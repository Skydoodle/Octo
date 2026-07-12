import { describe, expect, it, vi } from 'vitest'
import migrationSource from '../../supabase/migrations/20260712174500_founder_50_leads.sql?raw'
import fixMigrationSource from '../../supabase/migrations/20260712183500_fix_founder_50_lead_submission.sql?raw'
import {
  initialLeadFormState,
  leadFormReducer,
  runFounder50Submission,
  submitFounder50Lead,
  type LeadFormAction,
} from './landingLead'

describe('Kurucu 100 lead submission', () => {
  it('enters a loading state when submission begins', () => {
    expect(leadFormReducer(initialLeadFormState, { type: 'submit' })).toEqual({ status: 'submitting', message: null })
  })

  it('confirms a successful backend submission', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    await expect(submitFounder50Lead('  Founder@Example.com ', rpc)).resolves.toEqual({ success: true, validationError: false })
    expect(rpc).toHaveBeenCalledWith('submit_founder_50_lead', { lead_email: 'founder@example.com' })
  })

  it('shows failure when Supabase rejects the submission', async () => {
    const actions: LeadFormAction[] = []
    const rpc = vi.fn(async () => ({ error: { message: 'database unavailable' } }))
    await expect(runFounder50Submission('founder@example.com', action => actions.push(action), rpc)).resolves.toBe(false)
    expect(actions).toEqual([
      { type: 'submit' },
      { type: 'error', message: 'Başvurunuz kaydedilemedi. Lütfen tekrar deneyin.' },
    ])
  })

  it('does not show success before backend confirmation', async () => {
    const actions: LeadFormAction[] = []
    let resolveRpc: ((value: { error: null }) => void) | undefined
    const rpc = vi.fn(() => new Promise<{ error: null }>(resolve => { resolveRpc = resolve }))
    const submission = runFounder50Submission('founder@example.com', action => actions.push(action), rpc)

    expect(actions).toEqual([{ type: 'submit' }])
    resolveRpc?.({ error: null })
    await expect(submission).resolves.toBe(true)
    expect(actions).toEqual([{ type: 'submit' }, { type: 'success' }])
  })

  it('treats duplicate valid submissions as successful without duplicate rows', async () => {
    const rpc = vi.fn(async () => ({ error: null }))
    await expect(submitFounder50Lead('founder@example.com', rpc)).resolves.toEqual({ success: true, validationError: false })
    await expect(submitFounder50Lead('founder@example.com', rpc)).resolves.toEqual({ success: true, validationError: false })
    expect(migrationSource).toContain('on conflict (normalized_email) do nothing')
    expect(fixMigrationSource).toContain('normalized_lead_email')
    expect(fixMigrationSource).not.toContain('normalized_email text :=')
  })
})
