import { useState, useEffect } from 'react'
import { generateBriefing } from './orchestrator'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const CACHE_KEY = 'octo_briefing'
const CACHE_DATE_KEY = 'octo_briefing_date'

export function useBriefing() {
  const [briefing, setBriefing] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toDateString()

  async function fetchBriefing(force = false) {
    // Check cache first
    const cachedDate = sessionStorage.getItem(CACHE_DATE_KEY)
    const cachedBriefing = sessionStorage.getItem(CACHE_KEY)

    if (!force && cachedBriefing && cachedDate === today) {
      setBriefing(cachedBriefing)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!GROQ_API_KEY) {
        setBriefing('API anahtarı bulunamadı. Lütfen .env dosyasına VITE_GROQ_API_KEY ekleyin.')
        return
      }
      const result = await generateBriefing(GROQ_API_KEY)
      setBriefing(result)
      sessionStorage.setItem(CACHE_KEY, result)
      sessionStorage.setItem(CACHE_DATE_KEY, today)
    } catch (err) {
      setError('Brifing oluşturulamadı.')
      setBriefing('Brifing yüklenemedi — yeniden deneyin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBriefing()
  }, [])

  const regenerate = () => fetchBriefing(true)

  return { briefing, loading, error, regenerate }
}