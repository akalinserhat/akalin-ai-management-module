/**
 * @akalin/ai_management_module - Yapay Zeka (AI) Sağlayıcıları ve LLM Model Yönetim Sayfası
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseSystemPage ve BaseSystemCard temel bileşenlerinden türetilmiştir.
 * - OpenAI, Google Gemini, Anthropic Claude, DeepSeek ve Yerel Ollama sağlayıcılarını listelemek ve durumlarını izlemek
 * - API anahtarlarını, varsayılan modelleri ve bağlı ajan sayılarını görüntülemek
 * - Canlı API bağlantı testi gerçekleştirmek
 * - AiSaglayiciForm bileşeni ile sağlayıcı ekleme ve yapılandırma işlemlerini yürütmek
 * - Arama ve filtreleme yeteneklerini BaseSystemPage entegrasyonu ile yönetmek
 * - Kesinlikle inline CSS barındırmaz, tüm stiller Material Design 3 (MD3) token'ları ile yönetilir.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Cpu, Key, CheckCircle2, XCircle, RefreshCw, 
  Settings2, Zap, Activity, AlertCircle, Code2, Search,
  Plus, Trash2, Sparkles
} from 'lucide-react';
import { BaseSystemPage, BaseSystemCard, BaseSwitch, useAlertDialog, type ActionMenuItem } from '@akalin/ui';
import AiSaglayiciForm from './AiSaglayiciForm';
import { aiSaglayiciService } from '../services/aiSaglayiciService';
import { firmaAiSettingsService } from '../services/firmaAiSettingsService';

export interface AiSaglayicilarProps {
  embedded?: boolean;
  backRoute?: string;
  onBack?: () => void;
}

export const AiSaglayicilar: React.FC<AiSaglayicilarProps> = ({ 
  embedded = false,
  backRoute: propBackRoute = '/ayarlar/YapayZekaAyarlari',
  onBack
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramId } = useParams<{ id?: string }>();
  const { showAlert } = useAlertDialog();

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const baseRoute = isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari/AiSaglayicilar' : '/ai-saglayicilar';
  const effectiveBackRoute = propBackRoute || (isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari' : '/yapay-zeka-ayarlari');

  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('ai_saglayicilar_search') || '');
  
  const isInitialMount = useRef(true);

  const isNewRoute = paramId === 'yeni' || location.pathname.endsWith('/yeni');
  const [isCreating, setIsCreating] = useState(isNewRoute);

  // Düzenleme / Alt Sayfa Durumu
  const [selectedProvider, setSelectedProvider] = useState<any>(() => location.state?.providerData || null);

  const [isYanitSenteziActive, setIsYanitSenteziActive] = useState<boolean>(true);

  // Global sistem ayarını yükle
  useEffect(() => {
    firmaAiSettingsService.getYanitSenteziAyar()
      .then(aktif => setIsYanitSenteziActive(aktif))
      .catch(() => {});
  }, []);

  const handleToggleGlobalYanitSentezi = async (e: any) => {
    const newVal = e.target.checked;
    setIsYanitSenteziActive(newVal);
    try {
      await firmaAiSettingsService.setYanitSenteziAyar(newVal);
      toast.success(
        newVal 
          ? t('ai_sentez_aktif_edildi', 'Akıllı Yanıt Sentezi aktif edildi.') 
          : t('ai_sentez_pasif_edildi', 'Token tasarruf modu aktif: Doğrudan araç çıktıları dönecek.')
      );
    } catch {
      toast.error(t('ai_ayar_kaydedilemedi', 'Ayar kaydedilemedi.'));
    }
  };

  const extraDropdownActions = useMemo<ActionMenuItem[]>(() => [
    {
      custom: (
        <BaseSwitch
          id="aiSaglayicilarLlmYanitSenteziSwitch"
          checked={isYanitSenteziActive}
          onChange={handleToggleGlobalYanitSentezi}
          label={
            <span className="flex items-center gap-8">
              <Sparkles size={15} className={isYanitSenteziActive ? "text-success" : "text-secondary"} />
              <span className="font-medium">{t('akilli_yanit_sentezi', 'Akıllı Yanıt Sentezi')}:</span>
              <span className={isYanitSenteziActive ? "text-success font-semibold" : "text-secondary font-semibold"}>
                {isYanitSenteziActive ? t('aktif', 'Aktif') : t('kapali', 'Kapalı')}
              </span>
            </span>
          }
          className="action-menu-switch-item"
        />
      )
    }
  ], [isYanitSenteziActive, t]);

  useEffect(() => {
    if (isNewRoute) {
      setIsCreating(true);
      setSelectedProvider(null);
    }
  }, [isNewRoute]);

  const activeProviderId = (paramId && paramId !== 'yeni') ? paramId : selectedProvider?.id;
  const isEditing = Boolean(activeProviderId || selectedProvider || isCreating || isNewRoute);

  // Test Connection State
  const [testingId, setTestingId] = useState<any>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    sessionStorage.setItem('ai_saglayicilar_search', searchTerm || '');
  }, [searchTerm]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const data = await aiSaglayiciService.getAll();
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(t('ai_saglayicilar_hata', 'AI Sağlayıcıları yüklenirken hata oluştu'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (provider: any) => {
    setSelectedProvider(provider);
    navigate(`${baseRoute}/${provider.id}`, { state: { providerData: provider } });
  };

  const handleOpenCreate = () => {
    setSelectedProvider(null);
    setIsCreating(true);
    navigate(`${baseRoute}/yeni`);
  };

  const handleDeleteProvider = (provider: any) => {
    showAlert(
      'confirm',
      t('auto_saglayici_sil_baslik', 'Sağlayıcıyı Sil'),
      t('auto_saglayici_sil_onay', 'Bu sağlayıcıyı silmek istediğinize emin misiniz?'),
      async () => {
        try {
          await aiSaglayiciService.delete(provider.id);
          toast.success(t('auto_saglayici_silindi', 'Sağlayıcı başarıyla silindi.'));
          fetchProviders();
        } catch (error: any) {
          showAlert('error', t('Hata', 'Hata'), error.response?.data?.mesaj || t('auto_silme_hatasi', 'Silme işlemi başarısız'));
        }
      },
      t('auto_sil_onayla', 'Evet, Sil'),
      t('auto_vazgec', 'Vazgeç')
    );
  };

  const handleTestConnection = async (provider: any) => {
    setTestingId(provider.id);
    try {
      const res = await aiSaglayiciService.testConnection(provider.id);

      setTestResults(prev => ({
        ...prev,
        [provider.id]: res
      }));

      if (res?.success) {
        toast.success(`${provider.ad}: ${res.message}`);
      } else {
        toast.error(`${provider.ad}: ${res?.message || t('test_istegi_basarisiz', 'Test isteği başarısız oldu.')}`);
      }
    } catch (error) {
      toast.error(t('test_istegi_basarisiz', 'Test isteği başarısız oldu.'));
    } finally {
      setTestingId(null);
    }
  };

  const getProviderBrand = (turu: number) => {
    switch (turu) {
      case 1:
        return { name: 'OpenAI', boxClass: 'ai-provider-brand-openai' };
      case 2:
        return { name: 'Google Gemini', boxClass: 'ai-provider-brand-gemini' };
      case 3:
        return { name: 'Anthropic', boxClass: 'ai-provider-brand-anthropic' };
      case 4:
        return { name: 'Ollama (Yerel)', boxClass: 'ai-provider-brand-ollama' };
      case 5:
        return { name: 'DeepSeek', boxClass: 'ai-provider-brand-deepseek' };
      default:
        return { name: 'Özel LLM', boxClass: 'ai-provider-brand-custom' };
    }
  };

  const searchableFields = useMemo(() => [
    {
      id: 'Tumu',
      label: t('tumu', 'Tümü'),
      type: 'text',
      placeholder: t('ai_saglayici_arama_placeholder', 'Sağlayıcı veya model ara...')
    }
  ], [t]);

  const filteredProviders = useMemo(() => {
    const term = (searchTerm || '').toLocaleLowerCase('tr-TR').trim();
    if (!term) return providers;
    return providers.filter((p) => {
      const brand = getProviderBrand(p.saglayiciTuru);
      const inName = p.ad && p.ad.toLocaleLowerCase('tr-TR').includes(term);
      const inBrand = brand.name && brand.name.toLocaleLowerCase('tr-TR').includes(term);
      const inDesc = p.aciklama && p.aciklama.toLocaleLowerCase('tr-TR').includes(term);
      const inDefaultModel = p.varsayilanModel && p.varsayilanModel.toLocaleLowerCase('tr-TR').includes(term);
      const inModels = Array.isArray(p.desteklenenModeller) && p.desteklenenModeller.some((m: string) => m.toLocaleLowerCase('tr-TR').includes(term));
      return inName || inBrand || inDesc || inDefaultModel || inModels;
    });
  }, [providers, searchTerm]);

  const renderContent = () => (
    <>
      {loading ? (
        <div className="glass-card loading-state flex-col items-center justify-center p-48 w-full">
          <RefreshCw size={36} className="spinning loading-icon mb-12 text-primary" />
          <p className="text-secondary">{t('ai_saglayicilari_yukleniyor', 'AI Sağlayıcıları taranıyor...')}</p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-48 text-secondary w-full">
          <AlertCircle size={40} className="mb-12 text-muted" />
          <p className="font-semibold text-15 mb-4">{t('saglayici_bulunamadi', 'Sağlayıcı bulunamadı')}</p>
          <p className="text-13">{t('arama_sonucu_bos', 'Arama kriterlerinize uygun sağlayıcı bulunamadı.')}</p>
        </div>
      ) : (
        <div className="ai-saglayicilar-grid">
          {filteredProviders.map((p) => {
            const brand = getProviderBrand(p.saglayiciTuru);
            const test = testResults[p.id];
            const isTesting = testingId === p.id;

            const isReady = p.saglayiciTuru === 4 || p.apiKeyTanimliMi;
            const isActive = p.aktifMi && isReady;
            const statusText = isActive 
              ? t('Aktif', 'Aktif') 
              : (!isReady ? t('yapilandirilmadi', 'Yapılandırılmadı') : t('Pasif', 'Pasif'));
            const badgeClass = isActive ? 'chip-success' : (!isReady ? 'chip-warning' : 'chip-danger');

            return (
              <BaseSystemCard
                key={p.id}
                icon={<Cpu size={22} />}
                iconBoxClassName={brand.boxClass}
                title={p.ad}
                subtitle={brand.name}
                badge={
                  <div className="flex items-center gap-6">
                    {p.aiProtokolAdi && (
                      <span className="ai-protocol-code-badge" title={p.aiProtokolAdi}>
                        {p.aiProtokolAdi}
                      </span>
                    )}
                    <span className={badgeClass}>
                      {statusText}
                    </span>
                  </div>
                }
                borderHighlight={isActive ? 'primary' : (!isReady ? 'warning' : 'none')}
                middleContent={
                  p.aciklama ? (
                    <p className="text-13 text-secondary m-0 line-height-14">
                      {p.aciklama}
                    </p>
                  ) : undefined
                }
                details={[
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <Code2 size={14} />
                        <span>{t('auto_protokol', 'Protokol')}</span>
                      </span>
                    ),
                    value: (
                      <span className="text-12 font-semibold text-primary">
                        {p.aiProtokolAdi || t('auto_varsayilan', 'Varsayılan')}
                      </span>
                    )
                  },
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <Key size={14} />
                        <span>{t('api_anahtari', 'API Anahtarı')}</span>
                      </span>
                    ),
                    value: p.apiKeyTanimliMi ? (
                      <span className="text-success font-semibold flex items-center gap-4">
                        <CheckCircle2 size={13} />
                        <span>{t('tanimli', 'Tanımlı')}</span>
                      </span>
                    ) : (
                      <span className="text-warning font-semibold flex items-center gap-4">
                        <AlertCircle size={13} />
                        <span>{t('yapilandirilmadi', 'Yapılandırılmadı')}</span>
                      </span>
                    )
                  },
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <Zap size={14} />
                        <span>{t('varsayilan_model', 'Varsayılan Model')}</span>
                      </span>
                    ),
                    value: (
                      <code className="code-badge">
                        {p.varsayilanModel || '-'}
                      </code>
                    )
                  },
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <Activity size={14} />
                        <span>{t('bagli_ajan_sayisi', 'Bağlı Ajan Sayısı')}</span>
                      </span>
                    ),
                    value: (
                      <span className="font-semibold text-primary">
                        {p.ajanSayisi} {t('ajan', 'Ajan')}
                      </span>
                    )
                  }
                ]}
                actions={[
                  {
                    label: t('yapilandir', 'Yapılandır'),
                    icon: <Settings2 size={15} />,
                    onClick: () => handleOpenEdit(p)
                  },
                  {
                    label: isTesting ? t('test_ediliyor', 'Test Ediliyor...') : t('baglantiyi_test_et', 'Bağlantıyı Test Et'),
                    icon: <Activity size={15} />,
                    onClick: () => handleTestConnection(p)
                  },
                  ...(!p.sistemKaydiMi ? [{
                    label: t('auto_sil', 'Sil'),
                    icon: <Trash2 size={15} />,
                    onClick: () => handleDeleteProvider(p),
                    danger: true
                  }] : [])
                ]}
                interactive={true}
                onClick={() => handleOpenEdit(p)}
              >
                {/* Desteklenen Modeller Chip Havuzu */}
                <div className="ai-models-chip-container mt-12">
                  <span className="ai-models-chip-title">
                    {t('desteklenen_modeller', 'Desteklenen Modeller')} ({p.desteklenenModeller?.length || 0})
                  </span>
                  <div className="ai-models-chip-list">
                    {Array.isArray(p.desteklenenModeller) && p.desteklenenModeller.length > 0 ? (
                      p.desteklenenModeller.map((mod: string, i: number) => (
                        <span 
                          key={i} 
                          className={`ai-model-chip ${mod === p.varsayilanModel ? 'is-default' : ''}`}
                        >
                          {mod}
                        </span>
                      ))
                    ) : (
                      <span className="text-12 text-secondary">{t('model_belirtilmedi', 'Model belirtilmedi')}</span>
                    )}
                  </div>
                </div>

                {/* Canlı Test Sonucu Bildirim Kartı */}
                {test && (
                  <div className={`ai-test-alert ${test.success ? 'success' : 'danger'} mt-12`}>
                    {test.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    <span className="flex-1">{test.message}</span>
                  </div>
                )}
              </BaseSystemCard>
            );
          })}
        </div>
      )}
    </>
  );

  if (isEditing) {
    return (
      <AiSaglayiciForm
        id={isNewRoute || isCreating ? undefined : activeProviderId}
        initialData={isNewRoute || isCreating ? undefined : selectedProvider}
        onClose={() => {
          setSelectedProvider(null);
          setIsCreating(false);
          navigate(baseRoute);
        }}
        onSuccess={() => {
          setSelectedProvider(null);
          setIsCreating(false);
          fetchProviders();
          navigate(baseRoute);
        }}
        onBack={() => {
          setSelectedProvider(null);
          setIsCreating(false);
          navigate(baseRoute);
        }}
        backRoute={baseRoute}
      />
    );
  }

  const createButton = (
    <button
      type="button"
      onClick={handleOpenCreate}
      className="btn btn-primary flex items-center gap-8"
      id="btn-yeni-ai-saglayici"
    >
      <Plus size={16} />
      <span>{t('auto_yeni_saglayici_ekle', 'Yeni Sağlayıcı Ekle')}</span>
    </button>
  );

  if (embedded) {
    return (
      <div className="ai-saglayicilar-embedded">
        <div className="flex items-center justify-between gap-12 mb-16 flex-wrap">
          <div className="search-box flex-1 max-w-360">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('ai_saglayici_arama_placeholder', 'Sağlayıcı veya model ara...')}
            />
          </div>
          <div className="flex items-center gap-8">
            <button
              type="button"
              className="btn btn-secondary flex items-center gap-8"
              onClick={fetchProviders}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              <span>{t('Yenile', 'Yenile')}</span>
            </button>
            {createButton}
          </div>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <BaseSystemPage
      title={t('ai_saglayicilar_baslik', 'Model & LLM Sağlayıcıları')}
      subtitle={t('ai_saglayicilar_alt_baslik', 'OpenAI, Google Gemini, Claude ve yerel Ollama bağlantılarını, API anahtarlarını ve model havuzlarını yönetin.')}
      icon={<Cpu size={26} />}
      baseRoute="/ayarlar/YapayZekaAyarlari/AiSaglayicilar"
      backRoute={effectiveBackRoute}
      onBack={onBack}
      searchTerm={searchTerm}
      searchPlaceholder={t('ai_saglayici_arama_placeholder', 'Sağlayıcı veya model ara...')}
      searchableFields={searchableFields}
      onSearchChange={(term) => setSearchTerm(term)}
      headerSync={false}
      onAdd={handleOpenCreate}
      addButtonTitle={t('auto_yeni_saglayici_ekle', 'Yeni Sağlayıcı Ekle')}
      extraDropdownActions={extraDropdownActions}
    >
      {renderContent()}
    </BaseSystemPage>
  );
};

export default AiSaglayicilar;
