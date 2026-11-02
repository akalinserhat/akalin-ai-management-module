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
  ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseSwitch
} from '@akalin/ui';
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

  const effectiveAgentId = propAgentId || params.id;
  const effectiveIstekId = propIstekId || params.istekId;
  const effectiveOgeId = propNodeId || params.ogeId;

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
      tip: 'AI_ISLEM',
      baslik: defaultNodeTitle,
      uiAksiyonu: 'YOK',
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
  const nodeTitle = defaultNodeTitle;

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

        {/* 2. BÖLÜM: İŞLEM SONRASI DAVRANIŞ VE KULLANICI TEYİDİ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <ShieldCheck size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'ai_islem_sonrasi_davranis_ve_teyit',
                    'İşlem Sonrası Davranış ve Kullanıcı Teyidi'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'ai_islem_sonrasi_davranis_aciklama',
                    'Yapay zeka işlemi tamamladığında oluşturulan/güncellenen belgenin takibini ve kullanıcı teyidini yapılandırın.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid">
              <div
                className={`form-ac-wizard-option-box ${formData.kayitBekle !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <CheckCircle2 size={16} />
                    <span>
                      {t(
                        'ai_islem_sonucu_forma_aktar_ve_izle',
                        'Oluşturulan Belge / Kart Taslağını Hazırla ve Takip Et'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'ai_islem_sonucu_forma_aktar_ve_izle_aciklama',
                      'Yapay zeka seçili MCP varlığı üzerinden belge veya kart oluşturduğunda ilgili ekran aksiyonunu sohbet ekranında hazırlar.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="aiIslemKayitBekleSwitch"
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

              <div
                className={`form-ac-wizard-option-box ${formData.kayitSonrasiTeyitEt !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Sparkles size={16} />
                    <span>
                      {t(
                        'ai_islem_sonrasi_ozet_ve_teyit',
                        'İşlem Sonucunu Özetleyerek Kullanıcıya Sun'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'ai_islem_sonrasi_ozet_ve_teyit_aciklama',
                      'Yapay zeka analiz veya belge oluşturma işlemini tamamladığında çıkarılan kuralları ve kalemleri sohbet ekranında kullanıcıya özetler.'
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
