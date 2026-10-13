import { NextRequest, NextResponse } from 'next/server'
import { getMember, updateMemberReminderSent, getSettingsRows } from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'
import { sendWhatsAppReminder } from '@/lib/whatsapp'
import { requireAuth } from '@/lib/auth'
import { parseSettings, toEmailConfig, toWhatsAppConfig } from '@/lib/settings'
import { errorResponse } from '@/lib/api'

// Auth/DB-backed: always run per-request (reads the session cookie).
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const member = await getMember(Number(id))
    if (!member) {
      return errorResponse(new Error('Member not found'), 'POST /api/remind/[id]')
    }
    if (member.status === 'paid') {
      return errorResponse(new Error('Member has already paid'), 'POST /api/remind/[id]')
    }

    const settings = parseSettings(await getSettingsRows())
    const emailConfig = toEmailConfig(settings)
    const whatsappConfig = toWhatsAppConfig(settings)

    const results = {
      email: { success: false, error: 'No email provided' } as { success: boolean; error?: string },
      whatsapp: { success: false, error: 'No phone provided' } as { success: boolean; error?: string },
    }

    if (member.email) {
      results.email = await sendReminderEmail(
        {
          name: member.name,
          email: member.email,
          feeAmount: member.fee_amount,
          dueDate: member.due_date,
          status: member.status,
        },
        emailConfig
      )
    }

    if (member.phone) {
      results.whatsapp = await sendWhatsAppReminder(
        {
          name: member.name,
          phone: member.phone,
          feeAmount: member.fee_amount,
          dueDate: member.due_date,
          status: member.status,
        },
        whatsappConfig
      )
    }

    if (!results.email.success && !results.whatsapp.success) {
      return NextResponse.json(
        {
          success: false,
          results,
          error:
            'No reminder sent. Enable Email or WhatsApp in Settings and ensure the member has contact details.',
        },
        { status: 400 }
      )
    }

    await updateMemberReminderSent(member.id)

    return NextResponse.json({
      success: true,
      results,
      message: 'Reminder sent successfully',
    })
  } catch (error) {
    return errorResponse(error, 'POST /api/remind/[id]')
  }
}
