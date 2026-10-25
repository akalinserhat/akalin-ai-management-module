/**
 * @akalin/ai_management_module - Yapay Zeka (AI) API Protokol Form Sayfası (AiProtokolForm.tsx)
 * 
 * Sorumlulukları ve Yetenekleri:
 * - BaseCardPage temel bileşeni üzerinden sekmeli ve standart form iskeleti sunmak
 * - Dinamik API istek dönüştürücü (buildRequest), yanıt ayrıştırıcı (parseResponse) ve model listeleme (parseModels) scriptlerini yönetmek
 * - Canlı test konsolu ile Jint sandbox ortamında HTTP çağrısını simüle etmek ve token ayrıştırmasını doğrulamak
 * - useAdminValidation ve modüler aiProtokolValidation kuralları ile hatasız veri doğrulaması sağlamak
 * - Sıfır inline CSS ve sıfır hardcoded metin ilkelerine %100 uymak
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { 
  Code2, Terminal, CheckCircle2, AlertCircle, 
  Zap, Play, RefreshCw, Cpu, FileText, Info
} from 'lucide-react';
import { 
  BaseCardPage, 
  BaseTabItem, 
  BasitInput, 
  FieldError, 
  useAdminValidation 
} from '@akalin/ui';
import { aiProtokolService } from '../services/aiProtokolService';
import { 
  AiProtokol, 
  AiProtokolTestDto, 
  AiScriptResponseOutput 
} from '../types';
import { 
  validateAiProtokolField, 
  validateAiProtokolForm,
  AiProtokolFormData 
} from '../validators/aiProtokolValidation';

export const AiProtokolForm: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isNew = !id || id === 'yeni';
  const numericId = !isNew ? parseInt(id, 10) : null;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(location.state?.activeTab || 'genel');
  const returnUrl = (location.state as any)?.returnUrl || '/ayarlar/YapayZekaAyarlari/AiProtokoller';

  const handleBack = () => {
    if (returnUrl) {
      navigate(returnUrl);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/ayarlar/YapayZekaAyarlari/AiProtokoller');
    }
  };

  // Form State
  const [formData, setFormData] = useState<Partial<AiProtokol>>({
    ad: '',
    aciklama: '',
    requestScript: `function buildRequest(context) {\n  return {\n    url: context.baseUrl + '/chat/completions',\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ model: context.model, messages: context.messages })\n  };\n}`,
    responseScript: `function parseResponse(rawResponse) {\n  var data = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;\n  return {\n    content: data.choices ? data.choices[0].message.content : '',\n    promptTokens: data.usage ? data.usage.prompt_tokens : 0,\n    completionTokens: data.usage ? data.usage.completion_tokens : 0,\n    totalTokens: data.usage ? data.usage.total_tokens : 0\n  };\n}`,
    modelsScript: `function parseModels(rawResponse) {\n  var data = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;\n  if (data && data.data && Array.isArray(data.data)) {\n    return data.data.map(function(m) { return m.id; });\n  }\n  return [];\n}`,
    sistemProtokoluMu: false
  });

  // Validasyon Hook'u
  const { errors, clearError, setFieldError, setErrors } = useAdminValidation();

  // Canlı Test Konsolu State'i
  const [testDto, setTestDto] = useState<AiProtokolTestDto>({
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    testMessage: 'Merhaba, API protokol bağlantı testi.',
    requestScript: '',
    responseScript: '',
    modelsScript: ''
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<AiScriptResponseOutput | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && numericId) {
      loadProtokol(numericId);
    }
  }, [numericId, isNew]);

  const loadProtokol = async (protoId: number) => {
    try {
      setLoading(true);
      const data = await aiProtokolService.getById(protoId);
      setFormData(data);
      setTestDto(prev => ({
        ...prev,
        protokolId: data.id,
        requestScript: data.requestScript || '',
        responseScript: data.responseScript || '',
        modelsScript: data.modelsScript || ''
      }));
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_protokol_bulunamadi', 'İstenen protokol kaydı bulunamadı.'));
      handleBack();
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: keyof AiProtokolFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field as string);
  };

  const handleFieldBlur = (field: keyof AiProtokolFormData) => {
    const errorMsg = validateAiProtokolField(field, formData[field], t);
    if (errorMsg) {
      setFieldError(field as string, errorMsg);
    } else {
      clearError(field as string);
    }
  };

  const handleSave = async () => {
    const formErrors = validateAiProtokolForm(formData as AiProtokolFormData, t);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error(t('auto_lutfen_zorunlu_alanlari_doldurun', 'Lütfen zorunlu alanları doldurun.'));
      return;
    }

    try {
      setSaving(true);
      if (formData.id) {
        await aiProtokolService.update(formData.id, formData);
        toast.success(t('auto_protokol_guncellendi', 'Protokol scriptleri başarıyla güncellendi.'));
      } else {
        await aiProtokolService.create(formData);
        toast.success(t('auto_protokol_olusturuldu', 'Yeni protokol başarıyla oluşturuldu.'));
      }
      handleBack();
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_kayit_hatasi', 'Kayıt sırasında hata oluştu.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRunTest = async () => {
    if (!testDto.baseUrl || !testDto.model) {
      toast.error(t('auto_test_alanlari_zorunlu', 'Base URL ve Model alanları zorunludur.'));
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      setTestError(null);

      const payload: AiProtokolTestDto = {
        ...testDto,
        requestScript: formData.requestScript || testDto.requestScript,
        responseScript: formData.responseScript || testDto.responseScript,
        modelsScript: formData.modelsScript || testDto.modelsScript
      };

      const result = await aiProtokolService.testProtocol(payload);
      setTestResult(result);
      toast.success(t('auto_test_basarili', 'Protokol scripti başarıyla doğrulandı ve yanıt ayrıştırıldı!'));
    } catch (err: any) {
      const msg = err.response?.data?.mesaj || err.message || t('auto_test_hatasi', 'Test başarısız oldu.');
      setTestError(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  const tabs: BaseTabItem[] = useMemo(() => [
    { 
      id: 'genel', 
      label: t('auto_genel_bilgiler', 'Genel Bilgiler'),
      icon: <FileText size={16} />,
      content: (
        <div className="py-20 flex flex-col gap-20">
          <div className="form-group">
            <label className="form-label">{t('auto_protokol_adi', 'Protokol Adı')}</label>
            <BasitInput
              type="text"
              value={formData.ad || ''}
              onChange={e => handleFieldChange('ad', e.target.value)}
              onBlur={() => handleFieldBlur('ad')}
              placeholder="Örn: OpenAI REST API Uyumluluğu"
              className={errors.ad ? 'is-invalid' : ''}
            />
            <FieldError error={errors.ad} />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auto_aciklama', 'Açıklama')}</label>
            <BasitInput
              type="text"
              value={formData.aciklama || ''}
              onChange={e => handleFieldChange('aciklama', e.target.value)}
              placeholder={t('auto_protokol_aciklama_ornek', 'Desteklenen sağlayıcılar ve API formatı hakkında notlar...')}
            />
          </div>

          {formData.sistemProtokoluMu && (
            <div className="ai-test-alert success flex items-center gap-10">
              <Info size={18} />
              <span>
                {t('auto_sistem_protokolu_bilgi', 'Bu protokol sistem çekirdeği tarafından tanımlanmıştır. İstek ve yanıt scriptleri kurumunuza özel güncellenebilir.')}
              </span>
            </div>
          )}
        </div>
      )
    },
    { 
      id: 'request', 
      label: t('auto_istek_scripti_tab', '1. İstek Scripti (buildRequest)'),
      icon: <Code2 size={16} />,
      content: (
        <div className="py-20 flex flex-col gap-16">
          <div className="ai-script-editor-container">
            <div className="ai-script-editor-label">
              <span>{t('auto_request_func_label', 'function buildRequest(context) { return { url, method, headers, body }; }')}</span>
              <span className="text-secondary font-mono text-xs">{t('auto_jint_engine', 'Jint Sandbox ECMAScript')}</span>
            </div>
            <textarea
              className="ai-script-textarea"
              value={formData.requestScript || ''}
              onChange={e => handleFieldChange('requestScript', e.target.value)}
              onBlur={() => handleFieldBlur('requestScript')}
              placeholder="// buildRequest fonksiyonu context nesnesini alır..."
              rows={14}
            />
            <FieldError error={errors.requestScript} />
            <div className="ai-script-help">
              {t('auto_request_help', 'Parametreler: context.baseUrl, context.apiKey, context.model, context.messages, context.temperature, context.maxTokens. Dönüş: { url, method, headers, body }')}
            </div>
          </div>
        </div>
      )
    },
    { 
      id: 'response', 
      label: t('auto_yanit_scripti_tab', '2. Yanıt & Token Scripti (parseResponse)'),
      icon: <Zap size={16} />,
      content: (
        <div className="py-20 flex flex-col gap-16">
          <div className="ai-script-editor-container">
            <div className="ai-script-editor-label">
              <span>{t('auto_response_func_label', 'function parseResponse(rawResponse) { return { content, promptTokens, completionTokens, totalTokens }; }')}</span>
              <span className="text-secondary font-mono text-xs">{t('auto_jint_engine', 'Jint Sandbox ECMAScript')}</span>
            </div>
            <textarea
              className="ai-script-textarea"
              value={formData.responseScript || ''}
              onChange={e => handleFieldChange('responseScript', e.target.value)}
              onBlur={() => handleFieldBlur('responseScript')}
              placeholder="// parseResponse fonksiyonu ham JSON yanıtını alır..."
              rows={14}
            />
            <FieldError error={errors.responseScript} />
            <div className="ai-script-help">
              {t('auto_response_help', 'Zorunlu alanlar: content (string), promptTokens (int), completionTokens (int), totalTokens (int). Token sayaçları ve bakiye düşümü bu değerlere göre yapılır.')}
            </div>
          </div>
        </div>
      )
    },
    { 
      id: 'models', 
      label: t('auto_modeller_scripti_tab', '3. Modeller Scripti (parseModels)'),
      icon: <Cpu size={16} />,
      content: (
        <div className="py-20 flex flex-col gap-16">
          <div className="ai-script-editor-container">
            <div className="ai-script-editor-label">
              <span>{t('auto_models_func_label', 'function parseModels(rawResponse) { return string[]; }')}</span>
              <span className="chip-primary font-mono text-xs">{t('auto_opsiyonel', 'Opsiyonel')}</span>
            </div>
            <textarea
              className="ai-script-textarea"
              value={formData.modelsScript || ''}
              onChange={e => handleFieldChange('modelsScript', e.target.value)}
              placeholder="// parseModels fonksiyonu sağlayıcının /models uç noktasından dönen listeden model id dizisini çıkarır..."
              rows={14}
            />
            <div className="ai-script-help">
              {t('auto_models_help', 'Sağlayıcının /models veya benzeri model listeleme uç noktasından model ID dizisini (Array of strings) ayıklar.')}
            </div>
          </div>
        </div>
      )
    },
    { 
      id: 'test', 
      label: t('auto_canli_test_tab', '4. Canlı Test Konsolu'),
      icon: <Terminal size={16} />,
      content: (
        <div className="py-20 flex flex-col gap-20">
          <div className="grid-2-col gap-16">
            <div className="form-group">
              <label className="form-label">{t('auto_test_base_url', 'Test Base URL')}</label>
              <BasitInput
                type="text"
                textTransform="none"
                value={testDto.baseUrl}
                onChange={e => setTestDto({ ...testDto, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('auto_test_model', 'Test Model Adı')}</label>
              <BasitInput
                type="text"
                textTransform="none"
                value={testDto.model}
                onChange={e => setTestDto({ ...testDto, model: e.target.value })}
                placeholder="gpt-4o-mini"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('auto_test_api_key', 'API Key (İsteğe Bağlı / Test İçin)')}</label>
            <BasitInput
              type="password"
              textTransform="none"
              value={testDto.apiKey || ''}
              onChange={e => setTestDto({ ...testDto, apiKey: e.target.value })}
              placeholder="sk-..."
              className="font-mono"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auto_test_mesaji', 'Test Mesajı')}</label>
            <div className="flex-row gap-8">
              <BasitInput
                type="text"
                className="flex-1"
                value={testDto.testMessage}
                onChange={e => setTestDto({ ...testDto, testMessage: e.target.value })}
              />
              <button
                type="button"
                className="btn-primary flex items-center gap-8"
                onClick={handleRunTest}
                disabled={testing}
              >
                {testing ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
                <span>{t('auto_test_et_calistir', 'İsteği Gönder & Test Et')}</span>
              </button>
            </div>
          </div>

          {/* Test Sonuç Alanı */}
          {testResult && (
            <div className="ai-test-alert success flex-col items-start gap-12">
              <div className="flex-row items-center justify-between w-full">
                <div className="flex-row items-center gap-6 font-bold">
                  <CheckCircle2 size={16} />
                  <span>{t('auto_test_yanit_basarili', 'Script Başarıyla Çalıştı & Yanıt Ayrıştırıldı')}</span>
                </div>
                <div className="flex-row gap-8">
                  <span className="chip-primary">Prompt: {testResult.promptTokens} tkn</span>
                  <span className="chip-primary">Completion: {testResult.completionTokens} tkn</span>
                  <span className="chip-success">Toplam: {testResult.totalTokens} tkn</span>
                </div>
              </div>
              <div className="p-12 bg-primary rounded border border-glass w-full text-sm">
                <div className="font-semibold text-secondary mb-4">{t('auto_ayristirilan_metin', 'Ayrıştırılan Model Yanıtı:')}</div>
                <div className="whitespace-pre-wrap">{testResult.content}</div>
              </div>
            </div>
          )}

          {testError && (
            <div className="ai-test-alert danger flex items-center gap-8">
              <AlertCircle size={16} />
              <span>{testError}</span>
            </div>
          )}
        </div>
      )
    }
  ], [formData, testDto, testResult, testError, testing, errors, t]);

  if (loading) {
    return (
      <div className="flex-center py-60">
        <RefreshCw size={36} className="spin text-secondary" />
      </div>
    );
  }

  const pageTitleText = isNew 
    ? t('auto_yeni_ai_protokol', 'Yeni AI Protokolü') 
    : (formData.ad || t('auto_protokol_duzenle', 'Protokol Düzenle'));

  const subtitleRightBadge = !isNew ? (
    formData.sistemProtokoluMu 
      ? t('auto_sistem_protokolu', 'Sistem Protokolü')
      : t('auto_ozel_protokol', 'Özel Protokol')
  ) : undefined;

  return (
    <BaseCardPage
      id="aiProtokolForm"
      title={isNew ? t('auto_yeni_ai_protokol', 'Yeni AI Protokolü') : (formData.ad || t('auto_protokol_duzenle', 'Protokol Düzenle'))}
      pageTitle={pageTitleText}
      icon={<Code2 size={24} />}
      subtitleLeft={t('auto_protokol_aciklama_detay', 'JavaScript scriptleri ile API istek şemalarını ve token sayaç yanıtlarını özelleştirin.')}
      subtitleRight={subtitleRightBadge}
      showBackButton={true}
      onClose={handleBack}
      onBack={handleBack}
      onSave={handleSave}
      isSaving={saving}
      saveButtonText={t('auto_kaydet', 'Kaydet')}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as string)}
      className="fade-in"
    />
  );
};

export default AiProtokolForm;
