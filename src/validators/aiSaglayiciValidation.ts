/**
 * @akalin/ai_management_module - Yapay Zeka (AI) Sağlayıcı Validatörü (aiSaglayiciValidation.ts)
 * 
 * Sorumlulukları:
 * - AI Sağlayıcı form alanlarının saf TypeScript fonksiyonları ile doğrulanması
 * - Sıfır inline validasyon kuralına uygun Record<string, string> tipinde hata üretimi
 * - Sıfır hardcoded metin kuralına uygun t() çevirileri
 */

export interface AiSaglayiciFormData {
  ad?: string;
  saglayiciTuru?: number;
  aiProtokolId?: number | null;
  baseUrl?: string;
  apiKey?: string;
  varsayilanModel?: string;
  desteklenenModeller?: string[];
  aktifMi?: boolean;
  aciklama?: string;
}

export const validateAiSaglayiciField = (
  fieldName: keyof AiSaglayiciFormData,
  value: any,
  t: any,
  existingProviders?: { id?: any; ad?: string }[],
  currentId?: any
): string => {
  switch (fieldName) {
    case 'ad':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return t('auto_saglayici_adi_giriniz', 'Lütfen sağlayıcı adını giriniz.');
      }
      if (value.trim().length < 2) {
        return t('auto_ad_en_az_2_karakter', 'Sağlayıcı adı en az 2 karakter olmalıdır.');
      }
      if (existingProviders && existingProviders.length > 0) {
        const trimmedVal = value.trim().toLowerCase();
        const isDuplicate = existingProviders.some(p => {
          if (currentId && String(p.id) === String(currentId)) return false;
          return (p.ad || '').trim().toLowerCase() === trimmedVal;
        });
        if (isDuplicate) {
          return t('auto_saglayici_adi_benzersiz_olmalidir', 'Bu sağlayıcı adı zaten kullanılmaktadır. Farklı bir isim belirleyin.');
        }
      }
      return '';

    case 'baseUrl':
      if (value && typeof value === 'string' && value.trim()) {
        const trimmed = value.trim();
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          return t('auto_url_format_gecersiz', 'Geçerli bir HTTP veya HTTPS adresi giriniz.');
        }
      }
      return '';

    default:
      return '';
  }
};

export const validateAiSaglayiciForm = (
  data: AiSaglayiciFormData,
  t: any,
  existingProviders?: { id?: any; ad?: string }[],
  currentId?: any
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const adErr = validateAiSaglayiciField('ad', data.ad, t, existingProviders, currentId);
  if (adErr) errors.ad = adErr;

  const urlErr = validateAiSaglayiciField('baseUrl', data.baseUrl, t, existingProviders, currentId);
  if (urlErr) errors.baseUrl = urlErr;

  return errors;
};
