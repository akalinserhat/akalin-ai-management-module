/**
 * @akalin/ai_management_module - "Form Aç" Düğümü Ayar Sayfası (FormAcFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Form Aç" (FORM_AC - Paralelkenar Girdi/Çıktı) düğümünün ayarlarını yönetmek
 * - Ajanın kartına kayıtlı ve aktif edilmiş MCP listesindeki Listeleri, Belgeleri ve Kartları (getAgentActiveMcpEntities) listelemek ve seçtirmek
 * - Sihirbaz (Wizard) akışı için sayfanın kaydedilip kaydedilmediği ve hangi bilgilerle kaydedildiği takibini (kayitBekle, kayitSonrasiTeyitEt) yapılandırmak
 * - Zero Bottom Button, Zero Inline CSS ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Monitor,
  Terminal,
  Sparkles,
  Info,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Tag,
  ExternalLink,
  Braces
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseInput,
  BaseSwitch,
  McpVarlikSeciciInput
} from '@akalin/ui';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  getOpenedEntityFixedJsonSchema,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';
import {
  getAgentActiveMcpEntities,
  getAllMcpEntities,
  type AgentActiveMcpEntity
} from './AiMcpYonetimi';
import { MCPSelectionList } from './MCPSelectionList';

export interface FormAcFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const FormAcFlowchartOgeAyarPage: React.FC<FormAcFlowchartOgeAyarPageProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
  initialNodeData,
  onClose,
  onBack,
  onSuccess,
  backRoute
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();

  const effectiveAgentId = propAgentId || params.id;
  const effectiveIstekId = propIstekId || params.istekId;
  const effectiveOgeId = propNodeId || params.ogeId;

  const incomingAgentData = location.state?.agentData;
  const incomingIstekData = location.state?.istekData;
  const incomingNodeFromState = location.state?.nodeData || initialNodeData;

  const [agentData, setAgentData] = useState<any>(incomingAgentData || null);
  const [istekData, setIstekData] = useState<any>(incomingIstekData || null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const defaultFormTitle = t('form_ac', 'Form Aç');

  const [formData, setFormData] = useState<any>(() => {
    const baseNode = incomingNodeFromState || {};
    return {
      id: baseNode.id || effectiveOgeId || `adim_${Date.now()}`,
      tip: 'FORM_AC',
      baslik: baseNode.baslik || defaultFormTitle,
      prompt: baseNode.prompt || '',
      aracKodu: baseNode.aracKodu || 'erp_navigate',
      uiAksiyonu: baseNode.uiAksiyonu || 'OZEL_ROTA',
      hedefRota: baseNode.hedefRota || '',
      mcpVarlikId: baseNode.mcpVarlikId || '',
      modulKodu: baseNode.modulKodu || '',
      modulAdi: baseNode.modulAdi || '',
      varlikKodu: baseNode.varlikKodu || '',
      varlikAdi: baseNode.varlikAdi || '',
      varlikTuru: baseNode.varlikTuru || '',
      kullaniciMesaji: baseNode.kullaniciMesaji || '',
      dugmeBasligi: baseNode.dugmeBasligi || '',
      hariciSayfaAyarlari: baseNode.hariciSayfaAyarlari || {},
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
                      tip: 'FORM_AC',
                      baslik: foundNode.baslik || defaultFormTitle,
                      prompt: foundNode.prompt || '',
                      aracKodu: foundNode.aracKodu || 'erp_navigate',
                      uiAksiyonu: foundNode.uiAksiyonu || 'OZEL_ROTA',
                      hedefRota: foundNode.hedefRota || '',
                      mcpVarlikId: foundNode.mcpVarlikId || '',
                      modulKodu: foundNode.modulKodu || '',
                      modulAdi: foundNode.modulAdi || '',
                      varlikKodu: foundNode.varlikKodu || '',
                      varlikAdi: foundNode.varlikAdi || '',
                      varlikTuru: foundNode.varlikTuru || '',
                      kullaniciMesaji: foundNode.kullaniciMesaji || '',
                      dugmeBasligi: foundNode.dugmeBasligi || '',
                      hariciSayfaAyarlari: foundNode.hariciSayfaAyarlari || {},
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
  }, [agentData, effectiveAgentId, effectiveIstekId, effectiveOgeId, incomingNodeFromState, defaultFormTitle]);

  // Ajanın kartında kayıtlı ve aktif edilmiş MCP varlıklarını (Liste, Belge, Kart) getir
  const activeMcpEntities = useMemo<AgentActiveMcpEntity[]>(() => {
    const codes = agentData?.seciliAracKodlari || incomingAgentData?.seciliAracKodlari || [];
    return getAgentActiveMcpEntities(codes, t);
  }, [agentData?.seciliAracKodlari, incomingAgentData?.seciliAracKodlari, t]);

  // Sistemdeki tüm MCP varlıkları (fallback amaçlı)
  const allMcpEntities = useMemo<AgentActiveMcpEntity[]>(() => {
    return getAllMcpEntities(t);
  }, [t]);

  // Seçili MCP varlığını bul (önce ajanın aktif listesinde, bulunamazsa genel listede arar)
  const selectedEntity = useMemo<AgentActiveMcpEntity | null>(() => {
    if (!formData.mcpVarlikId && !formData.varlikKodu) return null;
    const foundInActive = activeMcpEntities.find(
      (e) =>
        e.id === formData.mcpVarlikId ||
        (formData.varlikKodu && e.kod === formData.varlikKodu)
    );
    if (foundInActive) return foundInActive;

    return (
      allMcpEntities.find(
        (e) =>
          e.id === formData.mcpVarlikId ||
          (formData.varlikKodu && e.kod === formData.varlikKodu)
      ) || null
    );
  }, [activeMcpEntities, allMcpEntities, formData.mcpVarlikId, formData.varlikKodu]);

  // Seçilen Belge veya Kartın bu düğümün JSON verisi (belgeVerisi) içine gömülecek sabit JSON Schema'sı
  const openedEntitySchema = useMemo(() => {
    const nodeForSchema = {
      ...formData,
      varlikKodu: selectedEntity?.kod || formData.varlikKodu || '',
      varlikAdi: selectedEntity?.ad || formData.varlikAdi || '',
      varlikTuru: selectedEntity?.kategori || formData.varlikTuru || '',
      modulAdi: selectedEntity?.modulAdi || formData.modulAdi || ''
    };
    return getOpenedEntityFixedJsonSchema(nodeForSchema, '$onceki', t);
  }, [formData, selectedEntity, t]);

  // Bir MCP varlığı (Belge / Kart / Liste) seçildiğinde form alanlarını senkronize et
  const handleSelectMcpEntity = (entity: AgentActiveMcpEntity | any) => {
    const nextToolCode =
      entity.kategori === 'belge' || entity.kategori === 'kart'
        ? 'erp_create_document'
        : 'erp_navigate';

    setFormData((prev: any) => ({
      ...prev,
      baslik: defaultFormTitle,
      mcpVarlikId: entity.id,
      modulKodu: entity.modulKodu,
      modulAdi: entity.modulAdi,
      varlikKodu: entity.kod,
      varlikAdi: entity.ad,
      varlikTuru: entity.kategori,
      hedefRota: entity.rota || prev.hedefRota || '',
      aracKodu: nextToolCode,
      uiAksiyonu: 'OZEL_ROTA'
    }));
  };

  // MCP varlık seçimini temizle
  const handleClearMcpEntity = () => {
    setFormData((prev: any) => ({
      ...prev,
      mcpVarlikId: '',
      modulKodu: '',
      modulAdi: '',
      varlikKodu: '',
      varlikAdi: '',
      varlikTuru: '',
      hedefRota: '',
      aracKodu: 'erp_navigate',
      hariciSayfaAyarlari: {}
    }));
  };

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const effectiveBackRoute = useMemo(() => {
    if (backRoute) return backRoute;
    if (effectiveAgentId && effectiveIstekId) {
      return isUnderAyarlar
        ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`
        : `/ai-ajanlar/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;
    }
    return -1 as any;
  }, [backRoute, effectiveAgentId, effectiveIstekId, isUnderAyarlar]);

  const buildUpdatedNodePayload = (overrideData?: any) => {
    const merged = {
      ...formData,
      ...(overrideData || {}),
      id: formData.id || effectiveOgeId || `adim_${Date.now()}`,
      tip: 'FORM_AC',
      baslik: defaultFormTitle,
      kayitBekle: (overrideData?.kayitBekle !== undefined ? overrideData.kayitBekle : formData.kayitBekle) !== false,
      kayitSonrasiTeyitEt:
        (overrideData?.kayitSonrasiTeyitEt !== undefined
          ? overrideData.kayitSonrasiTeyitEt
          : formData.kayitSonrasiTeyitEt) !== false
    };
    return merged;
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

      let updatedReq: any = null;

      if (effectiveAgentId && agentToUpdate && effectiveIstekId) {
        const currentRequests = Array.isArray(agentToUpdate.hizliIstekler)
          ? [...agentToUpdate.hizliIstekler]
          : [];
        const reqIdx = currentRequests.findIndex((x: any) => x.id === effectiveIstekId);

        if (reqIdx !== -1) {
          const currentReq = { ...currentRequests[reqIdx] };
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
          currentRequests[reqIdx] = currentReq;
          updatedReq = currentReq;

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
        }
      }

      toast.success(
        t('form_ac_ayarlari_kaydedildi', 'Form Aç düğümü ayarları başarıyla kaydedildi.')
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

  const ajanlarListRoute = isUnderAyarlar
    ? '/ayarlar/YapayZekaAyarlari/AiAjanlar'
    : '/ai-ajanlar';
  const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar');

  const agentTitle =
    agentData?.ad ||
    incomingAgentData?.ad ||
    (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const istekTitle =
    istekData?.baslik ||
    incomingIstekData?.baslik ||
    t('gorev_akisi', 'Görev Akışı');
  const nodeTitle = defaultFormTitle;

  const agentRoute = isUnderAyarlar
    ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}`
    : `/ai-ajanlar/${effectiveAgentId}`;

  const istekRoute = isUnderAyarlar
    ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`
    : `/ai-ajanlar/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;

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

  const handleAppendPromptSnippet = (snippetText: string) => {
    setFormData((prev: any) => {
      const current = (prev.prompt || '').trim();
      return {
        ...prev,
        prompt: current ? `${current}\n${snippetText}` : snippetText
      };
    });
  };

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="formAcFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="FORM_AC"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('form_ac_oge_ayarlari', 'Form Aç Düğümü Ayarları')}
      pageTitle={t('form_ac_oge_ayarlari', 'Form Aç Düğümü Ayarları')}
      recordTitle={nodeTitle}
      subTrail={subTrail}
      icon={<Monitor size={24} color="#06b6d4" />}
      subtitleLeft={t(
        'form_ac_oge_aciklama',
        'Ajanın aktif MCP listesinden Belge, Kart veya Liste açma, kayıt takibi ve kullanıcı teyidi yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. BÖLÜM: AÇILACAK FORM SEÇİMİ (AJANIN AKTİF MCP BELGE, KART VE LİSTELERİ) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <Monitor size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('acilacak_form_ve_mcp_varligi', 'Açılacak Form ve Aktif MCP Varlığı')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'acilacak_form_ve_mcp_varligi_aciklama',
                    'Bu düğüm çalışırken açılacak olan Kart, Belge veya Listeyi ajanın aktif MCP yetkileri arasından seçin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="basla-ayar-field-col">
              <label className="basla-ayar-field-label">
                {t(
                  'acilacak_form_ve_mcp_varligi',
                  'Açılacak Form ve Aktif MCP Varlığı'
                )}
              </label>
              <McpVarlikSeciciInput
                id="formAcMcpEntitySecici"
                selectedEntity={selectedEntity}
                seciliAracKodlari={agentData?.seciliAracKodlari || incomingAgentData?.seciliAracKodlari}
                selectionList={MCPSelectionList}
                externalSettingsValue={formData.hariciSayfaAyarlari}
                onExternalSettingsChange={(val) =>
                  setFormData((prev: any) => ({ ...prev, hariciSayfaAyarlari: val }))
                }
                autoFocus
                placeholder={t(
                  'mcp_belge_kart_liste_secin',
                  'Açılacak Belge, Kart veya Listeyi seçin...'
                )}
                onSelect={(entity) => handleSelectMcpEntity(entity)}
                onClear={handleClearMcpEntity}
              />
            </div>
          </div>
        </section>

        {/* 2. BÖLÜM: SOHBET EKRANI YÖNERGESİ VE FORM AÇMA DÜĞMESİ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <MessageSquare size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'sohbet_yonergesi_ve_form_acma_dugmesi',
                    'Sohbet Ekranı Yönergesi ve Form Açma Düğmesi'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'sohbet_yonergesi_ve_form_acma_dugmesi_aciklama',
                    'Bu adıma gelindiğinde sohbet ekranında kullanıcıya gösterilecek açıklama mesajını ve altında yer alacak form açma düğmesini yapılandırın.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="basla-ayar-field-col">
              <label className="basla-ayar-field-label">
                {t(
                  'sohbet_ekraninda_gosterilecek_mesaj',
                  'Sohbet Ekranında Gösterilecek Yönerge Mesajı'
                )}
              </label>
              <div className="form-ac-snippet-bar">
                <span className="form-ac-snippet-label">
                  {t('hazir_mesaj_kalibi_ekle', 'Hazır Mesaj Kalıbı:')}
                </span>
                <button
                  type="button"
                  className="form-ac-snippet-chip"
                  onClick={() =>
                    setFormData((prev: any) => ({
                      ...prev,
                      kullaniciMesaji: t(
                        'snippet_kampanya_yazisi_import_mesaji',
                        'Kampanya yazısını içeri aktarmak için aşağıdaki düğmeye basın.'
                      )
                    }))
                  }
                >
                  + {t('kampanya_yazisi_ice_aktar_mesaji', 'Kampanya Yazısını İçeri Aktar')}
                </button>
                <button
                  type="button"
                  className="form-ac-snippet-chip"
                  onClick={() =>
                    setFormData((prev: any) => ({
                      ...prev,
                      kullaniciMesaji: t(
                        'snippet_ilgili_formu_ac_mesaji',
                        'İşleme devam etmek için aşağıdaki düğmeye basarak ilgili ekranı açın.'
                      )
                    }))
                  }
                >
                  + {t('genel_form_acilis_mesaji', 'Genel Form Açılış Yönergesi')}
                </button>
              </div>
              <FlowchartPromptMentionInput
                showAttachButton={false}
                rows={3}
                value={formData.kullaniciMesaji || ''}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, kullaniciMesaji: e.target.value }))
                }
                placeholder={t(
                  'form_ac_kullanici_mesaji_placeholder',
                  'Örn: Kampanya yazısını içeri aktarmak için aşağıdaki düğmeye basın.'
                )}
              />
            </div>

            <div className="basla-ayar-input-grid">
              <div className="basla-ayar-field-col">
                <label className="basla-ayar-field-label">
                  {t('form_acma_dugmesi_basligi', 'Form Açma Düğmesi Üzerinde Görünecek İsim')}
                </label>
                <BaseInput
                  icon={<Tag size={14} />}
                  value={formData.dugmeBasligi || ''}
                  onChange={(e) =>
                    setFormData((prev: any) => ({ ...prev, dugmeBasligi: e.target.value }))
                  }
                  placeholder={t(
                    'form_ac_dugme_basligi_placeholder',
                    'Boş bırakılırsa seçilen form adı kullanılır (Örn: Dosya İçeri Aktar Ekranını Aç)'
                  )}
                />
              </div>

              <div className="basla-ayar-preview-col">
                <span className="basla-ayar-field-label">
                  {t('sohbet_karti_onizlemesi', 'Sohbet Ekranı Görünümü (Önizleme)')}
                </span>
                <div className="form-ac-chat-preview-box">
                  <p className="form-ac-chat-preview-text">
                    {formData.kullaniciMesaji?.trim() ||
                      (selectedEntity?.ad
                        ? t(
                          'form_ac_varsayilan_onizleme_mesaji',
                          '{{formAdi}} ekranını açmak için aşağıdaki düğmeye basın.',
                          { formAdi: selectedEntity.ad }
                        )
                        : t(
                          'snippet_kampanya_yazisi_import_mesaji',
                          'Kampanya yazısını içeri aktarmak için aşağıdaki düğmeye basın.'
                        ))}
                  </p>
                  <span className="form-ac-chat-preview-btn">
                    <ExternalLink size={13} />
                    <span>
                      {formData.dugmeBasligi?.trim() ||
                        (selectedEntity?.ad
                          ? `${selectedEntity.ad} ${t('ekranini_ac', 'Ekranını Aç')}`
                          : t('formu_ac', 'Formu Aç'))}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. BÖLÜM: SİHİRBAZ KAYIT TAKİBİ VE KULLANICI TEYİDİ (WIZARD HANDSHAKE) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <ShieldCheck size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'sihirbaz_kayit_takibi_ve_teyit',
                    'Sihirbaz Kayıt Takibi ve Kullanıcı Teyidi'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'sihirbaz_kayit_takibi_aciklama',
                    'Açılan sayfanın kaydedilip kaydedilmediğini, hangi bilgilerle kaydedildiğini yakalayın ve sonraki adıma geçmeden önce kullanıcıya teyit ettirin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid">
              {/* Seçenek 1: Kayıt Bekle ve Kaydedilen Bilgileri Al */}
              <div
                className={`form-ac-wizard-option-box ${formData.kayitBekle !== false ? 'is-active' : ''
                  }`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <CheckCircle2 size={16} />
                    <span>
                      {t(
                        'kayit_bekle_ve_bilgileri_al',
                        'Sayfanın Kaydedilmesini Bekle ve Kaydedilen Bilgileri Al'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'kayit_bekle_ve_bilgileri_al_aciklama',
                      'Kullanıcı açılan kartı veya belgeyi doldurup kaydettiğinde, kaydedilip kaydedilmediği bilgisi ve kaydedilen tüm alan verileri otomatik olarak AI sohbetine iletilir.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="formAcKayitBekleSwitch"
                  checked={formData.kayitBekle !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({ ...prev, kayitBekle: checked }));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {formData.kayitBekle !== false
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  }
                />
              </div>

              {/* Seçenek 2: Kayıt Sonrası Bilgileri Sun ve Teyit Et */}
              <div
                className={`form-ac-wizard-option-box ${formData.kayitSonrasiTeyitEt !== false ? 'is-active' : ''
                  }`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Sparkles size={16} />
                    <span>
                      {t(
                        'kayit_sonrasi_kullaniciya_teyit_ettir',
                        'Kaydedilen Bilgileri Kullanıcıya Sunup Teyit Ettikten Sonra İlerle'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'kayit_sonrasi_kullaniciya_teyit_ettir_aciklama',
                      'Kart veya belge kaydedildikten sonra yapay zeka kaydedilen verileri sohbet ekranında kullanıcıya özetler, teyit alır ve ardından akıştaki bir sonraki düğüme geçer.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="formAcKayitSonrasiTeyitSwitch"
                  checked={formData.kayitSonrasiTeyitEt !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({
                      ...prev,
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

        {/* 3. BÖLÜM: FORM AÇILIŞ KOŞULU, ÖN DOLDURMA VE AI TALİMATI */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <Terminal size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'form_acilis_kosulu_ve_ai_talimati',
                    'Form Açılış Koşulu ve Yapay Zeka Sihirbaz Talimatı'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'form_acilis_kosulu_ve_ai_talimati_aciklama',
                    'Yapay zekanın bu formu hangi durumda açacağını, kullanıcının cümlesindeki hangi bilgileri forma ön-dolduracağını ve kayıt sonrasında neyi teyit edeceğini belirtin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-snippet-bar">
              <span className="form-ac-snippet-label">
                {t('hazir_sihirbaz_kalibi_ekle', 'Hazır Sihirbaz Kalıbı Ekle:')}
              </span>
              <button
                type="button"
                className="form-ac-snippet-chip"
                onClick={() =>
                  handleAppendPromptSnippet(
                    t(
                      'snippet_kayit_yoksa_ac_bekle',
                      'Eğer ilgili kayıt sistemde bulunamazsa bu formu aç, kullanıcının verdiği bilinen alanları forma aktar ve kullanıcının formu doldurup kaydetmesini bekle.'
                    )
                  )
                }
              >
                + {t('kayit_yoksa_formu_ac_ve_bekle', 'Kayıt Yoksa Formu Aç & Bekle')}
              </button>
              <button
                type="button"
                className="form-ac-snippet-chip"
                onClick={() =>
                  handleAppendPromptSnippet(
                    t(
                      'snippet_kayit_sonrasi_ozetle_teyit_al',
                      'Kullanıcı formu kaydettiğinde kaydedilen tüm bilgileri (Unvan/Ad, Kod, Tutar vb.) kullanıcıya özetleyerek sun, teyit iste ve onay sonrasında bir sonraki adıma geç.'
                    )
                  )
                }
              >
                + {t('kayit_sonrasi_bilgileri_teyit_et', 'Kayıt Sonrası Bilgileri Teyit Et')}
              </button>
            </div>

            <FlowchartPromptMentionInput
              showAttachButton={false}
              rows={6}
              value={formData.prompt}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, prompt: e.target.value }))
              }
              placeholder={t(
                'form_ac_prompt_placeholder',
                'Örn: Müşteri sistemde kayıtlı değilse Cari Kart ekranını aç. Kullanıcının belirttiği müşteri adını forma aktar ve kullanıcının kartı doldurup kaydetmesini bekle. Kart kaydedildikten sonra kaydedilen cari bilgilerini kullanıcıya sunup teyit et ve satış adımına geç.'
              )}
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'form_ac_prompt_ipucu',
                    'İpucu: Sihirbaz akışında form kaydedildiğinde kaydedilen alanlar otomatik olarak yapay zekaya aktarılır.'
                  )}
                </span>
              </span>
              <span className="basla-ayar-char-count">
                {(formData.prompt || '').length} {t('karakter', 'karakter')}
              </span>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default FormAcFlowchartOgeAyarPage;
