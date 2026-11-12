/**
 * @akalin/ai_management_module - "Belge Oluştur" Düğümü Ayar Sayfası (BelgeOlusturFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Belge Oluştur" (BELGE_OLUSTUR) atomik düğümünün ayarlarını yönetmek
 * - Tek Sorumluluk (Single-Responsibility) ilkesi gereği sol giriş portundan (Script İşlemi / AI İşlemi) gelen yapısal JSON verisiyle
 *   seçili ERP Belgesini veya Kartını (erp_create_document) oluşturacak hedef varlığı ve taslak/kesin kayıt davranışını yapılandırmak
 * - Sabit Düğüm Başlığı ("Belge Oluştur"), 3 Sekmeli (Girdi | Parametreler | Çıktı) standart, Zero Bottom Button,
 *   Sıfır Inline CSS, Sıfır Native HTML Form Elemanı ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  ShieldCheck,
  Info,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseDropdownSecici,
  BaseSwitch,
  FieldError,
  McpVarlikSeciciInput,
  type DropdownOption
} from '@akalin/ui';
import {
  BELGE_OLUSTUR_MCP_TOOL_CODE,
  createDefaultBelgeOlusturDugumu
} from '../defaults/belgeOlusturFlowchartDefaultValue';
import {
  validateBelgeOlusturFlowchartNode,
  type BelgeOlusturValidationErrors
} from '../validators/belgeOlusturFlowchartValidation';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';
import {
  getAgentActiveMcpEntities,
  getAllMcpEntities,
  type AgentActiveMcpEntity
} from './AiMcpYonetimi';
import { MCPSelectionList } from './MCPSelectionList';

export interface BelgeOlusturFlowchartOgeAyarPageProps
  extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const BelgeOlusturFlowchartOgeAyarPage: React.FC<BelgeOlusturFlowchartOgeAyarPageProps> = ({
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
  const effectiveAgentId =
    propAgentId || params.id || (pathAgentIdMatch ? pathAgentIdMatch[1] : undefined);
  const effectiveIstekId =
    propIstekId || params.istekId || (pathIstekIdMatch ? pathIstekIdMatch[1] : undefined);
  const effectiveOgeId =
    propNodeId || params.ogeId || (pathOgeIdMatch ? pathOgeIdMatch[1] : undefined);

  const incomingAgentData = location.state?.agentData;
  const incomingIstekData = location.state?.istekData;
  const incomingNodeFromState = location.state?.nodeData || initialNodeData;

  const [agentData, setAgentData] = useState<any>(incomingAgentData || null);
  const [istekData, setIstekData] = useState<any>(incomingIstekData || null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<BelgeOlusturValidationErrors>({});

  const defaultNodeTitle = t('belge_olustur', 'Belge Oluştur');

  const [formData, setFormData] = useState<any>(() =>
    createDefaultBelgeOlusturDugumu({
      id: effectiveOgeId,
      title: defaultNodeTitle,
      existing: incomingNodeFromState
    })
  );

  useEffect(() => {
    if (!agentData && effectiveAgentId) {
      axios
        .get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then((res) => {
          if (res.data) {
            setAgentData(res.data);
            if (effectiveIstekId && Array.isArray(res.data.hizliIstekler)) {
              const foundIstek = res.data.hizliIstekler.find(
                (x: any) => x.id === effectiveIstekId
              );
              if (foundIstek) {
                setIstekData(foundIstek);
                if (
                  !incomingNodeFromState &&
                  effectiveOgeId &&
                  Array.isArray(foundIstek.akisDugumleri)
                ) {
                  const foundNode = foundIstek.akisDugumleri.find(
                    (n: any) => n.id === effectiveOgeId
                  );
                  if (foundNode) {
                    setFormData(
                      createDefaultBelgeOlusturDugumu({
                        id: foundNode.id,
                        title: defaultNodeTitle,
                        existing: foundNode
                      })
                    );
                  }
                }
              }
            }
          }
        })
        .catch(() => {});
    }
  }, [
    agentData,
    effectiveAgentId,
    effectiveIstekId,
    effectiveOgeId,
    incomingNodeFromState,
    defaultNodeTitle
  ]);

  const activeMcpEntities = useMemo<AgentActiveMcpEntity[]>(() => {
    const codes = agentData?.seciliAracKodlari || incomingAgentData?.seciliAracKodlari || [];
    return getAgentActiveMcpEntities(codes, t).filter(
      (e) => e.kategori === 'belge' || e.kategori === 'kart'
    );
  }, [agentData?.seciliAracKodlari, incomingAgentData?.seciliAracKodlari, t]);

  const allMcpEntities = useMemo<AgentActiveMcpEntity[]>(() => {
    return getAllMcpEntities(t).filter((e) => e.kategori === 'belge' || e.kategori === 'kart');
  }, [t]);

  const selectedEntity = useMemo<AgentActiveMcpEntity | null>(() => {
    if (!formData.mcpVarlikId && !formData.varlikKodu) return null;
    const foundInActive = activeMcpEntities.find(
      (e) =>
        e.id === formData.mcpVarlikId || (formData.varlikKodu && e.kod === formData.varlikKodu)
    );
    if (foundInActive) return foundInActive;
    return (
      allMcpEntities.find(
        (e) =>
          e.id === formData.mcpVarlikId || (formData.varlikKodu && e.kod === formData.varlikKodu)
      ) || null
    );
  }, [activeMcpEntities, allMcpEntities, formData.mcpVarlikId, formData.varlikKodu]);

  const entityCodeOptions = useMemo<DropdownOption[]>(
    () => [
      {
        id: 'BshFiyatFarki',
        value: 'BshFiyatFarki',
        label: t('varlik_bsh_fiyat_farki', 'BshFiyatFarki — BSH Fiyat Farkı Belgesi')
      },
      {
        id: 'KampanyaBelgesi',
        value: 'KampanyaBelgesi',
        label: t('varlik_kampanya_belgesi', 'KampanyaBelgesi — Kampanya Uygulama Belgesi')
      },
      {
        id: 'FiyatListesi',
        value: 'FiyatListesi',
        label: t('varlik_fiyat_listesi', 'FiyatListesi — Fiyat Listesi Belgesi')
      },
      {
        id: 'SatisFaturasi',
        value: 'SatisFaturasi',
        label: t('varlik_satis_faturasi', 'SatisFaturasi — Satış Faturası')
      },
      {
        id: 'AlisFaturasi',
        value: 'AlisFaturasi',
        label: t('varlik_alis_faturasi', 'AlisFaturasi — Alış Faturası')
      }
    ],
    [t]
  );

  const handleSelectMcpEntity = (entity: AgentActiveMcpEntity | any) => {
    setErrors((prev) => ({ ...prev, varlikKodu: undefined }));
    setFormData((prev: any) => ({
      ...prev,
      baslik: defaultNodeTitle,
      mcpVarlikId: entity.id,
      modulKodu: entity.modulKodu,
      modulAdi: entity.modulAdi,
      varlikKodu: entity.kod,
      varlikAdi: entity.ad,
      varlikTuru: entity.kategori || 'belge',
      hedefRota: entity.rota || prev.hedefRota || '',
      aracKodu: BELGE_OLUSTUR_MCP_TOOL_CODE,
      uiAksiyonu: 'YOK'
    }));
  };

  const handleClearMcpEntity = () => {
    setFormData((prev: any) => ({
      ...prev,
      mcpVarlikId: '',
      modulKodu: '',
      modulAdi: '',
      varlikAdi: '',
      hedefRota: '',
      aracKodu: BELGE_OLUSTUR_MCP_TOOL_CODE
    }));
  };

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
    const merged = {
      ...formData,
      ...(overrideData || {})
    };
    return {
      ...merged,
      id: merged.id || effectiveOgeId || `BELGE_OLUSTUR_${Date.now()}`,
      tip: 'BELGE_OLUSTUR',
      baslik: defaultNodeTitle,
      aktifMi: merged.aktifMi !== false,
      aracKodu: BELGE_OLUSTUR_MCP_TOOL_CODE,
      uiAksiyonu: 'YOK',
      varlikKodu: (merged.varlikKodu || selectedEntity?.kod || 'BshFiyatFarki').trim(),
      varlikAdi: merged.varlikAdi || selectedEntity?.ad || '',
      varlikTuru: merged.varlikTuru || selectedEntity?.kategori || 'belge',
      taslakOlarakOlustur: merged.taslakOlarakOlustur !== false
    };
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

  const handleSave = async (overrideNodeData?: any) => {
    const activeNode = buildUpdatedNodePayload(overrideNodeData);
    const validationErrors = validateBelgeOlusturFlowchartNode(activeNode, t);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const firstErr = Object.values(validationErrors).find(Boolean);
      if (firstErr) toast.error(firstErr);
      return;
    }

    const currentAgent = agentData || incomingAgentData;
    const currentIstek = istekData || incomingIstekData;

    if (effectiveAgentId) {
      setIsSaving(true);
      try {
        const agentToUpdate =
          currentAgent || (await axios.get(`/api/AiAjanlar/${effectiveAgentId}`)).data;
        const currentRequests = Array.isArray(agentToUpdate.hizliIstekler)
          ? [...agentToUpdate.hizliIstekler]
          : [];
        const reqIdx = currentRequests.findIndex(
          (x: any) =>
            x.id === effectiveIstekId || (currentIstek?.id && x.id === currentIstek.id)
        );

        const baseReq =
          reqIdx !== -1
            ? { ...currentRequests[reqIdx], ...(currentIstek || {}) }
            : currentIstek || {
                id: effectiveIstekId || `req_${Date.now()}`,
                baslik: '',
                prompt: '',
                ikon: 'Sparkles',
                uiAksiyonu: 'YOK',
                aktifMi: true,
                akisDugumleri: []
              };

        const existingNodes = Array.isArray(baseReq.akisDugumleri)
          ? [...baseReq.akisDugumleri]
          : [];
        const nodeIdx = existingNodes.findIndex((x: any) => x.id === activeNode.id);

        if (nodeIdx !== -1) {
          existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...activeNode };
        } else {
          existingNodes.push(activeNode);
        }

        const updatedIstek = {
          ...baseReq,
          akisDugumleri: existingNodes
        };

        if (reqIdx !== -1) {
          currentRequests[reqIdx] = updatedIstek;
        } else {
          currentRequests.push(updatedIstek);
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
            sessionStorage.removeItem(`webakus_flow_draft_${effectiveAgentId}_${updatedIstek.id}`);
          } catch {
            // ignore
          }
          window.dispatchEvent(new CustomEvent('ai-agents-updated'));
        }

        toast.success(
          t('belge_olustur_dugumu_kaydedildi', 'Belge Oluştur düğümü ayarları başarıyla kaydedildi.')
        );

        if (onSuccess) {
          onSuccess();
        } else if (typeof effectiveBackRoute === 'string') {
          navigate(effectiveBackRoute, {
            state: {
              agentData: payload,
              hizliIstekItem: updatedIstek
            }
          });
        } else {
          navigate(-1);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.mesaj ||
          err?.response?.data?.message ||
          t('kayit_sirasi_hata', 'Kayıt sırasında hata oluştu.');
        toast.error(msg);
      } finally {
        setIsSaving(false);
      }
    } else {
      handleBackOrClose();
    }
  };

  const agentTitle =
    agentData?.ad ||
    incomingAgentData?.ad ||
    (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const istekTitle =
    istekData?.baslik || incomingIstekData?.baslik || t('gorev_akisi', 'Görev Akışı');
  const agentRoute = `${baseAgentRoute}/${effectiveAgentId}`;

  const subTrail = useMemo(
    () => [
      {
        label: t('ai_ajanlar_baslik', 'Ajanlar'),
        onClick: () => navigate(baseAgentRoute)
      },
      {
        label: agentTitle,
        onClick: () => navigate(agentRoute, { state: { activeTabId: 'hizliIstekler' } })
      },
      {
        label: istekTitle,
        onClick: handleBackOrClose
      },
      {
        label: defaultNodeTitle,
        active: true
      }
    ],
    [t, navigate, baseAgentRoute, agentTitle, agentRoute, istekTitle, defaultNodeTitle]
  );

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="belgeOlusturFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="BELGE_OLUSTUR"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('belge_olustur_oge_ayarlari', 'Belge Oluştur Düğümü Ayarları')}
      pageTitle={t('belge_olustur_oge_ayarlari', 'Belge Oluştur Düğümü Ayarları')}
      recordTitle={defaultNodeTitle}
      subTrail={subTrail}
      icon={<FileText size={24} color="#10b981" />}
      subtitleLeft={t(
        'belge_olustur_oge_aciklama',
        'Önceki düğümden (Script İşlemi / AI İşlemi) gelen yapısal JSON verisiyle seçili ERP Belgesini veya Kartını oluşturma yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. KART: OLUŞTURULACAK ERP BELGESİ / KARTI SEÇİMİ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <FileText size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('olusturulacak_erp_belgesi_veya_karti', 'Oluşturulacak ERP Belgesi / Kartı')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'olusturulacak_erp_belgesi_aciklama',
                    'Sol giriş portundan gelen yapısal JSON verisiyle oluşturulacak hedef ERP Belgesini veya Kartını seçin (erp_create_document).'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="basla-ayar-field-label">
                  {t('aktif_mcp_belge_veya_kart_secimi', 'Ajanın Aktif MCP Belge / Kart Yetkisi')}
                </label>
                <McpVarlikSeciciInput
                  id="belgeOlusturMcpEntitySecici"
                  selectedEntity={selectedEntity}
                  seciliAracKodlari={
                    agentData?.seciliAracKodlari || incomingAgentData?.seciliAracKodlari
                  }
                  selectionList={MCPSelectionList}
                  autoFocus
                  placeholder={t(
                    'olusturulacak_belge_veya_karti_secin',
                    'Oluşturulacak ERP Belgesini veya Kartını seçin...'
                  )}
                  onSelect={(entity) => handleSelectMcpEntity(entity)}
                  onClear={handleClearMcpEntity}
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="belge-olustur-varlik-kodu">
                  {t('hedef_belge_turu_kodu', 'Hedef ERP Belge Türü Kodu (documentType)')}
                </label>
                <BaseDropdownSecici
                  id="belge-olustur-varlik-kodu"
                  value={formData.varlikKodu || 'BshFiyatFarki'}
                  options={entityCodeOptions}
                  onChange={(val: string | number | (string | number)[]) => {
                    const nextCode = String(val || 'BshFiyatFarki');
                    setErrors((prev) => ({ ...prev, varlikKodu: undefined }));
                    setFormData((prev: any) => ({
                      ...prev,
                      varlikKodu: nextCode,
                      aracKodu: BELGE_OLUSTUR_MCP_TOOL_CODE
                    }));
                  }}
                  clearable={false}
                />
                {errors.varlikKodu && <FieldError error={errors.varlikKodu} />}
              </div>
            </div>
          </div>
        </section>

        {/* 2. KART: BELGE OLUŞTURMA MODU VE EK EŞLEŞTİRME NOTU */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <ShieldCheck size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('belge_olusturma_davranisi_baslik', 'Belge Kayıt Modu ve Ek Eşleştirme Notu')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'belge_olusturma_davranisi_aciklama',
                    'Belgenin kullanıcı incelemesi için taslak olarak mı hazırlanacağını yoksa doğrudan kaydedileceğini belirleyin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid">
              <div
                className={`form-ac-wizard-option-box ${
                  formData.taslakOlarakOlustur !== false ? 'is-active' : ''
                }`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <CheckCircle2 size={16} />
                    <span>
                      {t(
                        'taslak_olarak_olustur_etiket',
                        'Belgeyi Taslak Olarak Hazırla ve Sohbet Ekranında Açma Düğmesi Sun'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'taslak_olarak_olustur_aciklama',
                      'Aktif olduğunda belge kalemleriyle birlikte taslak (isDraft: true) olarak hazırlanır ve kullanıcı inceleyip tek tıkla onaylayabilir.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="belgeOlusturTaslakSwitch"
                  checked={formData.taslakOlarakOlustur !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({
                      ...prev,
                      taslakOlarakOlustur: Boolean(checked)
                    }));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {formData.taslakOlarakOlustur !== false
                        ? t('taslak', 'Taslak')
                        : t('kesin_kayit', 'Kesin Kayıt')}
                    </span>
                  }
                />
              </div>
            </div>

            <div className="basla-ayar-field-col">
              <label className="basla-ayar-field-label">
                {t('belge_ek_aciklama_veya_eslestirme_notu', 'Belge Üst Bilgi / Eşleştirme Notu (İsteğe Bağlı)')}
              </label>
              <FlowchartPromptMentionInput
                showAttachButton={false}
                rows={3}
                value={formData.prompt || ''}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder={t(
                  'belge_olustur_not_placeholder',
                  'İsteğe bağlı: Belge açıklamasına eklenecek sabit metin veya @ ile önceki düğüm alan referansı...'
                )}
              />
              <div className="basla-ayar-card-footer">
                <span className="basla-ayar-footer-hint">
                  <Info size={13} />
                  <span>
                    {t(
                      'belge_olustur_tek_sorumluluk_ipucu',
                      'Tek Sorumluluk İlkesi: Bu düğüm yalnızca önceki adımdan gelen JSON verisiyle seçili ERP belgesini oluşturur.'
                    )}
                  </span>
                </span>
                <span className="basla-ayar-char-count">
                  <Sparkles size={12} /> {BELGE_OLUSTUR_MCP_TOOL_CODE} ({formData.varlikKodu || 'BshFiyatFarki'})
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default BelgeOlusturFlowchartOgeAyarPage;
