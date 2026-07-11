export function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLocaleLowerCase('en-US') : ''
  if (message.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.'
  if (message.includes('email not confirmed')) return 'Giriş yapmadan önce e-posta adresinizi doğrulamanız gerekiyor.'
  if (message.includes('too many requests') || message.includes('rate limit')) return 'Çok fazla deneme yapıldı. Lütfen kısa bir süre sonra yeniden deneyin.'
  if (message.includes('failed to fetch') || message.includes('network')) return 'Giriş hizmetine bağlanılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.'
  return 'Giriş işlemi tamamlanamadı. Bilgilerinizi kontrol edip yeniden deneyin.'
}

export function signOutErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLocaleLowerCase('en-US') : ''
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Çıkış hizmetine bağlanılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.'
  }
  return 'Çıkış işlemi tamamlanamadı. Lütfen yeniden deneyin.'
}
