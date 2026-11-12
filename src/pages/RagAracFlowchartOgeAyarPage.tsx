/**
 * @akalin/ai_management_module - "RAG Sorgu Aracı" Alt Düğümü Ayar Sayfası (RagAracFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "AI İşlemi" (AI_ISLEM) düğümüne bağlanan
 *   "RAG Sorgu Aracı" (RAG_ARAC / erp_rag_search) alt düğümünün arama kapsamı, strateji, Top-K ve filtre ayarlarını yönetmek
 * - PostgreSQL webakus_db veritabanındaki rag_cloud_documents ve rag_document_chunks tabloları üzerinde
 *   aktif bulut dosyası, klasör kategorisi veya tüm indeks kapsamında semantik + tablo odaklı sorgu yürütmek
 * - Sabit Düğüm Başlığı ("RAG Sorgu Aracı"), Zero Bottom Button, Zero Inline CSS, Sıfır Native HTML Input
 *   ve %100 i18n kurallarına eksiksiz uymak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Database,
  SlidersHorizontal,
  Terminal,
  Info,
  Layers,
  Table2,
  Cpu
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BasitInput,
  BaseDropdownSecici,
  BaseNumericInput,
  TamsayiInput,
  BaseSwitch,
  FieldError,
  type DropdownOption
} from '@akalin/ui';
import type {
  AiAkisDugumu,
  AiBagliAracDugumu,
  AiRagAracAyarlari,
  RagAramaKapsami,
  RagAramaStratejisi
} from '../types';
import {
  RAG_ARAC_MCP_TOOL_CODE,
  normalizeRagAracAyarlari,
  buildRagAracSummaryText
} from '../defaults/ragAracFlowchartDefaultValue';
import {
  validateRagAracField,
  validateRagAracForm
} from '../validators/ragAracFlowchartValidation';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';

export interface RagAracFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  parentNodeId?: string;
  onSuccess?: () => void;
}

export const RagAracFlowchartOgeAyarPage: React.FC<RagAracFlowchartOgeAyarPageProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
  parentNodeId: propParentNodeId,
  initialNodeData,
  onSuccess,
  backRoute
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();

  const pathAgentIdMatch = location.pathname.match(/(?:AiAjanlar|ai-ajanlar|agents)\/(\d+)/i);
  const pathIstekIdMatch = location.pathname.match(/hizli-istek\/([^/?#]+)/i);
  const pathOgeIdMatch = location.pathname.match(/adim\/([^/?#]+)/i);
  const effectiveAgentId = propAgentId || params.id || (pathAgentIdMatch ? pathAgentIdMatch[1] : undefined);
  const effectiveIstekId = propIstekId || params.istekId || (pathIstekIdMatch ? pathIstekIdMatch[1] : undefined);
  const effectiveOgeId = propNodeId || params.ogeId || (pathOgeIdMatch ? pathOgeIdMatch[1] : undefined);

  const incomingAgentData = location.state?.agentData;
  const incomingIstekData = location.state?.istekData;
  const incomingNodeFromState = location.state?.nodeData || initialNodeData;
  const incomingParentNodeId: string | undefined =
    propParentNodeId || location.state?.parentNodeId || incomingNodeFromState?.parentNodeId;

  const [agentData, setAgentData] = useState<any>(incomingAgentData || null);
  const [istekData, setIstekData] = useState<any>(incomingIstekData || null);
  const [resolvedParentNodeId, setResolvedParentNodeId] = useState<string | undefined>(incomingParentNodeId);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const defaultNodeTitle = t('rag_sorgu_araci', 'RAG Sorgu Aracı');

  const [formData, setFormData] = useState<any>(() => {
    const baseTool = incomingNodeFromState || {};
    const ragAyarlari = normalizeRagAracAyarlari(baseTool.ragAyarlari);
    return {
      id: baseTool.id || effectiveOgeId || `RAG_ARAC_${Date.now()}`,
      parentNodeId: baseTool.parentNodeId || incomingParentNodeId || '',
      tip: 'RAG_ARAC',
      baslik: defaultNodeTitle,
      aracKodu: RAG_ARAC_MCP_TOOL_CODE,
      aktifMi: baseTool.aktifMi !== false,
      aciklama: baseTool.aciklama || baseTool.prompt || '',
      ragAyarlari,
      oncekiDugumGirdisi: baseTool.oncekiDugumGirdisi || {
        aktifMi: true,
        kaynakDugumId: 'OTOMATIK_ONCEKI',
        belgeleriAktar: true,
        formVerileriniAktar: true,
        aiCiktisiniAktar: true,
        seciliDegiskenler: []
      }
    };
  });

  // Doğrudan URL ile açıldıysa Ajan, Görev Akışı ve Ebeveyn AI_ISLEM düğümünü çözümle
  useEffect(() => {
    const locateToolInIstek = (istekObj: any) => {
      if (!istekObj || !Array.isArray(istekObj.akisDugumleri)) return;
      for (const stepNode of istekObj.akisDugumleri as AiAkisDugumu[]) {
        if (Array.isArray(stepNode.bagliAraclar)) {
          const foundTool = stepNode.bagliAraclar.find(
            (tool) => tool && (tool.id === effectiveOgeId || tool.id === formData.id)
          );
          if (foundTool) {
            setResolvedParentNodeId(stepNode.id);
            if (!incomingNodeFromState) {
              const normalizedRag = normalizeRagAracAyarlari(foundTool.ragAyarlari);
              setFormData((prev: any) => ({
                ...prev,
                id: foundTool.id,
                parentNodeId: stepNode.id,
                tip: 'RAG_ARAC',
                baslik: defaultNodeTitle,
                aracKodu: RAG_ARAC_MCP_TOOL_CODE,
                aktifMi: foundTool.aktifMi !== false,
                aciklama: foundTool.aciklama || '',
                ragAyarlari: normalizedRag
              }));
            }
            return;
          }
        }
      }
    };

    if (istekData && !resolvedParentNodeId) {
      locateToolInIstek(istekData);
    }

    if (!agentData && effectiveAgentId) {
      axios
        .get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then((res) => {
          if (res.data) {
            setAgentData(res.data);
            if (effectiveIstekId && Array.isArray(res.data.hizliIstekler)) {
              const foundIstek = res.data.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
              if (foundIstek) {
                setIstekData(foundIstek);
                locateToolInIstek(foundIstek);
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [
    agentData,
    istekData,
    effectiveAgentId,
    effectiveIstekId,
    effectiveOgeId,
    formData.id,
    incomingNodeFromState,
    resolvedParentNodeId,
    defaultNodeTitle
  ]);

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const isUnderSettingsAiAgents = location.pathname.startsWith('/settings/ai/agents');
  const isUnderSettingsAiAjanlar = location.pathname.startsWith('/settings/ai/AiAjanlar');
  const isUnderSettingsAgents = location.pathname.startsWith('/settings/agents');
  const baseAgentRoute = isUnderSettingsAiAgents
    ? '/settings/ai/agents'
    : isUnderSettingsAiAjanlar
      ? '/settings/ai/AiAjanlar'
      : isUnderSettingsAgents
        ? '/settings/agents'
        : isUnderAyarlar
          ? '/ayarlar/YapayZekaAyarlari/AiAjanlar'
          : '/ai-ajanlar';

  const effectiveBackRoute = useMemo(() => {
    if (backRoute) return backRoute;
    if (effectiveAgentId && effectiveIstekId) {
      return `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;
    }
    return -1 as any;
  }, [backRoute, effectiveAgentId, effectiveIstekId, baseAgentRoute]);

  const currentRagSettings: AiRagAracAyarlari = useMemo(
    () => normalizeRagAracAyarlari(formData.ragAyarlari),
    [formData.ragAyarlari]
  );

  const updateRagSetting = <K extends keyof AiRagAracAyarlari>(
    field: K,
    value: AiRagAracAyarlari[K]
  ) => {
    setFormData((prev: any) => {
      const nextRag: AiRagAracAyarlari = {
        ...normalizeRagAracAyarlari(prev.ragAyarlari),
        [field]: value
      };
      const fieldErr = validateRagAracField(field, value, nextRag, t);
      setErrors((prevErr) => ({ ...prevErr, [field]: fieldErr || null }));
      return {
        ...prev,
        ragAyarlari: nextRag
      };
    });
  };

  const buildUpdatedToolPayload = (overrideData?: any): AiBagliAracDugumu => {
    const source = { ...formData, ...(overrideData || {}) };
    const mergedRag = normalizeRagAracAyarlari(source.ragAyarlari);

    return {
      id: source.id || effectiveOgeId || `RAG_ARAC_${Date.now()}`,
      parentNodeId: source.parentNodeId || resolvedParentNodeId || '',
      tip: 'RAG_ARAC',
      baslik: defaultNodeTitle,
      aracKodu: RAG_ARAC_MCP_TOOL_CODE,
      aktifMi: source.aktifMi !== false,
      aciklama: String(source.aciklama || '').trim(),
      ragAyarlari: mergedRag
    };
  };

  const mergeToolIntoNodes = (
    rawNodes: AiAkisDugumu[] | undefined,
    toolPayload: AiBagliAracDugumu
  ): AiAkisDugumu[] => {
    const nodes: AiAkisDugumu[] = Array.isArray(rawNodes)
      ? JSON.parse(JSON.stringify(rawNodes))
      : [];

    let targetParentIdx = nodes.findIndex(
      (n) =>
        n &&
        ((resolvedParentNodeId && n.id === resolvedParentNodeId) ||
          (Array.isArray(n.bagliAraclar) && n.bagliAraclar.some((tItem) => tItem.id === toolPayload.id)))
    );

    if (targetParentIdx === -1) {
      targetParentIdx = nodes.findIndex((n) => n && (n.tip || '').toUpperCase() === 'AI_ISLEM');
    }

    if (targetParentIdx !== -1) {
      const parentNode = nodes[targetParentIdx];
      const existingTools = Array.isArray(parentNode.bagliAraclar)
        ? [...parentNode.bagliAraclar]
        : [];
      const payloadWithParent: AiBagliAracDugumu = {
        ...toolPayload,
        parentNodeId: parentNode.id
      };
      const toolIdx = existingTools.findIndex((x) => x.id === payloadWithParent.id);
      if (toolIdx !== -1) {
        existingTools[toolIdx] = { ...existingTools[toolIdx], ...payloadWithParent };
      } else {
        existingTools.push(payloadWithParent);
      }
      nodes[targetParentIdx] = {
        ...parentNode,
        bagliAraclar: existingTools
      };
    }

    return nodes;
  };

  const handleBackOrClose = () => {
    if (typeof effectiveBackRoute === 'string') {
      const currentIstek = istekData || incomingIstekData;
      const toolPayload = buildUpdatedToolPayload();
      const updatedNodes = mergeToolIntoNodes(currentIstek?.akisDugumleri, toolPayload);

      navigate(effectiveBackRoute, {
        state: {
          agentData: agentData || incomingAgentData,
          hizliIstekItem: currentIstek
            ? {
                ...currentIstek,
                akisDugumleri: updatedNodes
              }
            : undefined
        }
      });
    } else {
      navigate(-1);
    }
  };

  const handleSave = async (dataToSave: any) => {
    const candidateTool = buildUpdatedToolPayload(dataToSave);
    const validation = validateRagAracForm(candidateTool.ragAyarlari || currentRagSettings, t);
    setErrors(validation.errors);

    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors).find(Boolean);
      if (firstErr) {
        toast.error(firstErr);
      }
      return;
    }

    try {
      setIsSaving(true);

      let agentToUpdate = agentData || incomingAgentData;
      if (!agentToUpdate && effectiveAgentId) {
        const res = await axios.get(`/api/AiAjanlar/${effectiveAgentId}`);
        agentToUpdate = res.data;
      }

      const currentRequests = Array.isArray(agentToUpdate?.hizliIstekler)
        ? [...agentToUpdate.hizliIstekler]
        : [];
      const activeIstekRef = istekData || incomingIstekData;
      const reqIdx = currentRequests.findIndex(
        (x: any) =>
          x.id === effectiveIstekId || (activeIstekRef?.id && x.id === activeIstekRef.id)
      );

      const baseSourceReq =
        (reqIdx !== -1 || activeIstekRef
          ? {
              ...(reqIdx !== -1 ? currentRequests[reqIdx] : {}),
              ...(activeIstekRef || {})
            }
          : null) || {
          id:
            activeIstekRef?.id ||
            (effectiveIstekId && effectiveIstekId !== 'yeni'
              ? effectiveIstekId
              : `req_${Date.now()}`),
          baslik: '',
          prompt: '',
          ikon: 'Sparkles',
          uiAksiyonu: 'YOK',
          aktifMi: true,
          akisDugumleri: []
        };

      const currentReq: any = {
        ...baseSourceReq,
        akisDugumleri: mergeToolIntoNodes(baseSourceReq.akisDugumleri, candidateTool)
      };

      setIstekData(currentReq);
      if (
        typeof window !== 'undefined' &&
        typeof sessionStorage !== 'undefined' &&
        effectiveAgentId &&
        currentReq?.id
      ) {
        try {
          sessionStorage.setItem(
            `webakus_flow_draft_${effectiveAgentId}_${currentReq.id}`,
            JSON.stringify(currentReq)
          );
        } catch {
          // ignore
        }
      }

      if (effectiveAgentId && agentToUpdate) {
        if (reqIdx !== -1) {
          currentRequests[reqIdx] = currentReq;
        } else {
          currentRequests.push(currentReq);
        }

        const payload = {
          ...agentToUpdate,
          kapsam: parseInt(agentToUpdate.kapsam, 10) || 1,
          aiSaglayiciId: agentToUpdate.aiSaglayiciId
            ? parseInt(agentToUpdate.aiSaglayiciId, 10)
            : null,
          sicaklik: parseFloat(agentToUpdate.sicaklik) || 0.7,
          maxTokens: parseInt(agentToUpdate.maxTokens, 10) || 2048,
          yanitSenteziModu: parseInt(agentToUpdate.yanitSenteziModu as any, 10) || 0,
          hizliIstekler: currentRequests
        };

        await axios.put(`/api/AiAjanlar/${effectiveAgentId}`, payload);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(`webakus_flow_draft_${effectiveAgentId}_${currentReq.id}`);
          } catch {
            // ignore
          }
          window.dispatchEvent(new CustomEvent('ai-agents-updated'));
        }
      }

      toast.success(
        t('rag_arac_ayarlari_kaydedildi', 'RAG Sorgu Aracı ayarları başarıyla kaydedildi.')
      );

      if (onSuccess) {
        onSuccess();
      } else if (typeof effectiveBackRoute === 'string') {
        navigate(effectiveBackRoute, {
          state: {
            agentData: agentToUpdate,
            hizliIstekItem: currentReq
          }
        });
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.mesaj ||
          err.message ||
          t('kayit_sirasi_hata', 'Kayıt sırasında hata oluştu.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Seçenek Listeleri
  const scopeOptions = useMemo<DropdownOption[]>(
    () => [
      {
        id: 'AKTIF_BULUT_DOSYASI',
        value: 'AKTIF_BULUT_DOSYASI',
        label: t(
          'rag_kapsam_aktif_bulut_dosyasi',
          'Önceki Adımdan / Formdan Gelen Aktif Bulut Dosyası'
        )
      },
      {
        id: 'BELGE_KLASORU',
        value: 'BELGE_KLASORU',
        label: t('rag_kapsam_belge_klasoru', 'Belirli Bulut Klasörü / Belge Türü')
      },
      {
        id: 'TUM_FIRMA_BELGELERI',
        value: 'TUM_FIRMA_BELGELERI',
        label: t('rag_kapsam_tum_firma_belgeleri', 'Tüm Firma Bulut RAG Arşivi (webakus_db)')
      }
    ],
    [t]
  );

  const strategyOptions = useMemo<DropdownOption[]>(
    () => [
      {
        id: 'HIBRIT_VEKTOR_KELIME',
        value: 'HIBRIT_VEKTOR_KELIME',
        label: t('rag_strateji_hibrit', 'Hibrit Arama (pgvector Semantik + Anahtar Kelime)')
      },
      {
        id: 'BOLUM_VE_TABLO_ODAKLI',
        value: 'BOLUM_VE_TABLO_ODAKLI',
        label: t('rag_strateji_tablo_odakli', 'Bölüm & Markdown Tablo Odaklı Sıralı Getirme')
      },
      {
        id: 'TAM_DOKUMAN_PARCALARI',
        value: 'TAM_DOKUMAN_PARCALARI',
        label: t('rag_strateji_tam_parcalar', 'Belgenin Sıralı Parçalarını Getir (Sayfa Sıralı)')
      }
    ],
    [t]
  );

  const ajanlarListRoute = baseAgentRoute;
  const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar');
  const agentTitle =
    agentData?.ad ||
    incomingAgentData?.ad ||
    (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const istekTitle =
    istekData?.baslik || incomingIstekData?.baslik || t('gorev_akisi', 'Görev Akışı');
  const parentAiTitle = t('ai_islem', 'AI İşlemi');
  const agentRoute = `${baseAgentRoute}/${effectiveAgentId}`;
  const istekRoute = `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;
  const parentNodeRoute = resolvedParentNodeId
    ? `${istekRoute}/adim/${resolvedParentNodeId}`
    : istekRoute;

  const subTrail = useMemo(
    () => [
      {
        label: ajanlarListLabel,
        onClick: () => navigate(ajanlarListRoute)
      },
      {
        label: agentTitle,
        onClick: () => navigate(agentRoute, { state: { activeTabId: 'hizliIstekler' } })
      },
      {
        label: istekTitle,
        onClick: () =>
          navigate(istekRoute, {
            state: {
              agentData: agentData || incomingAgentData,
              hizliIstekItem: istekData || incomingIstekData
            }
          })
      },
      {
        label: parentAiTitle,
        onClick: () => {
          const currentIstek = istekData || incomingIstekData;
          const parentNode = Array.isArray(currentIstek?.akisDugumleri)
            ? currentIstek.akisDugumleri.find((n: any) => n.id === resolvedParentNodeId)
            : undefined;
          navigate(parentNodeRoute, {
            state: {
              agentData: agentData || incomingAgentData,
              istekData: currentIstek,
              nodeData: parentNode
            }
          });
        }
      },
      {
        label: defaultNodeTitle,
        active: true
      }
    ],
    [
      ajanlarListLabel,
      ajanlarListRoute,
      agentTitle,
      agentRoute,
      istekTitle,
      istekRoute,
      parentAiTitle,
      parentNodeRoute,
      resolvedParentNodeId,
      defaultNodeTitle,
      agentData,
      incomingAgentData,
      istekData,
      incomingIstekData,
      navigate
    ]
  );

  const summaryPreview = useMemo(
    () => buildRagAracSummaryText({ ragAyarlari: currentRagSettings }, t),
    [currentRagSettings, t]
  );

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="ragAracFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="RAG_ARAC"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('rag_arac_oge_ayarlari', 'RAG Sorgu Aracı Düğümü Ayarları')}
      pageTitle={t('rag_arac_oge_ayarlari', 'RAG Sorgu Aracı Düğümü Ayarları')}
      recordTitle={defaultNodeTitle}
      subTrail={subTrail}
      icon={<Search size={24} color="var(--accent-primary)" />}
      subtitleLeft={t(
        'rag_arac_oge_aciklama',
        'AI İşlemi düğümüne bağlı çalışan PostgreSQL (webakus_db) Bulut Belge & Tablo RAG sorgu aracı yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* EBEVEYN DÜĞÜM & MCP BAĞLANTI ÖZET BANNERI */}
        <div className="rag-arac-connection-banner">
          <div className="rag-arac-connection-left">
            <div className="rag-arac-connection-icon">
              <Cpu size={18} />
            </div>
            <div className="rag-arac-connection-texts">
              <div className="rag-arac-connection-title">
                {t(
                  'rag_arac_baglanti_baslik',
                  'AI İşlemi Düğümüne Bağlı MCP Aracı: erp_rag_search'
                )}
              </div>
              <div className="rag-arac-connection-desc">
                {t(
                  'rag_arac_baglanti_aciklama',
                  'AI İşlemi çalışırken ihtiyaç duyduğu sayfa, kural ve Markdown tablolarını tüm PDF metnini belleğe yüklemek yerine PostgreSQL webakus_db (rag_document_chunks) tablosundan hedefli olarak çeker.'
                )}
              </div>
            </div>
          </div>
          <div className="rag-arac-connection-right">
            <span className="rag-arac-summary-pill">{summaryPreview}</span>
            <BaseSwitch
              id="ragAracAktifSwitch"
              checked={formData.aktifMi !== false}
              onChange={(e: any) => {
                const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                setFormData((prev: any) => ({ ...prev, aktifMi: checked }));
              }}
              label={
                <span className="text-sm font-semibold">
                  {formData.aktifMi !== false ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
                </span>
              }
            />
          </div>
        </div>

        {/* 1. BÖLÜM: RAG ARAMA KAPSAMI VE STRATEJİSİ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <Database size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('rag_arama_kapsami_ve_strateji_baslik', 'RAG Arama Kapsamı ve Getirme Stratejisi')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'rag_arama_kapsami_ve_strateji_aciklama',
                    'Sorgunun hangi bulut belgeleri üzerinde ve hangi vektör/tablo stratejisiyle yürütüleceğini seçin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="ragAramaKapsamiSelect">
                  {t('rag_arama_kapsami_label', 'Arama Kapsamı (Belge Sınırı)')}
                </label>
                <BaseDropdownSecici
                  id="ragAramaKapsamiSelect"
                  options={scopeOptions}
                  value={currentRagSettings.aramaKapsami}
                  onChange={(val) =>
                    updateRagSetting(
                      'aramaKapsami',
                      String(val || 'AKTIF_BULUT_DOSYASI') as RagAramaKapsami
                    )
                  }
                  clearable={false}
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="ragAramaStratejisiSelect">
                  {t('rag_arama_stratejisi_label', 'Arama ve Parça Getirme Stratejisi')}
                </label>
                <BaseDropdownSecici
                  id="ragAramaStratejisiSelect"
                  options={strategyOptions}
                  value={currentRagSettings.aramaStratejisi}
                  onChange={(val) =>
                    updateRagSetting(
                      'aramaStratejisi',
                      String(val || 'HIBRIT_VEKTOR_KELIME') as RagAramaStratejisi
                    )
                  }
                  clearable={false}
                />
              </div>

              {currentRagSettings.aramaKapsami === 'BELGE_KLASORU' && (
                <div className="form-group">
                  <label className="basla-ayar-field-label" htmlFor="ragBelgeKlasoruInput">
                    {t('rag_belge_klasoru_label', 'Bulut Belge Klasörü / Kategori Kodu')}
                  </label>
                  <BasitInput
                    id="ragBelgeKlasoruInput"
                    required
                    value={currentRagSettings.belgeTuruKlasoru || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRagSetting('belgeTuruKlasoru', e.target.value)
                    }
                    placeholder={t(
                      'rag_belge_klasoru_placeholder',
                      'Örn: BshFiyatFarki, KampanyaBelgesi'
                    )}
                  />
                  <FieldError error={errors.belgeTuruKlasoru || undefined} />
                </div>
              )}

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="ragBolumFiltresiInput">
                  {t(
                    'rag_varsayilan_bolum_filtresi_label',
                    'Varsayılan Bölüm / Tablo Başlığı Filtresi (Opsiyonel)'
                  )}
                </label>
                <BasitInput
                  id="ragBolumFiltresiInput"
                  value={currentRagSettings.varsayilanBolumFiltresi || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateRagSetting('varsayilanBolumFiltresi', e.target.value)
                  }
                  placeholder={t(
                    'rag_varsayilan_bolum_filtresi_placeholder',
                    'Örn: Desteklenecek Ürünler ve Tutarları'
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. BÖLÜM: PARÇA LİMİTİ (TOP-K), SKOR EŞİĞİ VE TABLO DAVRANIŞI */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <SlidersHorizontal size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('rag_hassasiyet_ve_tablo_ayarlari', 'Parça Limiti (Top-K), Eşik Skoru ve Tablo Bütünlüğü')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'rag_hassasiyet_ve_tablo_ayarlari_aciklama',
                    'Çok sayfalı PDF ve Excel tablolarında eksik satır kalmaması için getirilecek maksimum parça adedini ve tablo koruma kurallarını belirleyin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="basla-ayar-field-label">
                  {t('rag_top_k_label', 'Getirilecek Maksimum Parça Sayısı (Top-K: 1 - 25)')}
                </label>
                <TamsayiInput
                  value={currentRagSettings.topK}
                  onChange={(e) => updateRagSetting('topK', Number(e.target.value || 10))}
                  placeholder="10"
                />
                <FieldError error={errors.topK || undefined} />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label">
                  {t('rag_min_benzerlik_skoru_label', 'Minimum Benzerlik Skoru Eşiği (0.00 - 0.95)')}
                </label>
                <BaseNumericInput
                  value={currentRagSettings.minBenzerlikSkoru}
                  decimalScale={2}
                  allowNegative={false}
                  onChange={(e) =>
                    updateRagSetting('minBenzerlikSkoru', Number(e.target.value ?? 0.2))
                  }
                  placeholder="0.20"
                />
                <FieldError error={errors.minBenzerlikSkoru || undefined} />
              </div>
            </div>

            <div className="form-ac-wizard-options-grid rag-arac-options-mt">
              <div
                className={`form-ac-wizard-option-box ${currentRagSettings.tabloOncelikliMi !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Table2 size={16} />
                    <span>
                      {t('rag_tablo_oncelikli_baslik', 'Markdown Tablo Bütünlüğünü ve Devam Sayfalarını Koru')}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'rag_tablo_oncelikli_aciklama',
                      'Sayfalara bölünmüş ürün/fiyat listesi tablolarının komşu parçalarını sayfa ve chunk sırasına göre birleştirerek LLM modeline sunar.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="ragTabloOncelikliSwitch"
                  checked={currentRagSettings.tabloOncelikliMi !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    updateRagSetting('tabloOncelikliMi', Boolean(checked));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {currentRagSettings.tabloOncelikliMi !== false
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  }
                />
              </div>

              <div
                className={`form-ac-wizard-option-box ${currentRagSettings.sayfaVeBolumKaynakGoster !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Layers size={16} />
                    <span>
                      {t('rag_kaynak_referansi_baslik', 'Sayfa Numarası ve Bölüm Başlığı Etiketlerini Ekle')}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'rag_kaynak_referansi_aciklama',
                      'Her RAG parçasının başına dosya adı, sayfa numarası, bölüm başlığı ve benzerlik skorunu üst veri olarak ekler.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="ragKaynakReferansiSwitch"
                  checked={currentRagSettings.sayfaVeBolumKaynakGoster !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    updateRagSetting('sayfaVeBolumKaynakGoster', Boolean(checked));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {currentRagSettings.sayfaVeBolumKaynakGoster !== false
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. BÖLÜM: ARACA ÖZEL EK SORGULAMA YÖNERGESİ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box purple">
                <Terminal size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('rag_ek_yonerge_baslik', 'RAG Sorgu Kılavuzu (Opsiyonel Araç Yönergesi)')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'rag_ek_yonerge_aciklama',
                    'AI İşlemi modelinin erp_rag_search aracını hangi sorgu ifadeleriyle veya hangi sırayla çağırması gerektiğini yönlendirmek için ipucu ekleyin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <FlowchartPromptMentionInput
              showAttachButton={false}
              rows={4}
              value={formData.aciklama || ''}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, aciklama: e.target.value }))
              }
              placeholder={t(
                'rag_ek_yonerge_placeholder',
                'Örn: Önce kampanya tarihlerini ve KDV kuralını bulmak için genel uygulama koşullarını sorgula; ardından "Desteklenecek Ürünler ve Tutarları" tablolarını eksiksiz çek.'
              )}
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'rag_ek_yonerge_ipucu',
                    'Bu kılavuz yalnızca ebeveyn AI İşlemi adımının çalışma zamanı araç bağlamına (Runtime Tool Context) enjekte edilir.'
                  )}
                </span>
              </span>
              <span className="basla-ayar-char-count">
                {(formData.aciklama || '').length} {t('karakter', 'karakter')}
              </span>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default RagAracFlowchartOgeAyarPage;
