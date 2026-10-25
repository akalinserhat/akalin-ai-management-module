/**
 * @akalin/ai_management_module - Yapay Zeka (AI) Protokol Validatörü (aiProtokolValidation.ts)
 * 
 * Sorumlulukları:
 * - AI Protokol form alanlarının saf TypeScript fonksiyonları ile doğrulanması
 * - Sıfır inline validasyon kuralına uygun Record<string, string> tipinde hata üretimi
 * - Sıfır hardcoded metin kuralına uygun t() çevirileri
 */

export interface AiProtokolFormData {
  ad?: string;
  aciklama?: string;
  requestScript?: string;
  responseScript?: string;
  modelsScript?: string;
}

export const validateAiProtokolField = (
  fieldName: keyof AiProtokolFormData,
  value: any,
  t: any
): string => {
  switch (fieldName) {
    case 'ad':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return t('auto_ad_zorunlu', 'Protokol adı zorunludur.');
      }
      if (value.trim().length < 3) {
        return t('auto_ad_en_az_3_karakter', 'Protokol adı en az 3 karakter olmalıdır.');
      }
      return '';

    case 'requestScript':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return t('auto_request_script_zorunlu', 'İstek dönüştürücü scripti (buildRequest) zorunludur.');
      }
      if (!value.includes('buildRequest')) {
        return t('auto_request_script_buildRequest_eksik', 'Script içinde "buildRequest" fonksiyonu bulunmalıdır.');
      }
      return '';

    case 'responseScript':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return t('auto_response_script_zorunlu', 'Yanıt ayrıştırıcı scripti (parseResponse) zorunludur.');
      }
      if (!value.includes('parseResponse')) {
        return t('auto_response_script_parseResponse_eksik', 'Script içinde "parseResponse" fonksiyonu bulunmalıdır.');
      }
      return '';

    default:
      return '';
  }
};

export const validateAiProtokolForm = (
  data: AiProtokolFormData,
  t: any
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const adErr = validateAiProtokolField('ad', data.ad, t);
  if (adErr) errors.ad = adErr;

  const reqErr = validateAiProtokolField('requestScript', data.requestScript, t);
  if (reqErr) errors.requestScript = reqErr;

  const resErr = validateAiProtokolField('responseScript', data.responseScript, t);
  if (resErr) errors.responseScript = resErr;

  return errors;
};
