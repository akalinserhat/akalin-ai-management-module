/**
 * @akalin/ai_management_module - "Döngü (Loop)" Düğümü Varsayılan Başlangıç Değerleri (loopFlowchartDefaultValue.ts)
 *
 * Başlıca Sorumlulukları:
 * - "Döngü" (LOOP) atomik düğümü için saf (pure) başlangıç değerlerini sağlamak
 * - Senkron (Sync / Sıralı) ve Asenkron (Async / Paralel) iterasyon modlarını standartlaştırmak
 */

import type { AiAkisDugumu } from '../types';
import { DEFAULT_ONCEKI_DUGUM_GIRDISI } from './flowchartOgeAyarDefaultValue';

export const getDefaultLoopNodeTitle = (t?: (key: string, fallback?: string) => string): string => {
  return t ? t('loop_dongu', 'Döngü (Loop)') : 'Döngü (Loop)';
};

export const createDefaultLoopDugumu = (params?: {
  id?: string;
  title?: string;
  existing?: Partial<AiAkisDugumu> | null;
}): AiAkisDugumu => {
  const existing = params?.existing || {};
  return {
    id: existing.id || params?.id || `LOOP_${Date.now().toString(36).slice(-4).toUpperCase()}`,
    tip: 'LOOP',
    baslik: params?.title || existing.baslik || 'Döngü (Loop)',
    aktifMi: existing.aktifMi !== false,
    donguModu: existing.donguModu || 'SENKRON',
    donguKaynagi: existing.donguKaynagi || 'ONCEKI_CIKTI_LISTESI',
    donguDegiskeniAdi: existing.donguDegiskeniAdi || 'item',
    donguMaksimumTekrar: existing.donguMaksimumTekrar ?? 50,
    donguEsZamanliGorevSayisi: existing.donguEsZamanliGorevSayisi ?? 3,
    donguHataDavranisi: existing.donguHataDavranisi || 'DURDUR',
    donguGirisDugumId: existing.donguGirisDugumId || '',
    donguBirlestirmeModu: existing.donguBirlestirmeModu || 'DIZI',
    prompt: existing.prompt || '',
    aracKodu: '',
    uiAksiyonu: 'YOK',
    hedefRota: '',
    kayitBekle: false,
    kayitSonrasiTeyitEt: false,
    pozisyonX: existing.pozisyonX,
    pozisyonY: existing.pozisyonY,
    sonrakiDugumId: existing.sonrakiDugumId || '',
    oncekiDugumGirdisi: existing.oncekiDugumGirdisi || { ...DEFAULT_ONCEKI_DUGUM_GIRDISI }
  };
};
