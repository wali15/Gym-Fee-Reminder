import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { markMemberPaid, getMember, getSettingsRows } from '@/lib/db'
import { sendPaymentConfirmationEmail } from '@/lib/email'
import { sendWhatsAppPaymentConfirmation } from '@/lib/whatsapp'
import { parseSettings, toEmailConfig, toWhatsAppConfig } from '@/lib/settings'
import crypto from 'crypto'

// Reads request headers/signature and DB: always run per-request.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature') || headersList.get('x-razorpay-signature')

    const isStripe = signature && process.env.STRIPE_WEBHOOK_SECRET
    const isRazorpay = signature && process.env.RAZORPAY_WEBHOOK_SECRET

    let event: any
    let memberId: number | null = null

    if (isStripe) {
      const stripe = await import('stripe')
      const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2024-06-20' as any,
      })
      
      try {
        event = stripeClient.webhooks.constructEvent(
          body,
          signature!,
          process.env.STRIPE_WEBHOOK_SECRET!
        )
      } catch (err) {
        console.error('Stripe webhook signature verification failed:', err)
        return errorResponse(new Error('Invalid signature'), 'POST /api/webhook/payment')
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object
        memberId = Number(session.metadata?.member_id)
      }
    } else if (isRazorpay) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(body)
        .digest('hex')

      if (expectedSignature !== signature) {
        console.error('Razorpay webhook signature verification failed')
        return errorResponse(new Error('Invalid signature'), 'POST /api/webhook/payment')
      }

      // Safely parse JSON for Razorpay webhook
      let parsedBody: any
      try {
        parsedBody = JSON.parse(body)
      } catch (err) {
        console.error('Razorpay webhook: Invalid JSON in request body')
        return errorResponse(new Error('Invalid JSON in request body'), 'POST /api/webhook/payment')
      }

      event = parsedBody

      if (event.event === 'payment.captured') {
        memberId = Number(event.payload.payment.entity.notes?.member_id)
      }
    } else {
      return NextResponse.json({ error: 'No webhook secret configured' }, { status: 400 })
    }

    if (memberId) {
      const member = await getMember(memberId)
      
      if (member && member.status !== 'paid') {
        const updatedMember = await markMemberPaid(memberId)

        if (updatedMember) {
          const settings = parseSettings(await getSettingsRows())

          if (updatedMember.email) {
            await sendPaymentConfirmationEmail(
              {
                name: updatedMember.name,
                email: updatedMember.email,
                feeAmount: updatedMember.fee_amount,
                dueDate: updatedMember.due_date,
                status: 'paid',
              },
              toEmailConfig(settings)
            )
          }

          if (updatedMember.phone) {
            await sendWhatsAppPaymentConfirmation(
              {
                name: updatedMember.name,
                phone: updatedMember.phone,
                feeAmount: updatedMember.fee_amount,
                dueDate: updatedMember.due_date,
                status: 'paid',
              },
              toWhatsAppConfig(settings)
            )
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Payment webhook error:', error)
    return errorResponse(error, 'POST /api/webhook/payment')
  }
}