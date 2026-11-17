/**
 * Webakus AdminUI - Görev Akışı Döngü (Loop) Düğümü Ayar Sayfası (LoopFlowchartOgeAyarPage)
 *
 * Sorumlulukları ve Standartları:
 * - BaseAiAjanFlowchartOgeAyarPage bileşeninden türetilerek tüm flowchart adım sayfalarıyla %100 mimari tutarlılık sağlamak
 * - Büyük dökümanların (PDF sayfaları), JSON dizilerinin ve metin parçalarının döngüye sokulmasını sağlamak
 * - Senkron (Sıralı / Sequential) ve Asenkron (Paralel / Concurrent worker pool) çalıştırma desteği
 * - Sıfır inline CSS (.agents/rules/ui-and-styling.md) ve %100 i18n uyumlu çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Repeat,
  Zap,
  Clock,
  Layers,
  ListOrdered,
  ShieldCheck,
  AlertCircle,
  GitBranch,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  BaseDropdownSecici,
  type DropdownOption,
  BasitInput,
  TamsayiInput,
  FieldError
} from '@akalin/ui';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';
import {
  resolveAiAgentRouteContext,
  buildAiAgentSubTrail
} from '../utils/aiAgentBreadcrumb';
import {
  createDefaultLoopDugumu,
  getDefaultLoopNodeTitle
} from '../defaults/loopFlowchartDefaultValue';
import { validateLoopFlowchartNode } from '../validators/loopFlowchartValidation';
import type { AiAkisDugumu } from '../types';

export interface LoopFlowchartOgeAyarPageProps
  extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const LoopFlowchartOgeAyarPage: React.FC<LoopFlowchartOgeAyarPageProps> = ({
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

  const effectiveAgentId = propAgentId || params.id || '';
  const effectiveIstekId = propIstekId || params.istekId || '';
  const effectiveOgeId = propNodeId || params.ogeId || 'LOOP_1';

  const agentData = location.state?.agentData;
  const istekData = location.state?.istekData;
  const incomingNodeFromState = location.state?.nodeData || initialNodeData;

  const defaultNodeTitle = useMemo(() => getDefaultLoopNodeTitle(t), [t]);

  const [formData, setFormData] = useState<AiAkisDugumu>(() => {
    return createDefaultLoopDugumu({
      id: effectiveOgeId,
      title: defaultNodeTitle,
      existing: incomingNodeFromState
    });
  });

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [isSaving, setIsSaving] = useState(false);

  // SubTrail ekmek kırıntısı
  const subTrail = useMemo(() => {
    return buildAiAgentSubTrail({
      pathname: location.pathname,
      t,
      navigate,
      agentId: effectiveAgentId,
      agentTitle: agentData?.ad,
      istekId: effectiveIstekId,
      istekTitle: istekData?.baslik,
      agentData,
      istekData,
      activeLabel: defaultNodeTitle
    });
  }, [location.pathname, effectiveAgentId, agentData, effectiveIstekId, istekData, defaultNodeTitle, navigate, t]);

  // Sayfa yüklendiğinde var olan düğümü yükle
  useEffect(() => {
    if (incomingNodeFromState) {
      setFormData(
        createDefaultLoopDugumu({
          id: effectiveOgeId,
          title: defaultNodeTitle,
          existing: incomingNodeFromState
        })
      );
      return;
    }

    if (istekData?.akisDugumleri && Array.isArray(istekData.akisDugumleri)) {
      const found = istekData.akisDugumleri.find((n: any) => n.id === effectiveOgeId);
      if (found) {
        setFormData(
          createDefaultLoopDugumu({
            id: effectiveOgeId,
            title: defaultNodeTitle,
            existing: found
          })
        );
      }
    }
  }, [effectiveOgeId, incomingNodeFromState, istekData, defaultNodeTitle]);

  const { baseAgentRoute } = resolveAiAgentRouteContext(location.pathname);

  const effectiveBackRoute = useMemo(() => {
    if (backRoute) return backRoute;
    if (effectiveAgentId && effectiveIstekId) {
      return `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;
    }
    return -1 as any;
  }, [backRoute, effectiveAgentId, effectiveIstekId, baseAgentRoute]);

  const donguModuOptions: DropdownOption[] = useMemo(
    () => [
      {
        id: 'SENKRON',
        value: 'SENKRON',
        label: t('dongu_senkron_sync', 'Sıralı (Senkron / Sync) — Her iterasyon sırayla işlenir (Rate-limit dostu)')
      },
      {
        id: 'ASENKRON',
        value: 'ASENKRON',
        label: t('dongu_asenkron_async', 'Paralel (Asenkron / Async) — İterasyonlar eşzamanlı çalışır (Yüksek Hız)')
      }
    ],
    [t]
  );

  const donguKaynagiOptions: DropdownOption[] = useMemo(
    () => [
      {
        id: 'ONCEKI_CIKTI_LISTESI',
        value: 'ONCEKI_CIKTI_LISTESI',
        label: t('dongu_kaynak_onceki_cikti', 'Önceki Düğüm Çıktısı (Array / Dizi Elemanları)')
      },
      {
        id: 'SAYFA_SAYISI',
        value: 'SAYFA_SAYISI',
        label: t('dongu_kaynak_sayfa_sayisi', 'Döküman Sayfaları (PDF Sayfa Sayısı — Sayfa Sayfa İterasyon)')
      },
      {
        id: 'METIN_PARCALARI',
        value: 'METIN_PARCALARI',
        label: t('dongu_kaynak_metin_parcalari', 'Metin Bölümleri / Parçaları (Paragraflar & Başlıklar)')
      },
      {
        id: 'SAYI_ARALIGI',
        value: 'SAYI_ARALIGI',
        label: t('dongu_kaynak_sayi_araligi', 'Sayı Aralığı (1\'den N\'e kadar)')
      }
    ],
    [t]
  );

  const donguHataDavranisiOptions: DropdownOption[] = useMemo(
    () => [
      {
        id: 'DURDUR',
        value: 'DURDUR',
        label: t('dongu_hata_durdur', 'Döngüyü Durdur ve Hata Fırlat')
      },
      {
        id: 'DEVAM_ET',
        value: 'DEVAM_ET',
        label: t('dongu_hata_devam_et', 'Hatalı İterasyonu Atla ve Devam Et')
      }
    ],
    [t]
  );

  const donguBirlestirmeModuOptions: DropdownOption[] = useMemo(
    () => [
      {
        id: 'DIZI',
        value: 'DIZI',
        label: t('dongu_birlestir_dizi', 'Sonuçları Dizi (Array) Olarak Topla')
      },
      {
        id: 'METIN_BIRLESTIR',
        value: 'METIN_BIRLESTIR',
        label: t('dongu_birlestir_metin', 'Sonuç Metinlerini Satır Satır Birleştir')
      },
      {
        id: 'NESNE_LISTESI',
        value: 'NESNE_LISTESI',
        label: t('dongu_birlestir_nesne_listesi', 'JSON Nesne Havuzu Olarak Birleştir')
      }
    ],
    [t]
  );

  // Akıştaki diğer düğümleri listele (Tamamlandı / done ve Her Öğe / loop hedefleri için)
  const loopBodyTargetOptions: DropdownOption[] = useMemo(() => {
    const nodes = Array.isArray(istekData?.akisDugumleri) ? istekData.akisDugumleri : [];
    const opts: DropdownOption[] = [
      {
        id: '',
        value: '',
        label: t('loop_govde_secilmedi_secenegi', '-- Bağlı değil (Tuvalden "Her Öğe / loop" portunu bağlayın) --')
      }
    ];
    nodes.forEach((n: any, idx: number) => {
      if (n.id !== formData.id && n.tip !== 'BASLA' && n.id !== 'BASLA') {
        opts.push({
          id: n.id,
          value: n.id,
          label: `#${idx} • ${n.baslik || n.tip} (${n.id})`
        });
      }
    });
    return opts;
  }, [istekData, formData.id, t]);

  const doneTargetOptions: DropdownOption[] = useMemo(() => {
    const nodes = Array.isArray(istekData?.akisDugumleri) ? istekData.akisDugumleri : [];
    const opts: DropdownOption[] = [
      {
        id: '',
        value: '',
        label: t('loop_done_secilmedi_secenegi', '-- Akışı Sonlandır (Bağlı sonraki adım yok) --')
      }
    ];
    nodes.forEach((n: any, idx: number) => {
      if (n.id !== formData.id && n.tip !== 'BASLA' && n.id !== 'BASLA') {
        opts.push({
          id: n.id,
          value: n.id,
          label: `#${idx} • ${n.baslik || n.tip} (${n.id})`
        });
      }
    });
    return opts;
  }, [istekData, formData.id, t]);

  const buildUpdatedNodePayload = (overrideData?: any): AiAkisDugumu => {
    const merged = {
      ...formData,
      ...(overrideData || {})
    };
    return {
      ...merged,
      id: merged.id || effectiveOgeId || `LOOP_${Date.now()}`,
      tip: 'LOOP',
      baslik: defaultNodeTitle,
      aktifMi: merged.aktifMi !== false,
      donguModu: merged.donguModu || 'SENKRON',
      donguKaynagi: merged.donguKaynagi || 'ONCEKI_CIKTI_LISTESI',
      donguDegiskeniAdi: (merged.donguDegiskeniAdi || 'item').trim(),
      donguMaksimumTekrar: Number(merged.donguMaksimumTekrar) || 50,
      donguEsZamanliGorevSayisi: Number(merged.donguEsZamanliGorevSayisi) || 3,
      donguHataDavranisi: merged.donguHataDavranisi || 'DURDUR',
      donguGirisDugumId: String(merged.donguGirisDugumId || '').trim(),
      sonrakiDugumId: String(merged.sonrakiDugumId || '').trim(),
      donguBirlestirmeModu: merged.donguBirlestirmeModu || 'DIZI'
    };
  };

  const handleBackOrClose = () => {
    if (typeof effectiveBackRoute === 'string') {
      const existingNodes = Array.isArray(istekData?.akisDugumleri)
        ? [...istekData.akisDugumleri]
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
          agentData,
          fromNodeEdit: true,
          hizliIstekItem: istekData
            ? {
                ...istekData,
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
    const nodeToSave = buildUpdatedNodePayload(overrideNodeData);

    const validationErrors = validateLoopFlowchartNode(nodeToSave, t);
    const errorKeys = Object.keys(validationErrors);
    if (errorKeys.length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors).find(Boolean);
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }
    setErrors({});

    try {
      setIsSaving(true);

      let updatedAgent = agentData;
      let updatedIstek = istekData;

      if (effectiveAgentId) {
        const agentToUpdate =
          agentData || (await axios.get(`/api/AiAjanlar/${effectiveAgentId}`)).data;
        const currentRequests = Array.isArray(agentToUpdate.hizliIstekler)
          ? [...agentToUpdate.hizliIstekler]
          : [];
        const reqIdx = currentRequests.findIndex(
          (x: any) => x.id === effectiveIstekId || (istekData?.id && x.id === istekData.id)
        );

        const baseReq =
          reqIdx !== -1
            ? { ...currentRequests[reqIdx], ...(istekData || {}) }
            : istekData || {
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
        const nodeIdx = existingNodes.findIndex((x: any) => x.id === nodeToSave.id);

        if (nodeIdx !== -1) {
          existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...nodeToSave };
        } else {
          existingNodes.push(nodeToSave);
        }

        updatedIstek = {
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
        updatedAgent = payload;

        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(
              `webakus_flow_draft_${effectiveAgentId}_${updatedIstek.id}`
            );
          } catch {
            // ignore
          }
          window.dispatchEvent(new CustomEvent('ai-agents-updated'));
        }
      }

      toast.success(t('loop_kaydedildi', 'Döngü düğümü ayarları güncellendi.'));

      if (onSuccess) {
        onSuccess();
      } else if (typeof effectiveBackRoute === 'string') {
        navigate(effectiveBackRoute, {
          state: {
            agentData: updatedAgent,
            fromNodeEdit: true,
            hizliIstekItem: updatedIstek
          }
        });
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.mesaj ||
        err.response?.data?.message ||
        err.message ||
        t('kayit_hatasi', 'Kaydedilirken hata oluştu.');
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="loopFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="LOOP"
      agentData={agentData}
      istekData={istekData}
      title={defaultNodeTitle}
      pageTitle={defaultNodeTitle}
      recordTitle={defaultNodeTitle}
      subTrail={subTrail}
      icon={<Repeat size={24} color="#8b5cf6" />}
      subtitleLeft={t(
        'loop_oge_aciklama',
        'Büyük dökümanları (PDF sayfaları), JSON dizilerini veya metin parçalarını senkron (sıralı) veya asenkron (paralel) işleme yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* n8n Döngü (Loop Over Items) Görsel Çalışma Özeti */}
        <div className="loop-n8n-flow-banner">
          <div className="loop-n8n-stage-card">
            <div className="loop-n8n-stage-top">
              <span className="loop-n8n-stage-title">
                <Layers size={14} color="#8b5cf6" />
                <span>{t('loop_n8n_stage_girdi', '1. Sol Giriş (Veri Listesi)')}</span>
              </span>
            </div>
            <p className="loop-n8n-stage-desc">
              {t(
                'loop_n8n_stage_girdi_aciklama',
                'Önceki düğümden gelen diziyi, PDF sayfalarını veya metin bölümlerini tekil öğelere ayırır.'
              )}
            </p>
          </div>

          <div className="loop-n8n-stage-card is-loop">
            <div className="loop-n8n-stage-top">
              <span className="loop-n8n-stage-title">
                <Repeat size={14} color="#8b5cf6" />
                <span>{t('loop_n8n_stage_loop', '2. Alt Çıkış: Her Öğe')}</span>
              </span>
              <span className="loop-n8n-stage-pill">loop ↺</span>
            </div>
            <p className="loop-n8n-stage-desc">
              {t(
                'loop_n8n_stage_loop_aciklama',
                'Her bir öğeyi ({{degisken}}) döngü içi adıma gönderir; adım bitince alttan sıradaki öğe için geri döner.',
                { degisken: formData.donguDegiskeniAdi || 'item' }
              )}
            </p>
          </div>

          <div className="loop-n8n-stage-card is-done">
            <div className="loop-n8n-stage-top">
              <span className="loop-n8n-stage-title">
                <CheckCircle2 size={14} color="#10b981" />
                <span>{t('loop_n8n_stage_done', '3. Üst Çıkış: Tamamlandı')}</span>
              </span>
              <span className="loop-n8n-stage-pill is-done">done ✓</span>
            </div>
            <p className="loop-n8n-stage-desc">
              {t(
                'loop_n8n_stage_done_aciklama',
                'Tüm öğeler bittiğinde sonuçları birleştirir ve üst sağ çıkıştan ana akışa devam eder.'
              )}
            </p>
          </div>
        </div>

        {/* KART 1: Temel Döngü & İşleme Modu Yapılandırması */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <Repeat size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('dongu_isleme_modu_baslik', 'Döngü İşleme & Senkronizasyon Modu')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'dongu_isleme_modu_aciklama',
                    'Döngünün elemanları sıralı (Sync) mı yoksa paralel (Async) mi işleyeceğini belirleyin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              {/* Döngü Modu (SENKRON vs ASENKRON) */}
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="donguModuSelect">
                  <span className="basla-ayar-field-label-left">
                    {formData.donguModu === 'ASENKRON' ? <Zap size={14} /> : <Clock size={14} />}
                    <span>{t('dongu_modu_label', 'Çalışma & Senkronizasyon Modu')}</span>
                    <span className="required-star">*</span>
                  </span>
                </label>
                <BaseDropdownSecici
                  id="donguModuSelect"
                  options={donguModuOptions}
                  value={formData.donguModu || 'SENKRON'}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, donguModu: val }))}
                />
                <span className="basla-ayar-field-hint">
                  {formData.donguModu === 'ASENKRON'
                    ? t(
                        'asenkron_ipucu',
                        '⚡ Asenkron Mod: Tüm sayfalar veya elemanlar eşzamanlı worker havuzunda paralel işlenir. Çok hızlıdır.'
                      )
                    : t(
                        'senkron_ipucu',
                        '⏱️ Senkron Mod: Her adım bir öncekinin bitmesini bekler. Token sınırı ve rate-limit önlemi için idealdir.'
                      )}
                </span>
              </div>

              {/* Eşzamanlı Görev Sayısı (Yalnızca ASENKRON modda) */}
              {formData.donguModu === 'ASENKRON' && (
                <div className="form-group">
                  <label className="basla-ayar-field-label">
                    <span className="basla-ayar-field-label-left">
                      <Zap size={14} />
                      <span>{t('es_zamanli_gorev_sayisi', 'Eşzamanlı Paralel Görev Sayısı (Concurrency: 1 - 10)')}</span>
                    </span>
                  </label>
                  <TamsayiInput
                    value={formData.donguEsZamanliGorevSayisi ?? 3}
                    onChange={(e) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        donguEsZamanliGorevSayisi: Number(e.target.value || 3)
                      }))
                    }
                    placeholder="3"
                  />
                  {errors.donguEsZamanliGorevSayisi && (
                    <FieldError error={errors.donguEsZamanliGorevSayisi} />
                  )}
                  <span className="basla-ayar-field-hint">
                    {t(
                      'es_zamanli_ipucu',
                      'Aynı anda çalışacak maksimum LLM / alt görev sayısı (Önerilen: 3).'
                    )}
                  </span>
                </div>
              )}

              {/* Döngü Veri Kaynağı */}
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="donguKaynagiSelect">
                  <span className="basla-ayar-field-label-left">
                    <Layers size={14} />
                    <span>{t('dongu_kaynagi_label', 'Döngü Veri Kaynağı')}</span>
                    <span className="required-star">*</span>
                  </span>
                </label>
                <BaseDropdownSecici
                  id="donguKaynagiSelect"
                  options={donguKaynagiOptions}
                  value={formData.donguKaynagi || 'ONCEKI_CIKTI_LISTESI'}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, donguKaynagi: val }))}
                />
                <span className="basla-ayar-field-hint">
                  {t(
                    'dongu_kaynagi_ipucu',
                    'Döngüye sokulacak elemanların hangi kaynaktan çıkarılacağını belirler (Örn: PDF sayfaları veya JSON listesi).'
                  )}
                </span>
              </div>

              {/* İterasyon Değişkeni Adı */}
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="donguDegiskeniInput">
                  <span className="basla-ayar-field-label-left">
                    <ListOrdered size={14} />
                    <span>{t('dongu_degiskeni_adi_label', 'İterasyon Değişkeni Adı')}</span>
                    <span className="required-star">*</span>
                  </span>
                </label>
                <BasitInput
                  id="donguDegiskeniInput"
                  value={formData.donguDegiskeniAdi || 'item'}
                  placeholder="item, sayfa, parca"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setErrors((prev) => ({ ...prev, donguDegiskeniAdi: undefined }));
                    setFormData((prev: any) => ({ ...prev, donguDegiskeniAdi: e.target.value }));
                  }}
                />
                {errors.donguDegiskeniAdi && <FieldError error={errors.donguDegiskeniAdi} />}
                <span className="basla-ayar-field-hint">
                  {t(
                    'dongu_degiskeni_ipucu',
                    'Döngü içerisindeki sonraki düğümlerde erişilecek değişken adı (örn: {{item}} veya {{sayfa}}).'
                  )}
                </span>
              </div>

              {/* Maksimum Tekrar Limiti */}
              <div className="form-group">
                <label className="basla-ayar-field-label">
                  <span className="basla-ayar-field-label-left">
                    <ShieldCheck size={14} />
                    <span>{t('dongu_maksimum_tekrar_label', 'Maksimum Tekrar Limiti (Güvenlik Sınırı)')}</span>
                  </span>
                </label>
                <TamsayiInput
                  value={formData.donguMaksimumTekrar ?? 50}
                  onChange={(e) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      donguMaksimumTekrar: Number(e.target.value || 50)
                    }))
                  }
                  placeholder="50"
                />
                {errors.donguMaksimumTekrar && <FieldError error={errors.donguMaksimumTekrar} />}
                <span className="basla-ayar-field-hint">
                  {t(
                    'maksimum_tekrar_ipucu',
                    'Sonsuz döngüleri ve kota aşımını engellemek için güvenlik sınırı (Varsayılan: 50).'
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* KART 2: n8n Sağ Çıkış Portları Yönlendirmesi (Üst: Tamamlandı / done, Alt: Her Öğe / loop) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <GitBranch size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('loop_cikis_portlari_baslik', 'n8n Sağ Çıkış Portları Yönlendirmesi (done & loop)')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'loop_cikis_portlari_aciklama',
                    'Tuval üzerindeki üst "Tamamlandı (done)" ve alt "Her Öğe (loop)" portlarından kablo çekerek veya aşağıdaki seçicilerden hedefleri belirleyebilirsiniz.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="karar-onay-branch-grid">
              {/* Üst Çıkış Portu: Tamamlandı (done) */}
              <div className="karar-onay-branch-box is-done">
                <div className="karar-onay-branch-header">
                  <span className="karar-onay-branch-dot is-done" />
                  <span>{t('loop_done_portu_hedefi', 'Üst Çıkış: Tamamlandı (done) Hedefi')}</span>
                </div>
                <p className="karar-onay-branch-desc">
                  {t(
                    'loop_done_portu_aciklama',
                    'Tüm öğelerin iterasyonu tamamlandığında birleştirilmiş sonucun aktarılacağı sonraki ana akış adımı.'
                  )}
                </p>
                <BaseDropdownSecici
                  id="donguSonrakiDugumSelect"
                  options={doneTargetOptions}
                  value={formData.sonrakiDugumId || ''}
                  onChange={(val) =>
                    setFormData((prev: any) => ({ ...prev, sonrakiDugumId: String(val ?? '') }))
                  }
                  clearable={false}
                />
              </div>

              {/* Alt Çıkış Portu: Her Öğe (loop) */}
              <div className="karar-onay-branch-box is-loop">
                <div className="karar-onay-branch-header">
                  <span className="karar-onay-branch-dot is-loop" />
                  <span>{t('loop_govde_portu_hedefi', 'Alt Çıkış: Her Öğe (loop) Döngü Gövdesi')}</span>
                </div>
                <p className="karar-onay-branch-desc">
                  {t(
                    'loop_govde_portu_aciklama',
                    'Her iterasyonda tekil öğe için çalıştırılacak adım. Çalışma bitince akış otomatik olarak döngü başına döner.'
                  )}
                </p>
                <BaseDropdownSecici
                  id="donguGirisDugumSelect"
                  options={loopBodyTargetOptions}
                  value={formData.donguGirisDugumId || ''}
                  onChange={(val) =>
                    setFormData((prev: any) => ({ ...prev, donguGirisDugumId: String(val ?? '') }))
                  }
                  clearable={false}
                />
              </div>
            </div>
          </div>
        </section>

        {/* KART 3: Hata Davranışı & Sonuç Birleştirme */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <AlertCircle size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('dongu_hata_ve_birlestirme_baslik', 'Hata Yönetimi & Sonuç Birleştirme')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'dongu_hata_ve_birlestirme_aciklama',
                    'İterasyon hatalarında akışın nasıl davranacağını ve tamamlanan verilerin nasıl toplanacağını yapılandırın.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              {/* Hata Durumu Davranışı */}
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="donguHataSelect">
                  <span className="basla-ayar-field-label-left">
                    <AlertCircle size={14} />
                    <span>{t('dongu_hata_davranisi_label', 'Hata Durumu Davranışı')}</span>
                  </span>
                </label>
                <BaseDropdownSecici
                  id="donguHataSelect"
                  options={donguHataDavranisiOptions}
                  value={formData.donguHataDavranisi || 'DURDUR'}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, donguHataDavranisi: val }))}
                />
                <span className="basla-ayar-field-hint">
                  {t(
                    'hata_davranisi_ipucu',
                    'Bir iterasyonda LLM veya kural hatası alındığında tüm döngü dursun mu yoksa sıradaki adıma geçilsin mi?'
                  )}
                </span>
              </div>

              {/* Sonuç Birleştirme Modu */}
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="donguBirlestirmeSelect">
                  <span className="basla-ayar-field-label-left">
                    <Layers size={14} />
                    <span>{t('dongu_birlestirme_modu_label', 'Sonuç Birleştirme Formatı')}</span>
                  </span>
                </label>
                <BaseDropdownSecici
                  id="donguBirlestirmeSelect"
                  options={donguBirlestirmeModuOptions}
                  value={formData.donguBirlestirmeModu || 'DIZI'}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, donguBirlestirmeModu: val }))}
                />
                <span className="basla-ayar-field-hint">
                  {t(
                    'birlestirme_ipucu',
                    'Tüm döngü iterasyonlarının çıktıları Tamamlandı (done) çıkış portuna bu formatta birleştirilerek aktarılır.'
                  )}
                </span>
              </div>
            </div>

            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'loop_tek_sorumluluk_ipucu',
                    'Tek Sorumluluk İlkesi: Döngü düğümü doğrudan ekran açmaz veya ERP belgesi kaydetmez; öğeleri iterasyona sokup sonuçları birleştirir.'
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

export default LoopFlowchartOgeAyarPage;
