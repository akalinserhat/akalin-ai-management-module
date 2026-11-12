/**
 * Webakus AdminUI - Yapay Zeka Ajanı Görev Akışı (Flowchart) & Adım Prompt Sayfası (AiAjanHizliIstekForm)
 *
 * Sorumlulukları ve Standartları:
 * - BaseCardPage bileşeninden türetilerek tüm kart sayfalarıyla %100 mimari tutarlılık sağlamak
 * - Açıldığında tarayıcı URL rotasını senkronize etmek (/ayarlar/YapayZekaAyarlari/AiAjanlar/:id/hizli-istek/:istekId)
 * - Sol panelde @akalin/ui kütüphanesindeki BaseFlowchart ve ondan türeyen FlowchartStartNode,
 *   FlowchartInputNode, FlowchartProcessNode, FlowchartDecisionNode, FlowchartDocumentNode, FlowchartEndNode
 *   bileşenleriyle gerçek görsel akış diyagramı sunmak
 * - Sol taraftaki flowchart bileşenlerine tıklandığında sağ taraftaki Inspector panelinde o adımda
 *   yapılması gereken işlemleri (MCP aracı, ekran aksiyonu, adım promptu, Evet/Hayır dallanması) yapılandırmak
 * - Kaydet (Cmd+S / Ctrl+S) ve Geri Dönüş işlemlerini ana ajan formuyla senkronize etmek
 * - Sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  GitBranch,
  Power,
  Play,
  Monitor,
  Cpu,
  Database,
  Code2,
  Search
} from 'lucide-react';
import {
  BaseCardPage,
  BaseFlowchart,
  BaseSwitch,
  PageLoader,
  useHeaderApi,
  type BaseTabItem,
  type FlowchartStepItem,
  type FlowchartPaletteItem,
  type FlowchartAttachedToolItem
} from '@akalin/ui';
import type { AiAkisDugumu, AiBagliAracDugumu } from '../types';
import {
  createDefaultRagAracDugumu,
  buildRagAracSummaryText
} from '../defaults/ragAracFlowchartDefaultValue';
import {
  UI_ACTION_OPTIONS,
  FLOWCHART_NODE_TYPES
} from './AiAjanForm';
import { DEFAULT_CSV_TO_MCP_SCRIPT } from './ScriptIslemFlowchartOgeAyarPage';

const START_NODE_ID = '__START__';

export interface AiAjanHizliIstekFormProps {
  agentId?: string | number | null;
  istekId?: string | null;
  initialAgentData?: any;
  initialItem?: any;
  onBack?: () => void;
  onClose?: () => void;
  onSuccess?: () => void;
  backRoute?: string;
}

export const AiAjanHizliIstekForm: React.FC<AiAjanHizliIstekFormProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
  initialAgentData,
  initialItem,
  onBack,
  onClose,
  onSuccess,
  backRoute
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string }>();
  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

  // URL'den veya proptan agentId ve istekId çözümle
  const effectiveAgentId = useMemo(() => {
    if (propAgentId) return String(propAgentId);
    if (params.id && !isNaN(Number(params.id))) return params.id;
    const match = location.pathname.match(/(?:AiAjanlar|ai-ajanlar|agents)\/(\d+)/i);
    return match ? match[1] : null;
  }, [propAgentId, params.id, location.pathname]);

  const effectiveIstekId = useMemo(() => {
    if (propIstekId) return propIstekId;
    if (params.istekId) return params.istekId;
    const match = location.pathname.match(/hizli-istek\/([^/?#]+)/i);
    return match ? match[1] : null;
  }, [propIstekId, params.istekId, location.pathname]);

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
  const defaultBackRoute = effectiveAgentId
    ? `${baseAgentRoute}/${effectiveAgentId}`
    : baseAgentRoute;
  const effectiveBackRoute = backRoute || defaultBackRoute;

  const [agentData, setAgentData] = useState<any>(() => {
    if (initialAgentData) return initialAgentData;
    if (location.state?.agentData) return location.state.agentData;
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!agentData && Boolean(effectiveAgentId));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Navigasyon durumundan güncel ajan verisi gelirse güncelle
  useEffect(() => {
    if (location.state?.agentData) {
      setAgentData(location.state.agentData);
    }
  }, [location.state?.agentData]);

  // Ajan verisi yoksa çek
  useEffect(() => {
    if (!agentData && effectiveAgentId) {
      setIsLoading(true);
      axios.get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then(res => {
          if (res.data) setAgentData(res.data);
        })
        .catch(() => {
          toast.error(t('auto_ajan_yukleme_hata', 'Ajan bilgisi yüklenirken hata oluştu.'));
        })
        .finally(() => setIsLoading(false));
    }
  }, [agentData, effectiveAgentId, t]);

  // Düzenlenecek öğeyi bul veya yeni oluştur
  const targetItem = useMemo(() => {
    if (initialItem) return initialItem;
    if (location.state?.hizliIstekItem) return location.state.hizliIstekItem;

    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' && effectiveAgentId && effectiveIstekId && effectiveIstekId !== 'yeni') {
      try {
        const draftRaw = sessionStorage.getItem(`webakus_flow_draft_${effectiveAgentId}_${effectiveIstekId}`);
        if (draftRaw) {
          const parsedDraft = JSON.parse(draftRaw);
          if (parsedDraft && parsedDraft.id === effectiveIstekId) {
            return parsedDraft;
          }
        }
      } catch {
        // ignore sessionStorage error
      }
    }

    if (agentData?.hizliIstekler && Array.isArray(agentData.hizliIstekler)) {
      if (effectiveIstekId && effectiveIstekId !== 'yeni') {
        const found = agentData.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
        if (found) return found;
      }
    }
    return null;
  }, [initialItem, location.state?.hizliIstekItem, agentData, effectiveAgentId, effectiveIstekId]);

  // Akış düğümlerini normalize et: Başta her zaman tek bir BASLA düğümü bulunmasını ve sıralı bağlantıları garanti et
  const normalizeFlowNodes = (
    rawNodes: any[] | undefined,
    fallbackItem?: any
  ): AiAkisDugumu[] => {
    const cloned: AiAkisDugumu[] = Array.isArray(rawNodes)
      ? JSON.parse(JSON.stringify(rawNodes))
      : [];

    const existingBaslaIdx = cloned.findIndex(
      (n) => n && (n.id === 'BASLA' || n.tip === 'BASLA' || n.tip === 'START')
    );

    let baslaNode: AiAkisDugumu;
    const otherNodes: AiAkisDugumu[] = [];

    if (existingBaslaIdx !== -1) {
      baslaNode = {
        ...cloned[existingBaslaIdx],
        id: 'BASLA',
        tip: 'BASLA',
        baslik: t('basla', 'Başla'),
        prompt: cloned[existingBaslaIdx].prompt || fallbackItem?.prompt || '',
        hizliErisimDugmesi:
          cloned[existingBaslaIdx].hizliErisimDugmesi !== undefined
            ? cloned[existingBaslaIdx].hizliErisimDugmesi
            : fallbackItem?.hizliErisimDugmesi !== false,
        dugmeBasligi:
          cloned[existingBaslaIdx].dugmeBasligi !== undefined
            ? cloned[existingBaslaIdx].dugmeBasligi
            : fallbackItem?.dugmeBasligi || ''
      };
      cloned.forEach((n, idx) => {
        if (idx !== existingBaslaIdx && n && n.id !== 'BASLA' && n.tip !== 'BASLA') {
          otherNodes.push(n);
        }
      });
    } else {
      baslaNode = {
        id: 'BASLA',
        tip: 'BASLA',
        baslik: t('basla', 'Başla'),
        prompt: fallbackItem?.prompt || '',
        aracKodu: '',
        uiAksiyonu: fallbackItem?.uiAksiyonu || 'YOK',
        hedefRota: '',
        sonrakiDugumId: '',
        hizliErisimDugmesi: fallbackItem?.hizliErisimDugmesi !== false,
        dugmeBasligi: fallbackItem?.dugmeBasligi || ''
      };
      cloned.forEach((n) => {
        if (n) otherNodes.push(n);
      });
    }

    const result = [baslaNode, ...otherNodes];
    for (let i = 0; i < result.length; i++) {
      const curr = result[i];
      const next = result[i + 1];
      if (curr.tip !== 'KARAR_ONAY') {
        curr.sonrakiDugumId = next ? next.id : '';
      }
    }
    return result;
  };

  const [formState, setFormState] = useState<{
    id: string;
    baslik: string;
    prompt: string;
    ikon: string;
    uiAksiyonu: string;
    aktifMi: boolean;
    hizliErisimDugmesi: boolean;
    dugmeBasligi?: string;
    sira?: number;
    tetiklemeAnahtarlari: string;
    akisDugumleri: AiAkisDugumu[];
  }>(() => {
    if (targetItem) {
      const nodes = normalizeFlowNodes(targetItem.akisDugumleri, targetItem);

      return {
        id: targetItem.id || `req_${Date.now()}`,
        baslik: targetItem.baslik || '',
        prompt: targetItem.prompt || '',
        ikon: targetItem.ikon || 'Sparkles',
        uiAksiyonu: targetItem.uiAksiyonu || 'YOK',
        aktifMi: targetItem.aktifMi !== false,
        hizliErisimDugmesi: targetItem.hizliErisimDugmesi !== false,
        dugmeBasligi: targetItem.dugmeBasligi || '',
        sira: targetItem.sira,
        tetiklemeAnahtarlari: targetItem.tetiklemeAnahtarlari || '',
        akisDugumleri: nodes
      };
    }

    return {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: '',
      prompt: '',
      ikon: 'Sparkles',
      uiAksiyonu: 'YOK',
      aktifMi: true,
      hizliErisimDugmesi: true,
      dugmeBasligi: '',
      tetiklemeAnahtarlari: '',
      akisDugumleri: normalizeFlowNodes([])
    };
  });

  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState<string>(() => {
    return formState.akisDugumleri[0]?.id || START_NODE_ID;
  });
  const [selectedToolId, setSelectedToolId] = useState<string | undefined>(undefined);

  const formStateRef = useRef(formState);
  useEffect(() => {
    formStateRef.current = formState;
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' && effectiveAgentId && formState?.id) {
      try {
        sessionStorage.setItem(`webakus_flow_draft_${effectiveAgentId}_${formState.id}`, JSON.stringify(formState));
      } catch {
        // ignore sessionStorage error
      }
    }
  }, [formState, effectiveAgentId]);

  const handleTitleChange = useCallback((newTitle: string) => {
    formStateRef.current = {
      ...formStateRef.current,
      baslik: newTitle
    };
    setFormState((prev) => ({
      ...prev,
      baslik: newTitle
    }));
  }, []);

  // targetItem sonradan API'den yüklendiğinde formState'i senkronize et
  useEffect(() => {
    if (!location.state?.hizliIstekItem && targetItem && formState.id !== targetItem.id) {
      const nodes = normalizeFlowNodes(targetItem.akisDugumleri, targetItem);

      setFormState({
        id: targetItem.id || `req_${Date.now()}`,
        baslik: targetItem.baslik || '',
        prompt: targetItem.prompt || '',
        ikon: targetItem.ikon || 'Sparkles',
        uiAksiyonu: targetItem.uiAksiyonu || 'YOK',
        aktifMi: targetItem.aktifMi !== false,
        hizliErisimDugmesi: targetItem.hizliErisimDugmesi !== false,
        dugmeBasligi: targetItem.dugmeBasligi || '',
        sira: targetItem.sira,
        tetiklemeAnahtarlari: targetItem.tetiklemeAnahtarlari || '',
        akisDugumleri: nodes
      });
      setSelectedFlowNodeId(nodes[0]?.id || START_NODE_ID);
    }
  }, [targetItem, location.state?.hizliIstekItem, formState.id, t]);

  // location.state'ten doğrudan güncel istek öğesi geldiyse (alt ayar sayfasından dönüş)
  useEffect(() => {
    if (location.state?.hizliIstekItem) {
      const item = location.state.hizliIstekItem;
      const nodes = normalizeFlowNodes(item.akisDugumleri, item);
      const baslaNode = nodes.find(n => n.id === 'BASLA' || n.tip === 'BASLA');
      const resolvedBaslik =
        item.baslik?.trim() ||
        baslaNode?.dugmeBasligi?.trim() ||
        item.dugmeBasligi?.trim() ||
        '';

      setFormState({
        id: item.id || `req_${Date.now()}`,
        baslik: resolvedBaslik,
        prompt: item.prompt || baslaNode?.prompt || '',
        ikon: item.ikon || 'Sparkles',
        uiAksiyonu: item.uiAksiyonu || 'YOK',
        aktifMi: item.aktifMi !== false,
        hizliErisimDugmesi: item.hizliErisimDugmesi !== false,
        dugmeBasligi: item.dugmeBasligi || baslaNode?.dugmeBasligi || '',
        sira: item.sira,
        tetiklemeAnahtarlari: item.tetiklemeAnahtarlari || '',
        akisDugumleri: nodes
      });
      setSelectedFlowNodeId(nodes[0]?.id || START_NODE_ID);
    }
  }, [location.state?.hizliIstekItem, t]);

  // @akalin/ui BaseFlowchart için düğüm listesini dönüştür
  const flowchartSteps = useMemo<FlowchartStepItem[]>(() => {
    return (formState.akisDugumleri || []).map((node) => {
      const typeInfo = FLOWCHART_NODE_TYPES.find(nt => nt.id === node.tip);
      const uiOpt = UI_ACTION_OPTIONS.find(o => o.id === node.uiAksiyonu || o.value === node.uiAksiyonu);
      const isFormAc = node.tip === 'FORM_AC' || node.tip === 'EKRAN_AC';
      const isAiIslem = node.tip === 'AI_ISLEM';
      const isHafiza = node.tip === 'HAFIZA';
      const isScriptIslem = node.tip === 'SCRIPT_ISLEM';
      const hafizaFileLabel = isHafiza
        ? `${(node.dosyaAdi || 'fiyat_farki_tablosu').replace(/\.(csv|json|txt|md|xml)$/i, '')}.${(node.dosyaUzantisi || 'csv').replace(/^\./, '')}`
        : undefined;
      const scriptTargetLabel = isScriptIslem
        ? `${node.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv'} → ${node.aracKodu || 'erp_create_document'}`
        : undefined;
      const resolvedUiActionLabel = isHafiza
        ? hafizaFileLabel
        : isScriptIslem
          ? scriptTargetLabel
          : node.varlikAdi
            ? `${node.varlikAdi}${node.modulAdi ? ` • ${node.modulAdi}` : ''}`
            : (node.uiAksiyonu && node.uiAksiyonu !== 'YOK' ? (uiOpt ? t(uiOpt.badge) : node.uiAksiyonu) : undefined);

      return {
        id: node.id,
        type: node.tip,
        title: isAiIslem
          ? t('ai_islem', 'AI İşlemi')
          : isHafiza
            ? t('hafiza', 'Hafıza')
            : isScriptIslem
              ? t('script_islem', 'Script İşlemi')
              : node.baslik,
        shapeBadgeText: isFormAc
          ? t('form_ac', 'Form Aç')
          : isAiIslem
            ? t('ai_islem', 'AI İşlemi')
            : isHafiza
              ? t('hafiza', 'Hafıza')
              : isScriptIslem
                ? t('script_islem', 'Script İşlemi')
                : (typeInfo ? t(typeInfo.shortLabel) : node.tip),
        prompt: isHafiza
          ? hafizaFileLabel
          : isScriptIslem
            ? (node.scriptKodu || node.prompt)
            : (node.prompt || node.kullaniciMesaji),
        toolCode: node.aracKodu,
        uiAction: node.uiAksiyonu,
        uiActionLabel: resolvedUiActionLabel,
        routePath: node.hedefRota,
        nextStepId: node.sonrakiDugumId,
        yesStepId: node.evetDugumId,
        noStepId: node.hayirDugumId,
        supportsTools: isAiIslem,
        attachedTools:
          isAiIslem && Array.isArray(node.bagliAraclar)
            ? node.bagliAraclar.map((toolItem: AiBagliAracDugumu): FlowchartAttachedToolItem => ({
                id: toolItem.id,
                type: toolItem.tip || 'RAG_ARAC',
                title: t('rag_sorgu_araci', 'RAG Sorgu Aracı'),
                summary: buildRagAracSummaryText(toolItem, t),
                toolCode: toolItem.aracKodu || 'erp_rag_search',
                icon: <Search size={13} />
              }))
            : undefined
      };
    });
  }, [formState.akisDugumleri, t]);

  const handleAttachToolToStep = useCallback(
    (parentStepId: string, _toolType: string = 'RAG_ARAC') => {
      let createdOrExistingId = '';
      let alreadyExisted = false;

      setFormState((prev) => {
        const existing = [...(prev.akisDugumleri || [])];
        const parentIdx = existing.findIndex((n) => n.id === parentStepId);
        if (parentIdx === -1) return prev;

        const parentNode = existing[parentIdx];
        const currentTools: AiBagliAracDugumu[] = Array.isArray(parentNode.bagliAraclar)
          ? [...parentNode.bagliAraclar]
          : [];

        const existingRag = currentTools.find((x) => (x.tip || '').toUpperCase() === 'RAG_ARAC');
        if (existingRag) {
          createdOrExistingId = existingRag.id;
          alreadyExisted = true;
          return prev;
        }

        const newTool = createDefaultRagAracDugumu({
          parentNodeId: parentStepId,
          title: t('rag_sorgu_araci', 'RAG Sorgu Aracı')
        });
        createdOrExistingId = newTool.id;
        existing[parentIdx] = {
          ...parentNode,
          bagliAraclar: [...currentTools, newTool]
        };

        return {
          ...prev,
          akisDugumleri: normalizeFlowNodes(existing, prev)
        };
      });

      if (createdOrExistingId) {
        setSelectedFlowNodeId(parentStepId);
        setSelectedToolId(createdOrExistingId);
        if (alreadyExisted) {
          toast(t('rag_arac_zaten_bagli', 'Bu AI İşlemi adımına RAG Sorgu Aracı zaten bağlı.'));
        } else {
          toast.success(
            t('rag_arac_dugume_baglandi', 'RAG Sorgu Aracı AI İşlemi düğümüne bağlandı.')
          );
        }
      }
    },
    [t]
  );

  const handleDeleteAttachedTool = useCallback(
    (parentStepId: string, toolId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setFormState((prev) => {
        const existing = [...(prev.akisDugumleri || [])];
        const parentIdx = existing.findIndex((n) => n.id === parentStepId);
        if (parentIdx === -1) return prev;
        const parentNode = existing[parentIdx];
        const nextTools = (parentNode.bagliAraclar || []).filter((item) => item.id !== toolId);
        existing[parentIdx] = {
          ...parentNode,
          bagliAraclar: nextTools
        };
        return {
          ...prev,
          akisDugumleri: normalizeFlowNodes(existing, prev)
        };
      });
      if (selectedToolId === toolId) {
        setSelectedToolId(undefined);
      }
    },
    [selectedToolId]
  );

  const handleAddFlowNode = (nodeType: string = 'FORM_AC', insertAtIndex?: number) => {
    // RAG_ARAC bir ana akış adımı değil, "AI İşlemi" (AI_ISLEM) düğümüne bağlanan araç alt düğümüdür
    if (nodeType === 'RAG_ARAC') {
      const existingNodes = formStateRef.current?.akisDugumleri || formState.akisDugumleri || [];
      const selectedNode = existingNodes.find((n) => n.id === selectedFlowNodeId);
      const nearBefore =
        typeof insertAtIndex === 'number' && insertAtIndex > 0
          ? existingNodes[insertAtIndex - 1]
          : undefined;
      const nearAt =
        typeof insertAtIndex === 'number' && insertAtIndex < existingNodes.length
          ? existingNodes[insertAtIndex]
          : undefined;
      const aiNodes = existingNodes.filter((n) => (n.tip || '').toUpperCase() === 'AI_ISLEM');

      const targetAiNode =
        (selectedNode && (selectedNode.tip || '').toUpperCase() === 'AI_ISLEM'
          ? selectedNode
          : undefined) ||
        (nearBefore && (nearBefore.tip || '').toUpperCase() === 'AI_ISLEM'
          ? nearBefore
          : undefined) ||
        (nearAt && (nearAt.tip || '').toUpperCase() === 'AI_ISLEM' ? nearAt : undefined) ||
        aiNodes[aiNodes.length - 1];

      if (!targetAiNode) {
        toast.error(
          t(
            'rag_arac_icin_ai_islem_gerekli',
            'RAG Sorgu Aracı bağlamak için önce akışa bir "AI İşlemi" düğümü ekleyin.'
          )
        );
        return;
      }

      handleAttachToolToStep(targetAiNode.id, 'RAG_ARAC');
      return;
    }

    setFormState(prev => {
      const existing = [...(prev.akisDugumleri || [])];
      const hasBasla = existing.some(n => n.id === 'BASLA' || n.tip === 'BASLA');

      // Eğer akışta zaten Başla düğümü varsa mükerrer Başla ekleme, mevcut Başla düğümünü seç
      if (nodeType === 'BASLA' && hasBasla) {
        setSelectedFlowNodeId('BASLA');
        return prev;
      }

      const nextNum = existing.length + 1;
      const newId = nodeType === 'BASLA'
        ? 'BASLA'
        : `${nodeType}_${nextNum}_${Date.now().toString(36).slice(-4).toUpperCase()}`;
      const newNode: AiAkisDugumu = {
        id: newId,
        tip: nodeType,
        baslik: nodeType === 'BASLA'
          ? t('basla', 'Başla')
          : nodeType === 'FORM_AC'
            ? t('form_ac', 'Form Aç')
            : nodeType === 'AI_ISLEM'
              ? t('ai_islem', 'AI İşlemi')
              : nodeType === 'HAFIZA'
                ? t('hafiza', 'Hafıza')
                : nodeType === 'SCRIPT_ISLEM'
                  ? t('script_islem', 'Script İşlemi')
                  : nodeType === 'KARAR_ONAY'
                    ? `${t('karar_onay_adimi', 'Kullanıcı Onayı')} (${nextNum}. ${t('adim', 'Adım')})`
                    : nodeType === 'BELGE_OLUSTUR'
                      ? `${t('belge_olusturma_adimi', 'Belge Taslağı Oluştur')} (${nextNum}. ${t('adim', 'Adım')})`
                      : nodeType === 'EKRAN_AC'
                        ? `${t('ekran_acma_adimi', 'ERP Ekranı Aç')} (${nextNum}. ${t('adim', 'Adım')})`
                        : `${nextNum}. ${t('islem_adimi', 'İşlem Adımı')}`,
        prompt: '',
        dosyaAdi: nodeType === 'HAFIZA' ? 'fiyat_farki_tablosu' : undefined,
        dosyaUzantisi: nodeType === 'HAFIZA' ? 'csv' : undefined,
        veriKaynagi: nodeType === 'HAFIZA' ? 'ONCEKI_AI_CIKTISI' : undefined,
        yazmaModu: nodeType === 'HAFIZA' ? 'UZERINE_YAZ' : undefined,
        kaynakDosyaAdi: nodeType === 'SCRIPT_ISLEM' ? 'fiyat_farki_tablosu.csv' : undefined,
        varlikKodu: nodeType === 'SCRIPT_ISLEM' ? 'BshFiyatFarki' : undefined,
        scriptKodu: nodeType === 'SCRIPT_ISLEM' ? DEFAULT_CSV_TO_MCP_SCRIPT : undefined,
        aracKodu: nodeType === 'FORM_AC' || nodeType === 'EKRAN_AC'
          ? 'erp_navigate'
          : nodeType === 'KARAR_ONAY'
            ? 'erp_request_confirmation'
            : (nodeType === 'BELGE_OLUSTUR' || nodeType === 'SCRIPT_ISLEM' ? 'erp_create_document' : (nodeType === 'MCP_SORGULA' ? 'erp_query_data' : '')),
        uiAksiyonu: nodeType === 'FORM_AC' || nodeType === 'EKRAN_AC' ? 'OZEL_ROTA' : 'YOK',
        hedefRota: '',
        kayitBekle: nodeType === 'FORM_AC' || nodeType === 'AI_ISLEM' || nodeType === 'HAFIZA' || nodeType === 'SCRIPT_ISLEM' ? true : undefined,
        kayitSonrasiTeyitEt: nodeType === 'FORM_AC' || nodeType === 'AI_ISLEM' || nodeType === 'SCRIPT_ISLEM' ? true : undefined,
        sonrakiDugumId: '',
        evetDugumId: '',
        hayirDugumId: ''
      };

      if (typeof insertAtIndex === 'number' && insertAtIndex >= 0 && insertAtIndex <= existing.length) {
        const safeInsertIdx = nodeType !== 'BASLA' && insertAtIndex === 0 && hasBasla ? 1 : insertAtIndex;
        existing.splice(safeInsertIdx, 0, newNode);
      } else {
        existing.push(newNode);
      }

      const normalized = normalizeFlowNodes(existing, prev);
      setSelectedFlowNodeId(newId);
      return {
        ...prev,
        akisDugumleri: normalized
      };
    });
  };

  const handleDeleteFlowNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (nodeId === 'BASLA' || nodeId === START_NODE_ID) return;
    setFormState(prev => {
      const remaining = (prev.akisDugumleri || []).filter(n => n.id !== nodeId);
      const normalized = normalizeFlowNodes(remaining, prev);
      if (selectedFlowNodeId === nodeId) {
        setSelectedFlowNodeId(normalized[0]?.id || START_NODE_ID);
      }
      return {
        ...prev,
        akisDugumleri: normalized
      };
    });
  };

  const handleMoveFlowNode = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormState(prev => {
      const list = [...(prev.akisDugumleri || [])];
      if (index <= 0 && direction === 'up') return prev;
      if (list[index]?.id === 'BASLA' || list[index]?.tip === 'BASLA') return prev;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      if (list[targetIndex]?.id === 'BASLA' || list[targetIndex]?.tip === 'BASLA') return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      const normalized = normalizeFlowNodes(list, prev);
      return {
        ...prev,
        akisDugumleri: normalized
      };
    });
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    } else {
      navigate(effectiveBackRoute, { state: { activeTabId: 'hizliIstekler' } });
    }
  };

  const handleNodeDoubleClick = (stepId: string) => {
      const latestState = {
        ...formState,
        baslik: formStateRef.current?.baslik ?? formState.baslik
      };
      const targetNode = (latestState.akisDugumleri || []).find(n => n.id === stepId) || {
        id: stepId,
        tip: (stepId === 'BASLA' || stepId === '__START__') ? 'BASLA' : 'MCP_SORGULA',
        baslik: (stepId === 'BASLA' || stepId === '__START__') ? t('basla', 'Başla') : ''
      };

      const isStart = stepId === 'BASLA' || stepId === '__START__' || targetNode.tip === 'BASLA';
      const ogeParam = isStart ? 'BASLA' : stepId;
      const currentIstekId = effectiveIstekId || latestState.id;

      const targetUrl = `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${currentIstekId}/adim/${ogeParam}`;

      navigate(targetUrl, {
        state: {
          agentData,
          istekData: latestState,
          nodeData: targetNode
        }
      });
    };

  const handleToolDoubleClick = (parentStepId: string, toolId: string) => {
    const latestState = {
      ...formState,
      baslik: formStateRef.current?.baslik ?? formState.baslik
    };
    const parentNode = (latestState.akisDugumleri || []).find((n) => n.id === parentStepId);
    const toolNode =
      parentNode?.bagliAraclar?.find((item) => item.id === toolId) ||
      createDefaultRagAracDugumu({
        parentNodeId: parentStepId,
        title: t('rag_sorgu_araci', 'RAG Sorgu Aracı')
      });

    const currentIstekId = effectiveIstekId || latestState.id;
    const targetUrl = `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${currentIstekId}/adim/${toolId}`;

    navigate(targetUrl, {
      state: {
        agentData,
        istekData: latestState,
        parentNodeId: parentStepId,
        nodeData: {
          ...toolNode,
          id: toolId,
          tip: toolNode.tip || 'RAG_ARAC',
          parentNodeId: parentStepId
        }
      }
    });
  };

    const handleSave = async (e?: any) => {
      if (e && e.preventDefault) e.preventDefault();

      try {
        setIsSaving(true);
      const currentState = {
          ...formState,
          baslik: formStateRef.current?.baslik ?? formState.baslik
        };
        const cleanedNodes = (currentState.akisDugumleri || []).filter(
          n =>
            n.baslik?.trim() ||
            n.prompt?.trim() ||
            n.tip === 'FORM_AC' ||
            n.tip === 'AI_ISLEM' ||
            n.tip === 'HAFIZA' ||
            n.tip === 'SCRIPT_ISLEM' ||
            n.tip === 'BASLA' ||
            n.id === 'BASLA'
        );
        const baslaNode = cleanedNodes.find(n => n.id === 'BASLA' || n.tip === 'BASLA');
        const firstActionNode =
          (baslaNode?.sonrakiDugumId
            ? cleanedNodes.find(n => n.id === baslaNode.sonrakiDugumId)
            : undefined) ||
          cleanedNodes.find(n => n.id !== 'BASLA' && n.tip !== 'BASLA') ||
          cleanedNodes[0];

        const effectiveDugmeBasligi =
          (baslaNode?.dugmeBasligi !== undefined
            ? baslaNode.dugmeBasligi
          : currentState.dugmeBasligi) || '';

const rawPromptForTitle =
  baslaNode?.prompt?.trim() ||
  currentState.prompt?.trim() ||
  firstActionNode?.prompt?.trim() ||
  '';
const promptShortTitle = rawPromptForTitle
  ? rawPromptForTitle.split('\n')[0].slice(0, 60).trim()
  : '';

const fallbackIndex = (Array.isArray(agentData?.hizliIstekler) ? agentData.hizliIstekler.length : 0) + 1;
const effectiveBaslik =
  currentState.baslik?.trim() ||
  effectiveDugmeBasligi.trim() ||
  firstActionNode?.dugmeMetni?.trim() ||
  firstActionNode?.dugmeBasligi?.trim() ||
  firstActionNode?.varlikAdi?.trim() ||
  promptShortTitle ||
  `${t('gorev_akisi', 'Görev Akışı')} #${fallbackIndex}`;

      const effectiveMainPrompt = currentState.prompt?.trim()
  ? currentState.prompt.trim()
  : (baslaNode?.prompt?.trim() || cleanedNodes[0]?.prompt || effectiveBaslik);
const effectiveMainUiAction =
  firstActionNode?.tip === 'FORM_AC'
    ? (firstActionNode.uiAksiyonu || 'OZEL_ROTA')
      : (currentState.uiAksiyonu && currentState.uiAksiyonu !== 'YOK')
        ? currentState.uiAksiyonu
        : (firstActionNode?.uiAksiyonu || cleanedNodes[0]?.uiAksiyonu || 'YOK');
const effectiveMainUiParams =
  firstActionNode?.tip === 'FORM_AC' && firstActionNode?.hedefRota
    ? firstActionNode.hedefRota
          : (currentState as any).uiParametreleriJson;

const savedItem = {
  ...currentState,
  baslik: effectiveBaslik,
  prompt: effectiveMainPrompt,
  uiAksiyonu: effectiveMainUiAction,
  uiParametreleriJson: effectiveMainUiParams,
  hizliErisimDugmesi: (baslaNode?.hizliErisimDugmesi !== undefined ? baslaNode.hizliErisimDugmesi : currentState.hizliErisimDugmesi) !== false,
  dugmeBasligi: effectiveDugmeBasligi,
  akisDugumleri: cleanedNodes
};

setFormState(savedItem);

if (effectiveAgentId) {
  const agentToUpdate = agentData || (await axios.get(`/api/AiAjanlar/${effectiveAgentId}`)).data;
  const currentList: any[] = Array.isArray(agentToUpdate.hizliIstekler) ? agentToUpdate.hizliIstekler : [];
  const exists = currentList.some(x => x.id === savedItem.id);

  const updatedList = exists
    ? currentList.map(x => (x.id === savedItem.id ? { ...x, ...savedItem } : x))
    : [...currentList, savedItem];

  const payload = {
    ...agentToUpdate,
    kapsam: parseInt(agentToUpdate.kapsam, 10) || 1,
    aiSaglayiciId: agentToUpdate.aiSaglayiciId ? parseInt(agentToUpdate.aiSaglayiciId, 10) : null,
    sicaklik: parseFloat(agentToUpdate.sicaklik) || 0.7,
    maxTokens: parseInt(agentToUpdate.maxTokens, 10) || 2048,
    yanitSenteziModu: parseInt(agentToUpdate.yanitSenteziModu as any, 10) || 0,
    hizliIstekler: updatedList
  };

  await axios.put(`/api/AiAjanlar/${effectiveAgentId}`, payload);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(`webakus_flow_draft_${effectiveAgentId}_${savedItem.id}`);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('ai-agents-updated'));
  }
  toast.success(t('gorev_akisi_kaydedildi', 'Görev akışı başarıyla kaydedildi.'));
}

if (onSuccess) {
  onSuccess();
} else {
  navigate(effectiveBackRoute, { state: { activeTabId: 'hizliIstekler' } });
}
    } catch (err: any) {
  toast.error(err.response?.data?.mesaj || err.message || t('kayit_sirasi_hata', 'Kayıt sırasında hata oluştu.'));
} finally {
  setIsSaving(false);
}
  };

const pageDisplayName = useMemo(() => {
  if (formState.baslik?.trim()) return formState.baslik.trim();
  const baslaNode = (formState.akisDugumleri || []).find(n => n.id === 'BASLA' || n.tip === 'BASLA');
  if (baslaNode?.dugmeBasligi?.trim()) return baslaNode.dugmeBasligi.trim();
  if (formState.dugmeBasligi?.trim()) return formState.dugmeBasligi.trim();
  const formAcNode = (formState.akisDugumleri || []).find(
    n => (n.tip === 'FORM_AC' || n.tip === 'EKRAN_AC') && (n.dugmeMetni?.trim() || n.dugmeBasligi?.trim() || n.varlikAdi?.trim())
  );
  if (formAcNode?.dugmeMetni?.trim()) return formAcNode.dugmeMetni.trim();
  if (formAcNode?.dugmeBasligi?.trim()) return formAcNode.dugmeBasligi.trim();
  if (formAcNode?.varlikAdi?.trim()) return formAcNode.varlikAdi.trim();
  return t('yeni_gorev_akisi', 'Yeni Görev Akışı (Flowchart)');
}, [formState.baslik, formState.dugmeBasligi, formState.akisDugumleri, t]);

const ajanlarListRoute = baseAgentRoute;
const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar');

const agentTitle = agentData?.ad || (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
const agentRoute = `${baseAgentRoute}/${effectiveAgentId}`;

const subTrail = useMemo(() => [
  {
    label: ajanlarListLabel,
    onClick: () => navigate(ajanlarListRoute)
  },
  {
    label: agentTitle,
    onClick: () => navigate(agentRoute, { state: { activeTabId: 'hizliIstekler' } })
  },
  {
    label: pageDisplayName,
    active: true
  }
], [ajanlarListLabel, ajanlarListRoute, agentTitle, agentRoute, pageDisplayName, navigate]);

useEffect(() => {
  if (setHeaderBreadcrumbOptions) {
    setHeaderBreadcrumbOptions({
      subTrail
    });
  }
  return () => {
    if (setHeaderBreadcrumbOptions) {
      setHeaderBreadcrumbOptions(null);
    }
  };
}, [subTrail, setHeaderBreadcrumbOptions]);

const flowchartPaletteItems = useMemo<FlowchartPaletteItem[]>(() => [
  {
    id: 'palette_basla',
    type: 'BASLA',
    title: t('basla', 'Başla'),
    subTitle: t('akisi_baslat', 'Akışı Başlat'),
    shape: 'terminal',
    icon: <Play size={13} />
  },
  {
    id: 'palette_form_ac',
    type: 'FORM_AC',
    title: t('form_ac', 'Form Aç'),
    subTitle: t('belge_kart_liste_ac', 'Belge, Kart veya Liste Aç'),
    shape: 'input',
    icon: <Monitor size={13} />
  },
  {
    id: 'palette_ai_islem',
    type: 'AI_ISLEM',
    title: t('ai_islem', 'AI İşlemi'),
    subTitle: t('ai_analiz_sorgu_belge_islem', 'AI Analiz, Sorgu veya Belge İşlemi'),
    shape: 'process',
    icon: <Cpu size={13} />
  },
  {
    id: 'palette_hafiza',
    type: 'HAFIZA',
    title: t('hafiza', 'Hafıza'),
    subTitle: t('llm_verisini_dosya_olarak_depola', 'LLM Verisini Dosya + Uzantı Olarak Depola'),
    shape: 'storage' as any,
    icon: <Database size={13} />
  },
  {
    id: 'palette_script_islem',
    type: 'SCRIPT_ISLEM',
    title: t('script_islem', 'Script İşlemi'),
    subTitle: t('js_ile_mcp_json_olustur', 'JavaScript ile MCP JSON Veri Yapısı Oluştur'),
    shape: 'script' as any,
    icon: <Code2 size={13} />
  },
  {
    id: 'palette_rag_arac',
    type: 'RAG_ARAC',
    title: t('rag_sorgu_araci', 'RAG Sorgu Aracı'),
    subTitle: t(
      'ai_islem_bulut_tablo_vektor_araci',
      'AI İşlemi Düğümüne Bağlı Bulut Belge & Tablo RAG Aracı'
    ),
    shape: 'tool',
    category: 'tool',
    icon: <Search size={13} />
  }
], [t]);

const tabs: BaseTabItem[] = useMemo(() => [
  {
    id: 'flowchart',
    label: t('flowchart_ve_prompt_tasarimi', 'Görsel Flowchart & Adım Ayarları'),
    icon: <GitBranch size={16} />,
    content: (
      <div className="ai-flowchart-full-page">
        <BaseFlowchart
          fit={true}
          paletteItems={flowchartPaletteItems}
          steps={flowchartSteps}
          selectedStepId={selectedFlowNodeId}
          selectedToolId={selectedToolId}
          onSelectStep={(stepId) => {
            setSelectedFlowNodeId(stepId);
            setSelectedToolId(undefined);
          }}
          onSelectTool={(parentStepId, toolId) => {
            setSelectedFlowNodeId(parentStepId);
            setSelectedToolId(toolId);
          }}
          onDoubleClickStep={handleNodeDoubleClick}
          onDoubleClickTool={handleToolDoubleClick}
          onAddStep={(stepType, insertAtIndex) => handleAddFlowNode(stepType, insertAtIndex)}
          onAddToolToStep={(parentStepId, toolType) => handleAttachToolToStep(parentStepId, toolType)}
          onMoveStep={handleMoveFlowNode}
          onDeleteStep={handleDeleteFlowNode}
          onDeleteTool={handleDeleteAttachedTool}
          className="ai-flowchart-fit"
        />
      </div>
    )
  }
], [
  flowchartPaletteItems,
  flowchartSteps,
  selectedFlowNodeId,
  selectedToolId,
  handleAttachToolToStep,
  handleDeleteAttachedTool,
  t
]);

const extraDropdownActions = useMemo(() => [
  {
    custom: (
      <BaseSwitch
        id="hizliIstekAktifMenuSwitch"
        checked={formState.aktifMi}
        onChange={(e: any) => setFormState(prev => ({ ...prev, aktifMi: e.target.checked }))}
        label={
          <span className="flex items-center gap-8">
            <Power size={15} className={formState.aktifMi ? 'text-success' : 'text-secondary'} />
            <span className="font-medium">{t('durum', 'Durum')}:</span>
            <span className={formState.aktifMi ? 'text-success font-semibold' : 'text-secondary font-semibold'}>
              {formState.aktifMi ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
            </span>
          </span>
        }
        className="action-menu-switch-item"
      />
    ),
    dividerBelow: true
  }
], [formState.aktifMi, t]);

if (isLoading) {
  return <PageLoader />;
}

return (
  <BaseCardPage
    id="aiAjanHizliIstekForm"
    title={pageDisplayName}
    pageTitle={pageDisplayName}
    recordTitle={pageDisplayName}
    onTitleChange={handleTitleChange}
    titleValue={formState.baslik || ''}
    titlePlaceholder={t('gorev_akisi_adi_giriniz', 'Görev akışı adı giriniz...')}
    titleEditTooltip={t('gorev_akisi_adini_duzenle', 'Görev Akışı Adını Düzenle')}
    icon={<GitBranch size={24} color="var(--accent-primary)" />}
    subtitleLeft={
      agentData?.ad
        ? `${agentData.ad} • ${t('gorev_akisi_flowchart', 'Görev Akışı & Flowchart')}`
        : undefined
    }
    showBackButton={true}
    onClose={handleClose}
    onSave={handleSave}
    isSaving={isSaving}
    extraDropdownActions={extraDropdownActions}
    tabs={tabs}
    activeTabId="flowchart"
    subTrail={subTrail}
    className="fade-in"
  />
);
};

export default AiAjanHizliIstekForm;
