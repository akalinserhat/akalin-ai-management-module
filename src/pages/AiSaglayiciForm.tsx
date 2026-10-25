/**
 * @akalin/ai_management_module - Yapay Zeka (AI) Sağlayıcı Yapılandırma Formu (AiSaglayiciForm.tsx)
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseCardPage mimarisine uygun sekmeli (Genel, Modeller, Canlı Test) sağlayıcı yapılandırması
 * - Sıfır inline validasyon (validators/aiSaglayiciValidation.ts kullanımı)
 * - Sıfır alt düğme kuralı (Tüm aksiyonlar üst başlık ve ActionMenu üzerinden yürütülür)
 * - YZModelSecici entegrasyonu ile sağlayıcının modellerini dinamik çekme ve varsayılan model atama
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { 
  Cpu, Sliders, Zap, CheckCircle2, AlertCircle, Eye, EyeOff, 
  RotateCcw, Bot
} from 'lucide-react';
import { 
  BaseCardPage, 
  BaseCard, 
  BasitInput, 
  BaseButton, 
  BaseDropdownSecici, 
  type DropdownOption,
  BaseSwitch, 
  YZModelSecici, 
  FieldError, 
  PageLoader,
  useHeaderApi,
  useAlertDialog,
  type BaseTabItem
} from '@akalin/ui';
import { aiProtokolService } from '../services/aiProtokolService';
import { aiSaglayiciService } from '../services/aiSaglayiciService';
import { AiProtokol } from '../types';
import { 
  validateAiSaglayiciField, 
  validateAiSaglayiciForm, 
  AiSaglayiciFormData 
} from '../validators/aiSaglayiciValidation';

export interface AiSaglayiciFormProps {
  id?: string | number;
  initialData?: any;
  onClose?: () => void;
  onSuccess?: () => void;
  onBack?: () => void;
  backRoute?: string;
  isOpen?: boolean;
}

export const AiSaglayiciForm: React.FC<AiSaglayiciFormProps> = ({
  id: propId,
  initialData: propInitialData,
  onClose,
  onSuccess,
  onBack,
  backRoute
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; providerId?: string }>();
  const { showAlert } = useAlertDialog();

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const defaultBackRoute = isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari/AiSaglayicilar' : '/ai-saglayicilar';

  const rawId = (propId && propId !== 'yeni') 
    ? propId 
    : (params.id && !isNaN(Number(params.id)) ? params.id : (params.providerId || null));
  const effectiveId = (rawId && !isNaN(Number(rawId))) ? rawId : null;
  const isNew = !effectiveId && !propInitialData?.id;

  const [initialData, setInitialData] = useState<any>(propInitialData || null);
  const [loading, setLoading] = useState(Boolean(effectiveId && !propInitialData));
  const [existingProviders, setExistingProviders] = useState<any[]>([]);

  const [formData, setFormData] = useState<AiSaglayiciFormData>({
    ad: '',
    saglayiciTuru: 1,
    aiProtokolId: null,
    baseUrl: '',
    apiKey: '',
    varsayilanModel: '',
    desteklenenModeller: [],
    aktifMi: false,
    aciklama: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [protokoller, setProtokoller] = useState<AiProtokol[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('genel');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

  // Sağlayıcı adını breadcrumb için hesapla (benzersiz isim)
  const providerDisplayName = useMemo(() => {
    if (formData.ad?.trim()) return formData.ad.trim();
    if (initialData?.ad?.trim()) return initialData.ad.trim();
    if (effectiveId) return `#${effectiveId}`;
    return t('auto_yeni_saglayici', 'Yeni AI Sağlayıcısı');
  }, [formData.ad, initialData?.ad, effectiveId, t]);

  // Breadcrumb üzerinde sağlayıcı adının otomatik görüntülenmesini sağla
  useEffect(() => {
    if (setHeaderBreadcrumbOptions) {
      setHeaderBreadcrumbOptions({
        recordTitle: providerDisplayName
      });
    }
    return () => {
      if (setHeaderBreadcrumbOptions) {
        setHeaderBreadcrumbOptions(null);
      }
    };
  }, [providerDisplayName, setHeaderBreadcrumbOptions]);

  // Protokolleri yükle
  useEffect(() => {
    aiProtokolService.getAll().then(setProtokoller).catch(() => {});
  }, []);

  // Benzersizlik kontrolü için mevcut sağlayıcı listesini yükle
  useEffect(() => {
    aiSaglayiciService.getAll()
      .then(res => {
        if (Array.isArray(res)) {
          setExistingProviders(res);
        }
      })
      .catch(() => {});
  }, []);

  // initialData değiştiğinde formu doldur
  const populateFormData = (data: any) => {
    setFormData({
      ad: data.ad || '',
      saglayiciTuru: data.saglayiciTuru ?? 1,
      aiProtokolId: data.aiProtokolId ?? null,
      baseUrl: data.baseUrl || '',
      apiKey: '', // Güvenlik sebebiyle maskeli gelir, boş bırakılırsa mevcut anahtar korunur
      varsayilanModel: data.varsayilanModel || '',
      desteklenenModeller: data.desteklenenModeller || [],
      aktifMi: data.aktifMi ?? false,
      aciklama: data.aciklama || ''
    });
    setTestResult(null);
  };

  useEffect(() => {
    if (propInitialData) {
      setInitialData(propInitialData);
      populateFormData(propInitialData);
    }
  }, [propInitialData]);

  // ID varsa backend'den sağlayıcıyı çek
  useEffect(() => {
    if (effectiveId && !propInitialData) {
      setLoading(true);
      aiSaglayiciService.getById(Number(effectiveId))
        .then(data => {
          if (data) {
            setInitialData(data);
            populateFormData(data);
          }
        })
        .catch(err => {
          console.error(err);
          toast.error(t('ai_saglayici_yuklenemedi', 'Sağlayıcı bilgisi yüklenemedi.'));
        })
        .finally(() => setLoading(false));
    }
  }, [effectiveId]);

  const handleFieldChange = (field: keyof AiSaglayiciFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleFieldBlur = (field: keyof AiSaglayiciFormData) => {
    const errorMsg = validateAiSaglayiciField(
      field, 
      formData[field], 
      t, 
      existingProviders, 
      initialData?.id || effectiveId
    );
    setErrors(prev => ({
      ...prev,
      [field]: errorMsg
    }));
  };

  const handleApiKeyChange = (val: string) => {
    handleFieldChange('apiKey', val);
    if (val.trim().length > 0) {
      handleFieldChange('aktifMi', true);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    } else if (backRoute) {
      navigate(backRoute);
    } else if ((location.state as any)?.returnUrl) {
      navigate((location.state as any).returnUrl);
    } else {
      navigate(defaultBackRoute);
    }
  };

  // Protokol, BaseUrl ve Sağlayıcı Adından dahili sağlayıcı türünü (motorunu) otomatik çözümle
  const inferSaglayiciTuru = (
    protokolId: number | null | undefined,
    baseUrl?: string,
    ad?: string,
    fallbackTuru: number = 1
  ): number => {
    const urlLower = (baseUrl || '').toLowerCase();
    const adLower = (ad || '').toLowerCase();
    const proto = protokoller.find(p => Number(p.id) === Number(protokolId));
    const protoLower = (proto?.ad || '').toLowerCase();

    if (urlLower.includes('11434') || adLower.includes('ollama') || protoLower.includes('ollama')) {
      return 4; // Ollama (Yerel LLM)
    }
    if (urlLower.includes('deepseek') || adLower.includes('deepseek')) {
      return 5; // DeepSeek
    }
    if (protoLower.includes('gemini') || urlLower.includes('googleapis.com') || urlLower.includes('generativelanguage') || adLower.includes('gemini')) {
      return 2; // Google Gemini
    }
    if (protoLower.includes('anthropic') || protoLower.includes('claude') || urlLower.includes('anthropic.com') || adLower.includes('claude') || adLower.includes('anthropic')) {
      return 3; // Anthropic Claude
    }
    if (protoLower.includes('openai') || urlLower.includes('openai.com') || adLower.includes('openai') || urlLower.endsWith('/v1') || urlLower.includes('/v1/')) {
      return 1; // OpenAI
    }
    if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1')) {
      return 4; // Ollama
    }
    return fallbackTuru || 1;
  };

  const derivedSaglayiciTuru = useMemo(
    () => inferSaglayiciTuru(formData.aiProtokolId, formData.baseUrl, formData.ad, formData.saglayiciTuru),
    [formData.aiProtokolId, formData.baseUrl, formData.ad, formData.saglayiciTuru, protokoller]
  );

  const handleTestConnection = async () => {
    if (!formData.apiKey && derivedSaglayiciTuru !== 4 && !initialData?.apiKeyTanimliMi) {
      toast.error(t('auto_api_key_giriniz_uyari', 'Lütfen test etmek için önce API Anahtarını giriniz.'));
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      let res: any;
      if (initialData?.id && !formData.apiKey) {
        res = await aiSaglayiciService.testConnection(initialData.id);
      } else {
        res = await aiSaglayiciService.testStandalone({
          saglayiciTuru: derivedSaglayiciTuru,
          aiProtokolId: formData.aiProtokolId,
          baseUrl: formData.baseUrl,
          apiKey: formData.apiKey,
          model: formData.varsayilanModel
        });
      }

      setTestResult(res);
      if (res.basarili || res.success) {
        toast.success(t('auto_baglanti_basarili', 'Bağlantı Başarılı: {{mesaj}}', {
          mesaj: res.mesaj || res.message || 'OK'
        }));
      } else {
        toast.error(t('auto_baglanti_basarisiz', 'Bağlantı Başarısız: {{mesaj}}', { mesaj: res.mesaj || res.message }));
      }
    } catch (err: any) {
      toast.error(t('auto_baglanti_test_hata', 'Bağlantı testi sırasında hata oluştu.'));
      setTestResult({ basarili: false, mesaj: t('auto_sunucuya_ulasilamadi', 'Sunucuya ulaşılamadı veya geçersiz istek.') });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();

    const validationErrors = validateAiSaglayiciForm(
      formData, 
      t, 
      existingProviders, 
      initialData?.id || effectiveId
    );
    if (Object.values(validationErrors).some(Boolean)) {
      setErrors(validationErrors);
      toast.error(t('auto_formda_hatalar_var', 'Lütfen formdaki zorunlu alanları kontrol ediniz.'));
      return;
    }

    const payload = {
      ...formData,
      saglayiciTuru: derivedSaglayiciTuru
    };

    try {
      setIsSaving(true);
      if (initialData?.id || effectiveId) {
        const idToUpdate = Number(initialData?.id || effectiveId);
        await aiSaglayiciService.update(idToUpdate, payload);
        toast.success(t('auto_saglayici_guncellendi', 'Sağlayıcı yapılandırması başarıyla güncellendi.'));
      } else {
        await aiSaglayiciService.create(payload);
        toast.success(t('auto_saglayici_olusturuldu', 'Sağlayıcı oluşturuldu.'));
      }
      if (onSuccess) onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.mesaj || error.response?.data?.message || t('auto_kayit_hatasi', 'Kayıt sırasında hata oluştu.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const idToReset = Number(initialData?.id || effectiveId);
    if (!idToReset) return;

    showAlert(
      'confirm',
      t('auto_saglayici_sifirla', 'Sağlayıcıyı Sıfırla'),
      t('auto_saglayici_sifirlama_onay', 'Bu sağlayıcıyı varsayılan fabrika ayarlarına sıfırlamak istediğinize emin misiniz?'),
      async () => {
        try {
          setIsResetting(true);
          await aiSaglayiciService.reset(idToReset);
          toast.success(t('auto_saglayici_sifirlandi', 'Sağlayıcı fabrika ayarlarına sıfırlandı.'));
          if (onSuccess) onSuccess();
          handleClose();
        } catch (error: any) {
          toast.error(error.response?.data?.mesaj || t('auto_sifirlama_hatasi', 'Sıfırlama işlemi başarısız oldu.'));
        } finally {
          setIsResetting(false);
        }
      },
      t('auto_sifirla', 'Sıfırla'),
      t('auto_vazgec', 'Vazgeç')
    );
  };

  const statusBadge = useMemo(() => {
    if (initialData?.apiKeyTanimliMi || (formData.apiKey && formData.apiKey.trim().length > 0)) {
      return (
        <span className="chip-success">
          <CheckCircle2 size={13} /> {t('auto_anahtar_tanimli', 'Anahtar Tanımlı')}
        </span>
      );
    }
    if (derivedSaglayiciTuru === 4) {
      return (
        <span className="chip-primary">
          {t('auto_yerel_servis', 'Yerel Servis')}
        </span>
      );
    }
    return (
      <span className="chip-warning">
        <AlertCircle size={13} /> {t('auto_yapilandirilmadi', 'Yapılandırılmadı')}
      </span>
    );
  }, [initialData, formData.apiKey, derivedSaglayiciTuru, t]);

  // Protokol seçenekleri (BaseDropdownSecici uyumlu)
  const protokolOptions: DropdownOption[] = useMemo(() => [
    { id: '', label: t('auto_protokol_seciniz', '--- Protokol Seçiniz ---') },
    ...protokoller.map(p => ({
      id: p.id,
      label: p.ad,
      rawValue: p
    }))
  ], [protokoller, t]);

  const handleProtokolChange = (val: any) => {
    const protokolId = val ? Number(val) : null;
    const nextTuru = inferSaglayiciTuru(protokolId, formData.baseUrl, formData.ad, formData.saglayiciTuru);
    handleFieldChange('aiProtokolId', protokolId);
    handleFieldChange('saglayiciTuru', nextTuru);

    const currentUrl = (formData.baseUrl || '').toLowerCase();
    const isDefaultUrlOrEmpty =
      !currentUrl ||
      currentUrl.includes('api.openai.com') ||
      currentUrl.includes('googleapis.com') ||
      currentUrl.includes('anthropic.com') ||
      currentUrl.includes('11434') ||
      currentUrl.includes('deepseek.com');

    if (isDefaultUrlOrEmpty && protokolId) {
      const proto = protokoller.find(p => Number(p.id) === Number(protokolId));
      const protoLower = (proto?.ad || '').toLowerCase();
      if (protoLower.includes('gemini')) {
        handleFieldChange('baseUrl', 'https://generativelanguage.googleapis.com/v1beta');
      } else if (protoLower.includes('anthropic') || protoLower.includes('claude')) {
        handleFieldChange('baseUrl', 'https://api.anthropic.com/v1');
      } else if (protoLower.includes('openai')) {
        if ((formData.ad || '').toLowerCase().includes('ollama')) {
          handleFieldChange('baseUrl', 'http://localhost:11434');
        } else if ((formData.ad || '').toLowerCase().includes('deepseek')) {
          handleFieldChange('baseUrl', 'https://api.deepseek.com/v1');
        } else {
          handleFieldChange('baseUrl', 'https://api.openai.com/v1');
        }
      }
    }
  };

  const tabs: BaseTabItem[] = useMemo(() => [
    {
      id: 'genel',
      label: t('auto_genel_bilgiler', 'Genel & Bağlantı'),
      icon: <Sliders size={16} />,
      content: (
        <BaseCard className="p-24 flex flex-col gap-20">
          {/* Sağlayıcı Bilgi Özeti Banner'ı */}
          <div className="flex items-center justify-between p-16 rounded border border-glass bg-primary">
            <div className="flex items-center gap-12">
              <div className="ai-token-stat-icon primary">
                <Bot size={22} />
              </div>
              <div>
                <div className="font-bold text-primary text-base">{formData.ad || t('auto_ai_saglayicisi', 'AI Sağlayıcısı')}</div>
                <div className="text-xs text-secondary">{formData.aciklama || t('auto_sistem_ai_entegrasyonu', 'Sistem AI Entegrasyonu')}</div>
              </div>
            </div>
            <div>
              {statusBadge}
            </div>
          </div>

          {/* Form Izgarası */}
          <div className="grid-2-col gap-16">
            <div className="form-group">
              <label className="form-label">{t('auto_saglayici_adi', 'Sağlayıcı Adı')}</label>
              <BasitInput
                type="text"
                value={formData.ad || ''}
                onChange={e => handleFieldChange('ad', e.target.value)}
                onBlur={() => handleFieldBlur('ad')}
                placeholder={t('auto_saglayici_adi_ornek', 'Örn: OpenAI')}
                className={errors.ad ? 'is-invalid' : ''}
              />
              <FieldError error={errors.ad} />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_api_protokolu', 'API Protokolü & İletişim Standardı')}</label>
              <BaseDropdownSecici
                value={formData.aiProtokolId || ''}
                options={protokolOptions}
                onChange={handleProtokolChange}
                placeholder={t('auto_protokol_seciniz', '--- Protokol Seçiniz ---')}
                clearable={true}
              />
            </div>
          </div>

          <div className="grid-2-col gap-16">
            <div className="form-group">
              <label className="form-label">{t('auto_base_url', 'API Endpoint / Base URL')}</label>
              <BasitInput
                type="text"
                textTransform="none"
                value={formData.baseUrl || ''}
                onChange={e => handleFieldChange('baseUrl', e.target.value)}
                onBlur={() => handleFieldBlur('baseUrl')}
                placeholder={t('auto_base_url_ornek', 'https://api.openai.com/v1')}
                className={errors.baseUrl ? 'is-invalid' : ''}
              />
              <FieldError error={errors.baseUrl} />
              <span className="text-secondary text-xs mt-4">
                {t('auto_base_url_ipucu', 'Varsayılan resmi URL\'i kullanmak için boş bırakabilirsiniz.')}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_api_key', 'API Anahtarı (API Key)')}</label>
              <div className="flex items-center gap-8">
                <div className="flex-1">
                  <BasitInput
                    type={showApiKey ? 'text' : 'password'}
                    textTransform="none"
                    className="font-mono"
                    value={formData.apiKey || ''}
                    onChange={e => handleApiKeyChange(e.target.value)}
                    placeholder={initialData?.apiKeyTanimliMi ? t('auto_mevcut_key_korunur', '•••••••••••••••• (Değiştirmek için yeni anahtar girin)') : t('auto_api_key_ornek', 'sk-...')}
                  />
                </div>
                <BaseButton
                  type="button"
                  variant="secondary"
                  className="p-8"
                  onClick={() => setShowApiKey(!showApiKey)}
                  icon={showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  title={showApiKey ? t('auto_gizle', 'Gizle') : t('auto_goster', 'Göster')}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auto_aciklama', 'Açıklama & Entegrasyon Notları')}</label>
            <BasitInput
              type="text"
              value={formData.aciklama || ''}
              onChange={e => handleFieldChange('aciklama', e.target.value)}
              placeholder={t('auto_saglayici_aciklama_ornek', 'Örn: GPT-4o ve o1 modelleri için birincil kurumsal LLM sağlayıcısı')}
            />
          </div>

          {/* Aktiflik Durumu Switch Kartı */}
          <div className="flex items-center justify-between p-16 rounded border border-glass bg-primary-soft">
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{t('auto_saglayici_aktif_mi', 'Sağlayıcıyı Sistemde Aktifleştir')}</span>
              <span className="text-secondary text-xs mt-4">{t('auto_saglayici_aktif_aciklama', 'Aktif olmayan sağlayıcılar ERP asistanında ve yapay zeka ajanlarında kullanılamaz.')}</span>
            </div>
            <BaseSwitch
              checked={Boolean(formData.aktifMi)}
              onChange={val => handleFieldChange('aktifMi', val)}
            />
          </div>
        </BaseCard>
      )
    },
    {
      id: 'modeller',
      label: t('auto_modeller_ve_secim', 'Modeller & Havuz'),
      icon: <Cpu size={16} />,
      content: (
        <BaseCard className="p-24 flex flex-col gap-20">
          <div className="text-xs text-secondary">
            {t('auto_model_havuzu_aciklama', 'Bu sağlayıcı üzerinden kullanılabilecek modelleri tanımlayın ve birincil varsayılan modeli belirleyin.')}
          </div>

          <div className="form-group">
            <YZModelSecici
              providerId={initialData?.id || effectiveId || undefined}
              saglayiciTuru={derivedSaglayiciTuru}
              baseUrl={formData.baseUrl}
              apiKey={formData.apiKey}
              value={formData.desteklenenModeller}
              varsayilanModel={formData.varsayilanModel}
              onChange={(modeller: any) => {
                setFormData(prev => ({
                  ...prev,
                  desteklenenModeller: Array.isArray(modeller) ? modeller : (modeller ? [modeller] : [])
                }));
              }}
              onDefaultModelChange={(varsayilan: string) => {
                setFormData(prev => ({
                  ...prev,
                  varsayilanModel: varsayilan
                }));
              }}
            />
          </div>
        </BaseCard>
      )
    },
    {
      id: 'test',
      label: t('auto_canli_baglanti_testi', 'Canlı Test Konsolu'),
      icon: <Zap size={16} />,
      content: (
        <BaseCard className="p-24 flex flex-col gap-20">
          <div className="flex items-center justify-between p-16 rounded border border-glass bg-primary">
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{t('auto_canli_baglanti_testi', 'Canlı API Bağlantı Testi')}</span>
              <span className="text-secondary text-xs mt-4">{t('auto_canli_test_aciklama', 'Girdiğiniz API anahtarı ve seçilen model ile harici sağlayıcıya ping gönderir.')}</span>
            </div>
            <BaseButton
              type="button"
              variant="primary"
              onClick={handleTestConnection}
              disabled={testing}
              isSaving={testing}
              loadingText={t('auto_test_ediliyor', 'Test Ediliyor...')}
              text={t('auto_test_et', 'Bağlantıyı Test Et')}
              icon={<Zap size={15} />}
            />
          </div>

          {testResult && (
            <div className={`ai-test-alert ${testResult.basarili || testResult.success ? 'success' : 'danger'}`}>
              {(testResult.basarili || testResult.success) ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <div className="flex flex-col gap-4 flex-1">
                <span className="font-semibold">{(testResult.basarili || testResult.success) ? t('auto_test_basarili', 'Test Başarılı') : t('auto_test_basarisiz', 'Test Başarısız')}</span>
                <span>{testResult.mesaj || testResult.message} {testResult.yanitSuresiMs ? `(${Math.round(testResult.yanitSuresiMs)} ms)` : ''}</span>
              </div>
            </div>
          )}
        </BaseCard>
      )
    }
  ], [
    t,
    formData,
    initialData,
    effectiveId,
    derivedSaglayiciTuru,
    statusBadge,
    protokolOptions,
    errors,
    showApiKey,
    testing,
    testResult
  ]);

  if (loading) {
    return (
      <PageLoader />
    );
  }

  const hasRecordId = Boolean(initialData?.id || effectiveId);

  return (
    <BaseCardPage
      id="aiSaglayiciForm"
      title={isNew ? t('auto_yeni_saglayici', 'Yeni AI Sağlayıcısı') : t('auto_saglayici_yapilandir', '{{ad}} Yapılandırması', { ad: formData.ad || initialData?.ad || '' })}
      pageTitle={isNew ? t('auto_yeni_saglayici', 'Yeni AI Sağlayıcısı') : t('auto_saglayici_yapilandir', '{{ad}} Yapılandırması', { ad: formData.ad || initialData?.ad || t('auto_ai_saglayicisi', 'AI Sağlayıcısı') })}
      recordTitle={providerDisplayName}
      icon={<Cpu size={24} />}
      subtitleLeft={formData.aciklama || t('auto_saglayici_modal_aciklama', 'API anahtarlarını, protokol standardını ve desteklenen modelleri yönetin.')}
      subtitleRight={statusBadge}
      showBackButton={true}
      onClose={handleClose}
      onSave={handleSave}
      isSaving={isSaving}
      saveButtonText={t('auto_kaydet', 'Kaydet')}
      extraDropdownActions={
        hasRecordId ? [
          {
            label: t('auto_sifirla_varsayilana_don', 'Sıfırla (Varsayılana Dön)'),
            icon: <RotateCcw size={15} />,
            onClick: handleReset,
            danger: true,
            dividerAbove: true
          }
        ] : []
      }
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={(tabId) => setActiveTabId(tabId as string)}
      className="fade-in"
    />
  );
};

export default AiSaglayiciForm;
