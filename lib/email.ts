import { Resend } from 'resend'
import { formatCurrency, type EmailConfig } from './settings'
import nodemailer from 'nodemailer'

export interface ReminderEmailData {
  name: string
  email: string
  feeAmount: number
  dueDate: string
  status: 'due' | 'overdue' | 'paid'
}

type SendResult = { success: boolean; error?: string }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function sendReminderEmail(
  data: ReminderEmailData,
  config: EmailConfig
): Promise<SendResult> {
  if (!config.enabled) return { success: false, error: 'Email disabled' }

  const gym = escapeHtml(config.gymName)
  const name = escapeHtml(data.name)
  const formattedAmount = formatCurrency(data.feeAmount, config.currency)
  const formattedDate = new Date(data.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const subject =
    data.status === 'overdue'
      ? `⚠️ OVERDUE: ${config.gymName} Membership Fee - ${formattedAmount}`
      : `📅 Reminder: ${config.gymName} Membership Fee Due - ${formattedAmount}`

  const payUrl = config.appUrl ? `${config.appUrl}/payment` : '#'
  const contact = escapeHtml(config.contactEmail || config.fromAddress)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💪 ${gym}</h1>
        <p style="color: #dcfce7; margin: 10px 0 0; font-size: 16px;">Membership Fee Reminder</p>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-top: 0;">Hi <strong>${name}</strong>,</p>

        <div style="background: ${data.status === 'overdue' ? '#fef2f2' : '#fffbeb'}; border-left: 4px solid ${data.status === 'overdue' ? '#ef4444' : '#f59e0b'}; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 10px; font-weight: 600; color: ${data.status === 'overdue' ? '#991b1b' : '#92400e'};">
            ${data.status === 'overdue' ? '⚠️ Payment Overdue' : '📅 Payment Due Soon'}
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">
            Amount: ${formattedAmount}
          </p>
          <p style="margin: 10px 0 0; color: #4b5563;">
            Due Date: <strong>${formattedDate}</strong>
          </p>
        </div>

        <p style="color: #4b5563;">Please complete your payment to continue enjoying uninterrupted access to all gym facilities.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${payUrl}"
             style="background: #16a34a; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Pay Now
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          If you've already made the payment, please ignore this reminder or reply to this email to update your status.
        </p>

        <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0;">
          — The ${gym} Team
        </p>
      </div>

      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>${gym}${contact ? ` | Contact: ${contact}` : ''}</p>
      </div>
    </body>
    </html>
  `

  try {
    // Use SMTP relay if configured, otherwise fallback to Resend
    if (config.smtpHost && config.smtpPort && config.smtpUsername && config.smtpPassword) {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure, // true for 465, false for other ports
        auth: {
          user: config.smtpUsername,
          pass: config.smtpPassword,
        },
      })

      await transporter.sendMail({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: data.email,
        subject,
        html,
      })
    } else {
      const resend = new Resend(config.apiKey)
      await resend.emails.send({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: [data.email],
        subject,
        html,
      })
    }
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
  }
}

export async function sendPaymentConfirmationEmail(
  data: ReminderEmailData,
  config: EmailConfig
): Promise<SendResult> {
  if (!config.enabled) return { success: false, error: 'Email disabled' }

  const gym = escapeHtml(config.gymName)
  const name = escapeHtml(data.name)
  const formattedAmount = formatCurrency(data.feeAmount, config.currency)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">💪 ${gym}</h1>
        <p style="color: #dcfce7; margin: 10px 0 0; font-size: 16px;">Payment Confirmation</p>
      </div>

      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 80px; height: 80px; background: #16a34a; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style="color: #16a34a; margin: 0;">Payment Received!</h2>
        </div>

        <p style="font-size: 16px; margin-top: 0;">Hi <strong>${name}</strong>,</p>

        <p style="color: #4b5563;">Thank you for your payment. Your membership is now active.</p>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 10px; font-weight: 600; color: #065f46;">Payment Details</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">Amount: ${formattedAmount}</p>
          <p style="margin: 10px 0 0; color: #4b5563;">Status: <strong style="color: #16a34a;">Paid ✓</strong></p>
        </div>

        <p style="color: #4b5563;">Your next payment will be due on your next billing cycle.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 14px; margin: 0;">
          — The ${gym} Team
        </p>
      </div>
    </body>
    </html>
  `

  try {
    // Use SMTP relay if configured, otherwise fallback to Resend
    if (config.smtpHost && config.smtpPort && config.smtpUsername && config.smtpPassword) {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure, // true for 465, false for other ports
        auth: {
          user: config.smtpUsername,
          pass: config.smtpPassword,
        },
      })

      await transporter.sendMail({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: data.email,
        subject: `✅ Payment Confirmed - ${formattedAmount}`,
        html,
      })
    } else {
      const resend = new Resend(config.apiKey)
      await resend.emails.send({
        from: `${config.fromName} <${config.fromAddress}>`,
        to: [data.email],
        subject: `✅ Payment Confirmed - ${formattedAmount}`,
        html,
      })
    }
    return { success: true }
  } catch (error) {
    console.error('Email error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' }
  }
}
