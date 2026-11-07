/**
 * @akalin/ai_management_module - Think Port Ayarları Validatörü (thinkPortAyarlariValidation.ts)
 * 
 * Sorumlulukları:
 * - Think Port API bağlantı ve gateway politika alanlarının saf TypeScript fonksiyonları ile doğrulanması
 * - Sıfır inline validasyon kuralına uygun Record<string, string> tipinde hata üretimi
 * - Sıfır hardcoded metin kuralına uygun t() çevirileri
 */

export interface ThinkPortAyarlariFormData {
  ad?: string;
  aiProtokolId?: number | null;
  baseUrl?: string;
  apiKey?: string;
  varsayilanModel?: string;
  desteklenenModeller?: string[];
  timeoutSaniye?: number;
  aktifMi?: boolean;
  aciklama?: string;
  globalRpm?: number;
  maxConcurrentBrowsers?: number;
  keepAliveIntervalSec?: number;
  enableStealth?: boolean;
  autoRotateProxyOn403?: boolean;
}

export const validateThinkPortField = (
  fieldName: keyof ThinkPortAyarlariFormData,
  value: any,
  t: any
): string => {
  switch (fieldName) {
    case 'ad':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return t('think_port_servis_adi_zorunlu', 'Lütfen ThinkPort servis adını giriniz.');
      }
      if (value.trim().length < 2) {
        return t('auto_ad_en_az_2_karakter', 'Servis adı en az 2 karakter olmalıdır.');
      }
      return '';

    case 'baseUrl':
      if (!value || typeof value !== 'string' || !value.trim()) {
        return t('think_port_base_url_zorunlu', 'Lütfen ThinkPort API bağlantı adresini (Base URL) giriniz.');
      }
      if (!value.trim().startsWith('http://') && !value.trim().startsWith('https://')) {
        return t('auto_url_format_gecersiz', 'Geçerli bir HTTP veya HTTPS adresi giriniz.');
      }
      return '';

    case 'globalRpm': {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 1 || num > 100000) {
        return t('think_port_rpm_gecersiz', 'Global hız sınırı (RPM) 1 ile 100.000 arasında olmalıdır.');
      }
      return '';
    }

    case 'maxConcurrentBrowsers': {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 1 || num > 256) {
        return t('think_port_max_browsers_gecersiz', 'Maksimum eşzamanlı tarayıcı oturumu 1 ile 256 arasında olmalıdır.');
      }
      return '';
    }

    case 'keepAliveIntervalSec': {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 10 || num > 86400) {
        return t('think_port_keep_alive_gecersiz', 'Oturum Keep-Alive süresi 10 ile 86.400 saniye arasında olmalıdır.');
      }
      return '';
    }

    default:
      return '';
  }
};

export const validateThinkPortForm = (
  data: ThinkPortAyarlariFormData,
  t: any
): Record<string, string> => {
  const errors: Record<string, string> = {};

  const adErr = validateThinkPortField('ad', data.ad, t);
  if (adErr) errors.ad = adErr;

  const urlErr = validateThinkPortField('baseUrl', data.baseUrl, t);
  if (urlErr) errors.baseUrl = urlErr;

  const rpmErr = validateThinkPortField('globalRpm', data.globalRpm, t);
  if (rpmErr) errors.globalRpm = rpmErr;

  const browsersErr = validateThinkPortField('maxConcurrentBrowsers', data.maxConcurrentBrowsers, t);
  if (browsersErr) errors.maxConcurrentBrowsers = browsersErr;

  const keepAliveErr = validateThinkPortField('keepAliveIntervalSec', data.keepAliveIntervalSec, t);
  if (keepAliveErr) errors.keepAliveIntervalSec = keepAliveErr;

  return errors;
};

