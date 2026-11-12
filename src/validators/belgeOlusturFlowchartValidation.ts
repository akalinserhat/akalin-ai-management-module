/**
 * @akalin/ai_management_module - "Belge Oluştur" Düğümü Doğrulama Kuralları (belgeOlusturFlowchartValidation.ts)
 *
 * Başlıca Sorumlulukları:
 * - Zero Inline Form Validation kuralına uygun olarak BELGE_OLUSTUR düğümü alan doğrulamalarını modül seviyesinde yürütmek
 */

import type { AiAkisDugumu } from '../types';

export interface BelgeOlusturValidationErrors {
  varlikKodu?: string;
}

export const validateBelgeOlusturFlowchartNode = (
  node: Partial<AiAkisDugumu> | null | undefined,
  t: (key: string, fallback?: string) => string
): BelgeOlusturValidationErrors => {
  const errors: BelgeOlusturValidationErrors = {};
  const entityCode = (node?.varlikKodu || node?.mcpVarlikId || '').trim();
  if (!entityCode) {
    errors.varlikKodu = t(
      'belge_olustur_varlik_secimi_zorunlu',
      'Lütfen oluşturulacak ERP Belgesini veya Kartını seçin.'
    );
  }
  return errors;
};
