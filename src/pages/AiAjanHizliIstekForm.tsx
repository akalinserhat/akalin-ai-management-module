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

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  GitBranch,
  Power
} from 'lucide-react';
import {
  BaseCardPage,
  BaseFlowchart,
  BaseSwitch,
  PageLoader,
  useHeaderApi,
  type BaseTabItem,
  type FlowchartStepItem
} from '@akalin/ui';
import type { AiAkisDugumu } from '../types';
import {
  UI_ACTION_OPTIONS,
  FLOWCHART_NODE_TYPES
} from './AiAjanForm';

const START_NODE_ID = '__START__';

export interface AiAjanHizliIstekFormProps {
  agentId?: string | number;
  istekId?: string;
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
    const match = location.pathname.match(/AiAjanlar\/(\d+)/i) || location.pathname.match(/ai-ajanlar\/(\d+)/i);
    return match ? match[1] : null;
  }, [propAgentId, params.id, location.pathname]);

  const effectiveIstekId = useMemo(() => {
    if (propIstekId) return propIstekId;
    if (params.istekId) return params.istekId;
    const match = location.pathname.match(/hizli-istek\/([^/?#]+)/i);
    return match ? match[1] : null;
  }, [propIstekId, params.istekId, location.pathname]);

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const defaultBackRoute = effectiveAgentId
    ? (isUnderAyarlar ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}` : `/ai-ajanlar/${effectiveAgentId}`)
    : (isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari/AiAjanlar' : '/ai-ajanlar');
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

    if (agentData?.hizliIstekler && Array.isArray(agentData.hizliIstekler)) {
      if (effectiveIstekId && effectiveIstekId !== 'yeni') {
        const found = agentData.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
        if (found) return found;
      }
    }
    return null;
  }, [initialItem, location.state?.hizliIstekItem, agentData, effectiveIstekId]);

  const [formState, setFormState] = useState<{
    id: string;
    baslik: string;
    prompt: string;
    ikon: string;
    uiAksiyonu: string;
    aktifMi: boolean;
    sira?: number;
    tetiklemeAnahtarlari: string;
    akisDugumleri: AiAkisDugumu[];
  }>(() => {
    if (targetItem) {
      const nodes: AiAkisDugumu[] = Array.isArray(targetItem.akisDugumleri)
        ? JSON.parse(JSON.stringify(targetItem.akisDugumleri))
        : [];

      return {
        id: targetItem.id || `req_${Date.now()}`,
        baslik: targetItem.baslik || '',
        prompt: targetItem.prompt || '',
        ikon: targetItem.ikon || 'Sparkles',
        uiAksiyonu: targetItem.uiAksiyonu || 'YOK',
        aktifMi: targetItem.aktifMi !== false,
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
      tetiklemeAnahtarlari: '',
      akisDugumleri: [
        {
          id: 'BASLA',
          tip: 'BASLA',
          baslik: t('basla', 'Başla'),
          prompt: '',
          aracKodu: '',
          uiAksiyonu: 'YOK',
          hedefRota: '',
          sonrakiDugumId: ''
        }
      ]
    };
  });

  const [selectedFlowNodeId, setSelectedFlowNodeId] = useState<string>(() => {
    return formState.akisDugumleri[0]?.id || START_NODE_ID;
  });

  // targetItem sonradan yüklendiğinde formState'i senkronize et
  useEffect(() => {
    if (targetItem && (!formState.baslik || formState.id !== targetItem.id)) {
      const nodes: AiAkisDugumu[] = Array.isArray(targetItem.akisDugumleri) && targetItem.akisDugumleri.length > 0
        ? JSON.parse(JSON.stringify(targetItem.akisDugumleri))
        : [
          {
            id: 'BASLA',
            tip: 'BASLA',
            baslik: t('basla', 'Başla'),
            prompt: targetItem.prompt || '',
            aracKodu: '',
            uiAksiyonu: targetItem.uiAksiyonu || 'YOK',
            hedefRota: '',
            sonrakiDugumId: ''
          }
        ];

      setFormState({
        id: targetItem.id || `req_${Date.now()}`,
        baslik: targetItem.baslik || '',
        prompt: targetItem.prompt || '',
        ikon: targetItem.ikon || 'Sparkles',
        uiAksiyonu: targetItem.uiAksiyonu || 'YOK',
        aktifMi: targetItem.aktifMi !== false,
        sira: targetItem.sira,
        tetiklemeAnahtarlari: targetItem.tetiklemeAnahtarlari || '',
        akisDugumleri: nodes
      });
      setSelectedFlowNodeId(nodes[0]?.id || START_NODE_ID);
    }
  }, [targetItem, t]);

  // location.state'ten doğrudan güncel istek öğesi geldiyse (alt ayar sayfasından dönüş)
  useEffect(() => {
    if (location.state?.hizliIstekItem) {
      const item = location.state.hizliIstekItem;
      const nodes: AiAkisDugumu[] = Array.isArray(item.akisDugumleri) && item.akisDugumleri.length > 0
        ? JSON.parse(JSON.stringify(item.akisDugumleri))
        : [
          {
            id: 'BASLA',
            tip: 'BASLA',
            baslik: t('basla', 'Başla'),
            prompt: item.prompt || '',
            aracKodu: '',
            uiAksiyonu: item.uiAksiyonu || 'YOK',
            hedefRota: '',
            sonrakiDugumId: ''
          }
        ];

      setFormState({
        id: item.id || `req_${Date.now()}`,
        baslik: item.baslik || '',
        prompt: item.prompt || '',
        ikon: item.ikon || 'Sparkles',
        uiAksiyonu: item.uiAksiyonu || 'YOK',
        aktifMi: item.aktifMi !== false,
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
      return {
        id: node.id,
        type: node.tip,
        title: node.baslik,
        shapeBadgeText: typeInfo ? t(typeInfo.shortLabel) : node.tip,
        prompt: node.prompt,
        toolCode: node.aracKodu,
        uiAction: node.uiAksiyonu,
        uiActionLabel: node.uiAksiyonu && node.uiAksiyonu !== 'YOK' ? (uiOpt ? t(uiOpt.badge) : node.uiAksiyonu) : undefined,
        routePath: node.hedefRota,
        nextStepId: node.sonrakiDugumId,
        yesStepId: node.evetDugumId,
        noStepId: node.hayirDugumId
      };
    });
  }, [formState.akisDugumleri, t]);

  const handleAddFlowNode = (nodeType: string = 'BASLA', insertAtIndex?: number) => {
    setFormState(prev => {
      const existing = [...(prev.akisDugumleri || [])];
      const nextNum = existing.length + 1;
      const newId = nodeType === 'BASLA' ? 'BASLA' : `ADIM_${nextNum}`;
      const newNode: AiAkisDugumu = {
        id: newId,
        tip: nodeType,
        baslik: nodeType === 'BASLA'
          ? t('basla', 'Başla')
          : nodeType === 'KARAR_ONAY'
            ? `${t('karar_onay_adimi', 'Kullanıcı Onayı')} (${nextNum}. ${t('adim', 'Adım')})`
            : nodeType === 'BELGE_OLUSTUR'
              ? `${t('belge_olusturma_adimi', 'Belge Taslağı Oluştur')} (${nextNum}. ${t('adim', 'Adım')})`
              : nodeType === 'EKRAN_AC'
                ? `${t('ekran_acma_adimi', 'ERP Ekranı Aç')} (${nextNum}. ${t('adim', 'Adım')})`
                : `${nextNum}. ${t('islem_adimi', 'İşlem Adımı')}`,
        prompt: '',
        aracKodu: nodeType === 'KARAR_ONAY'
          ? 'erp_request_confirmation'
          : (nodeType === 'BELGE_OLUSTUR' ? 'erp_create_document' : (nodeType === 'MCP_SORGULA' ? 'erp_query_data' : '')),
        uiAksiyonu: 'YOK',
        hedefRota: '',
        sonrakiDugumId: '',
        evetDugumId: '',
        hayirDugumId: ''
      };

      if (typeof insertAtIndex === 'number' && insertAtIndex >= 0 && insertAtIndex <= existing.length) {
        const nextNode = existing[insertAtIndex];
        if (nextNode) {
          newNode.sonrakiDugumId = nextNode.id;
        }
        if (insertAtIndex > 0) {
          const prevNode = existing[insertAtIndex - 1];
          if (prevNode && prevNode.tip !== 'KARAR_ONAY') {
            existing[insertAtIndex - 1] = { ...prevNode, sonrakiDugumId: newId };
          }
        }
        existing.splice(insertAtIndex, 0, newNode);
      } else {
        if (existing.length > 0) {
          const lastIdx = existing.length - 1;
          const lastNode = existing[lastIdx];
          if (lastNode.tip !== 'KARAR_ONAY' && !lastNode.sonrakiDugumId) {
            existing[lastIdx] = { ...lastNode, sonrakiDugumId: newId };
          }
        }
        existing.push(newNode);
      }

      setSelectedFlowNodeId(newId);
      return {
        ...prev,
        akisDugumleri: existing
      };
    });
  };

  const handleDeleteFlowNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormState(prev => {
      const remaining = (prev.akisDugumleri || []).filter(n => n.id !== nodeId);
      if (selectedFlowNodeId === nodeId) {
        setSelectedFlowNodeId(remaining[0]?.id || START_NODE_ID);
      }
      return {
        ...prev,
        akisDugumleri: remaining
      };
    });
  };

  const handleMoveFlowNode = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFormState(prev => {
      const list = [...(prev.akisDugumleri || [])];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      return {
        ...prev,
        akisDugumleri: list
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
    const targetNode = (formState.akisDugumleri || []).find(n => n.id === stepId) || {
      id: stepId,
      tip: (stepId === 'BASLA' || stepId === '__START__') ? 'BASLA' : 'MCP_SORGULA',
      baslik: (stepId === 'BASLA' || stepId === '__START__') ? t('basla', 'Başla') : ''
    };

    const isStart = stepId === 'BASLA' || stepId === '__START__' || targetNode.tip === 'BASLA';
    const ogeParam = isStart ? 'BASLA' : stepId;
    const currentIstekId = effectiveIstekId || formState.id;

    const targetUrl = isUnderAyarlar
      ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}/hizli-istek/${currentIstekId}/adim/${ogeParam}`
      : `/ai-ajanlar/${effectiveAgentId}/hizli-istek/${currentIstekId}/adim/${ogeParam}`;

    navigate(targetUrl, {
      state: {
        agentData,
        istekData: formState,
        nodeData: targetNode
      }
    });
  };

  const handleSave = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formState.baslik?.trim()) {
      toast.error(t('istek_baslik_zorunlu', 'Lütfen görev / istek başlığını giriniz.'));
      setSelectedFlowNodeId(START_NODE_ID);
      return;
    }

    try {
      setIsSaving(true);
      const cleanedNodes = (formState.akisDugumleri || []).filter(
        n => n.baslik?.trim() || n.prompt?.trim()
      );
      const effectiveMainPrompt = formState.prompt?.trim()
        ? formState.prompt.trim()
        : (cleanedNodes[0]?.prompt || formState.baslik);
      const effectiveMainUiAction = (formState.uiAksiyonu && formState.uiAksiyonu !== 'YOK')
        ? formState.uiAksiyonu
        : (cleanedNodes[0]?.uiAksiyonu || 'YOK');

      const savedItem = {
        ...formState,
        prompt: effectiveMainPrompt,
        uiAksiyonu: effectiveMainUiAction,
        akisDugumleri: cleanedNodes
      };

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
    return t('yeni_gorev_akisi', 'Yeni Görev Akışı (Flowchart)');
  }, [formState.baslik, t]);

  const ajanlarListRoute = isUnderAyarlar
    ? '/ayarlar/YapayZekaAyarlari/AiAjanlar'
    : '/ai-ajanlar';
  const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar & MCP');

  const agentTitle = agentData?.ad || (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const agentRoute = isUnderAyarlar
    ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}`
    : `/ai-ajanlar/${effectiveAgentId}`;

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

  const tabs: BaseTabItem[] = useMemo(() => [
    {
      id: 'flowchart',
      label: t('flowchart_ve_prompt_tasarimi', 'Görsel Flowchart & Adım Ayarları'),
      icon: <GitBranch size={16} />,
      content: (
        <div className="ai-flowchart-full-page">
          <BaseFlowchart
            fit={true}
            steps={flowchartSteps}
            selectedStepId={selectedFlowNodeId}
            onSelectStep={(stepId) => setSelectedFlowNodeId(stepId)}
            onDoubleClickStep={handleNodeDoubleClick}
            onAddStep={(stepType, insertAtIndex) => handleAddFlowNode(stepType, insertAtIndex)}
            onMoveStep={handleMoveFlowNode}
            onDeleteStep={handleDeleteFlowNode}
            className="ai-flowchart-fit"
          />
        </div>
      )
    }
  ], [flowchartSteps, selectedFlowNodeId, t]);

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
