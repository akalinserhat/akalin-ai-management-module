/**
 * @akalin/ai_management_module - "Başla" Düğümü Ayar Sayfası (BaslaFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Başla" (Terminator) düğümünün ayarlarını yönetmek
 * - Akışın başlangıç başlığını, tetikleme anahtarlarını, hızlı erişim düğmesi ve düğme ismini, promptunu yapılandırmak
 * - Zero Bottom Button, ActionMenu ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Terminal, Sparkles, Tag, EyeOff, Info } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseInput,
  BaseSwitch,
  NotInput
} from '@akalin/ui';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';

export interface BaslaFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const BaslaFlowchartOgeAyarPage: React.FC<BaslaFlowchartOgeAyarPageProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
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

  // location.state'ten veya props'tan gelen verileri çözümle
  const incomingNode = location.state?.nodeData || initialNodeData || {
    id: 'BASLA',
    tip: 'BASLA',
    baslik: t('basla', 'Başla'),
    tetiklemeAnahtarlari: '',
    prompt: '',
    hizliErisimDugmesi: true,
    dugmeBasligi: ''
  };

  const incomingAgentData = location.state?.agentData;
  const incomingIstekData = location.state?.istekData;

  const [agentData, setAgentData] = useState<any>(incomingAgentData || null);
  const [istekData, setIstekData] = useState<any>(incomingIstekData || null);

  useEffect(() => {
    if (!agentData && effectiveAgentId) {
      axios.get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then(res => {
          if (res.data) {
            setAgentData(res.data);
            if (!istekData && effectiveIstekId && Array.isArray(res.data.hizliIstekler)) {
              const found = res.data.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
              if (found) setIstekData(found);
            }
          }
        })
        .catch(() => { });
    }
  }, [agentData, effectiveAgentId, istekData, effectiveIstekId]);

  const [formData, setFormData] = useState<any>(() => ({
    id: incomingNode.id || 'BASLA',
    tip: 'BASLA',
    baslik: t('basla', 'Başla'),
    tetiklemeAnahtarlari: incomingNode.tetiklemeAnahtarlari || incomingIstekData?.tetiklemeAnahtarlari || '',
    prompt: incomingNode.prompt || incomingIstekData?.prompt || '',
    hizliErisimDugmesi: incomingNode.hizliErisimDugmesi !== false && incomingIstekData?.hizliErisimDugmesi !== false,
    dugmeBasligi: incomingNode.dugmeBasligi || incomingIstekData?.dugmeBasligi || ''
  }));

  // istekData yüklendiğinde formData prompt, anahtarlar veya düğme başlığı boşsa senkronize et
  useEffect(() => {
    if (istekData) {
      setFormData((prev: any) => ({
        ...prev,
        tetiklemeAnahtarlari: prev.tetiklemeAnahtarlari || istekData.tetiklemeAnahtarlari || '',
        prompt: prev.prompt || istekData.prompt || '',
        hizliErisimDugmesi: prev.hizliErisimDugmesi !== undefined
          ? prev.hizliErisimDugmesi
          : (istekData.hizliErisimDugmesi !== false),
        dugmeBasligi: prev.dugmeBasligi !== undefined ? prev.dugmeBasligi : (istekData.dugmeBasligi || '')
      }));
    }
  }, [istekData]);

  const [isSaving, setIsSaving] = useState<boolean>(false);

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

  const handleBackOrClose = () => {
    if (typeof effectiveBackRoute === 'string') {
      const existingNodes = Array.isArray(incomingIstekData?.akisDugumleri) ? [...incomingIstekData.akisDugumleri] : [];
      const nodeIdx = existingNodes.findIndex((x: any) => x.id === 'BASLA' || x.tip === 'BASLA');
      const activeBaslaNode = {
        ...formData,
        id: 'BASLA',
        tip: 'BASLA',
        baslik: t('basla', 'Başla'),
        hizliErisimDugmesi: formData.hizliErisimDugmesi !== false,
        dugmeBasligi: formData.dugmeBasligi || ''
      };

      if (nodeIdx !== -1) {
        existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...activeBaslaNode };
      } else {
        existingNodes.unshift(activeBaslaNode);
      }

      navigate(effectiveBackRoute, {
        state: {
          agentData: incomingAgentData,
          hizliIstekItem: incomingIstekData ? {
            ...incomingIstekData,
            hizliErisimDugmesi: formData.hizliErisimDugmesi !== false,
            dugmeBasligi: formData.dugmeBasligi || '',
            tetiklemeAnahtarlari: formData.tetiklemeAnahtarlari,
            prompt: formData.prompt,
            akisDugumleri: existingNodes
          } : undefined
        }
      });
    } else {
      navigate(-1);
    }
  };

  const handleSave = async (dataToSave: any) => {
    try {
      setIsSaving(true);
      const payloadNode = {
        ...formData,
        ...dataToSave,
        id: 'BASLA',
        tip: 'BASLA',
        baslik: t('basla', 'Başla'),
        hizliErisimDugmesi: (dataToSave?.hizliErisimDugmesi !== undefined ? dataToSave.hizliErisimDugmesi : formData.hizliErisimDugmesi) !== false,
        dugmeBasligi: (dataToSave?.dugmeBasligi !== undefined ? dataToSave.dugmeBasligi : formData.dugmeBasligi) || ''
      };

      let agentToUpdate = incomingAgentData;
      if (!agentToUpdate && effectiveAgentId) {
        const res = await axios.get(`/api/AiAjanlar/${effectiveAgentId}`);
        agentToUpdate = res.data;
      }

      let updatedReq: any = null;

      if (effectiveAgentId && agentToUpdate && effectiveIstekId) {
        const currentRequests = Array.isArray(agentToUpdate.hizliIstekler) ? [...agentToUpdate.hizliIstekler] : [];
        const reqIdx = currentRequests.findIndex((x: any) => x.id === effectiveIstekId);

        if (reqIdx !== -1) {
          const currentReq = { ...currentRequests[reqIdx] };
          const currentNodes = Array.isArray(currentReq.akisDugumleri) ? [...currentReq.akisDugumleri] : [];
          const nodeIdx = currentNodes.findIndex((x: any) => x.id === 'BASLA' || x.tip === 'BASLA');

          if (nodeIdx !== -1) {
            currentNodes[nodeIdx] = { ...currentNodes[nodeIdx], ...payloadNode };
          } else {
            currentNodes.unshift(payloadNode);
          }

          currentReq.akisDugumleri = currentNodes;
          // DİKKAT: İstek başlığı (currentReq.baslik) korunur, ezilmez!
          currentReq.hizliErisimDugmesi = payloadNode.hizliErisimDugmesi !== false;
          currentReq.dugmeBasligi = payloadNode.dugmeBasligi || '';
          currentReq.prompt = payloadNode.prompt ?? currentReq.prompt ?? '';

          currentRequests[reqIdx] = currentReq;
          updatedReq = currentReq;

          const payload = {
            ...agentToUpdate,
            kapsam: parseInt(agentToUpdate.kapsam, 10) || 1,
            aiSaglayiciId: agentToUpdate.aiSaglayiciId ? parseInt(agentToUpdate.aiSaglayiciId, 10) : null,
            sicaklik: parseFloat(agentToUpdate.sicaklik) || 0.7,
            maxTokens: parseInt(agentToUpdate.maxTokens, 10) || 2048,
            yanitSenteziModu: parseInt(agentToUpdate.yanitSenteziModu as any, 10) || 0,
            hizliIstekler: currentRequests
          };

          await axios.put(`/api/AiAjanlar/${effectiveAgentId}`, payload);
        }
      }

      toast.success(t('basla_ayarlari_kaydedildi', 'Başla düğümü ayarları başarıyla kaydedildi.'));

      if (onSuccess) {
        onSuccess();
      } else {
        if (typeof effectiveBackRoute === 'string') {
          navigate(effectiveBackRoute, {
            state: {
              agentData: agentToUpdate,
              hizliIstekItem: updatedReq || incomingIstekData
            }
          });
        } else {
          navigate(-1);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || err.message || t('kayit_sirasi_hata', 'Kayıt sırasında hata oluştu.'));
    } finally {
      setIsSaving(false);
    }
  };

  const ajanlarListRoute = isUnderAyarlar
    ? '/ayarlar/YapayZekaAyarlari/AiAjanlar'
    : '/ai-ajanlar';
  const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar');

  const agentTitle = agentData?.ad || incomingAgentData?.ad || (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const istekTitle = istekData?.baslik || incomingIstekData?.baslik || t('gorev_akisi', 'Görev Akışı');
  const nodeTitle = t('basla', 'Başla');

  const agentRoute = isUnderAyarlar
    ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}`
    : `/ai-ajanlar/${effectiveAgentId}`;

  const istekRoute = isUnderAyarlar
    ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`
    : `/ai-ajanlar/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;

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
      label: istekTitle,
      onClick: () => navigate(istekRoute, {
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
  ], [ajanlarListLabel, ajanlarListRoute, agentTitle, agentRoute, istekTitle, istekRoute, nodeTitle, agentData, incomingAgentData, istekData, incomingIstekData, navigate]);

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="baslaFlowchartOgeAyarPage"
      title={t('basla_oge_ayarlari', 'Başla Düğümü Ayarları')}
      pageTitle={t('basla_oge_ayarlari', 'Başla Düğümü Ayarları')}
      recordTitle={t('basla', 'Başla')}
      subTrail={subTrail}
      icon={<Play size={24} color="#10b981" />}
      subtitleLeft={t('basla_oge_aciklama', 'Akışın başlangıç parametreleri ve tetikleyici yapılandırması')}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. BÖLÜM: HIZLI ERİŞİM DÜĞMESİ & KISAYOL GÖRÜNÜMÜ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <Sparkles size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('hizli_erisim_dugmesi', 'Hızlı Erişim Düğmesi')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t('hizli_erisim_dugmesi_aciklama', 'Etkinleştirildiğinde bu görev akışı, asistan panelinde tek tıkla başlatılabilen bir kısayol düğmesi olarak gösterilir.')}
                </p>
              </div>
            </div>

            <div className={`basla-ayar-switch-pill ${formData.hizliErisimDugmesi !== false ? 'is-active' : ''}`}>
              <BaseSwitch
                id="hizliErisimDugmesiSwitch"
                checked={formData.hizliErisimDugmesi !== false}
                onChange={(e: any) => {
                  const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                  setFormData((prev: any) => ({ ...prev, hizliErisimDugmesi: checked }));
                }}
                label={
                  <span className="text-sm font-semibold">
                    {formData.hizliErisimDugmesi !== false
                      ? t('aktif', 'Aktif')
                      : t('pasif', 'Pasif')}
                  </span>
                }
              />
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="basla-ayar-input-grid">
              <div className="basla-ayar-field-col">
                <label className="basla-ayar-field-label">
                  {t('dugme_gorunen_ismi', 'Düğme Üzerinde Görünecek İsim')}
                </label>
                <BaseInput
                  autoFocus={formData.hizliErisimDugmesi !== false}
                  disabled={formData.hizliErisimDugmesi === false}
                  icon={<Tag size={14} />}
                  value={formData.dugmeBasligi || ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, dugmeBasligi: e.target.value }))}
                  placeholder={t('dugme_ismi_placeholder', 'Düğme İsmi (Boş bırakılırsa akış başlığı kullanılır)')}
                />
              </div>

              <div className="basla-ayar-preview-col">
                <span className="basla-ayar-field-label">
                  {t('asistan_dugme_onizlemesi', 'Asistan Paneli Görünümü')}
                </span>
                <div className={`basla-ayar-preview-box ${formData.hizliErisimDugmesi === false ? 'is-disabled' : ''}`}>
                  {formData.hizliErisimDugmesi !== false ? (
                    <span className="basla-ayar-preview-chip">
                      <Sparkles size={13} />
                      <span>{formData.dugmeBasligi?.trim() || istekTitle}</span>
                    </span>
                  ) : (
                    <span className="basla-ayar-preview-disabled-text">
                      <EyeOff size={14} />
                      <span>{t('hizli_erisim_dugmesi_gizli', 'Kısayol düğmesi gizli (Sadece sohbet içinden tetiklenir)')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. BÖLÜM: GÖREV AKIŞININ AMACI VE BAŞLANGIÇ TALİMATI */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <Terminal size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('gorev_akisi_amaci_ve_baslangic_talimati', 'Görev Akışının Amacı ve Başlangıç Talimatı')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t('gorev_akisi_amaci_aciklama', 'Yapay zekanın bu görev akışını hangi kullanıcı isteklerinde devreye alacağını ve başlarken nasıl davranacağını tanımlayın.')}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <NotInput
              autoFocus={formData.hizliErisimDugmesi === false}
              rows={6}
              value={formData.prompt}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, prompt: e.target.value }))}
              placeholder={t('gorev_akisi_amaci_placeholder', 'Kullanıcı hangi amaçla istekte bulunduğunda LLM bu görev akışını başlatmalı ve başlarken nasıl davranmalı? (Örn: Kullanıcı yeni bir satış kampanyası, promosyon veya indirim kurgulamak istediğinde bu akışı başlat...)')}
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>{t('gorev_akisi_amaci_ipucu', 'İpucu: Kullanıcının hangi cümlelerle veya niyetle bu akışı tetikleyeceğini açıkça belirtin.')}</span>
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

export default BaslaFlowchartOgeAyarPage;
