/**
 * @akalin/ai_management_module - Temel Flowchart Öğe Ayarları Kart Sayfası (BaseAiAjanFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Tüm Flowchart akış düğümü ayar sayfaları (Başla, Form Aç, AI İşlemi, Karar, Belge vb.) için ortak temel kart sayfası iskeletini sunmak
 * - n8n tarzı "Önceki Düğümden Gelen Bilgi ve Belgeler (Girdi Bağlamı / Input Binding)" mimarisini merkezi olarak tüm düğümlere kazandırmak
 * - @akalin/ui BaseCardPage temel bileşenini sarmalayarak standart form mimarisi, ActionMenu ve Breadcrumb senkronizasyonu sağlamak
 * - Türetilen sayfaların içeriklerini (children) ve form durumlarını esnek şekilde yönetmesine imkan tanımak
 * - Zero Bottom Button, Header-Only Actions, Sıfır Header Rozeti, Sıfır Inline CSS ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Sliders,
  Workflow,
  FileText,
  Database,
  Sparkles,
  ArrowRight,
  Check,
  Plus,
  Play,
  Monitor,
  Cpu,
  GitBranch,
  Info
} from 'lucide-react';
import {
  BaseCardPage,
  BaseSwitch,
  useHeaderApi,
  type BaseTabItem
} from '@akalin/ui';
import type { AiAkisDugumu, AiOncekiDugumGirdiAyarlari } from '../types';

export interface FlowchartPreviousNodeOutputField {
  key: string;
  expression: string;
  label: string;
  description: string;
  dataType: 'belge' | 'veri' | 'metin' | 'karar';
  sourceNodeId: string;
  sourceNodeTitle: string;
  sourceNodeType: string;
}

export interface FlowchartOgeAyarContextValue {
  previousNodes: AiAkisDugumu[];
  immediatePreviousNode: AiAkisDugumu | null;
  availableInputVariables: FlowchartPreviousNodeOutputField[];
  oncekiDugumGirdisi: Required<AiOncekiDugumGirdiAyarlari>;
  updateOncekiDugumGirdisi: (patch: Partial<AiOncekiDugumGirdiAyarlari>) => void;
  insertVariableIntoPrompt: (expression: string) => void;
}

const FlowchartOgeAyarContext = createContext<FlowchartOgeAyarContextValue | null>(null);

export const useFlowchartOgeAyarContext = () => useContext(FlowchartOgeAyarContext);

export interface BaseAiAjanFlowchartOgeAyarPageProps {
  id?: string;
  agentId?: string | number;
  istekId?: string;
  nodeId?: string;
  nodeType?: string;
  title?: string;
  pageTitle?: string;
  recordTitle?: string;
  subtitleLeft?: string;
  icon?: React.ReactNode;
  initialNodeData?: any;
  agentData?: any;
  istekData?: any;
  formData?: any;
  onFormDataChange?: (newData: any) => void;
  onSave?: (nodeData: any) => Promise<void> | void;
  onClose?: () => void;
  onBack?: () => void;
  backRoute?: string;
  showBackButton?: boolean;
  isSaving?: boolean;
  extraDropdownActions?: any[];
  tabs?: BaseTabItem[];
  activeTabId?: string | number;
  onTabChange?: (tabId: string | number) => void;
  subTrail?: any[];
  /** Başla düğümü dışındaki tüm düğümlerde varsayılan olarak true'dur; önceki düğümden gelen bilgi/belge kartını gösterir */
  showPreviousNodeInput?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_ONCEKI_DUGUM_GIRDISI: Required<AiOncekiDugumGirdiAyarlari> = {
  aktifMi: true,
  kaynakDugumId: 'OTOMATIK_ONCEKI',
  belgeleriAktar: true,
  formVerileriniAktar: true,
  aiCiktisiniAktar: true,
  seciliDegiskenler: []
};

