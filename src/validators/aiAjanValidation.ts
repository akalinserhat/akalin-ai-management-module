/**
 * @akalin/ai_management_module - AI Ajan Formu Doğrulama Kuralları (aiAjanValidation.ts)
 *
 * Zorunlu (uygulamaId + kod) birleşik kimlik (composite key) ve pgvector hafıza
 * sınırlarını saf (pure) TypeScript fonksiyonları ile doğrular.
 */

export interface AiAjanValidationInput {
  ad?: string;
  kod?: string;
  ajanId?: string;
  uygulamaId?: string;
  hafizaMaxKayit?: number | string;
  hafizaSaklamaGun?: number | string;
  hafizaAramaTopK?: number | string;
}

export const normalizeAgentCode = (raw: string): string => {
  return (raw || '')
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ş/g, 'S')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const validateAiAjanField = (
  field: keyof AiAjanValidationInput,
  value: any,
  t?: (key: string, defaultText?: string) => string
): string => {
  const tr = (k: string, def: string) => (t ? t(k, def) : def);

  if (field === 'ad') {
    const str = String(value ?? '').trim();
    if (!str) {
      return tr('ajan_adi_zorunlu_hata', 'Ajan adı zorunludur.');
    }
  }

  if (field === 'kod' || field === 'ajanId') {
    const str = normalizeAgentCode(String(value ?? ''));
    if (!str) {
      return tr('ajan_kodu_zorunlu_hata', 'Benzersiz ajan kimliği (Agent ID / Kod) zorunludur.');
    }
  }

  if (field === 'uygulamaId') {
    const str = normalizeAgentCode(String(value ?? ''));
    if (!str) {
      return tr('uygulama_id_zorunlu_hata', 'Uygulama kimliği (App ID) zorunludur.');
    }
  }

  if (field === 'hafizaMaxKayit') {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 50 || num > 50000) {
      return tr('hafiza_max_kayit_aralik_hata', 'Maksimum hafıza kaydı 50 ile 50.000 arasında olmalıdır.');
    }
  }

  if (field === 'hafizaSaklamaGun') {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1 || num > 3650) {
      return tr('hafiza_saklama_gun_aralik_hata', 'Hafıza saklama süresi (TTL) 1 ile 3650 gün arasında olmalıdır.');
    }
  }

  if (field === 'hafizaAramaTopK') {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 1 || num > 20) {
      return tr('hafiza_top_k_aralik_hata', 'Arama başına sonuç sınırı (Top-K) 1 ile 20 arasında olmalıdır.');
    }
  }

  return '';
};

export const validateAiAjanForm = (
  formData: AiAjanValidationInput,
  t?: (key: string, defaultText?: string) => string
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const fields: (keyof AiAjanValidationInput)[] = [
    'ad',
    'kod',
    'uygulamaId',
    'hafizaMaxKayit',
    'hafizaSaklamaGun',
    'hafizaAramaTopK',
  ];

  for (const field of fields) {
    if (field === 'kod') {
      const resolvedValue = formData.kod || formData.ajanId;
      const err = validateAiAjanField('kod', resolvedValue, t);
      if (err) {
        errors.kod = err;
        errors.ajanId = err;
      }
    } else {
      const err = validateAiAjanField(field, formData[field], t);
      if (err) {
        errors[field] = err;
      }
    }
  }

  return errors;
};

