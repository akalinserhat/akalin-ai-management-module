/**
 * @akalin/ai_management_module - "Karar / Onay" Düğümü Doğrulama Kuralları (kararOnayFlowchartValidation.ts)
 *
 * Başlıca Sorumlulukları:
 * - Zero Inline Form Validation kuralına uygun olarak KARAR_ONAY düğümü alan doğrulamalarını modül seviyesinde yürütmek
 */

import type { AiAkisDugumu } from '../types';

export interface KararOnayValidationErrors {
  kullaniciMesaji?: string;
}

export const validateKararOnayFlowchartNode = (
  node: Partial<AiAkisDugumu> | null | undefined,
  t: (key: string, fallback?: string) => string
): KararOnayValidationErrors => {
  const errors: KararOnayValidationErrors = {};
  const msg = (node?.kullaniciMesaji || node?.prompt || '').trim();
  if (!msg) {
    errors.kullaniciMesaji = t(
      'karar_onay_mesaji_zorunlu',
      'Lütfen kullanıcıya sorulacak onay mesajını veya karar kriterini girin.'
    );
  }
  return errors;
};
