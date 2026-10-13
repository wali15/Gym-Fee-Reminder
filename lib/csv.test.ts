import { parseCsv, formatCsv } from './csv'

describe('CSV Library', () => {
  describe('parseCsv', () => {
    it('should parse valid CSV correctly', () => {
      const csv = `name,email,phone,fee_amount,due_date,status
John Doe,john@example.com,1234567890,100.50,2023-12-31,due
Jane Smith,,0987654321,75.25,2024-01-15,paid`

      const members = parseCsv(csv)

      expect(members.length).toBe(2)
      expect(members[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        fee_amount: 100.50,
        due_date: '2023-12-31',
        status: 'due'
      })
      expect(members[1]).toEqual({
        name: 'Jane Smith',
        email: null,
        phone: '0987654321',
        fee_amount: 75.25,
        due_date: '2024-01-15',
        status: 'paid'
      })
    })

    it('should throw error for missing required columns', () => {
      const csv = `name,email,due_date
John Doe,john@example.com,2023-12-31`

      expect(() => parseCsv(csv)).toThrow('Missing required column: fee_amount')
    })

    it('should throw error for invalid fee amount', () => {
      const csv = `name,email,phone,fee_amount,due_date,status
John Doe,john@example.com,1234567890,-50,2023-12-31,due`

      expect(() => parseCsv(csv)).toThrow('Row 2: Fee amount must be a positive number')
    })

    it('should throw error for invalid date format', () => {
      const csv = `name,email,phone,fee_amount,due_date,status
John Doe,john@example.com,1234567890,100,2023/12/31,due`

      expect(() => parseCsv(csv)).toThrow('Row 2: Due date must be in YYYY-MM-DD format')
    })

    it('should handle empty values correctly', () => {
      const csv = `name,email,phone,fee_amount,due_date,status
John Doe,john@example.com,,100,2023-12-31,`

      const members = parseCsv(csv)

      expect(members[0].phone).toBeNull()
      expect(members[0].email).toBe('john@example.com')
      expect(members[0].status).toBe('due') // default value
    })
  })

  describe('formatCsv', () => {
    it('should format members to CSV correctly', () => {
      const members = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '1234567890',
          fee_amount: 100.50,
          due_date: '2023-12-31',
          status: 'due'
        },
        {
          name: 'Jane Smith',
          email: null,
          phone: '0987654321',
          fee_amount: 75.25,
          due_date: '2024-01-15',
          status: 'paid'
        }
      ]

      const csv = formatCsv(members)

      expect(csv).toContain('name,email,phone,fee_amount,due_date,status')
      expect(csv).toContain('John Doe,john@example.com,1234567890,100.5,2023-12-31,due')
      expect(csv).toContain('Jane Smith,,0987654321,75.25,2024-01-15,paid')
    })

    it('should handle empty members array', () => {
      const csv = formatCsv([])
      expect(csv).toBe('name,email,phone,fee_amount,due_date,status\n')
    })

    it('should escape special characters in CSV', () => {
      const members = [
        {
          name: 'John "The Boss" Doe',
          email: 'john@example.com',
          phone: '1234567890',
          fee_amount: 100.50,
          due_date: '2023-12-31',
          status: 'due'
        }
      ]

      const csv = formatCsv(members)
      expect(csv).toContain('"John ""The Boss"" Doe"')
    })
  })
})