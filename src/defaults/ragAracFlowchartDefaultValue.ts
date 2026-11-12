/**
 * @akalin/ai_management_module - RAG Sorgu Aracı Varsayılan Başlangıç Değerleri (ragAracFlowchartDefaultValue.ts)
 *
 * Başlıca Sorumlulukları:
 * - AI İşlemi (AI_ISLEM) düğümüne bağlanabilen "RAG Sorgu Aracı" (RAG_ARAC) alt düğümü için saf (pure) başlangıç değerlerini sunmak
 * - Hem diyagram tuvali (AiAjanHizliIstekForm), hem AI İşlemi ayarları, hem de RagAracFlowchartOgeAyarPage için tek doğruluk kaynağı (Single Source of Truth) sağlamak
 * - Form Default Values & Initial State Architecture kurallarına %100 uyumlu çalışmak
 */

import type {
  AiBagliAracDugumu,
  AiRagAracAyarlari,
  RagAramaKapsami,
  RagAramaStratejisi
} from '../types';

export const RAG_ARAC_MCP_TOOL_CODE = 'erp_rag_search';

export const DEFAULT_RAG_ARAC_AYARLARI: AiRagAracAyarlari = {
  aramaKapsami: 'AKTIF_BULUT_DOSYASI',
  belgeTuruKlasoru: 'BshFiyatFarki',
  aramaStratejisi: 'HIBRIT_VEKTOR_KELIME',
  varsayilanBolumFiltresi: '',
  topK: 10,
  minBenzerlikSkoru: 0.2,
  tabloOncelikliMi: true,
  sayfaVeBolumKaynakGoster: true
};

/**
 * Ham JSON verisinden gelen RAG ayarlarını güvenli varsayılanlarla normalize eder.
 */
export const normalizeRagAracAyarlari = (
  raw?: Partial<AiRagAracAyarlari> | null
): AiRagAracAyarlari => {
  const validKapsam: RagAramaKapsami =
    raw?.aramaKapsami === 'BELGE_KLASORU' ||
    raw?.aramaKapsami === 'TUM_FIRMA_BELGELERI' ||
    raw?.aramaKapsami === 'AKTIF_BULUT_DOSYASI'
      ? raw.aramaKapsami
      : DEFAULT_RAG_ARAC_AYARLARI.aramaKapsami;

  const validStrateji: RagAramaStratejisi =
    raw?.aramaStratejisi === 'BOLUM_VE_TABLO_ODAKLI' ||
    raw?.aramaStratejisi === 'TAM_DOKUMAN_PARCALARI' ||
    raw?.aramaStratejisi === 'HIBRIT_VEKTOR_KELIME'
      ? raw.aramaStratejisi
      : DEFAULT_RAG_ARAC_AYARLARI.aramaStratejisi;

  const parsedTopK = Number(raw?.topK);
  const safeTopK = Number.isFinite(parsedTopK)
    ? Math.max(1, Math.min(25, Math.round(parsedTopK)))
    : DEFAULT_RAG_ARAC_AYARLARI.topK;

  const parsedScore = Number(raw?.minBenzerlikSkoru);
  const safeScore = Number.isFinite(parsedScore)
    ? Math.max(0, Math.min(0.95, Math.round(parsedScore * 100) / 100))
    : DEFAULT_RAG_ARAC_AYARLARI.minBenzerlikSkoru;

  return {
    aramaKapsami: validKapsam,
    belgeTuruKlasoru: (raw?.belgeTuruKlasoru || DEFAULT_RAG_ARAC_AYARLARI.belgeTuruKlasoru || '').trim(),
    aramaStratejisi: validStrateji,
    varsayilanBolumFiltresi: (raw?.varsayilanBolumFiltresi || '').trim(),
    topK: safeTopK,
    minBenzerlikSkoru: safeScore,
    tabloOncelikliMi: raw?.tabloOncelikliMi !== false,
    sayfaVeBolumKaynakGoster: raw?.sayfaVeBolumKaynakGoster !== false
  };
};

/**
 * Bir AI_ISLEM düğümüne bağlanacak varsayılan RAG Sorgu Aracı nesnesini üretir.
 */
export const createDefaultRagAracDugumu = (params: {
  parentNodeId: string;
  title: string;
  existing?: Partial<AiBagliAracDugumu> | null;
}): AiBagliAracDugumu => {
  const existing = params.existing || {};
  return {
    id: existing.id || `RAG_ARAC_${Date.now()}`,
    parentNodeId: existing.parentNodeId || params.parentNodeId,
    tip: 'RAG_ARAC',
    baslik: params.title,
    aracKodu: RAG_ARAC_MCP_TOOL_CODE,
    aktifMi: existing.aktifMi !== false,
    aciklama: existing.aciklama || '',
    ragAyarlari: normalizeRagAracAyarlari(existing.ragAyarlari)
  };
};

/**
 * Flowchart tuvalindeki alt düğüm kartında ve özet satırlarında gösterilecek okunabilir özet metni üretir.
 */
export const buildRagAracSummaryText = (
  tool: Partial<AiBagliAracDugumu> | null | undefined,
  t: (key: string, fallback?: string, opts?: Record<string, any>) => string
): string => {
  const cfg = normalizeRagAracAyarlari(tool?.ragAyarlari);
  const scopeLabel =
    cfg.aramaKapsami === 'BELGE_KLASORU'
      ? `${t('rag_kapsam_kisa_klasor', 'Klasör')}: ${cfg.belgeTuruKlasoru || 'Genel'}`
      : cfg.aramaKapsami === 'TUM_FIRMA_BELGELERI'
        ? t('rag_kapsam_kisa_tum_firma', 'Tüm Firma Belgeleri')
        : t('rag_kapsam_kisa_aktif_dosya', 'Aktif Bulut Dosyası');

  const parts = [scopeLabel, `Top-K: ${cfg.topK}`];
  if (cfg.varsayilanBolumFiltresi) {
    parts.push(`${t('rag_bolum_kisa', 'Bölüm')}: ${cfg.varsayilanBolumFiltresi}`);
  }
  return parts.join(' • ');
};
