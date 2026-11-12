/**
 * @akalin/ai_management_module - "Belge Oluştur" Düğümü Varsayılan Başlangıç Değerleri (belgeOlusturFlowchartDefaultValue.ts)
 *
 * Başlıca Sorumlulukları:
 * - "Belge Oluştur" (BELGE_OLUSTUR) atomik düğümü için saf (pure) başlangıç değerlerini sağlamak
 * - Tek Sorumluluk (Single-Responsibility) ilkesi gereği önceki düğümden (Script İşlemi / AI İşlemi) gelen yapısal JSON verisiyle
 *   seçili ERP belgesini/kartını (erp_create_document) oluşturacak ayarları standartlaştırmak
 */

import type { AiAkisDugumu } from '../types';
import { DEFAULT_ONCEKI_DUGUM_GIRDISI } from './flowchartOgeAyarDefaultValue';

export const BELGE_OLUSTUR_MCP_TOOL_CODE = 'erp_create_document';

export const createDefaultBelgeOlusturDugumu = (params?: {
  id?: string;
  title?: string;
  existing?: Partial<AiAkisDugumu> | null;
}): AiAkisDugumu => {
  const existing = params?.existing || {};
  return {
    id: existing.id || params?.id || `BELGE_OLUSTUR_${Date.now()}`,
    tip: 'BELGE_OLUSTUR',
    baslik: params?.title || existing.baslik || 'Belge Oluştur',
    aktifMi: existing.aktifMi !== false,
    aracKodu: BELGE_OLUSTUR_MCP_TOOL_CODE,
    uiAksiyonu: 'YOK',
    hedefRota: existing.hedefRota || '',
    mcpVarlikId: existing.mcpVarlikId || '',
    modulKodu: existing.modulKodu || '',
    modulAdi: existing.modulAdi || '',
    varlikKodu: existing.varlikKodu || 'BshFiyatFarki',
    varlikAdi: existing.varlikAdi || '',
    varlikTuru: existing.varlikTuru || 'belge',
    taslakOlarakOlustur: existing.taslakOlarakOlustur !== false,
    prompt: existing.prompt || '',
    pozisyonX: existing.pozisyonX,
    pozisyonY: existing.pozisyonY,
    sonrakiDugumId: existing.sonrakiDugumId || '',
    oncekiDugumGirdisi: existing.oncekiDugumGirdisi || { ...DEFAULT_ONCEKI_DUGUM_GIRDISI }
  };
};
