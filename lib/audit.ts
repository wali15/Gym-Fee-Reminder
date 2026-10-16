import { getClient } from './db'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
export type AuditTable = 'members' | 'settings'

export interface AuditLogEntry {
  table_name: AuditTable
  record_id: string | null
  action: AuditAction
  changed_by: string
  changed_at: string
  old_value: string | null
  new_value: string | null
}

/**
 * Log an audit entry for tracking changes
 *
 * @param entry - Audit log entry to create (old_value and new_value are JSON strings when not null)
 */
export async function logAuditEntry(entry: AuditLogEntry): Promise<void> {
  const client = getClient()

  await client.execute({
    sql: `
      INSERT INTO audit_log (table_name, record_id, action, changed_by, old_value, new_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    args: [
      entry.table_name,
      entry.record_id,
      entry.action,
      entry.changed_by,
      entry.old_value,
      entry.new_value
    ]
  })
}

/**
 * Log a settings change
 *
 * @param key - The setting key that was changed
 * @param oldValue - The old value (can be null)
 * @param newValue - The new value (can be null)
 * @param changedBy - Email of the user who made the change
 */
export async function logSettingsChange(
  key: string,
  oldValue: string | number | boolean | null,
  newValue: string | number | boolean | null,
  changedBy: string
): Promise<void> {
  await logAuditEntry({
    table_name: 'settings',
    record_id: key,
    action: oldValue === null ? 'CREATE' : (newValue === null ? 'DELETE' : 'UPDATE'),
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    old_value: oldValue !== null ? JSON.stringify(oldValue) : null,
    new_value: newValue !== null ? JSON.stringify(newValue) : null
  })
}

/**
 * Log a member change
 *
 * @param memberId - The ID of the member that was changed
 * @param action - The action performed (CREATE, UPDATE, DELETE)
 * @param oldValue - The old member data (can be null for CREATE)
 * @param newValue - The new member data (can be null for DELETE)
 * @param changedBy - Email of the user who made the change
 */
export async function logMemberChange(
  memberId: number,
  action: AuditAction,
  oldValue: any | null,
  newValue: any | null,
  changedBy: string
): Promise<void> {
  await logAuditEntry({
    table_name: 'members',
    record_id: String(memberId),
    action,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    old_value: oldValue ? JSON.stringify(oldValue) : null,
    new_value: newValue ? JSON.stringify(newValue) : null
  })
}