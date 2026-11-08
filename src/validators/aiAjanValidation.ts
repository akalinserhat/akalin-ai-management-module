/**
 * @akalin/ai_management_module - AI Ajan Formu Doğrulama Kuralları (aiAjanValidation.ts)
 *
 * Zorunlu ve benzersiz Ajan Id (kod / ajanId) ile pgvector hafıza
 * sınırlarını saf (pure) TypeScript fonksiyonları ile doğrular.
 */

export interface AiAjanValidationInput {
  id?: number | string | null;
  ad?: string;
  kod?: string;
  ajanId?: string;
  hafizaMaxKayit?: number | string;
  hafizaSaklamaGun?: number | string;
  hafizaAramaTopK?: number | string;
}

export interface AiAjanValidationOptions {
  existingAgents?: Array<{ id?: number | string; kod?: string; ajanId?: string }>;
  currentAgentId?: number | string | null;
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
  t?: (key: string, defaultText?: string) => string,
  options?: AiAjanValidationOptions
): string => {
  const tr = (k: string, def: string) => (t ? t(k, def) : def);

  if (field === 'ad') {
    const str = String(value ?? '').trim();
    if (!str) {
      return tr('ajan_adi_zorunlu_hata', 'Ajan adı zorunludur.');
    }
  }

  if (field === 'kod' || field === 'ajanId') {
    const rawStr = String(value ?? '').trim();
    if (rawStr.includes(':')) {
      return tr('ajan_id_iki_nokta_yasak_hata', 'Ajan Id içerisinde ":" karakteri kullanılamaz.');
    }
    const str = normalizeAgentCode(rawStr);
    if (!str) {
      return tr('ajan_kodu_zorunlu_hata', 'Benzersiz ajan kimliği (Ajan Id) zorunludur.');
    }
    if (options?.existingAgents && Array.isArray(options.existingAgents)) {
      const currentIdStr = options.currentAgentId != null ? String(options.currentAgentId) : '';
      const isDuplicate = options.existingAgents.some(agent => {
        const agentIdStr = agent?.id != null ? String(agent.id) : '';
        if (currentIdStr && agentIdStr === currentIdStr) {
          return false;
        }
        const existingCode = normalizeAgentCode(String(agent?.ajanId || agent?.kod || ''));
        return Boolean(existingCode && existingCode === str);
      });
      if (isDuplicate) {
        return tr('ajan_id_benzersiz_degil_hata', 'Bu Ajan Id başka bir ajan tarafından kullanılmaktadır. Ajan Id benzersiz olmalıdır.');
      }
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
  t?: (key: string, defaultText?: string) => string,
  options?: AiAjanValidationOptions
): Record<string, string> => {
  const errors: Record<string, string> = {};
  const fields: (keyof AiAjanValidationInput)[] = [
    'ad',
    'kod',
    'hafizaMaxKayit',
    'hafizaSaklamaGun',
    'hafizaAramaTopK',
  ];

  const effectiveOptions: AiAjanValidationOptions = {
    existingAgents: options?.existingAgents,
    currentAgentId: options?.currentAgentId ?? formData.id ?? null,
  };

  for (const field of fields) {
    if (field === 'kod') {
      const resolvedValue = formData.kod || formData.ajanId;
      const err = validateAiAjanField('kod', resolvedValue, t, effectiveOptions);
      if (err) {
        errors.kod = err;
        errors.ajanId = err;
      }
    } else {
      const err = validateAiAjanField(field, formData[field], t, effectiveOptions);
      if (err) {
        errors[field] = err;
      }
    }
  }

  return errors;
};

