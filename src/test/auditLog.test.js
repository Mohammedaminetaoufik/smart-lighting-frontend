import { describe, expect, it } from 'vitest'
import {
  auditAPIParams, buildAuditCSV, diffAuditValues, eventSeverity,
  friendlyIPAddress, parseUserAgent,
} from '../utils/auditLog'

describe('audit investigation helpers', () => {
  it('returns only added, removed, and changed fields', () => {
    expect(diffAuditValues(
      { unchanged: 1, changed: 2, removed: 'old' },
      { unchanged: 1, changed: 3, added: true },
    )).toEqual([
      { key: 'added', before: undefined, after: true, type: 'added' },
      { key: 'changed', before: 2, after: 3, type: 'changed' },
      { key: 'removed', before: 'old', after: undefined, type: 'removed' },
    ])
  })

  it('detects nested changes while ignoring object key order', () => {
    expect(diffAuditValues(
      { config: { brightness: 80, enabled: true }, unchanged: { a: 1, b: 2 } },
      { config: { brightness: 60, enabled: true }, unchanged: { b: 2, a: 1 } },
    )).toEqual([{
      key: 'config',
      before: { brightness: 80, enabled: true },
      after: { brightness: 60, enabled: true },
      type: 'changed',
    }])
  })

  it('normalizes filters for the API', () => {
    const params = auditAPIParams({
      search: 'REF1', status: '', sensitive: true,
      from: '2026-07-10T12:00:00Z', to: '',
    })
    expect(params).toEqual({
      search: 'REF1', sensitive: 'true', from: '2026-07-10T12:00:00.000Z',
    })
  })

  it('identifies sensitive and failed actions', () => {
    expect(eventSeverity({ status: 'error', action: 'lcu_tested' })).toBe('error')
    expect(eventSeverity({ status: 'success', action: 'user_deleted' })).toBe('sensitive')
    expect(eventSeverity({ status: 'success', action: 'lcu_tested' })).toBe('normal')
  })

  it('formats technical client metadata', () => {
    expect(friendlyIPAddress('::1')).toBe('Localhost')
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36'))
      .toBe('Chrome 126.0.0.0 · Windows')
  })

  it('escapes structured values in CSV exports', () => {
    const csv = buildAuditCSV([{ action: 'user_updated', new_values: { role: 'admin' } }])
    expect(csv).toContain('Utilisateur modifié')
    expect(csv).toContain('{""role"":""admin""}')
  })
})
