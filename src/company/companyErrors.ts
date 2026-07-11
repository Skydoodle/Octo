function errorText(error: unknown): string {
  if (error instanceof Error) return error.message.toLocaleLowerCase('en-US')
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message.toLocaleLowerCase('en-US')
  }
  return ''
}

export function companyLoadErrorMessage(error: unknown): string {
  const message = errorText(error)
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Şirket bilgilerine ulaşılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.'
  }
  return 'Şirket bilgileri yüklenemedi. Lütfen yeniden deneyin.'
}

export function companyCreationErrorMessage(error: unknown): string {
  const message = errorText(error)
  if (message.includes('blank')) return 'Şirket adı boş bırakılamaz.'
  if (message.includes('currency')) return 'Lütfen desteklenen bir para birimi seçin.'
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Şirket oluşturma hizmetine bağlanılamadı. İnternet bağlantınızı kontrol edip yeniden deneyin.'
  }
  return 'Şirket oluşturulamadı. Lütfen bilgileri kontrol edip yeniden deneyin.'
}
