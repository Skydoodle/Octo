import { supabase } from '../lib/supabase'

export type LeadFormStatus = 'idle' | 'submitting' | 'success' | 'error'

export interface LeadFormState {
  status: LeadFormStatus
  message: string | null
}

export type LeadFormAction =
  | { type: 'submit' }
  | { type: 'success' }
  | { type: 'error'; message: string }
  | { type: 'edit' }

export const initialLeadFormState: LeadFormState = { status: 'idle', message: null }

export function leadFormReducer(_state: LeadFormState, action: LeadFormAction): LeadFormState {
  if (action.type === 'submit') return { status: 'submitting', message: null }
  if (action.type === 'success') return { status: 'success', message: null }
  if (action.type === 'error') return { status: 'error', message: action.message }
  return initialLeadFormState
}

export function isValidLeadEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export type LeadRpc = (functionName: string, args: { lead_email: string }) => PromiseLike<{ error: unknown | null }>

const callLeadRpc: LeadRpc = (functionName, args) => supabase.rpc(functionName, args)

export async function submitFounder50Lead(
  email: string,
  rpc: LeadRpc = callLeadRpc,
): Promise<{ success: boolean; validationError: boolean }> {
  const normalizedEmail = email.trim().toLocaleLowerCase('en-US')
  if (!isValidLeadEmail(normalizedEmail)) return { success: false, validationError: true }

  const { error } = await rpc('submit_founder_50_lead', { lead_email: normalizedEmail })
  return { success: !error, validationError: false }
}

export async function runFounder50Submission(
  email: string,
  dispatch: (action: LeadFormAction) => void,
  rpc: LeadRpc = callLeadRpc,
): Promise<boolean> {
  dispatch({ type: 'submit' })
  try {
    const result = await submitFounder50Lead(email, rpc)
    if (!result.success) {
      dispatch({
        type: 'error',
        message: result.validationError
          ? 'Geçerli bir şirket e-postası girin.'
          : 'Başvurunuz kaydedilemedi. Lütfen tekrar deneyin.',
      })
      return false
    }
    dispatch({ type: 'success' })
    return true
  } catch {
    dispatch({ type: 'error', message: 'Başvurunuz kaydedilemedi. Lütfen tekrar deneyin.' })
    return false
  }
}
