/**
 * @akalin/ai_management_module - Flowchart Öğe Ayar Sayfaları Varsayılan Başlangıç Değerleri (flowchartOgeAyarDefaultValue.ts)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage ve ondan türeyen düğüm ayar sayfalarının (Başla, Form Aç, AI İşlemi vb.)
 *   ilk açılışta alacağı varsayılan sekme ("ayarlar") ve girdi ayarlarını (oncekiDugumGirdisi) modül seviyesinde tanımlamak
 * - Form Default Values & Initial State Architecture kurallarına %100 uyumlu saf (pure) başlangıç fonksiyonları sunmak
 */

import type { AiOncekiDugumGirdiAyarlari } from '../types';

export type FlowchartOgeAyarTabId = 'onceki_dugum' | 'ayarlar' | (string & {});

/**
 * BaseAiAjanFlowchartOgeAyarPage'den türeyen sayfalar ilk açıldığında odaklanılacak varsayılan sekme kimliği.
 * Sekme çubuğunda "Önceki Düğüm" ilk sırada yer alsa da sayfa ilk açıldığında "Ayarlar" sekmesi aktif olarak açılır.
 */
export const DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB: FlowchartOgeAyarTabId = 'ayarlar';

/**
 * Önceki düğüm girdi ayarları için varsayılan değerler.
 */
export const DEFAULT_ONCEKI_DUGUM_GIRDISI: Required<AiOncekiDugumGirdiAyarlari> = {
  aktifMi: true,
  kaynakDugumId: 'OTOMATIK_ONCEKI',
  belgeleriAktar: true,
  formVerileriniAktar: true,
  aiCiktisiniAktar: true,
  seciliDegiskenler: [],
  bagliBelgeEkleri: []
};

export interface FlowchartOgeAyarInitialState {
  activeTabId: string | number;
  schemaViewMode: 'json_schema' | 'example_payload';
  showNestedInSettings: boolean;
  oncekiDugumGirdisi: Required<AiOncekiDugumGirdiAyarlari>;
}

/**
 * Sayfa ilk açıldığında aktif olması gereken sekmeyi çözümler.
 * Eğer `location.state?.activeTabId` veya kontrollü bir başlangıç sekmesi verilmişse onu korur,
 * aksi halde her zaman `"ayarlar"` sekmesine odaklanır.
 */
export const getFlowchartOgeAyarDefaultActiveTab = (
  preferredTabId?: string | number | null
): string | number => {
  if (preferredTabId !== undefined && preferredTabId !== null && String(preferredTabId).trim() !== '') {
    return preferredTabId;
  }
  return DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB;
};

/**
 * BaseAiAjanFlowchartOgeAyarPage ve türeyen sayfalar için varsayılan başlangıç durumunu döndürür.
 */
export const getFlowchartOgeAyarDefaultValues = (options?: {
  activeTabId?: string | number | null;
  oncekiDugumGirdisi?: Partial<AiOncekiDugumGirdiAyarlari> | null;
}): FlowchartOgeAyarInitialState => {
  const rawGirdi = options?.oncekiDugumGirdisi || {};
  return {
    activeTabId: getFlowchartOgeAyarDefaultActiveTab(options?.activeTabId),
    schemaViewMode: 'json_schema',
    showNestedInSettings: false,
    oncekiDugumGirdisi: {
      aktifMi: rawGirdi.aktifMi !== false,
      kaynakDugumId: rawGirdi.kaynakDugumId || DEFAULT_ONCEKI_DUGUM_GIRDISI.kaynakDugumId,
      belgeleriAktar: rawGirdi.belgeleriAktar !== false,
      formVerileriniAktar: rawGirdi.formVerileriniAktar !== false,
      aiCiktisiniAktar: rawGirdi.aiCiktisiniAktar !== false,
      seciliDegiskenler: Array.isArray(rawGirdi.seciliDegiskenler) ? rawGirdi.seciliDegiskenler : [],
      bagliBelgeEkleri: Array.isArray(rawGirdi.bagliBelgeEkleri) ? rawGirdi.bagliBelgeEkleri : []
    }
  };
};
