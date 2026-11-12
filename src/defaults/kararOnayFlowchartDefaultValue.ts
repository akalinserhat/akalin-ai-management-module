/**
 * @akalin/ai_management_module - "Karar / Onay" Düğümü Varsayılan Başlangıç Değerleri (kararOnayFlowchartDefaultValue.ts)
 *
 * Başlıca Sorumlulukları:
 * - "Karar / Onay" (KARAR_ONAY) atomik düğümü için saf (pure) başlangıç değerlerini sağlamak
 * - Tek Sorumluluk ilkesi gereği yalnızca kullanıcı onayı veya koşul kontrolü yaparak akışı Evet / Hayır sağ çıkış portlarına yönlendirmek
 */

import type { AiAkisDugumu } from '../types';
import { DEFAULT_ONCEKI_DUGUM_GIRDISI } from './flowchartOgeAyarDefaultValue';

export const KARAR_ONAY_MCP_TOOL_CODE = 'erp_request_confirmation';

export const createDefaultKararOnayDugumu = (params?: {
  id?: string;
  title?: string;
  existing?: Partial<AiAkisDugumu> | null;
}): AiAkisDugumu => {
  const existing = params?.existing || {};
  return {
    id: existing.id || params?.id || `KARAR_ONAY_${Date.now()}`,
    tip: 'KARAR_ONAY',
    baslik: params?.title || existing.baslik || 'Karar / Onay',
    aktifMi: existing.aktifMi !== false,
    aracKodu: KARAR_ONAY_MCP_TOOL_CODE,
    uiAksiyonu: 'YOK',
    hedefRota: '',
    kullaniciMesaji: existing.kullaniciMesaji || '',
    dugmeBasligi: existing.dugmeBasligi || '',
    prompt: existing.prompt || '',
    evetDugumId: existing.evetDugumId || '',
    hayirDugumId: existing.hayirDugumId || '',
    pozisyonX: existing.pozisyonX,
    pozisyonY: existing.pozisyonY,
    oncekiDugumGirdisi: existing.oncekiDugumGirdisi || { ...DEFAULT_ONCEKI_DUGUM_GIRDISI }
  };
};
