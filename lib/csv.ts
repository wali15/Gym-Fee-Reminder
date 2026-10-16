/**
 * CSV utilities for importing and exporting member data.
 */

export type CsvMember = {
  name: string
  email?: string | null
  phone?: string | null
  fee_amount: number
  due_date: string // YYYY-MM-DD format
  status?: 'paid' | 'due' | 'overdue'
}

/**
 * Parse CSV string into array of member objects.
 *
 * @param csv - CSV string with header row
 * @returns Array of parsed member objects
 * @throws Error if CSV format is invalid
 */
export function parseCsv(csv: string): CsvMember[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header and one data row')
  }

  const headers = lines[0].split(',').map(h => h.trim())
  const requiredHeaders = ['name', 'fee_amount', 'due_date']

  // Check if required headers are present
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(`Missing required column: ${required}`)
    }
  }

  const members: CsvMember[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = line.split(',').map(v => v.trim())
    const member: any = {}

    // Map values to headers
    headers.forEach((header, index) => {
      member[header] = values[index] !== undefined ? values[index] : null
    })

    // Validate and convert data types
    if (!member.name || member.name.trim() === '') {
      throw new Error(`Row ${i + 1}: Name is required`)
    }

    const feeAmount = parseFloat(member.fee_amount)
    if (isNaN(feeAmount) || feeAmount <= 0) {
      throw new Error(`Row ${i + 1}: Fee amount must be a positive number`)
    }
    member.fee_amount = feeAmount

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(member.due_date)) {
      throw new Error(`Row ${i + 1}: Due date must be in YYYY-MM-DD format`)
    }
    const date = new Date(member.due_date)
    if (isNaN(date.getTime())) {
      throw new Error(`Row ${i + 1}: Invalid date`)
    }

    // Handle optional fields
    if (member.email === '' || member.email === null) member.email = null
    if (member.phone === '' || member.phone === null) member.phone = null
    if (member.status && !['paid', 'due', 'overdue'].includes(member.status)) {
      throw new Error(`Row ${i + 1}: Status must be one of: paid, due, overdue`)
    }
    if (!member.status) member.status = 'due'

    members.push(member)
  }

  return members
}

/**
 * Convert array of member objects to CSV string.
 *
 * @param members - Array of member objects
 * @returns CSV string with header row
 */
export function formatCsv(members: CsvMember[]): string {
  if (members.length === 0) {
    return 'name,email,phone,fee_amount,due_date,status\n'
  }

  const headers = ['name', 'email', 'phone', 'fee_amount', 'due_date', 'status']
  const rows = [headers.join(',')]

  for (const member of members) {
    const row = headers.map(header => {
      const value = member[header as keyof CsvMember]
      // Handle null/undefined values
      if (value === null || value === undefined) return ''
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      const strValue = String(value)
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`
      }
      return strValue
    })
    rows.push(row.join(','))
  }

  return rows.join('\n') + '\n'
}