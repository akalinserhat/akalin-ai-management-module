/**
 * @akalin/ai_management_module - "Başla" Düğümü Ayar Sayfası (BaslaFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Başla" (Terminator) düğümünün ayarlarını yönetmek
 * - Akışın başlangıç başlığını, tetikleme anahtarlarını, başlangıç girdisi / UI aksiyonunu ve promptunu yapılandırmak
 * - Zero Bottom Button, ActionMenu ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Key, Terminal, Monitor } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';
import { UI_ACTION_OPTIONS } from './AiAjanForm';

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
    uiAksiyonu: 'YOK'
  };

  const incomingAgentData = location.state?.agentData;
  const incomingIstekData = location.state?.istekData;

  const [formData, setFormData] = useState<any>(() => ({
    id: incomingNode.id || 'BASLA',
    tip: 'BASLA',
    baslik: incomingNode.baslik || t('basla', 'Başla'),
    tetiklemeAnahtarlari: incomingNode.tetiklemeAnahtarlari || incomingIstekData?.tetiklemeAnahtarlari || '',
    prompt: incomingNode.prompt || incomingIstekData?.prompt || '',
    uiAksiyonu: incomingNode.uiAksiyonu || incomingIstekData?.uiAksiyonu || 'YOK'
  }));

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

  const handleSave = async (dataToSave: any) => {
    try {
      setIsSaving(true);
      const payloadNode = {
        ...formData,
        ...dataToSave
      };

      if (effectiveAgentId && effectiveIstekId) {
        let agentToUpdate = incomingAgentData;
        if (!agentToUpdate) {
          const res = await axios.get(`/api/AiAjanlar/${effectiveAgentId}`);
          agentToUpdate = res.data;
        }

        const currentRequests = Array.isArray(agentToUpdate?.hizliIstekler) ? [...agentToUpdate.hizliIstekler] : [];
        const currentReq = currentRequests.find((x: any) => x.id === effectiveIstekId);

        if (currentReq) {
          const currentNodes = Array.isArray(currentReq.akisDugumleri) ? [...currentReq.akisDugumleri] : [];
          const nodeIdx = currentNodes.findIndex((x: any) => x.id === 'BASLA' || x.tip === 'BASLA');

          if (nodeIdx !== -1) {
            currentNodes[nodeIdx] = { ...currentNodes[nodeIdx], ...payloadNode };
          } else {
            currentNodes.unshift(payloadNode);
          }

          currentReq.akisDugumleri = currentNodes;
          currentReq.baslik = payloadNode.baslik || currentReq.baslik;
          currentReq.tetiklemeAnahtarlari = payloadNode.tetiklemeAnahtarlari;
          currentReq.uiAksiyonu = payloadNode.uiAksiyonu;

          await axios.put(`/api/AiAjanlar/${effectiveAgentId}`, {
            ...agentToUpdate,
            hizliIstekler: currentRequests
          });
        }
      }

      toast.success(t('basla_ayarlari_kaydedildi', 'Başla düğümü ayarları başarıyla kaydedildi.'));

      if (onSuccess) {
        onSuccess();
      } else {
        if (typeof effectiveBackRoute === 'string') {
          navigate(effectiveBackRoute);
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

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="baslaFlowchartOgeAyarPage"
      title={t('basla_oge_ayarlari', 'Başla Düğümü Ayarları')}
      pageTitle={t('basla_oge_ayarlari', 'Başla Düğümü Ayarları')}
      recordTitle={formData.baslik || t('basla', 'Başla')}
      icon={<Play size={24} color="#10b981" />}
      subtitleLeft={t('basla_oge_aciklama', 'Akışın başlangıç parametreleri ve tetikleyici yapılandırması')}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={() => (typeof effectiveBackRoute === 'string' ? navigate(effectiveBackRoute) : navigate(-1))}
      onBack={() => (typeof effectiveBackRoute === 'string' ? navigate(effectiveBackRoute) : navigate(-1))}
    >
      <div className="form-grid max-w-4xl mx-auto flex flex-col gap-20">
        <div className="form-group">
          <label className="form-label font-semibold text-sm">
            {t('dugum_basligi', 'Düğüm Başlığı / Adı')}
          </label>
          <input
            type="text"
            autoFocus
            className="form-control"
            value={formData.baslik}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, baslik: e.target.value }))}
            placeholder={t('basla_ornegi', 'Örn: Başla, Görevi Başlat')}
          />
          <small className="text-secondary text-xs mt-4 block">
            {t('dugum_basligi_ipucu', 'Flowchart tuvalinde düğüm üzerinde görünecek başlık.')}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label font-semibold text-sm flex items-center gap-6">
            <Key size={14} className="text-primary" />
            <span>{t('tetikleyici_anahtarlar', 'Tetikleyici Anahtar Kelimeler')}</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={formData.tetiklemeAnahtarlari}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, tetiklemeAnahtarlari: e.target.value }))}
            placeholder={t('tetikleme_anahtarlari_placeholder', 'Örn: kampanya hazırla, teklif oluştur, cari bakiye sor')}
          />
          <small className="text-secondary text-xs mt-4 block">
            {t('tetikleme_anahtarlari_ipucu', 'Kullanıcı mesajında bu kelimeler geçtiğinde akış otomatik tetiklenir (virgülle ayırın).')}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label font-semibold text-sm flex items-center gap-6">
            <Monitor size={14} className="text-info" />
            <span>{t('baslangic_ui_aksiyonu', 'Başlangıç Girdisi / Arayüz Aksiyonu')}</span>
          </label>
          <select
            className="form-control"
            value={formData.uiAksiyonu}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, uiAksiyonu: e.target.value }))}
          >
            {UI_ACTION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <small className="text-secondary text-xs mt-4 block">
            {t('baslangic_ui_aksiyonu_ipucu', 'Akış başlamadan önce kullanıcıdan dosya, metin veya veri seçimi istenmesini sağlar.')}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label font-semibold text-sm flex items-center gap-6">
            <Terminal size={14} className="text-warning" />
            <span>{t('baslangic_prompt_talimati', 'Başlangıç Prompt Talimatı (İsteğe Bağlı)')}</span>
          </label>
          <textarea
            className="form-control"
            rows={4}
            value={formData.prompt}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, prompt: e.target.value }))}
            placeholder={t('baslangic_prompt_placeholder', 'Ajan bu akışı başlatırken dikkat etmesi gereken özel talimatlar...')}
          />
        </div>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default BaslaFlowchartOgeAyarPage;
