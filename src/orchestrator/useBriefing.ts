import { useState, useEffect } from 'react'
import { generateBriefing, type Briefing } from './orchestrator'

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const CACHE_KEY = 'octo_briefing_v2'
const CACHE_DATE_KEY = 'octo_briefing_date_v2'

const EMPTY: Briefing = { ozet: '', kollar: [] }

export function useBriefing() {
  const [briefing, setBriefing] = useState<Briefing>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toDateString()

  async function fetchBriefing(force = false) {
    const cachedDate = sessionStorage.getItem(CACHE_DATE_KEY)
    const cachedBriefing = sessionStorage.getItem(CACHE_KEY)

    if (!force && cachedBriefing && cachedDate === today) {
      try {
        setBriefing(JSON.parse(cachedBriefing))
        setLoading(false)
        return
      } catch {
        // fall through to refetch
      }
    }

    setLoading(true)
    setError(null)

    try {
      if (!GROQ_API_KEY) {
        setBriefing({ ozet: 'API anahtari bulunamadi. .env dosyasina VITE_GROQ_API_KEY ekleyin.', kollar: [] })
        return
      }
      const result = await generateBriefing(GROQ_API_KEY)
      setBriefing(result)
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(result))
      sessionStorage.setItem(CACHE_DATE_KEY, today)
    } catch (err) {
      setError('Brifing olusturulamadi.')
      setBriefing({ ozet: 'Brifing yuklenemedi, yeniden deneyin.', kollar: [] })
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
