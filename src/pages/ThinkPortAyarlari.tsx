/**
 * @akalin/ai_management_module - Think Port Ayarları Yönetim Sayfası (ThinkPortAyarlari.tsx)
 * BaseCardPage mimarisi üzerinde Webakus <-> ThinkPort AI Gateway bağlantı parametrelerini,
 * hız sınırlarını (RPM), eşzamanlı tarayıcı oturumu havuzunu, anti-bot stealth ve proxy
 * politikalarını ve aktif model havuzunu tek merkezden yönetir.
 *
 * Sorumlulukları:
 * - Webakus ile think-port-api arasındaki Base URL, API Anahtarı, Protokol ve Timeout ayarlarını yönetmek
 * - think-port-api Gateway Sistem Parametrelerini (global_rpm, max_concurrent_browsers, keep_alive_interval_sec, enable_stealth, auto_rotate_proxy_on_403) senkronize etmek
 * - YZModelSecici ile ThinkPort model havuzunu ve varsayılan modeli yapılandırmak
 * - Canlı bağlantı ve gecikme (latency) testi gerçekleştirmek
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Key,
  Shield,
  Cpu,
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Play,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Activity,
  Sliders
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  BaseCardPage,
  BasitInput,
  BaseDropdownSecici,
  TamsayiInput,
  BaseSwitch,
  BaseButton,
  PolicySettingCard,
  YZModelSecici,
  FieldError,
  useAlertDialog,
  type BaseTabItem,
  type ActionMenuItem
} from '@akalin/ui';
import { aiSaglayiciService } from '../services/aiSaglayiciService';
import { aiProtokolService } from '../services/aiProtokolService';
import { AiProtokol } from '../types';
import {
  validateThinkPortForm,
  validateThinkPortField,
  type ThinkPortAyarlariFormData
} from '../validators/thinkPortAyarlariValidation';
import '../styles/aiManagement.css';

export interface ThinkPortAyarlariProps {
  isSubModule?: boolean;
  onBack?: () => void;
}

export const ThinkPortAyarlari: React.FC<ThinkPortAyarlariProps> = ({
  isSubModule = false,
  onBack
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useAlertDialog();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('baglanti');

  const [providerId, setProviderId] = useState<number>(0);
  const [apiKeyTanimliMi, setApiKeyTanimliMi] = useState<boolean>(false);
  const [ajanSayisi, setAjanSayisi] = useState<number>(0);
  const [gatewayBaglantiDurumu, setGatewayBaglantiDurumu] = useState<boolean>(false);
  const [protokoller, setProtokoller] = useState<AiProtokol[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [testResult, setTestResult] = useState<{
    basarili: boolean;
    mesaj: string;
    yanitSuresiMs?: number;
    modeller?: string[];
  } | null>(null);

  const [formData, setFormData] = useState<Required<ThinkPortAyarlariFormData>>({
    ad: 'ThinkPort API',
    aiProtokolId: 1,
    baseUrl: 'http://localhost:8000/v1',
    apiKey: '',
    varsayilanModel: 'gpt-4o',
    desteklenenModeller: [
      'gpt-4o',
      'claude-3-5-sonnet',
      'deepseek-r1',
      'gemini-2.5-pro',
      'grok-3',
      'qwen-max'
    ],
    timeoutSaniye: 60,
    aktifMi: true,
    aciklama: '',
    globalRpm: 600,
    maxConcurrentBrowsers: 16,
    keepAliveIntervalSec: 300,
    enableStealth: true,
    autoRotateProxyOn403: true
  });

  const handleFieldChange = useCallback(
    (field: keyof ThinkPortAyarlariFormData, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setErrors(prev => {
        if (!prev[field]) return prev;
        const nextErr = validateThinkPortField(field, value, t);
        const updated = { ...prev };
        if (nextErr) {
          updated[field] = nextErr;
        } else {
          delete updated[field];
        }
        return updated;
      });
    },
    [t]
  );

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [settings, protoList] = await Promise.all([
        aiSaglayiciService.getThinkPortSettings(),
        aiProtokolService.getAll().catch(() => [] as AiProtokol[])
      ]);

      setProtokoller(protoList || []);
      setProviderId(settings.id);
      setApiKeyTanimliMi(Boolean(settings.apiKeyTanimliMi));
      setAjanSayisi(settings.ajanSayisi || 0);
      setGatewayBaglantiDurumu(Boolean(settings.gatewayBaglantiDurumu));

      const defaultOpenAiProto =
        (protoList || []).find(p => (p.ad || '').toLowerCase().includes('openai'))?.id ??
        protoList?.[0]?.id ??
        1;

      setFormData({
        ad: settings.ad || 'ThinkPort API',
        aiProtokolId: settings.aiProtokolId || defaultOpenAiProto,
        baseUrl: settings.baseUrl || 'http://localhost:8000/v1',
        apiKey: '',
        varsayilanModel: settings.varsayilanModel || 'gpt-4o',
        desteklenenModeller: Array.isArray(settings.desteklenenModeller)
          ? settings.desteklenenModeller
          : [],
        timeoutSaniye: settings.timeoutSaniye || 60,
        aktifMi: settings.aktifMi !== false,
        aciklama: settings.aciklama || '',
        globalRpm: settings.gatewaySettings?.globalRpm ?? 600,
        maxConcurrentBrowsers: settings.gatewaySettings?.maxConcurrentBrowsers ?? 16,
        keepAliveIntervalSec: settings.gatewaySettings?.keepAliveIntervalSec ?? 300,
        enableStealth: settings.gatewaySettings?.enableStealth ?? true,
        autoRotateProxyOn403: settings.gatewaySettings?.autoRotateProxyOn403 ?? true
      });
    } catch {
      toast.error(t('think_port_yukleme_hatasi', 'Think Port ayarları yüklenirken hata oluştu.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      navigate('/ayarlar/YapayZekaAyarlari');
    }
  }, [navigate, onBack]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationErrors = validateThinkPortForm(formData, t);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      if (validationErrors.ad || validationErrors.baseUrl) {
        setActiveTab('baglanti');
      } else if (
        validationErrors.globalRpm ||
        validationErrors.maxConcurrentBrowsers ||
        validationErrors.keepAliveIntervalSec
      ) {
        setActiveTab('gateway');
      }
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }

    try {
      setSaving(true);
      const updated = await aiSaglayiciService.updateThinkPortSettings({
        ad: formData.ad.trim(),
        aiProtokolId: formData.aiProtokolId,
        baseUrl: formData.baseUrl.trim(),
        apiKey: formData.apiKey.trim() || undefined,
        varsayilanModel: formData.varsayilanModel.trim(),
        desteklenenModeller: formData.desteklenenModeller,
        timeoutSaniye: Number(formData.timeoutSaniye) || 60,
        aktifMi: formData.aktifMi,
        aciklama: formData.aciklama.trim(),
        gatewaySettings: {
          globalRpm: Number(formData.globalRpm) || 600,
          maxConcurrentBrowsers: Number(formData.maxConcurrentBrowsers) || 16,
          keepAliveIntervalSec: Number(formData.keepAliveIntervalSec) || 300,
          enableStealth: Boolean(formData.enableStealth),
          autoRotateProxyOn403: Boolean(formData.autoRotateProxyOn403)
        }
      });

      setProviderId(updated.id);
      setApiKeyTanimliMi(Boolean(updated.apiKeyTanimliMi));
      setGatewayBaglantiDurumu(Boolean(updated.gatewayBaglantiDurumu));
      setFormData(prev => ({ ...prev, apiKey: '' }));

      toast.success(
        t(
          'think_port_kaydedildi',
          'Think Port bağlantı ve gateway sistem ayarları başarıyla kaydedildi.'
        )
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        t('kayit_sirasinda_hata', 'Kayıt sırasında hata oluştu.');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const res: any = await aiSaglayiciService.testStandalone({
        saglayiciTuru: 1,
        aiProtokolId: formData.aiProtokolId,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey || undefined,
        model: formData.varsayilanModel
      });

      const isSuccess = res.basarili ?? res.success ?? false;
      const msg = res.mesaj || res.message || '';
      const detectedModels: string[] = Array.isArray(res.tespitEdilenModeller)
        ? res.tespitEdilenModeller
        : [];

      setTestResult({
        basarili: isSuccess,
        mesaj: msg,
        yanitSuresiMs: res.yanitSuresiMs,
        modeller: detectedModels
      });

      if (isSuccess) {
        if (detectedModels.length > 0 && formData.desteklenenModeller.length === 0) {
          setFormData(prev => ({
            ...prev,
            desteklenenModeller: detectedModels,
            varsayilanModel: prev.varsayilanModel || detectedModels[0]
          }));
        }
        toast.success(msg || t('baglanti_testi_basarili', 'Think Port bağlantı testi başarılı!'));
      } else {
        toast.error(msg || t('baglanti_testi_basarisiz', 'Think Port bağlantı testi başarısız.'));
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.mesaj ||
        err?.response?.data?.message ||
        t('baglanti_testi_hatasi', 'Think Port sunucusuna bağlanırken hata oluştu.');
      setTestResult({ basarili: false, mesaj: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const executeResetDefaults = async () => {
    try {
      setSaving(true);
      const resetData = await aiSaglayiciService.resetThinkPortSettings();
      setProviderId(resetData.id);
      setApiKeyTanimliMi(Boolean(resetData.apiKeyTanimliMi));
      setGatewayBaglantiDurumu(Boolean(resetData.gatewayBaglantiDurumu));
      setFormData({
        ad: resetData.ad || 'ThinkPort API',
        aiProtokolId: resetData.aiProtokolId || formData.aiProtokolId,
        baseUrl: resetData.baseUrl || 'http://localhost:8000/v1',
        apiKey: '',
        varsayilanModel: resetData.varsayilanModel || 'gpt-4o',
        desteklenenModeller: resetData.desteklenenModeller || [],
        timeoutSaniye: resetData.timeoutSaniye || 60,
        aktifMi: resetData.aktifMi !== false,
        aciklama: resetData.aciklama || '',
        globalRpm: resetData.gatewaySettings?.globalRpm ?? 600,
        maxConcurrentBrowsers: resetData.gatewaySettings?.maxConcurrentBrowsers ?? 16,
        keepAliveIntervalSec: resetData.gatewaySettings?.keepAliveIntervalSec ?? 300,
        enableStealth: resetData.gatewaySettings?.enableStealth ?? true,
        autoRotateProxyOn403: resetData.gatewaySettings?.autoRotateProxyOn403 ?? true
      });
      toast.success(
        t('think_port_varsayilanlara_sifirlandi', 'Think Port ayarları varsayılan değerlere sıfırlandı.')
      );
    } catch {
      toast.error(t('sifirlama_hatasi', 'Ayarlar sıfırlanırken hata oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    showAlert(
      'confirm',
      t('think_port_sifirla_baslik', 'Varsayılan Ayarlara Sıfırla'),
      t(
        'think_port_sifirla_onay',
        'Think Port bağlantı ve Gateway sistem politikalarını varsayılan fabrika değerlerine sıfırlamak istediğinize emin misiniz?'
      ),
      () => {
        executeResetDefaults();
      },
      t('sifirla', 'Sıfırla'),
      t('iptal', 'İptal')
    );
  };

  const extraActions: ActionMenuItem[] = useMemo(
    () => [
      {
        custom: (
          <BaseSwitch
            id="thinkPortAktifMiSwitch"
            checked={formData.aktifMi}
            onChange={(e: any) => {
              const checked = typeof e === 'boolean' ? e : Boolean(e?.target?.checked);
              handleFieldChange('aktifMi', checked);
            }}
            label={
              <span className="flex items-center gap-8">
                <span className="font-medium">{t('durum', 'Durum')}:</span>
                <span className={formData.aktifMi ? 'text-success font-semibold' : 'text-secondary font-semibold'}>
                  {formData.aktifMi ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
                </span>
              </span>
            }
            className="action-menu-switch-item"
          />
        ),
        dividerBelow: true
      },
      {
        label: t('think_port_yuksek_guvenlik_profili', 'Yüksek Güvenlik Profili Uygula'),
        icon: <Shield size={15} />,
        onClick: () => {
          setFormData(prev => ({
            ...prev,
            enableStealth: true,
            autoRotateProxyOn403: true,
            globalRpm: 300
          }));
          setActiveTab('gateway');
          toast.success(
            t(
              'think_port_yuksek_guvenlik_uygulandi',
              'Yüksek güvenlik profili form alanlarına uygulandı. Kaydet butonuna basarak kalıcı hale getirebilirsiniz.'
            )
          );
        }
      },
      {
        label: t('think_port_yuksek_kapasite_profili', 'Yüksek Kapasite Profili (24 Oturum / 1200 RPM)'),
        icon: <Cpu size={15} />,
        onClick: () => {
          setFormData(prev => ({
            ...prev,
            maxConcurrentBrowsers: 24,
            globalRpm: 1200,
            keepAliveIntervalSec: 180
          }));
          setActiveTab('gateway');
          toast.success(
            t(
              'think_port_yuksek_kapasite_uygulandi',
              'Yüksek kapasite profili form alanlarına uygulandı. Kaydet butonuna basarak kalıcı hale getirebilirsiniz.'
            )
          );
        }
      },
      {
        label: t('think_port_canli_baglanti_testi', 'Canlı Bağlantı Testi Yap'),
        icon: <Play size={15} />,
        onClick: () => {
          setActiveTab('test');
          handleTestConnection();
        }
      },
      {
        label: t('varsayilan_ayarlara_sifirla', 'Varsayılan Ayarlara Sıfırla'),
        icon: <RotateCcw size={15} />,
        danger: true,
        dividerAbove: true,
        onClick: handleResetDefaults
      }
    ],
    [t, formData.aktifMi, formData.aiProtokolId, formData.baseUrl, formData.apiKey, formData.varsayilanModel, handleFieldChange]
  );

  const tabs: BaseTabItem[] = [
    {
      id: 'baglanti',
      label: t('think_port_tab_baglanti', 'Bağlantı & Kimlik'),
      icon: <Globe size={16} />,
      content: (
        <div className="think-port-tab-panel">
          <div className="think-port-info-banner">
            <Sparkles size={18} className="think-port-info-banner-icon" />
            <div>
              {t(
                'think_port_merkezi_bilgi_metni',
                'Webakus içerisindeki tüm yapay zeka ajanları, belge analizörleri ve MCP iş akışları burada yapılandırılan ThinkPort AI Gateway bağlantısını ve model havuzunu tek merkezden kullanır.'
              )}
            </div>
          </div>

          <div className="think-port-grid-2col">
            <div className="think-port-field-group">
              <label className="think-port-label-title">
                <span>{t('think_port_servis_adi', 'Gateway Servis Adı')} *</span>
              </label>
              <BasitInput
                id="thinkport-ad"
                autoFocus
                value={formData.ad}
                onChange={e => handleFieldChange('ad', e.target.value)}
                placeholder={t('think_port_servis_adi_placeholder', 'ThinkPort API')}
                className={errors.ad ? 'input-error' : ''}
              />
              <FieldError error={errors.ad} />
            </div>

            <div className="think-port-field-group">
              <label className="think-port-label-title">
                <Cpu size={14} />
                <span>{t('ai_protokolu', 'API Protokolü')} *</span>
              </label>
              <BaseDropdownSecici
                id="thinkport-protokol"
                value={formData.aiProtokolId || ''}
                onChange={val => {
                  const numVal = val ? Number(val) : null;
                  handleFieldChange('aiProtokolId', numVal);
                  setTimeout(() => {
                    const nextEl = document.getElementById('thinkport-baseurl');
                    nextEl?.focus();
                  }, 50);
                }}
                options={protokoller.map(p => ({
                  id: p.id,
                  label: p.sistemProtokoluMu
                    ? `${p.ad} (${t('sistem', 'Sistem')})`
                    : `${p.ad} (${t('ozel_script', 'Özel Script')})`
                }))}
                placeholder={t('protokol_seciniz', 'Protokol Seçiniz')}
              />
            </div>

            <div className="think-port-field-group">
              <label className="think-port-label-title">
                <Globe size={14} />
                <span>{t('think_port_base_url', 'ThinkPort API Endpoint (Base URL)')} *</span>
              </label>
              <BasitInput
                id="thinkport-baseurl"
                value={formData.baseUrl}
                onChange={e => handleFieldChange('baseUrl', e.target.value)}
                placeholder="http://localhost:8000/v1"
                className={errors.baseUrl ? 'input-error' : ''}
              />
              <FieldError error={errors.baseUrl} />
            </div>

            <div className="think-port-field-group">
              <div className="think-port-label-row">
                <label className="think-port-label-title">
                  <Key size={14} />
                  <span>{t('api_anahtari_secret_key', 'API Anahtarı (Gateway Master / İstemci Anahtarı)')}</span>
                </label>
                {apiKeyTanimliMi && (
                  <span className="think-port-key-defined-badge">
                    ✓ {t('tanimli_degistirmek_icin_yazin', 'Tanımlı (Değiştirmek için yeni anahtar girin)')}
                  </span>
                )}
              </div>
              <div className="think-port-password-wrapper">
                <BasitInput
                  id="thinkport-apikey"
                  type={showKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={e => handleFieldChange('apiKey', e.target.value)}
                  placeholder={
                    apiKeyTanimliMi
                      ? '••••••••••••••••••••••••••••••••'
                      : 'sk-gw-default-master-key'
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowKey(prev => !prev)}
                  className="think-port-eye-btn"
                  title={showKey ? t('gizle', 'Gizle') : t('goster', 'Göster')}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="think-port-field-group">
              <label className="think-port-label-title">
                <Clock size={14} />
                <span>{t('think_port_timeout_saniye', 'İstek Zaman Aşımı (Timeout)')}</span>
              </label>
              <TamsayiInput
                value={formData.timeoutSaniye}
                onChange={e => handleFieldChange('timeoutSaniye', Number(e.target.value) || 60)}
                suffix={t('saniye_kisa', 'sn')}
              />
            </div>

            <div className="think-port-field-group">
              <label className="think-port-label-title">
                <span>{t('aciklama', 'Açıklama')}</span>
              </label>
              <BasitInput
                id="thinkport-aciklama"
                value={formData.aciklama}
                onChange={e => handleFieldChange('aciklama', e.target.value)}
                placeholder={t(
                  'think_port_aciklama_placeholder',
                  'ThinkPort AI Gateway merkezi bağlantı ve model yönlendirme katmanı...'
                )}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'gateway',
      label: t('think_port_tab_gateway', 'Gateway Sistem Politikaları'),
      icon: <Sliders size={16} />,
      content: (
        <div className="think-port-tab-panel">
          <div className="think-port-policy-list">
            <PolicySettingCard
              icon={<Globe size={18} />}
              title={t('think_port_global_rpm_baslik', 'Global Hız Sınırı (RPM)')}
              description={t(
                'think_port_global_rpm_aciklama',
                'ThinkPort API Gateway genelinde tüm istemci anahtarlarının dakikada gönderebileceği toplam maksimum istek sayısı.'
              )}
              error={errors.globalRpm}
              action={
                <div className="think-port-number-control">
                  <TamsayiInput
                    value={formData.globalRpm}
                    onChange={e => handleFieldChange('globalRpm', Number(e.target.value) || 0)}
                    suffix="RPM"
                  />
                </div>
              }
            />

            <PolicySettingCard
              icon={<Cpu size={18} />}
              title={t(
                'think_port_max_browsers_baslik',
                'Maksimum Eşzamanlı Tarayıcı Oturumu'
              )}
              description={t(
                'think_port_max_browsers_aciklama',
                'Playwright / Chromium havuzunda aynı anda açık tutulabilecek maksimum tarayıcı bağlamı (context) sayısı.'
              )}
              error={errors.maxConcurrentBrowsers}
              action={
                <div className="think-port-number-control">
                  <TamsayiInput
                    value={formData.maxConcurrentBrowsers}
                    onChange={e =>
                      handleFieldChange('maxConcurrentBrowsers', Number(e.target.value) || 0)
                    }
                  />
                </div>
              }
            />

            <PolicySettingCard
              icon={<Clock size={18} />}
              title={t('think_port_keep_alive_baslik', 'Oturum Keep-Alive Süresi (sn)')}
              description={t(
                'think_port_keep_alive_aciklama',
                'Tarayıcı çerezlerinin ve sağlayıcı oturumlarının canlı tutulması için arka plan yoklama periyodu.'
              )}
              error={errors.keepAliveIntervalSec}
              action={
                <div className="think-port-number-control">
                  <TamsayiInput
                    value={formData.keepAliveIntervalSec}
                    onChange={e =>
                      handleFieldChange('keepAliveIntervalSec', Number(e.target.value) || 0)
                    }
                    suffix={t('saniye_kisa', 'sn')}
                  />
                </div>
              }
            />

            <PolicySettingCard
              icon={<Shield size={18} />}
              iconActive={formData.enableStealth}
              title={t('think_port_enable_stealth_baslik', 'Anti-Bot Stealth Modu')}
              description={t(
                'think_port_enable_stealth_aciklama',
                'Cloudflare ve Turnstile korumalarını aşmak için tarayıcı parmak izi gizleme katmanını etkinleştirir.'
              )}
              action={
                <BaseSwitch
                  checked={formData.enableStealth}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : Boolean(e?.target?.checked);
                    handleFieldChange('enableStealth', checked);
                  }}
                />
              }
            />

            <PolicySettingCard
              icon={<RefreshCw size={18} />}
              iconActive={formData.autoRotateProxyOn403}
              title={t(
                'think_port_auto_rotate_proxy_baslik',
                'HTTP 403 Durumunda Otomatik Proxy Rotasyonu'
              )}
              description={t(
                'think_port_auto_rotate_proxy_aciklama',
                'Sağlayıcı engeli veya hız sınırı algılandığında isteği otomatik olarak yedek proxy düğümüne yönlendirir.'
              )}
              action={
                <BaseSwitch
                  checked={formData.autoRotateProxyOn403}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : Boolean(e?.target?.checked);
                    handleFieldChange('autoRotateProxyOn403', checked);
                  }}
                />
              }
            />
          </div>
        </div>
      )
    },
    {
      id: 'modeller',
      label: t('think_port_tab_modeller', 'Modeller & Havuz'),
      icon: <Cpu size={16} />,
      badge: formData.desteklenenModeller.length,
      content: (
        <div className="think-port-tab-panel">
          <div className="think-port-field-group">
            <label className="think-port-label-title">
              <Cpu size={14} />
              <span>
                {t(
                  'think_port_desteklenen_modeller_label',
                  'ThinkPort Desteklenen Modeller & Varsayılan Model'
                )}
              </span>
            </label>
            <YZModelSecici
              saglayiciTuru={1}
              baseUrl={formData.baseUrl}
              apiKey={formData.apiKey}
              providerId={providerId || undefined}
              value={formData.desteklenenModeller}
              varsayilanModel={formData.varsayilanModel}
              showLiveFetchButton={true}
              onChange={(modeller: string[]) => {
                const list = Array.isArray(modeller) ? modeller : [];
                setFormData(prev => ({
                  ...prev,
                  desteklenenModeller: list,
                  varsayilanModel:
                    list.includes(prev.varsayilanModel) ? prev.varsayilanModel : (list[0] || '')
                }));
              }}
              onDefaultModelChange={(defModel: string) => {
                handleFieldChange('varsayilanModel', defModel);
              }}
            />
          </div>
        </div>
      )
    },
    {
      id: 'test',
      label: t('think_port_tab_test', 'Canlı Test Konsolu'),
      icon: <Activity size={16} />,
      content: (
        <div className="think-port-tab-panel">
          <div className="think-port-test-card">
            <div className="think-port-test-header">
              <div className="think-port-test-meta">
                <h4 className="think-port-test-title">
                  {t('think_port_canli_baglanti_baslik', 'ThinkPort API Canlı Bağlantı ve Model Keşif Testi')}
                </h4>
                <p className="think-port-test-desc">
                  {t(
                    'think_port_canli_baglanti_aciklama',
                    'Yapılandırılan Base URL ve API anahtarı üzerinden ThinkPort Gateway sunucusuna gerçek zamanlı istek göndererek erişilebilirliği ve aktif modelleri doğrular.'
                  )}
                </p>
              </div>
              <BaseButton
                variant="outline"
                icon={<Play size={15} />}
                onClick={handleTestConnection}
                isSaving={testing}
                loadingText={t('test_ediliyor', 'Test Ediliyor...')}
                text={t('canli_baglanti_testi_yap', 'Canlı Bağlantı Testi Yap')}
                disabled={testing || saving}
              />
            </div>

            {testResult && (
              <div className={`ai-test-alert ${testResult.basarili ? 'success' : 'danger'}`}>
                {testResult.basarili ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <XCircle size={16} />
                )}
                <span>
                  {testResult.mesaj}
                  {testResult.yanitSuresiMs ? ` (${testResult.yanitSuresiMs} ms)` : ''}
                </span>
              </div>
            )}

            {testResult?.modeller && testResult.modeller.length > 0 && (
              <div className="ai-models-chip-container">
                <span className="ai-models-chip-title">
                  {t('think_port_tespit_edilen_modeller', 'ThinkPort Üzerinde Tespit Edilen Aktif Modeller')}
                </span>
                <div className="ai-models-chip-list">
                  {testResult.modeller.map(m => (
                    <span
                      key={m}
                      className={`ai-model-chip ${
                        m === formData.varsayilanModel ? 'is-default' : ''
                      }`}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <BaseCardPage
      id="thinkPortAyarlari"
      title={t('menu_think_port_ayarlari', 'Think Port Ayarları')}
      pageTitle={t('menu_think_port_ayarlari', 'Think Port Ayarları')}
      subtitleLeft={t(
        'think_port_ayarlari_subtitle',
        'ThinkPort AI Gateway merkezi bağlantı parametreleri, hız sınırları, tarayıcı oturum havuzu ve model yönlendirme ayarları'
      )}
      icon={<Cpu size={24} />}
      asForm
      onSave={handleSave}
      isSaving={saving || loading}
      extraDropdownActions={extraActions}
      showBackButton={true}
      onClose={handleBack}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={tabId => setActiveTab(String(tabId))}
    />
  );
};

export default ThinkPortAyarlari;
