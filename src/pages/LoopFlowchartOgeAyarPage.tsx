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
  Workflow
} from 'lucide-react';
import {
  BaseDropdownSecici,
  type DropdownOption,
  BasitInput,
  TamsayiInput,
  BaseSwitch,
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

  const defaultNodeTitle = useMemo(() => {
    return (
      incomingNodeFromState?.baslik ||
      getDefaultLoopNodeTitle(t)
    );
  }, [incomingNodeFromState?.baslik, t]);

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

  // Akıştaki diğer düğümleri listele (Döngü Gövdesi hedefi için)
  const availableTargetNodeOptions: DropdownOption[] = useMemo(() => {
    const nodes = Array.isArray(istekData?.akisDugumleri) ? istekData.akisDugumleri : [];
    const opts: DropdownOption[] = [
      { id: '', value: '', label: t('seciniz_otomatik_sonraki', '-- Sonraki Bağlı Düğümü Kullan --') }
    ];
    nodes.forEach((n: any) => {
      if (n.id !== formData.id && n.tip !== 'BASLA') {
        opts.push({
          id: n.id,
          value: n.id,
          label: `${n.baslik || n.tip} (${n.id})`
        });
      }
    });
    return opts;
  }, [istekData, formData.id, t]);

  const buildUpdatedNodePayload = (overrideData?: any) => {
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
      donguGirisDugumId: (merged.donguGirisDugumId || '').trim(),
      donguBirlestirmeModu: merged.donguBirlestirmeModu || 'DIZI'
    };
  };

  const handleBackOrClose = () => {
    if (typeof effectiveBackRoute === 'string') {
      navigate(effectiveBackRoute, {
        state: {
          fromNodeEdit: true,
          nodeData: formData,
          agentData,
          istekData
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

      // SessionStorage veya state üzerinden geri aktar
      try {
        const draftKey = `webakus_flow_draft_${effectiveAgentId}_${effectiveIstekId}`;
        const existingDraftRaw = sessionStorage.getItem(draftKey);
        let draftObj = existingDraftRaw ? JSON.parse(existingDraftRaw) : null;
        if (!draftObj && istekData) {
          draftObj = { ...istekData };
        }
        if (draftObj && Array.isArray(draftObj.akisDugumleri)) {
          const idx = draftObj.akisDugumleri.findIndex((n: any) => n.id === nodeToSave.id);
          if (idx >= 0) {
            draftObj.akisDugumleri[idx] = nodeToSave;
          } else {
            draftObj.akisDugumleri.push(nodeToSave);
          }
          sessionStorage.setItem(draftKey, JSON.stringify(draftObj));
        }
      } catch {
        // storage fallback
      }

      toast.success(t('loop_kaydedildi', 'Döngü düğümü ayarları güncellendi.'));

      if (onSuccess) {
        onSuccess();
      } else {
        handleBackOrClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || t('kayit_hatasi', 'Kaydedilirken hata oluştu.');
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
      title={t('loop_oge_ayarlari', 'Döngü (Loop) Düğümü Ayarları')}
      pageTitle={t('loop_oge_ayarlari', 'Döngü (Loop) Düğümü Ayarları')}
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
                    'Döngü içerisindeki sonraki düğümlerde erişilecek değişken adı (örn: {{ $dongu.sayfa }} veya input.item).'
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

        {/* KART 2: Hata Davranışı & Sonuç Birleştirme */}
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
                    'Tüm döngü iterasyonlarının çıktıları sağ çıkış portuna bu formatta birleştirilerek aktarılır.'
                  )}
                </span>
              </div>

              {/* Döngü Gövdesi Düğümü (Opsiyonel Açık Seçim) */}
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="donguGirisDugumSelect">
                  <span className="basla-ayar-field-label-left">
                    <Workflow size={14} />
                    <span>{t('dongu_giris_dugumu_label', 'Döngü Gövdesi Düğümü (Loop Body)')}</span>
                  </span>
                </label>
                <BaseDropdownSecici
                  id="donguGirisDugumSelect"
                  options={availableTargetNodeOptions}
                  value={formData.donguGirisDugumId || ''}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, donguGirisDugumId: val }))}
                />
                <span className="basla-ayar-field-hint">
                  {t(
                    'dongu_govdesi_ipucu',
                    'Döngünün her iterasyonunda tetikleyeceği özel düğüm. Boş bırakılırsa sağ porttan bağlı sonraki düğüm kullanılır.'
                  )}
                </span>
              </div>
            </div>

            {/* Aktiflik Durumu */}
            <div className="basla-ayar-switch-block" style={{ marginTop: '16px' }}>
              <div className="basla-ayar-switch-label">
                <span className="basla-ayar-switch-title">
                  {t('dongu_aktif_mi', 'Döngü Düğümü Aktif')}
                </span>
                <span className="basla-ayar-switch-sub">
                  {t(
                    'dongu_aktif_sub',
                    'Devre dışı bırakıldığında döngü atlanır ve veri doğrudan sonraki düğüme geçer.'
                  )}
                </span>
              </div>
              <BaseSwitch
                checked={formData.aktifMi !== false}
                onChange={(checked) => setFormData((prev: any) => ({ ...prev, aktifMi: checked }))}
              />
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default LoopFlowchartOgeAyarPage;
