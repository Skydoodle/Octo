import { supabase } from '../lib/supabase'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const minimumPasswordLength = 8

export interface SignUpValues {
  email: string
  fullName: string
  password: string
  passwordConfirmation: string
}

export function validateSignUp(values: SignUpValues): string | null {
  if (values.fullName.trim().length < 2) return 'Ad soyad en az 2 karakter olmalıdır.'
  if (!emailPattern.test(values.email.trim())) return 'Geçerli bir e-posta adresi girin.'
  if (values.password.length < minimumPasswordLength) return 'Şifre en az 8 karakter olmalıdır.'
  if (values.password !== values.passwordConfirmation) return 'Şifreler eşleşmiyor.'
  return null
}

export function validateForgotPassword(email: string): string | null {
  return emailPattern.test(email.trim()) ? null : 'Geçerli bir e-posta adresi girin.'
}

export function validatePasswordUpdate(password: string, confirmation: string): string | null {
  if (password.length < minimumPasswordLength) return 'Yeni şifre en az 8 karakter olmalıdır.'
  if (password !== confirmation) return 'Yeni şifreler eşleşmiyor.'
  return null
}

export function validateDisplayName(displayName: string): string | null {
  return displayName.trim().length >= 2 ? null : 'Görünen ad en az 2 karakter olmalıdır.'
}

type ProfileNameWriter = (userId: string, displayName: string) => Promise<{ error: unknown | null }>

const writeProfileName: ProfileNameWriter = async (userId, displayName) => {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
  return { error }
}

export async function updateProfileName(
  userId: string,
  displayName: string,
  writer: ProfileNameWriter = writeProfileName,
): Promise<{ error: unknown | null }> {
  const validationError = validateDisplayName(displayName)
  if (validationError) return { error: new Error(validationError) }
  return writer(userId, displayName.trim())
}

export function accountAccessErrorMessage(error: unknown): string {
  const message = typeof error === 'object' && error && 'message' in error && typeof error.message === 'string'
    ? error.message.toLocaleLowerCase('en-US')
    : ''
  if (message.includes('already registered') || message.includes('already been registered')) return 'Bu e-posta adresiyle zaten bir hesap var.'
  if (message.includes('same password')) return 'Yeni şifreniz mevcut şifrenizden farklı olmalıdır.'
  if (message.includes('weak password') || message.includes('password should')) return 'Şifre güvenlik gereksinimlerini karşılamıyor.'
  if (message.includes('failed to fetch') || message.includes('network')) return 'Hesap hizmetine bağlanılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.'
  return 'İşlem tamamlanamadı. Lütfen yeniden deneyin.'
}
