/**
 * @akalin/ai_management_module - "Döngü (Loop)" Düğümü Doğrulama Kuralları (loopFlowchartValidation.ts)
 *
 * Başlıca Sorumlulukları:
 * - Zero Inline Form Validation kuralına uygun olarak LOOP düğümü alan doğrulamalarını modül seviyesinde yürütmek
 */

import type { AiAkisDugumu } from '../types';

export interface LoopValidationErrors {
  [key: string]: string | undefined;
  donguDegiskeniAdi?: string;
  donguMaksimumTekrar?: string;
  donguEsZamanliGorevSayisi?: string;
}

export const validateLoopFlowchartNode = (
  node: Partial<AiAkisDugumu> | null | undefined,
  t: (key: string, fallback?: string) => string
): LoopValidationErrors => {
  const errors: LoopValidationErrors = {};

  const varName = (node?.donguDegiskeniAdi || '').trim();
  if (!varName) {
    errors.donguDegiskeniAdi = t(
      'dongu_degiskeni_zorunlu',
      'İterasyon değişkeni adı zorunludur (örn: item, sayfa).'
    );
  }

  if (node?.donguMaksimumTekrar !== undefined && (node.donguMaksimumTekrar < 1 || node.donguMaksimumTekrar > 1000)) {
    errors.donguMaksimumTekrar = t(
      'dongu_maksimum_tekrar_gecersiz',
      'Maksimum tekrar sayısı 1 ile 1000 arasında olmalıdır.'
    );
  }

  if (node?.donguModu === 'ASENKRON') {
    if (node?.donguEsZamanliGorevSayisi !== undefined && (node.donguEsZamanliGorevSayisi < 1 || node.donguEsZamanliGorevSayisi > 20)) {
      errors.donguEsZamanliGorevSayisi = t(
        'dongu_es_zamanli_gorev_gecersiz',
        'Eşzamanlı görev sayısı 1 ile 20 arasında olmalıdır.'
      );
    }
  }

  return errors;
};
