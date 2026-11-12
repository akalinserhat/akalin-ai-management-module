/**
 * @akalin/ai_management_module - "AI İşlemi" Düğümü Ayar Sayfası (AiIslemFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "AI İşlemi" (AI_ISLEM - Dikdörtgen Süreç Kutusu) düğümünün ayarlarını yönetmek
 * - BaseAiAjanFlowchartOgeAyarPage üzerindeki n8n tarzı "Önceki Düğümden Gelen Bilgi ve Belgeler" girdi bağlamı ile önceki adımlardan gelen belge ve verileri işlemek
 * - Bu adımda LLM'e gönderilecek işlem yönergesini (Prompt) ve işlem sonrası davranış seçeneklerini yapılandırmak
 * - Sabit Düğüm Başlığı ("AI İşlemi"), Zero Bottom Button, Zero Inline CSS ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Cpu,
  Terminal,
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck,
  Wrench,
  Search,
  Plus,
  SlidersHorizontal,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseButton,
  BaseSwitch
} from '@akalin/ui';
import type { AiBagliAracDugumu } from '../types';
import {
  createDefaultRagAracDugumu,
  buildRagAracSummaryText
} from '../defaults/ragAracFlowchartDefaultValue';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';

export interface AiIslemFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const AiIslemFlowchartOgeAyarPage: React.FC<AiIslemFlowchartOgeAyarPageProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
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

  const [agentData, setAgentData] = useState<any>(incomingAgentData || null);
  const [istekData, setIstekData] = useState<any>(incomingIstekData || null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const defaultNodeTitle = t('ai_islem', 'AI İşlemi');

  const [formData, setFormData] = useState<any>(() => {
    const baseNode = incomingNodeFromState || {};
    return {
      id: baseNode.id || effectiveOgeId || `adim_${Date.now()}`,
      tip: 'AI_ISLEM',
      baslik: defaultNodeTitle,
      prompt: baseNode.prompt || '',
      aracKodu: baseNode.aracKodu || '',
      uiAksiyonu: 'YOK',
      hedefRota: baseNode.hedefRota || '',
      bagliAraclar: Array.isArray(baseNode.bagliAraclar) ? baseNode.bagliAraclar : [],
      oncekiDugumGirdisi: baseNode.oncekiDugumGirdisi || {
        aktifMi: true,
        kaynakDugumId: 'OTOMATIK_ONCEKI',
        belgeleriAktar: true,
        formVerileriniAktar: true,
        aiCiktisiniAktar: true,
        seciliDegiskenler: []
      },
      kayitBekle: baseNode.kayitBekle !== false,
      kayitSonrasiTeyitEt: baseNode.kayitSonrasiTeyitEt !== false
    };
  });

  // Ajan veya İstek verisi doğrudan URL ile açıldıysa API'den yükle
  useEffect(() => {
    if (!agentData && effectiveAgentId) {
      axios.get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then((res) => {
          if (res.data) {
            setAgentData(res.data);
            if (effectiveIstekId && Array.isArray(res.data.hizliIstekler)) {
              const foundIstek = res.data.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
              if (foundIstek) {
                setIstekData(foundIstek);
                if (!incomingNodeFromState && effectiveOgeId && Array.isArray(foundIstek.akisDugumleri)) {
                  const foundNode = foundIstek.akisDugumleri.find((n: any) => n.id === effectiveOgeId);
                  if (foundNode) {
                    setFormData({
                      id: foundNode.id,
                      tip: 'AI_ISLEM',
                      baslik: defaultNodeTitle,
                      prompt: foundNode.prompt || '',
                      aracKodu: foundNode.aracKodu || '',
                      uiAksiyonu: 'YOK',
                      hedefRota: foundNode.hedefRota || '',
                      bagliAraclar: Array.isArray(foundNode.bagliAraclar) ? foundNode.bagliAraclar : [],
                      oncekiDugumGirdisi: foundNode.oncekiDugumGirdisi || {
                        aktifMi: true,
                        kaynakDugumId: 'OTOMATIK_ONCEKI',
                        belgeleriAktar: true,
                        formVerileriniAktar: true,
                        aiCiktisiniAktar: true,
                        seciliDegiskenler: []
                      },
                      kayitBekle: foundNode.kayitBekle !== false,
                      kayitSonrasiTeyitEt: foundNode.kayitSonrasiTeyitEt !== false
                    });
                  }
                }
              }
            }
          }
        })
        .catch(() => { });
    }
  }, [agentData, effectiveAgentId, effectiveIstekId, effectiveOgeId, incomingNodeFromState, defaultNodeTitle]);

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

  const buildUpdatedNodePayload = (overrideData?: any) => {
    const rawTools =
      overrideData?.bagliAraclar !== undefined ? overrideData.bagliAraclar : formData.bagliAraclar;
    const merged = {
      ...formData,
      ...(overrideData || {}),
      id: formData.id || effectiveOgeId || `adim_${Date.now()}`,
      tip: 'AI_ISLEM',
      baslik: defaultNodeTitle,
      aktifMi: (overrideData?.aktifMi !== undefined ? overrideData.aktifMi : formData.aktifMi) !== false,
      uiAksiyonu: 'YOK',
      bagliAraclar: Array.isArray(rawTools) ? rawTools : [],
      kayitBekle: false,
      kayitSonrasiTeyitEt:
        (overrideData?.kayitSonrasiTeyitEt !== undefined
          ? overrideData.kayitSonrasiTeyitEt
          : formData.kayitSonrasiTeyitEt) !== false
    };
    return merged;
  };

  const attachedTools: AiBagliAracDugumu[] = useMemo(
    () => (Array.isArray(formData.bagliAraclar) ? formData.bagliAraclar : []),
    [formData.bagliAraclar]
  );

  const buildUpdatedIstekSnapshot = (nextTools: AiBagliAracDugumu[]) => {
    const currentIstek = istekData || incomingIstekData;
    const existingNodes = Array.isArray(currentIstek?.akisDugumleri)
      ? [...currentIstek.akisDugumleri]
      : [];
    const activeNode = buildUpdatedNodePayload({ bagliAraclar: nextTools });
    const nodeIdx = existingNodes.findIndex((x: any) => x.id === activeNode.id);
    if (nodeIdx !== -1) {
      existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...activeNode };
    } else {
      existingNodes.push(activeNode);
    }
    const updatedIstek = {
      ...(currentIstek || { id: effectiveIstekId || `req_${Date.now()}` }),
      akisDugumleri: existingNodes
    };
    if (
      typeof window !== 'undefined' &&
      typeof sessionStorage !== 'undefined' &&
      effectiveAgentId &&
      updatedIstek?.id
    ) {
      try {
        sessionStorage.setItem(
          `webakus_flow_draft_${effectiveAgentId}_${updatedIstek.id}`,
          JSON.stringify(updatedIstek)
        );
      } catch {
        // ignore
      }
    }
    return updatedIstek;
  };

  const handleAttachRagTool = () => {
    const existingRag = attachedTools.find((item) => (item.tip || '').toUpperCase() === 'RAG_ARAC');
    if (existingRag) {
      handleOpenAttachedTool(existingRag);
      return;
    }
    const newTool = createDefaultRagAracDugumu({
      parentNodeId: formData.id,
      title: t('rag_sorgu_araci', 'RAG Sorgu Aracı')
    });
    const nextTools = [...attachedTools, newTool];
    setFormData((prev: any) => ({ ...prev, bagliAraclar: nextTools }));
    buildUpdatedIstekSnapshot(nextTools);
    toast.success(
      t('rag_arac_dugume_baglandi', 'RAG Sorgu Aracı bu AI İşlemi düğümüne bağlandı.')
    );
  };

  const handleOpenAttachedTool = (toolItem: AiBagliAracDugumu) => {
    if (!effectiveAgentId || !effectiveIstekId) return;
    const updatedIstek = buildUpdatedIstekSnapshot(attachedTools);
    const targetUrl = `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}/adim/${toolItem.id}`;
    navigate(targetUrl, {
      state: {
        agentData: agentData || incomingAgentData,
        istekData: updatedIstek,
        parentNodeId: formData.id,
        nodeData: {
          ...toolItem,
          tip: toolItem.tip || 'RAG_ARAC',
          parentNodeId: formData.id
        }
      }
    });
  };

  const handleToggleAttachedTool = (toolId: string, checked: boolean) => {
    const nextTools = attachedTools.map((item) =>
      item.id === toolId ? { ...item, aktifMi: checked } : item
    );
    setFormData((prev: any) => ({ ...prev, bagliAraclar: nextTools }));
    buildUpdatedIstekSnapshot(nextTools);
  };

  const handleRemoveAttachedTool = (toolId: string) => {
    const nextTools = attachedTools.filter((item) => item.id !== toolId);
    setFormData((prev: any) => ({ ...prev, bagliAraclar: nextTools }));
    buildUpdatedIstekSnapshot(nextTools);
  };

  const handleBackOrClose = () => {
    if (typeof effectiveBackRoute === 'string') {
      const currentIstek = istekData || incomingIstekData;
      const existingNodes = Array.isArray(currentIstek?.akisDugumleri)
        ? [...currentIstek.akisDugumleri]
        : [];
      const activeNode = buildUpdatedNodePayload();
      const nodeIdx = existingNodes.findIndex((x: any) => x.id === activeNode.id);

      if (nodeIdx !== -1) {
        existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...activeNode };
      } else {
        existingNodes.push(activeNode);
      }

      navigate(effectiveBackRoute, {
        state: {
          agentData: agentData || incomingAgentData,
          hizliIstekItem: currentIstek
            ? {
              ...currentIstek,
              akisDugumleri: existingNodes
            }
            : undefined
        }
      });
    } else {
      navigate(-1);
    }
  };

  const handleSave = async (dataToSave: any) => {
    try {
      setIsSaving(true);
      const payloadNode = buildUpdatedNodePayload(dataToSave);

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
          x.id === effectiveIstekId ||
          (activeIstekRef?.id && x.id === activeIstekRef.id)
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

      const currentReq: any = { ...baseSourceReq };
      const currentNodes = Array.isArray(currentReq.akisDugumleri)
        ? [...currentReq.akisDugumleri]
        : [];
      const nodeIdx = currentNodes.findIndex((x: any) => x.id === payloadNode.id);

      if (nodeIdx !== -1) {
        currentNodes[nodeIdx] = { ...currentNodes[nodeIdx], ...payloadNode };
      } else {
        currentNodes.push(payloadNode);
      }

      currentReq.akisDugumleri = currentNodes;
      if (!currentReq.baslik?.trim() && payloadNode.prompt?.trim()) {
        currentReq.baslik = payloadNode.prompt.trim().split('\n')[0].slice(0, 60).trim();
      }

      const updatedReq: any = currentReq;
      setIstekData(currentReq);
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' && effectiveAgentId && currentReq?.id) {
        try {
          sessionStorage.setItem(`webakus_flow_draft_${effectiveAgentId}_${currentReq.id}`, JSON.stringify(currentReq));
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
        t('ai_islem_ayarlari_kaydedildi', 'AI İşlemi düğümü ayarları başarıyla kaydedildi.')
      );

      if (onSuccess) {
        onSuccess();
      } else if (typeof effectiveBackRoute === 'string') {
        navigate(effectiveBackRoute, {
          state: {
            agentData: agentToUpdate,
            hizliIstekItem: updatedReq || istekData || incomingIstekData
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

  const ajanlarListRoute = baseAgentRoute;
  const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar');

  const agentTitle =
    agentData?.ad ||
    incomingAgentData?.ad ||
    (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const istekTitle =
    istekData?.baslik ||
    incomingIstekData?.baslik ||
    t('gorev_akisi', 'Görev Akışı');
  const nodeTitle = defaultNodeTitle;

  const agentRoute = `${baseAgentRoute}/${effectiveAgentId}`;

  const istekRoute = `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;

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
        label: nodeTitle,
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
      nodeTitle,
      agentData,
      incomingAgentData,
      istekData,
      incomingIstekData,
      navigate
    ]
  );

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="aiIslemFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="AI_ISLEM"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('ai_islem_oge_ayarlari', 'AI İşlemi Düğümü Ayarları')}
      pageTitle={t('ai_islem_oge_ayarlari', 'AI İşlemi Düğümü Ayarları')}
      recordTitle={nodeTitle}
      subTrail={subTrail}
      icon={<Cpu size={24} color="var(--accent-primary)" />}
      subtitleLeft={t(
        'ai_islem_oge_aciklama',
        'Önceki düğümlerden gelen bilgi ve belgeleri analiz etme, sorgulama veya yapay zeka işlemi yürütme yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. BÖLÜM: YAPAY ZEKA İŞLEM YÖNERGESİ (ADIM PROMPTU) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <Terminal size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'ai_islem_yonergesi_ve_prompt',
                    'Yapay Zeka İşlem Yönergesi (Adım Promptu)'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'ai_islem_yonergesi_ve_prompt_aciklama',
                    'Görev akışı bu düğüme ulaştığında LLM modeline gönderilecek talimatı yazın.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <FlowchartPromptMentionInput
              autoFocus
              showAttachButton={true}
              rows={6}
              value={formData.prompt}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, prompt: e.target.value }))
              }
              placeholder={t(
                'ai_islem_prompt_placeholder',
                'Örn: Kampanya bülteni dosyasını analiz et. Bültendeki kampanya başlığını, başlangıç-bitiş tarihlerini ve ürün/fiyat kurallarını çıkararak Kampanya Belgesi taslağını oluştur.'
              )}
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'ai_islem_prompt_ipucu',
                    'İpucu: @ karakteri yazarak önceki düğümdeki verileri ismiyle birlikte yönergeye ekleyebilirsiniz.'
                  )}
                </span>
              </span>
              <span className="basla-ayar-char-count">
                {(formData.prompt || '').length} {t('karakter', 'karakter')}
              </span>
            </div>
          </div>
        </section>

        {/* BAĞLI AI ARAÇ DÜĞÜMLERİ (TOOLS SUB-NODES) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box purple">
                <Wrench size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('bagli_ai_arac_dugumleri_baslik', 'Bağlı AI Araç Düğümleri (MCP Tools)')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'bagli_ai_arac_dugumleri_aciklama',
                    'Bu AI İşlemi adımına RAG Sorgu Aracı bağlayarak bulut PDF ve Excel tabloları üzerinde hedefli vektör/tablo araması yaptırabilirsiniz.'
                  )}
                </p>
              </div>
            </div>
            <div className="ai-islem-tools-header-actions">
              <BaseButton
                variant="outline"
                className="btn-sm"
                icon={<Plus size={14} />}
                onClick={handleAttachRagTool}
                text={
                  attachedTools.some((item) => (item.tip || '').toUpperCase() === 'RAG_ARAC')
                    ? t('rag_arac_ayarlarini_ac', 'RAG Aracı Ayarları')
                    : t('rag_sorgu_araci_bagla', 'RAG Sorgu Aracı Bağla')
                }
              />
            </div>
          </div>

          <div className="basla-ayar-card-body">
            {attachedTools.length === 0 ? (
              <div className="ai-islem-attached-tools-empty">
                <Search size={18} className="ai-islem-attached-tools-empty-icon" />
                <div className="ai-islem-attached-tools-empty-texts">
                  <span className="ai-islem-attached-tools-empty-title">
                    {t(
                      'henuz_bagli_arac_dugumu_yok',
                      'Bu AI İşlemi adımına henüz bir araç alt düğümü bağlanmadı.'
                    )}
                  </span>
                  <span className="ai-islem-attached-tools-empty-desc">
                    {t(
                      'henuz_bagli_arac_dugumu_yok_aciklama',
                      'Akış şeması (Flowchart) üzerindeki "+ Araç Bağla" noktasından veya yukarıdaki düğmeden RAG Sorgu Aracı ekleyebilirsiniz.'
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="ai-islem-attached-tools-list">
                {attachedTools.map((toolItem) => {
                  const summaryLabel = buildRagAracSummaryText(toolItem, t);
                  const isToolActive = toolItem.aktifMi !== false;
                  return (
                    <div
                      key={toolItem.id}
                      className={`ai-islem-attached-tool-row ${isToolActive ? 'is-active' : 'is-disabled'}`}
                    >
                      <div className="ai-islem-attached-tool-main">
                        <div className="ai-islem-attached-tool-icon">
                          <Search size={16} />
                        </div>
                        <div className="ai-islem-attached-tool-info">
                          <div className="ai-islem-attached-tool-title-row">
                            <span className="ai-islem-attached-tool-title">
                              {t('rag_sorgu_araci', 'RAG Sorgu Aracı')}
                            </span>
                            <span className="ai-ajan-identity-badge">
                              {toolItem.aracKodu || 'erp_rag_search'}
                            </span>
                            <span className="rag-arac-summary-pill">{summaryLabel}</span>
                          </div>
                          <p className="ai-islem-attached-tool-desc">
                            {toolItem.aciklama?.trim()
                              ? toolItem.aciklama
                              : t(
                                  'rag_arac_varsayilan_aciklama',
                                  'PostgreSQL webakus_db (rag_document_chunks) üzerinden sayfa, bölüm ve Markdown tablo parçalarını getirir.'
                                )}
                          </p>
                        </div>
                      </div>

                      <div className="ai-islem-attached-tool-controls">
                        <BaseSwitch
                          id={`attachedToolSwitch_${toolItem.id}`}
                          checked={isToolActive}
                          onChange={(e: any) => {
                            const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                            handleToggleAttachedTool(toolItem.id, Boolean(checked));
                          }}
                          label={
                            <span className="text-xs font-semibold">
                              {isToolActive ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
                            </span>
                          }
                        />
                        <BaseButton
                          variant="outline"
                          className="btn-sm"
                          icon={<SlidersHorizontal size={14} />}
                          onClick={() => handleOpenAttachedTool(toolItem)}
                          text={t('ayarlar', 'Ayarlar')}
                        />
                        <BaseButton
                          variant="outline"
                          className="btn-sm"
                          icon={<Trash2 size={14} />}
                          onClick={() => handleRemoveAttachedTool(toolItem.id)}
                          title={t('araci_kaldir', 'Aracı Kaldır')}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* 3. BÖLÜM: SOHBET ÇIKTISI GÖRÜNÜRLÜĞÜ (SAF LLM ANALİZ / SENTEZ) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <ShieldCheck size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'ai_islem_cikti_gorunurlugu_baslik',
                    'Analiz Çıktısı ve Sohbet Ekranı Görünürlüğü'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'ai_islem_cikti_gorunurlugu_aciklama',
                    'Tek Sorumluluk İlkesi: AI İşlemi yalnızca LLM muhakemesi ve bağlı alt araç (RAG) sorgusu yürütür; üretilen yanıtı sağ çıkış portuna iletir.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid">
              <div
                className={`form-ac-wizard-option-box ${formData.kayitSonrasiTeyitEt !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Sparkles size={16} />
                    <span>
                      {t(
                        'ai_islem_analiz_ciktisini_sohbette_goster',
                        'Analiz Çıktısını Sohbet Ekranında Göster'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'ai_islem_analiz_ciktisini_sohbette_goster_aciklama',
                      'Aktif olduğunda LLM modelinin ürettiği analiz/sentez metni kullanıcı sohbetinde de gösterilir; pasif olduğunda yalnızca sağ çıkış portundaki sonraki düğüme (örn: Hafıza) aktarılır.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="aiIslemKayitSonrasiTeyitSwitch"
                  checked={formData.kayitSonrasiTeyitEt !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({
                      ...prev,
                      kayitBekle: false,
                      kayitSonrasiTeyitEt: checked
                    }));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {formData.kayitSonrasiTeyitEt !== false
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default AiIslemFlowchartOgeAyarPage;
