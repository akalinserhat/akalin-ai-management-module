/**
 * @akalin/ai_management_module - "Başla" Düğümü Ayar Sayfası (BaslaFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Başla" (Terminator) düğümünün ayarlarını yönetmek
 * - Akışın başlangıç başlığını, tetikleme anahtarlarını, başlangıç girdisi / UI aksiyonunu ve promptunu yapılandırmak
 * - Zero Bottom Button, ActionMenu ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Play, Key, Terminal, Monitor } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BaseInput,
  BaseDropdownSecici,
  NotInput,
  type DropdownOption
} from '@akalin/ui';
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
    uiAksiyonu: incomingNode.uiAksiyonu || incomingIstekData?.uiAksiyonu || 'YOK'
  }));

  // istekData yüklendiğinde formData prompt veya anahtarlar boşsa senkronize et
  useEffect(() => {
    if (istekData) {
      setFormData((prev: any) => ({
        ...prev,
        tetiklemeAnahtarlari: prev.tetiklemeAnahtarlari || istekData.tetiklemeAnahtarlari || '',
        prompt: prev.prompt || istekData.prompt || '',
        uiAksiyonu: prev.uiAksiyonu && prev.uiAksiyonu !== 'YOK' ? prev.uiAksiyonu : (istekData.uiAksiyonu || 'YOK')
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
        baslik: t('basla', 'Başla')
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
        baslik: t('basla', 'Başla')
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
          currentReq.tetiklemeAnahtarlari = payloadNode.tetiklemeAnahtarlari || currentReq.tetiklemeAnahtarlari;
          currentReq.uiAksiyonu = payloadNode.uiAksiyonu || currentReq.uiAksiyonu;
          if (payloadNode.prompt) {
            currentReq.prompt = payloadNode.prompt;
          }

          currentRequests[reqIdx] = currentReq;
          updatedReq = currentReq;

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

  const uiActionOptions: DropdownOption[] = useMemo(() => {
    return UI_ACTION_OPTIONS.map((opt) => ({
      id: opt.value,
      label: opt.label,
      rawValue: opt
    }));
  }, []);

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
  ], [agentTitle, agentRoute, istekTitle, istekRoute, nodeTitle, agentData, incomingAgentData, istekData, incomingIstekData, navigate]);

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
      <div className="form-grid max-w-4xl mx-auto flex flex-col gap-20">
        <div className="form-group">
          <label className="form-label font-semibold text-sm flex items-center gap-6">
            <Key size={14} className="text-primary" />
            <span>{t('tetikleyici_anahtarlar', 'Tetikleyici Anahtar Kelimeler')}</span>
          </label>
          <BaseInput
            autoFocus
            icon={<Key size={14} />}
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
          <BaseDropdownSecici
            options={uiActionOptions}
            value={formData.uiAksiyonu}
            onChange={(val) => setFormData((prev: any) => ({ ...prev, uiAksiyonu: val }))}
            placeholder={t('ui_aksiyonu_secin', 'Arayüz aksiyonu seçin...')}
          />
          <small className="text-secondary text-xs mt-4 block">
            {t('baslangic_ui_aksiyonu_ipucu', 'Akış başlamadan önce kullanıcıdan dosya, metin veya veri seçimi istenmesini sağlar.')}
          </small>
        </div>

        <div className="form-group">
          <label className="form-label font-semibold text-sm flex items-center gap-6">
            <Terminal size={14} className="text-warning" />
            <span>{t('baslangic_prompt_talimati', 'Başlangıç Prompt Talimatı (İsteğe Bağlı)')}</span>
          </label>
          <NotInput
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
