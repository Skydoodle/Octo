// Octo — Fatura Görsel Çıkarımı (PDF/Image → yapılandırılmış fatura)
// Bir fatura görselini/PDF'ini vision-capable bir LLM'e verip alanları (cari,
// VKN, tarih, tutar, KDV) yapılandırılmış JSON olarak çıkarır. Bu, manuel
// girişi sıfıra yaklaştıran "veri girişi kolaylaştırma" hedefinin en güçlü
// parçası.
//
// MİMARİ NOT: Vision model adı TEK yerde (VISION_MODEL) tanımlı. Groq vision
// modelleri 2026'da oynak (Llama 4 Maverick/Scout deprecate sürecinde), o yüzden
// model değişince burada tek satır güncellenir. API OpenAI-uyumlu olduğu için
// ileride başka sağlayıcıya veya backend'e geçmek de kolay.
//
// GÜVENLİK BORCU: Groq anahtarı şu an tarayıcıya açık (VITE_GROQ_API_KEY).
// Bu özellik anahtarı daha çok kullanır — ideal olarak çıkarım backend'e
// taşınmalı (anahtar sunucuda güvende, görseller sunucuda işlenir).

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Vision-capable model. Değişirse SADECE burayı güncelle.
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'

export interface CikarilmisFatura {
  cariUnvan: string
  vkn: string
  faturaTarihi: string      // ISO YYYY-MM-DD (mümkünse)
  tutar: number | null      // KDV hariç (net)
  kdvOrani: number | null
  kdvTutari: number | null
  toplam: number | null     // KDV dahil genel toplam
  tur: 'sales' | 'purchase'
  aciklama: string
  guven: 'yuksek' | 'orta' | 'dusuk'  // model özgüveni
}

export interface CikarimSonuc {
  ok: boolean
  fatura?: CikarilmisFatura
  hata?: string
}

const SYSTEM_PROMPT = `Sen bir Türk fatura okuma uzmanısın. Sana bir fatura görseli verilecek.
Faturadaki bilgileri çıkar ve SADECE şu JSON formatında döndür, başka hiçbir şey yazma:
{
  "cariUnvan": "satıcı veya alıcı firma ünvanı",
  "vkn": "vergi kimlik numarası veya TC (sadece rakam)",
  "faturaTarihi": "YYYY-MM-DD formatında",
  "tutar": KDV hariç matrah (sayı, yoksa null),
  "kdvOrani": KDV oranı yüzde olarak (20, 10, 1 gibi; yoksa null),
  "kdvTutari": KDV tutarı (sayı, yoksa null),
  "toplam": KDV dahil genel toplam (sayı),
  "tur": "sales" eğer bu bizim kestiğimiz satış faturasıysa, "purchase" eğer bize kesilen alış faturasıysa,
  "aciklama": "kısa açıklama (ürün/hizmet)",
  "guven": "yuksek" | "orta" | "dusuk" (okuma netliğine göre)
}
Türkçe sayı formatına dikkat et (1.234,56 = 1234.56). Tarihi ISO'ya çevir.
Emin olamadığın alanı null bırak ve guven'i düşür. SADECE JSON döndür.`

// Bir dosyayı (image veya PDF) base64 data URL'e çevir.
export function dosyayiBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}

// Ana fonksiyon: fatura görselinden yapılandırılmış fatura çıkar.
export async function faturaCikar(file: File): Promise<CikarimSonuc> {
  if (!GROQ_API_KEY) {
    return { ok: false, hata: 'API anahtarı yok. .env dosyasına VITE_GROQ_API_KEY ekleyin.' }
  }

  // Vision modelleri görsel ister; PDF'i doğrudan kabul etmeyebilir. Görsel
  // (jpg/png/webp) en güvenlisi. PDF için kullanıcı sayfayı görsel olarak
  // vermeli (ileride backend'de PDF→image dönüşümü eklenebilir).
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    return { ok: false, hata: 'Şimdilik sadece görsel (JPG/PNG) faturalar okunabilir. PDF için ekran görüntüsü alıp yükleyin. (PDF desteği backend ile gelecek.)' }
  }

  try {
    const dataUrl = await dosyayiBase64(file)
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 800,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Bu faturadaki bilgileri JSON olarak çıkar.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      return { ok: false, hata: `Vision API hatası: ${response.status}. Model değişmiş olabilir.` }
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '{}'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const num = (v: unknown): number | null => {
      if (v === null || v === undefined || v === '') return null
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
      return isNaN(n) ? null : n
    }

    const fatura: CikarilmisFatura = {
      cariUnvan: String(parsed.cariUnvan ?? '').trim(),
      vkn: String(parsed.vkn ?? '').replace(/\D/g, ''),
      faturaTarihi: String(parsed.faturaTarihi ?? '').trim(),
      tutar: num(parsed.tutar),
      kdvOrani: num(parsed.kdvOrani),
      kdvTutari: num(parsed.kdvTutari),
      toplam: num(parsed.toplam),
      tur: parsed.tur === 'purchase' ? 'purchase' : 'sales',
      aciklama: String(parsed.aciklama ?? '').trim(),
      guven: ['yuksek', 'orta', 'dusuk'].includes(parsed.guven) ? parsed.guven : 'orta',
    }
    return { ok: true, fatura }
  } catch {
    return { ok: false, hata: 'Fatura okunamadı. Görselin net olduğundan emin olun.' }
  }
}
