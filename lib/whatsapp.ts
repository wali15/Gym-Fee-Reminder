import { formatCurrency, type WhatsAppConfig } from './settings'

export interface WhatsAppMessageData {
  name: string
  phone: string
  feeAmount: number
  dueDate: string
  status: 'due' | 'overdue' | 'paid'
}

type SendResult = { success: boolean; error?: string }

async function postMessage(config: WhatsAppConfig, payload: unknown): Promise<SendResult> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${config.phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()
    if (!response.ok) {
      console.error('WhatsApp API error:', result)
      return {
        success: false,
        error: result.error?.message || `WhatsApp API error: ${response.status}`,
      }
    }
    return { success: true }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send WhatsApp' }
  }
}

export async function sendWhatsAppReminder(
  data: WhatsAppMessageData,
  config: WhatsAppConfig
): Promise<SendResult> {
  if (!config.enabled) return { success: false, error: 'WhatsApp disabled' }

  const formattedAmount = formatCurrency(data.feeAmount, config.currency)
  const formattedDate = new Date(data.dueDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const templateName = data.status === 'overdue' ? config.templateOverdue : config.templateDue

  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(data.phone),
    type: 'template',
    template: {
      name: templateName,
      language: { code: config.lang },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.name },
            { type: 'text', text: formattedAmount },
            { type: 'text', text: formattedDate },
          ],
        },
      ],
    },
  }

  return postMessage(config, payload)
}

export async function sendWhatsAppPaymentConfirmation(
  data: WhatsAppMessageData,
  config: WhatsAppConfig
): Promise<SendResult> {
  if (!config.enabled) return { success: false, error: 'WhatsApp disabled' }

  const formattedAmount = formatCurrency(data.feeAmount, config.currency)

  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(data.phone),
    type: 'template',
    template: {
      name: config.templatePayment,
      language: { code: config.lang },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.name },
            { type: 'text', text: formattedAmount },
          ],
        },
      ],
    },
  }

  return postMessage(config, payload)
}

export async function sendWhatsAppTextMessage(
  phone: string,
  message: string,
  config: WhatsAppConfig
): Promise<SendResult> {
  if (!config.enabled) return { success: false, error: 'WhatsApp disabled' }

  const payload = {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(phone),
    type: 'text',
    text: { body: message },
  }

  return postMessage(config, payload)
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1)
  }

  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned
  }

  return cleaned
}
