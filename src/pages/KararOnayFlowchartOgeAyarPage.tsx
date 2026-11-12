/**
 * @akalin/ai_management_module - "Karar / Onay" Düğümü Ayar Sayfası (KararOnayFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Karar / Onay" (KARAR_ONAY) atomik düğümünün ayarlarını yönetmek
 * - Tek Sorumluluk (Single-Responsibility) ilkesi gereği yalnızca kullanıcı onayı veya karar kriterini değerlendirip
 *   akışı sağ taraftaki iki ayrı çıkış portuna ("Evet" -> evetDugumId, "Hayır" -> hayirDugumId) yönlendirmek
 * - Sabit Düğüm Başlığı ("Karar / Onay"), 3 Sekmeli (Girdi | Parametreler | Çıktı) standart, Zero Bottom Button,
 *   Sıfır Inline CSS, Sıfır Native HTML Form Elemanı ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  GitBranch,
  MessageSquare,
  Tag,
  Info
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseDropdownSecici,
  BaseInput,
  FieldError,
  type DropdownOption
} from '@akalin/ui';
import {
  KARAR_ONAY_MCP_TOOL_CODE,
  createDefaultKararOnayDugumu
} from '../defaults/kararOnayFlowchartDefaultValue';
import {
  validateKararOnayFlowchartNode,
  type KararOnayValidationErrors
} from '../validators/kararOnayFlowchartValidation';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';

export interface KararOnayFlowchartOgeAyarPageProps
  extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const KararOnayFlowchartOgeAyarPage: React.FC<KararOnayFlowchartOgeAyarPageProps> = ({
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
  const [errors, setErrors] = useState<KararOnayValidationErrors>({});

  const defaultNodeTitle = t('karar_onay', 'Karar / Onay');

  const [formData, setFormData] = useState<any>(() =>
    createDefaultKararOnayDugumu({
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
                      createDefaultKararOnayDugumu({
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

  // Evet / Hayır sağ çıkış portlarının bağlanabileceği diğer akış düğümleri
  const branchTargetOptions = useMemo<DropdownOption[]>(() => {
    const currentIstek = istekData || incomingIstekData;
    const allNodes: any[] = Array.isArray(currentIstek?.akisDugumleri)
      ? currentIstek.akisDugumleri
      : [];

    const endOption: DropdownOption = {
      id: '',
      value: '',
      label: t('akisi_bu_dalda_sonlandir', 'Bağlantı Yok (Akışı Bu Dalda Sonlandır)')
    };

    const candidates = allNodes
      .filter(
        (n) =>
          n &&
          n.id &&
          n.id !== formData.id &&
          n.id !== 'BASLA' &&
          (n.tip || '').toUpperCase() !== 'BASLA'
      )
      .map((n, idx): DropdownOption => {
        const tipUpper = (n.tip || '').toUpperCase();
        const typeTitle =
          tipUpper === 'FORM_AC'
            ? t('form_ac', 'Form Aç')
            : tipUpper === 'AI_ISLEM'
              ? t('ai_islem', 'AI İşlemi')
              : tipUpper === 'HAFIZA'
                ? t('hafiza', 'Hafıza')
                : tipUpper === 'SCRIPT_ISLEM'
                  ? t('script_islem', 'Script İşlemi')
                  : tipUpper === 'BELGE_OLUSTUR'
                    ? t('belge_olustur', 'Belge Oluştur')
                    : tipUpper === 'KARAR_ONAY'
                      ? t('karar_onay', 'Karar / Onay')
                      : n.baslik || `${idx + 1}. ${t('adim', 'Adım')}`;
        const detailSuffix = n.varlikAdi || n.dosyaAdi || n.varlikKodu || '';
        return {
          id: n.id,
          value: n.id,
          label: detailSuffix ? `${typeTitle} (${detailSuffix}) — [${n.id}]` : `${typeTitle} — [${n.id}]`
        };
      });

    return [endOption, ...candidates];
  }, [istekData, incomingIstekData, formData.id, t]);

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
    const resolvedMessage = String(merged.kullaniciMesaji || merged.prompt || '').trim();
    return {
      ...merged,
      id: merged.id || effectiveOgeId || `KARAR_ONAY_${Date.now()}`,
      tip: 'KARAR_ONAY',
      baslik: defaultNodeTitle,
      aktifMi: merged.aktifMi !== false,
      aracKodu: KARAR_ONAY_MCP_TOOL_CODE,
      uiAksiyonu: 'YOK',
      hedefRota: '',
      sonrakiDugumId: '',
      kullaniciMesaji: resolvedMessage,
      prompt: resolvedMessage,
      dugmeBasligi: String(merged.dugmeBasligi || '').trim(),
      evetDugumId: String(merged.evetDugumId || ''),
      hayirDugumId: String(merged.hayirDugumId || '')
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
    const validationErrors = validateKararOnayFlowchartNode(activeNode, t);
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
          t('karar_onay_dugumu_kaydedildi', 'Karar / Onay düğümü ayarları başarıyla kaydedildi.')
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
      id="kararOnayFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="KARAR_ONAY"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('karar_onay_oge_ayarlari', 'Karar / Onay Düğümü Ayarları')}
      pageTitle={t('karar_onay_oge_ayarlari', 'Karar / Onay Düğümü Ayarları')}
      recordTitle={defaultNodeTitle}
      subTrail={subTrail}
      icon={<GitBranch size={24} color="#f59e0b" />}
      subtitleLeft={t(
        'karar_onay_oge_aciklama',
        'Kullanıcı onayı veya karar kriterine göre akışı Evet ve Hayır sağ çıkış portlarına yönlendirme yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. KART: ONAY SORUSU VE KARAR KRİTERİ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <MessageSquare size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('karar_onay_mesaji_ve_kriteri_baslik', 'Kullanıcı Onay Mesajı ve Karar Kriteri')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'karar_onay_mesaji_ve_kriteri_aciklama',
                    'Bu adıma gelindiğinde sohbet ekranında kullanıcıya sorulacak onay mesajını veya dallanma kriterini yazın.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="basla-ayar-field-col">
              <label className="basla-ayar-field-label">
                {t('kullaniciya_sorulacak_onay_mesaji', 'Kullanıcıya Sorulacak Onay Mesajı')}
              </label>
              <FlowchartPromptMentionInput
                autoFocus
                showAttachButton={false}
                rows={4}
                value={formData.kullaniciMesaji || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.trim()) {
                    setErrors((prev) => ({ ...prev, kullaniciMesaji: undefined }));
                  }
                  setFormData((prev: any) => ({
                    ...prev,
                    kullaniciMesaji: val,
                    prompt: val
                  }));
                }}
                placeholder={t(
                  'karar_onay_mesaji_placeholder',
                  'Örn: Çıkarılan kampanya ürün ve fiyat farkı kalemlerini onaylıyor musunuz? Onaylarsanız ERP belgesi oluşturulacaktır.'
                )}
              />
              {errors.kullaniciMesaji && <FieldError error={errors.kullaniciMesaji} />}
            </div>

            <div className="basla-ayar-field-col">
              <label className="basla-ayar-field-label">
                {t('onay_dugmesi_etiketi', 'Onay Düğmesi Etiketi (İsteğe Bağlı)')}
              </label>
              <BaseInput
                icon={<Tag size={14} />}
                value={formData.dugmeBasligi || ''}
                onChange={(e) =>
                  setFormData((prev: any) => ({ ...prev, dugmeBasligi: e.target.value }))
                }
                placeholder={t(
                  'karar_onay_dugme_basligi_placeholder',
                  'Varsayılan: Evet, Onaylıyorum / Hayır, İptal Et'
                )}
              />
            </div>
          </div>
        </section>

        {/* 2. KART: SAĞ ÇIKIŞ PORTLARI (EVET / HAYIR DALLANMA HEDEFLERİ) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <GitBranch size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('evet_hayir_cikis_portlari_baslik', 'Evet / Hayır Sağ Çıkış Portları Yönlendirmesi')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'evet_hayir_cikis_portlari_aciklama',
                    'Tuval üzerinde sağdaki Evet ve Hayır portlarından kablo çekerek veya aşağıdaki seçicilerden hedef adımları belirleyebilirsiniz.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="karar-onay-branch-grid">
              <div className="karar-onay-branch-box is-yes">
                <div className="karar-onay-branch-header">
                  <span className="karar-onay-branch-dot is-yes" />
                  <span>{t('evet_cikis_portu_hedefi', 'Evet (Onay) Çıkış Portu Hedefi')}</span>
                </div>
                <p className="karar-onay-branch-desc">
                  {t(
                    'evet_cikis_portu_aciklama',
                    'Kullanıcı onay verdiğinde veya koşul sağlandığında çalışacak sonraki düğüm.'
                  )}
                </p>
                <BaseDropdownSecici
                  id="karar-onay-evet-dugum"
                  value={formData.evetDugumId || ''}
                  options={branchTargetOptions}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      evetDugumId: String(val ?? '')
                    }))
                  }
                  clearable={false}
                />
              </div>

              <div className="karar-onay-branch-box is-no">
                <div className="karar-onay-branch-header">
                  <span className="karar-onay-branch-dot is-no" />
                  <span>{t('hayir_cikis_portu_hedefi', 'Hayır (Red) Çıkış Portu Hedefi')}</span>
                </div>
                <p className="karar-onay-branch-desc">
                  {t(
                    'hayir_cikis_portu_aciklama',
                    'Kullanıcı reddettiğinde veya koşul sağlanmadığında çalışacak alternatif düğüm.'
                  )}
                </p>
                <BaseDropdownSecici
                  id="karar-onay-hayir-dugum"
                  value={formData.hayirDugumId || ''}
                  options={branchTargetOptions}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      hayirDugumId: String(val ?? '')
                    }))
                  }
                  clearable={false}
                />
              </div>
            </div>

            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'karar_onay_tek_sorumluluk_ipucu',
                    'Tek Sorumluluk İlkesi: Bu düğüm ekran açmaz veya belge oluşturmaz; yalnızca akışı Evet / Hayır çıkış portlarına yönlendirir.'
                  )}
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default KararOnayFlowchartOgeAyarPage;
