/**
 * @akalin/ai_management_module - RAG Sorgu Aracı Validatörü (ragAracFlowchartValidation.ts)
 *
 * Başlıca Sorumlulukları:
 * - AI İşlemi (AI_ISLEM) düğümüne bağlanan RAG Sorgu Aracı (RAG_ARAC) form verilerini saf TypeScript fonksiyonları ile doğrulamak
 * - Zero Inline Form Validation ve %100 i18n kurallarına uygun olarak Record<string, string> hata nesnesi döndürmek
 */

import type { RagAramaKapsami, RagAramaStratejisi } from '../types';

export interface RagAracFlowchartFormData {
  aramaKapsami?: RagAramaKapsami | string;
  belgeTuruKlasoru?: string;
  aramaStratejisi?: RagAramaStratejisi | string;
  varsayilanBolumFiltresi?: string;
  topK?: number;
  minBenzerlikSkoru?: number;
  tabloOncelikliMi?: boolean;
  sayfaVeBolumKaynakGoster?: boolean;
  aciklama?: string;
}

export const validateRagAracField = (
  fieldName: keyof RagAracFlowchartFormData,
  value: any,
  formData: RagAracFlowchartFormData,
  t: (key: string, defaultText?: string) => string
): string => {
  switch (fieldName) {
    case 'belgeTuruKlasoru': {
      if (formData.aramaKapsami === 'BELGE_KLASORU') {
        if (!value || typeof value !== 'string' || !value.trim()) {
          return t(
            'rag_arac_klasor_zorunlu',
            'Belge klasörü kapsamı seçildiğinde hedef bulut klasörü / belge türü girilmelidir.'
          );
        }
      }
      return '';
    }

    case 'topK': {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 1 || num > 25) {
        return t(
          'rag_arac_topk_aralik_hatasi',
          'Getirilecek maksimum parça (Chunk / Top-K) sayısı 1 ile 25 arasında olmalıdır.'
        );
      }
      return '';
    }

    case 'minBenzerlikSkoru': {
      const num = Number(value);
      if (!Number.isFinite(num) || num < 0 || num > 0.95) {
        return t(
          'rag_arac_benzerlik_aralik_hatasi',
          'Minimum benzerlik skoru eşiği 0.00 ile 0.95 arasında olmalıdır.'
        );
      }
      return '';
    }

    default:
      return '';
  }
};

export const validateRagAracForm = (
  data: RagAracFlowchartFormData,
  t: (key: string, defaultText?: string) => string
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  const klasorErr = validateRagAracField('belgeTuruKlasoru', data.belgeTuruKlasoru, data, t);
  if (klasorErr) errors.belgeTuruKlasoru = klasorErr;

  const topKErr = validateRagAracField('topK', data.topK, data, t);
  if (topKErr) errors.topK = topKErr;

  const scoreErr = validateRagAracField('minBenzerlikSkoru', data.minBenzerlikSkoru, data, t);
  if (scoreErr) errors.minBenzerlikSkoru = scoreErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