export const BaseAiAjanFlowchartOgeAyarPage: React.FC<BaseAiAjanFlowchartOgeAyarPageProps> = ({
  id = 'flowchartOgeAyarPage',
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
  nodeType,
  title,
  pageTitle,
  recordTitle,
  subtitleLeft,
  icon,
  initialNodeData,
  agentData: propAgentData,
  istekData: propIstekData,
  formData: controlledFormData,
  onFormDataChange,
  onSave: propOnSave,
  onClose,
  onBack,
  backRoute,
  showBackButton = true,
  isSaving: controlledIsSaving,
  extraDropdownActions,
  tabs,
  activeTabId,
  onTabChange,
  subTrail,
  showPreviousNodeInput,
  className = '',
  children
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();
  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

  const effectiveAgentId = propAgentId || params.id;
  const effectiveIstekId = propIstekId || params.istekId;
  const effectiveNodeId = propNodeId || controlledFormData?.id || initialNodeData?.id || params.ogeId;

  const [internalIsSaving, setInternalIsSaving] = useState<boolean>(false);
  const [internalFormData, setInternalFormData] = useState<any>(initialNodeData || {});
  const [fetchedIstekData, setFetchedIstekData] = useState<any>(null);

  const effectiveIsSaving = controlledIsSaving !== undefined ? controlledIsSaving : internalIsSaving;
  const effectiveFormData = controlledFormData !== undefined ? controlledFormData : internalFormData;

  const resolvedIstekData = propIstekData || location.state?.istekData || fetchedIstekData;

  useEffect(() => {
    if (!propIstekData && !location.state?.istekData && effectiveAgentId && effectiveIstekId) {
      axios
        .get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then((res) => {
          if (res.data && Array.isArray(res.data.hizliIstekler)) {
            const found = res.data.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
            if (found) setFetchedIstekData(found);
          }
        })
        .catch(() => {});
    }
  }, [propIstekData, location.state?.istekData, effectiveAgentId, effectiveIstekId]);

  const setFormData = (updater: any) => {
    const nextVal = typeof updater === 'function' ? updater(effectiveFormData) : updater;
    if (controlledFormData === undefined) {
      setInternalFormData(nextVal);
    }
    if (onFormDataChange) {
      onFormDataChange(nextVal);
    }
  };

  // Mevcut düğümün "Başla" (kök) düğümü olup olmadığını tespit et
  const effectiveNodeType = nodeType || effectiveFormData?.tip || initialNodeData?.tip || '';
  const isStartNode = useMemo(() => {
    if (showPreviousNodeInput !== undefined) return !showPreviousNodeInput;
    return (
      id === 'baslaFlowchartOgeAyarPage' ||
      effectiveNodeType === 'BASLA' ||
      effectiveNodeId === 'BASLA' ||
      effectiveNodeId === '__START__'
    );
  }, [showPreviousNodeInput, id, effectiveNodeType, effectiveNodeId]);

  // Kendisinden önce gelen düğümleri (Upstream Nodes) çözümle
  const previousNodes = useMemo<AiAkisDugumu[]>(() => {
    if (isStartNode) return [];
    const allNodes: AiAkisDugumu[] = Array.isArray(resolvedIstekData?.akisDugumleri)
      ? resolvedIstekData.akisDugumleri
      : [];

    if (allNodes.length === 0) {
      return [
        {
          id: 'BASLA',
          tip: 'BASLA',
          baslik: t('basla', 'Başla'),
          prompt: resolvedIstekData?.prompt || ''
        }
      ];
    }

    const currentIdx = allNodes.findIndex(
      (n) => n && (n.id === effectiveNodeId || (effectiveNodeId && n.id === String(effectiveNodeId)))
    );

    const sliced = currentIdx > 0 ? allNodes.slice(0, currentIdx) : currentIdx === -1 ? allNodes : [];
    if (sliced.length === 0) {
      return [
        {
          id: 'BASLA',
          tip: 'BASLA',
          baslik: t('basla', 'Başla'),
          prompt: resolvedIstekData?.prompt || ''
        }
      ];
    }
    return sliced;
  }, [isStartNode, resolvedIstekData, effectiveNodeId, t]);

  const immediatePreviousNode = useMemo<AiAkisDugumu | null>(() => {
    if (previousNodes.length === 0) return null;
    return previousNodes[previousNodes.length - 1];
  }, [previousNodes]);

  // Önceki düğüm girdi ayarlarını çözümle
  const oncekiDugumGirdisi = useMemo<Required<AiOncekiDugumGirdiAyarlari>>(() => {
    const raw = effectiveFormData?.oncekiDugumGirdisi || {};
    return {
      aktifMi: raw.aktifMi !== false,
      kaynakDugumId: raw.kaynakDugumId || 'OTOMATIK_ONCEKI',
      belgeleriAktar: raw.belgeleriAktar !== false,
      formVerileriniAktar: raw.formVerileriniAktar !== false,
      aiCiktisiniAktar: raw.aiCiktisiniAktar !== false,
      seciliDegiskenler: Array.isArray(raw.seciliDegiskenler) ? raw.seciliDegiskenler : []
    };
  }, [effectiveFormData?.oncekiDugumGirdisi]);

  const updateOncekiDugumGirdisi = (patch: Partial<AiOncekiDugumGirdiAyarlari>) => {
    setFormData((prev: any) => {
      const current = prev?.oncekiDugumGirdisi || {};
      return {
        ...prev,
        oncekiDugumGirdisi: {
          ...DEFAULT_ONCEKI_DUGUM_GIRDISI,
          ...current,
          ...patch
        }
      };
    });
  };

  // Seçili kaynak düğüme göre n8n tarzı çıktı şeması / değişken listesini oluştur
  const availableInputVariables = useMemo<FlowchartPreviousNodeOutputField[]>(() => {
    if (isStartNode || previousNodes.length === 0) return [];

    const buildForNode = (
      node: AiAkisDugumu,
      idx: number,
      isImmediate: boolean
    ): FlowchartPreviousNodeOutputField[] => {
      const nType = (node.tip || '').toUpperCase();
      const nodeLabel =
        node.varlikAdi?.trim()
          ? `${node.baslik || t('form_ac', 'Form Aç')} (${node.varlikAdi.trim()})`
          : node.baslik || `${idx + 1}. ${t('adim', 'Adım')}`;
      const prefix = nType === 'BASLA' ? '$basla' : isImmediate ? '$onceki' : `$adim_${idx + 1}`;

      if (nType === 'BASLA') {
        return [
          {
            key: `${node.id}_kullaniciIstegi`,
            expression: `{{ ${prefix}.kullaniciIstegi }}`,
            label: t('n8n_var_kullanici_istegi', 'Kullanıcının Başlangıç İsteği'),
            description: t(
              'n8n_var_kullanici_istegi_aciklama',
              'Akışı başlatan kullanıcının yazdığı ilk mesaj veya hızlı erişim komutu'
            ),
            dataType: 'metin',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          },
          {
            key: `${node.id}_ekDosyalar`,
            expression: `{{ ${prefix}.ekDosyalar }}`,
            label: t('n8n_var_baslangic_belgeleri', 'Başlangıçta Eklenen Belgeler'),
            description: t(
              'n8n_var_baslangic_belgeleri_aciklama',
              'Sohbet başlatılırken eklenen dosya veya belgeler'
            ),
            dataType: 'belge',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          }
        ];
      }

      if (nType === 'FORM_AC' || nType === 'EKRAN_AC') {
        return [
          {
            key: `${node.id}_eklenenBelgeler`,
            expression: `{{ ${prefix}.eklenenBelgeler }}`,
            label: t('n8n_var_eklenen_belgeler', 'İçeri Aktarılan Belgeler / Dosyalar'),
            description: t(
              'n8n_var_eklenen_belgeler_aciklama',
              'Önceki form/ekranda seçilen veya içeri aktarılan PDF, Word, Excel, görsel ve bulut dosyaları'
            ),
            dataType: 'belge',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          },
          {
            key: `${node.id}_belgeMetinIcerigi`,
            expression: `{{ ${prefix}.belgeMetinIcerigi }}`,
            label: t('n8n_var_belge_metin_icerigi', 'Belgeden Çıkarılan Metin İçeriği'),
            description: t(
              'n8n_var_belge_metin_icerigi_aciklama',
              'İçeri aktarılan belgenin/dosyanın çözümlenmiş ham metin içeriği'
            ),
            dataType: 'metin',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          },
          {
            key: `${node.id}_kaydedilenVeri`,
            expression: `{{ ${prefix}.kaydedilenVeri }}`,
            label: t('n8n_var_kaydedilen_form_verisi', 'Kaydedilen Form / Kart Verisi (JSON)'),
            description: t(
              'n8n_var_kaydedilen_form_verisi_aciklama',
              'Açılan form veya kart kaydedildiğinde yakalanan tüm alanlar ve satır verileri'
            ),
            dataType: 'veri',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          },
          {
            key: `${node.id}_kayitId`,
            expression: `{{ ${prefix}.kayitId }}`,
            label: t('n8n_var_kayit_id', 'Kaydedilen Kayıt ID ve Özeti'),
            description: t(
              'n8n_var_kayit_id_aciklama',
              'Oluşturulan veya güncellenen kaydın sistem kimliği (ID) ve başlık bilgisi'
            ),
            dataType: 'veri',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          }
        ];
      }

      if (nType === 'KARAR_ONAY') {
        return [
          {
            key: `${node.id}_onayDurumu`,
            expression: `{{ ${prefix}.onayDurumu }}`,
            label: t('n8n_var_onay_durumu', 'Kullanıcı Onay Kararı (Evet / Hayır)'),
            description: t('n8n_var_onay_durumu_aciklama', 'Kullanıcının verdiği onay veya red yanıtı'),
            dataType: 'karar',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          },
          {
            key: `${node.id}_kullaniciNotu`,
            expression: `{{ ${prefix}.kullaniciNotu }}`,
            label: t('n8n_var_kullanici_notu', 'Kullanıcı Açıklama Notu'),
            description: t('n8n_var_kullanici_notu_aciklama', 'Onay adımında kullanıcının eklediği mesaj'),
            dataType: 'metin',
            sourceNodeId: node.id,
            sourceNodeTitle: nodeLabel,
            sourceNodeType: nType
          }
        ];
      }

      // AI_ISLEM, MCP_SORGULA, BELGE_OLUSTUR ve diğer işlem düğümleri
      return [
        {
          key: `${node.id}_aiYaniti`,
          expression: `{{ ${prefix}.aiYaniti }}`,
          label: t('n8n_var_ai_yaniti', 'Önceki AI İşlemi Analiz Sonucu'),
          description: t(
            'n8n_var_ai_yaniti_aciklama',
            'Önceki AI adımının ürettiği analiz metni, kurallar ve özet çıktı'
          ),
          dataType: 'metin',
          sourceNodeId: node.id,
          sourceNodeTitle: nodeLabel,
          sourceNodeType: nType
        },
        {
          key: `${node.id}_cikarilanVeri`,
          expression: `{{ ${prefix}.cikarilanVeri }}`,
          label: t('n8n_var_cikarilan_veri', 'Çıkarılan Yapısal Veri / Kalemler (JSON)'),
          description: t(
            'n8n_var_cikarilan_veri_aciklama',
            'Önceki adımda belgeden veya sorgudan elde edilen yapılandırılmış JSON verisi'
          ),
          dataType: 'veri',
          sourceNodeId: node.id,
          sourceNodeTitle: nodeLabel,
          sourceNodeType: nType
        },
        {
          key: `${node.id}_olusturulanBelge`,
          expression: `{{ ${prefix}.olusturulanBelge }}`,
          label: t('n8n_var_olusturulan_belge', 'Oluşturulan Belge / Kart Taslağı'),
          description: t(
            'n8n_var_olusturulan_belge_aciklama',
            'Önceki düğümde hazırlanan veya aktarılan belge referansı'
          ),
          dataType: 'belge',
          sourceNodeId: node.id,
          sourceNodeTitle: nodeLabel,
          sourceNodeType: nType
        }
      ];
    };

    const selectedSource = oncekiDugumGirdisi.kaynakDugumId;
    if (selectedSource === 'OTOMATIK_ONCEKI' && immediatePreviousNode) {
      const immIdx = previousNodes.length - 1;
      return buildForNode(immediatePreviousNode, immIdx, true);
    }

    if (selectedSource === 'TUM_ONCEKILER') {
      return previousNodes.flatMap((n, idx) =>
        buildForNode(n, idx, idx === previousNodes.length - 1)
      );
    }

    const specificIdx = previousNodes.findIndex((n) => n.id === selectedSource);
    if (specificIdx !== -1) {
      return buildForNode(
        previousNodes[specificIdx],
        specificIdx,
        specificIdx === previousNodes.length - 1
      );
    }

    if (immediatePreviousNode) {
      return buildForNode(immediatePreviousNode, previousNodes.length - 1, true);
    }
    return [];
  }, [isStartNode, previousNodes, immediatePreviousNode, oncekiDugumGirdisi.kaynakDugumId, t]);

  // Bir n8n değişken etiketine tıklandığında aktif düğümün prompt alanına ekle
  const insertVariableIntoPrompt = (expression: string) => {
    setFormData((prev: any) => {
      const currentPrompt = prev?.prompt || '';
      const alreadyHas = currentPrompt.includes(expression);
      const nextPrompt = alreadyHas
        ? currentPrompt
        : currentPrompt.trim()
          ? `${currentPrompt.trim()} ${expression}`
          : expression;

      const currentGirdi = prev?.oncekiDugumGirdisi || DEFAULT_ONCEKI_DUGUM_GIRDISI;
      const existingVars: string[] = Array.isArray(currentGirdi.seciliDegiskenler)
        ? currentGirdi.seciliDegiskenler
        : [];
      const nextVars = existingVars.includes(expression)
        ? existingVars
        : [...existingVars, expression];

      return {
        ...prev,
        prompt: nextPrompt,
        oncekiDugumGirdisi: {
          ...DEFAULT_ONCEKI_DUGUM_GIRDISI,
          ...currentGirdi,
          seciliDegiskenler: nextVars
        }
      };
    });

    toast.success(
      t('n8n_degisken_prompta_eklendi', '{{expr}} değişkeni işlem yönergesine (prompt) eklendi.', {
        expr: expression
      })
    );
  };

  const renderNodeSmallIcon = (tip?: string) => {
    const upper = (tip || '').toUpperCase();
    if (upper === 'BASLA') return <Play size={13} />;
    if (upper === 'FORM_AC' || upper === 'EKRAN_AC') return <Monitor size={13} />;
    if (upper === 'KARAR_ONAY') return <GitBranch size={13} />;
    return <Cpu size={13} />;
  };

  const pageDisplayName = useMemo(() => {
    if (recordTitle?.trim()) return recordTitle.trim();
    if (title?.trim()) return title.trim();
    if (pageTitle?.trim()) return pageTitle.trim();
    if (effectiveFormData?.baslik?.trim()) {
      return `${effectiveFormData.baslik.trim()} • ${t('oge_ayarlari', 'Öğe Ayarları')}`;
    }
    return t('flowchart_oge_ayarlari', 'Flowchart Öğe Ayarları');
  }, [recordTitle, title, pageTitle, effectiveFormData?.baslik, t]);

  useEffect(() => {
    if (setHeaderBreadcrumbOptions) {
      if (subTrail && subTrail.length > 0) {
        setHeaderBreadcrumbOptions({
          subTrail
        });
      } else {
        setHeaderBreadcrumbOptions({
          recordTitle: pageDisplayName
        });
      }
    }
    return () => {
      if (setHeaderBreadcrumbOptions) {
        setHeaderBreadcrumbOptions(null);
      }
    };
  }, [subTrail, pageDisplayName, setHeaderBreadcrumbOptions]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    } else if (backRoute) {
      navigate(backRoute);
    } else {
      navigate(-1);
    }
  };

  const handleSave = async () => {
    try {
      if (controlledIsSaving === undefined) {
        setInternalIsSaving(true);
      }
      if (propOnSave) {
        const finalData = isStartNode
          ? effectiveFormData
          : {
              ...effectiveFormData,
              oncekiDugumGirdisi
            };
        await propOnSave(finalData);
      }
    } finally {
      if (controlledIsSaving === undefined) {
        setInternalIsSaving(false);
      }
    }
  };

  const contextValue = useMemo<FlowchartOgeAyarContextValue>(
    () => ({
      previousNodes,
      immediatePreviousNode,
      availableInputVariables,
      oncekiDugumGirdisi,
      updateOncekiDugumGirdisi,
      insertVariableIntoPrompt
    }),
    [previousNodes, immediatePreviousNode, availableInputVariables, oncekiDugumGirdisi]
  );

  const immediatePrevDisplayName = useMemo(() => {
    if (!immediatePreviousNode) return t('onceki_dugum', 'Önceki Düğüm');
    if (immediatePreviousNode.varlikAdi?.trim()) {
      return `${immediatePreviousNode.baslik || t('form_ac', 'Form Aç')} • ${immediatePreviousNode.varlikAdi.trim()}`;
    }
    return immediatePreviousNode.baslik || t('onceki_dugum', 'Önceki Düğüm');
  }, [immediatePreviousNode, t]);

  return (
    <FlowchartOgeAyarContext.Provider value={contextValue}>
      <BaseCardPage
        id={id}
        title={pageDisplayName}
        pageTitle={pageDisplayName}
        recordTitle={pageDisplayName}
        icon={icon || <Sliders size={24} color="var(--accent-primary)" />}
        subtitleLeft={
          subtitleLeft ||
          t(
            'flowchart_oge_yapilandirma_aciklama',
            'Akış diyagramı düğüm parametreleri ve yapılandırma ayarları'
          )
        }
        showBackButton={showBackButton}
        onClose={handleClose}
        onSave={handleSave}
        isSaving={effectiveIsSaving}
        extraDropdownActions={extraDropdownActions}
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        subTrail={subTrail}
        className={`fade-in ${className}`}
      >
        <div className="flowchart-oge-ayar-content">
          {!isStartNode && (
            <div className="basla-ayar-page-container n8n-input-section-wrapper">
              <section className="basla-ayar-card n8n-input-context-card">
                <div className="basla-ayar-card-header">
                  <div className="basla-ayar-card-header-left">
                    <div className="basla-ayar-icon-box emerald">
                      <Workflow size={18} />
                    </div>
                    <div className="basla-ayar-header-text">
                      <h3 className="basla-ayar-card-title">
                        {t(
                          'onceki_dugumden_gelen_bilgi_ve_belgeler',
                          'Önceki Düğümden Gelen Bilgi ve Belgeler (Girdi Bağlamı)'
                        )}
                      </h3>
                      <p className="basla-ayar-card-subtitle">
                        {t(
                          'onceki_dugumden_gelen_bilgi_aciklama',
                          'Akışta bu adımdan önce çalışan düğümlerin ürettiği belgeleri, form kayıtlarını ve çıktı verilerini bu düğüme girdi (input) olarak bağlayın.'
                        )}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`basla-ayar-switch-pill ${oncekiDugumGirdisi.aktifMi ? 'is-active' : ''}`}
                  >
                    <BaseSwitch
                      id={`${id}_oncekiDugumGirdisiSwitch`}
                      checked={oncekiDugumGirdisi.aktifMi}
                      onChange={(e: any) => {
                        const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                        updateOncekiDugumGirdisi({ aktifMi: checked });
                      }}
                      label={
                        <span className="text-sm font-semibold">
                          {oncekiDugumGirdisi.aktifMi
                            ? t('girdi_baglantisi_aktif', 'Girdi Bağlantısı Aktif')
                            : t('pasif', 'Pasif')}
                        </span>
                      }
                    />
                  </div>
                </div>

                {oncekiDugumGirdisi.aktifMi && (
                  <div className="basla-ayar-card-body">
                    {/* 1. GÖRSEL AKIŞ ZİNCİRİ VE KAYNAK DÜĞÜM SEÇİCİ */}
                    <div className="n8n-input-pipeline-bar">
                      <div className="n8n-input-pipeline-left">
                        <span className="n8n-input-pipeline-label">
                          {t('veri_kaynagi_dugumu', 'Veri & Belge Kaynağı Düğüm:')}
                        </span>
                        <div className="n8n-input-source-pills">
                          <button
                            type="button"
                            className={`n8n-source-node-btn ${
                              oncekiDugumGirdisi.kaynakDugumId === 'OTOMATIK_ONCEKI' ? 'active' : ''
                            }`}
                            onClick={() =>
                              updateOncekiDugumGirdisi({ kaynakDugumId: 'OTOMATIK_ONCEKI' })
                            }
                          >
                            {renderNodeSmallIcon(immediatePreviousNode?.tip)}
                            <span>
                              {t('bir_onceki_dugum_otomatik', 'Bir Önceki Düğüm')}:{' '}
                              <strong>{immediatePrevDisplayName}</strong>
                            </span>
                          </button>

                          {previousNodes.length > 1 && (
                            <button
                              type="button"
                              className={`n8n-source-node-btn ${
                                oncekiDugumGirdisi.kaynakDugumId === 'TUM_ONCEKILER' ? 'active' : ''
                              }`}
                              onClick={() =>
                                updateOncekiDugumGirdisi({ kaynakDugumId: 'TUM_ONCEKILER' })
                              }
                            >
                              <Workflow size={13} />
                              <span>
                                {t('tum_onceki_dugumler', 'Tüm Önceki Düğümler')} (
                                {previousNodes.length})
                              </span>
                            </button>
                          )}

                          {previousNodes.length > 1 &&
                            previousNodes.map((pNode, idx) => {
                              const pTitle = pNode.varlikAdi?.trim()
                                ? `${pNode.baslik || pNode.tip} (${pNode.varlikAdi.trim()})`
                                : pNode.baslik || pNode.tip;
                              return (
                                <button
                                  key={pNode.id || idx}
                                  type="button"
                                  className={`n8n-source-node-btn ${
                                    oncekiDugumGirdisi.kaynakDugumId === pNode.id ? 'active' : ''
                                  }`}
                                  onClick={() =>
                                    updateOncekiDugumGirdisi({ kaynakDugumId: pNode.id })
                                  }
                                >
                                  {renderNodeSmallIcon(pNode.tip)}
                                  <span>
                                    #{idx + 1} {pTitle}
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      <div className="n8n-input-target-indicator">
                        <ArrowRight size={14} className="n8n-input-arrow-icon" />
                        <span className="n8n-current-node-badge">
                          {pageDisplayName}
                        </span>
                      </div>
                    </div>

                    {/* 2. AKTARILACAK VERİ VE BELGE KANALLARI */}
                    <div className="n8n-input-channels-grid">
                      <div
                        className={`n8n-input-channel-card ${
                          oncekiDugumGirdisi.belgeleriAktar ? 'is-active' : ''
                        }`}
                        onClick={() =>
                          updateOncekiDugumGirdisi({
                            belgeleriAktar: !oncekiDugumGirdisi.belgeleriAktar
                          })
                        }
                      >
                        <div className="n8n-input-channel-top">
                          <div className="n8n-input-channel-icon doc">
                            <FileText size={16} />
                          </div>
                          <div className="n8n-input-channel-title-wrap">
                            <span className="n8n-input-channel-title">
                              {t('gelen_belgeleri_ve_dosyalari_al', 'Gelen Belgeler ve Dosya Ekleri')}
                            </span>
                            <span className="n8n-input-channel-badge">
                              {oncekiDugumGirdisi.belgeleriAktar
                                ? t('aktif', 'Aktif')
                                : t('pasif', 'Pasif')}
                            </span>
                          </div>
                        </div>
                        <p className="n8n-input-channel-desc">
                          {t(
                            'gelen_belgeleri_ve_dosyalari_al_aciklama',
                            'Önceki düğümde içeri aktarılan veya yüklenen dosyaları (PDF, Word, Excel, Görsel, Ham Metin) bu düğüme belge eki olarak ilet.'
                          )}
                        </p>
                      </div>

                      <div
                        className={`n8n-input-channel-card ${
                          oncekiDugumGirdisi.formVerileriniAktar ? 'is-active' : ''
                        }`}
                        onClick={() =>
                          updateOncekiDugumGirdisi({
                            formVerileriniAktar: !oncekiDugumGirdisi.formVerileriniAktar
                          })
                        }
                      >
                        <div className="n8n-input-channel-top">
                          <div className="n8n-input-channel-icon data">
                            <Database size={16} />
                          </div>
                          <div className="n8n-input-channel-title-wrap">
                            <span className="n8n-input-channel-title">
                              {t(
                                'kaydedilen_form_ve_varlik_verilerini_al',
                                'Kaydedilen Form ve Kayıt Verileri'
                              )}
                            </span>
                            <span className="n8n-input-channel-badge">
                              {oncekiDugumGirdisi.formVerileriniAktar
                                ? t('aktif', 'Aktif')
                                : t('pasif', 'Pasif')}
                            </span>
                          </div>
                        </div>
                        <p className="n8n-input-channel-desc">
                          {t(
                            'kaydedilen_form_ve_varlik_verilerini_al_aciklama',
                            'Önceki adımda açılan form veya kartta kaydedilen alan bilgilerini (Kayıt ID, JSON alanları, satırlar) bu düğüme aktar.'
                          )}
                        </p>
                      </div>

                      <div
                        className={`n8n-input-channel-card ${
                          oncekiDugumGirdisi.aiCiktisiniAktar ? 'is-active' : ''
                        }`}
                        onClick={() =>
                          updateOncekiDugumGirdisi({
                            aiCiktisiniAktar: !oncekiDugumGirdisi.aiCiktisiniAktar
                          })
                        }
                      >
                        <div className="n8n-input-channel-top">
                          <div className="n8n-input-channel-icon ai">
                            <Sparkles size={16} />
                          </div>
                          <div className="n8n-input-channel-title-wrap">
                            <span className="n8n-input-channel-title">
                              {t(
                                'onceki_adim_ai_ciktisi_ve_baglami_al',
                                'Önceki Adım Çıktısı ve Sohbet Bağlamı'
                              )}
                            </span>
                            <span className="n8n-input-channel-badge">
                              {oncekiDugumGirdisi.aiCiktisiniAktar
                                ? t('aktif', 'Aktif')
                                : t('pasif', 'Pasif')}
                            </span>
                          </div>
                        </div>
                        <p className="n8n-input-channel-desc">
                          {t(
                            'onceki_adim_ai_ciktisi_ve_baglami_al_aciklama',
                            'Önceki düğümün ürettiği AI analiz sonucunu, özetini ve başlangıçtaki kullanıcı isteğini bu adımın bağlamına dahil et.'
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 3. N8N TARZI ÇIKTI ŞEMASI VE DİNAMİK DEĞİŞKEN ETİKETLERİ */}
                    {availableInputVariables.length > 0 && (
                      <div className="n8n-schema-variables-box">
                        <div className="n8n-schema-variables-header">
                          <span className="n8n-schema-variables-title">
                            {t(
                              'onceki_dugum_cikti_degiskenleri',
                              'Önceki Düğümden Kullanılabilir Veri & Belge Değişkenleri (Yönergeye Eklemek İçin Tıklayın)'
                            )}
                          </span>
                          <span className="n8n-schema-variables-hint">
                            <Info size={12} />
                            <span>
                              {t(
                                'n8n_degisken_tikla_ekle_ipucu',
                                'Tıkladığınız değişken etiketi bu düğümün prompt alanına otomatik eklenir'
                              )}
                            </span>
                          </span>
                        </div>

                        <div className="n8n-schema-variables-grid">
                          {availableInputVariables.map((item) => {
                            const isUsedInPrompt = Boolean(
                              effectiveFormData?.prompt &&
                                String(effectiveFormData.prompt).includes(item.expression)
                            );
                            return (
                              <button
                                key={item.key}
                                type="button"
                                className={`n8n-schema-var-chip ${isUsedInPrompt ? 'is-used' : ''}`}
                                onClick={() => insertVariableIntoPrompt(item.expression)}
                                title={item.description}
                              >
                                <div className="n8n-schema-var-top">
                                  <span className={`n8n-schema-var-type type-${item.dataType}`}>
                                    {item.dataType === 'belge'
                                      ? t('belge_etiket', 'BELGE')
                                      : item.dataType === 'veri'
                                        ? t('veri_etiket', 'VERİ')
                                        : item.dataType === 'karar'
                                          ? t('karar_etiket', 'KARAR')
                                          : t('metin_etiket', 'METİN')}
                                  </span>
                                  <code className="n8n-schema-var-code">{item.expression}</code>
                                  <span className="n8n-schema-var-action-icon">
                                    {isUsedInPrompt ? <Check size={13} /> : <Plus size={13} />}
                                  </span>
                                </div>
                                <div className="n8n-schema-var-meta">
                                  <span className="n8n-schema-var-label">{item.label}</span>
                                  <span className="n8n-schema-var-source">{item.sourceNodeTitle}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
          {children}
        </div>
      </BaseCardPage>
    </FlowchartOgeAyarContext.Provider>
  );
};

export default BaseAiAjanFlowchartOgeAyarPage;

