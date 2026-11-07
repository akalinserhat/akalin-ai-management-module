/**
 * @akalin/ai_management_module - Yapay Zeka Ayarları (YapayZekaAyarlari.tsx)
 * 
 * BaseSystemPage mimarisinde çalışan ve altında:
 * 1. Think Port Ayarları (ThinkPortAyarlari)
 * 2. Ajanlar (AiAjanlar)
 * 3. Model Context Protocol (AiMcpYonetimi)
 * seçeneklerini SistemKart grid görünümü ile ayrı ayrı listeleyen ana yönetim sayfası.
 * 
 * Kesinlikle inline CSS barındırmaz, %100 i18n ve MD3 tasarım sistemine uyumludur.
 */

import React, { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Bot, Cpu, Sparkles, Layers } from 'lucide-react';
import { BaseSystemPage, BaseSwitch, type ActionMenuItem } from '@akalin/ui';
import ThinkPortAyarlari from './ThinkPortAyarlari';
import AiAjanlar from './AiAjanlar';
import AiMcpYonetimi from './AiMcpYonetimi';
import { firmaAiSettingsService } from '../services/firmaAiSettingsService';

export interface YapayZekaAyarlariProps {
  onBack?: () => void;
}

export const YapayZekaAyarlari: React.FC<YapayZekaAyarlariProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ moduleId?: string; subModuleId?: string }>();

  const [isYanitSenteziActive, setIsYanitSenteziActive] = useState<boolean>(true);

  // Global sistem ayarını yükle
  useEffect(() => {
    firmaAiSettingsService.getYanitSenteziAyar()
      .then(aktif => setIsYanitSenteziActive(aktif))
      .catch(() => { });
  }, []);

  const handleToggleGlobalYanitSentezi = async (e: any) => {
    const newVal = e.target.checked;
    setIsYanitSenteziActive(newVal);
    try {
      await firmaAiSettingsService.setYanitSenteziAyar(newVal);
      toast.success(
        newVal
          ? t('ai_sentez_aktif_edildi', 'Akıllı Yanıt Sentezi aktif edildi: Araç ve validasyon sonuçları doğal dille yorumlanacak.')
          : t('ai_sentez_pasif_edildi', 'Token tasarruf modu aktif: Doğrudan hızlı araç çıktısı dönecek.')
      );
    } catch {
      toast.error(t('ai_ayar_kaydedilemedi', 'Ayar kaydedilemedi.'));
    }
  };

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const baseRoute = isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari' : '/yapay-zeka-ayarlari';
  const backRoute = isUnderAyarlar ? '/ayarlar' : undefined;

  const aiModules = useMemo(() => [
    {
      id: 'ThinkPortAyarlari',
      name: t('menu_think_port_ayarlari', 'Think Port Ayarları'),
      desc: t('think_port_ayarlari_desc', 'ThinkPort AI Gateway bağlantı parametreleri, hız sınırları, tarayıcı havuzu ve model yönetimi'),
      icon: <Cpu size={28} />,
      keywords: 'think port thinkport ai gateway model sağlayıcı llm rpm browser stealth proxy yapay zeka',
      hasOwnLayout: true,
      component: () => (
        <ThinkPortAyarlari
          isSubModule={true}
          onBack={() => navigate(baseRoute)}
        />
      )
    },
    {
      id: 'AiAjanlar',
      name: t('menu_ai_ajanlar', 'Ajanlar'),
      desc: t('ai_ajanlar_desc', 'ERP ve Admin kapsamlarındaki otonom AI uzman ajanları, kuralları ve sistem promptları'),
      icon: <Bot size={28} />,
      keywords: 'ai ajan agent bot kural prompt uzman rol yapay zeka',
      hasOwnLayout: true,
      component: () => (
        <AiAjanlar
          backRoute={baseRoute}
          onBack={() => navigate(baseRoute)}
        />
      )
    },
    {
      id: 'AiMcp',
      name: t('menu_ai_mcp', 'Model Context Protocol (MCP)'),
      desc: t('ai_mcp_desc', 'ERP ve Admin modüllerine ait tescilli liste, kart ve belgeler ile bunlara bağlı otonom MCP fonksiyonları'),
      icon: <Layers size={28} />,
      keywords: 'ai mcp model context protocol fonksiyon arac tool modul liste kart belge schema erp api',
      hasOwnLayout: true,
      component: () => (
        <AiMcpYonetimi
          backRoute={baseRoute}
          onBack={() => navigate(baseRoute)}
        />
      )
    }
  ], [t, baseRoute, navigate]);

  // URL rotasında subModuleId varsa veya doğrudan aliased moduleId geldiyse alt modülü seç
  const effectiveSubModuleId = useMemo(() => {
    if (params.subModuleId) {
      const lowerSub = params.subModuleId.toLowerCase();
      if (lowerSub === 'aisaglayicilar' || lowerSub === 'thinkportayarlari' || lowerSub === 'think-port-ayarlari') {
        return 'ThinkPortAyarlari';
      }
      return params.subModuleId;
    }
    const currentMod = params.moduleId;
    if (currentMod && ['thinkportayarlari', 'think-port-ayarlari', 'aisaglayicilar', 'aiajanlar', 'aimcp', 'mcp'].includes(currentMod.toLowerCase())) {
      const lowerMod = currentMod.toLowerCase();
      if (lowerMod === 'aisaglayicilar' || lowerMod === 'thinkportayarlari' || lowerMod === 'think-port-ayarlari') {
        return 'ThinkPortAyarlari';
      }
      const match = aiModules.find(
        m => m.id.toLowerCase() === lowerMod || (lowerMod === 'mcp' && m.id === 'AiMcp')
      );
      return match ? match.id : null;
    }
    return null;
  }, [params.subModuleId, params.moduleId, aiModules]);

  const extraDropdownActions = useMemo<ActionMenuItem[]>(() => [
    {
      custom: (
        <BaseSwitch
          id="globalLlmYanitSenteziSwitchMenu"
          checked={isYanitSenteziActive}
          onChange={handleToggleGlobalYanitSentezi}
          label={
            <span className="flex items-center gap-8">
              <Sparkles size={15} className={isYanitSenteziActive ? "text-success" : "text-secondary"} />
              <span className="font-medium">{t('akilli_yanit_sentezi', 'Akıllı Yanıt Sentezi')}:</span>
              <span className={isYanitSenteziActive ? "text-success font-semibold" : "text-secondary font-semibold"}>
                {isYanitSenteziActive ? t('aktif', 'Aktif') : t('kapali', 'Kapalı (Tasarruf)')}
              </span>
            </span>
          }
          className="action-menu-switch-item"
        />
      ),
      dividerBelow: true
    }
  ], [isYanitSenteziActive, t]);

  return (
    <BaseSystemPage
      title={t('yapay_zeka_ayarlari', 'Yapay Zeka Ayarları')}
      subtitle={t('yapay_zeka_ayarlari_desc_thinkport', 'Think Port Ayarları, uzman ajanlar ve MCP araçlarını tek bir merkezden yönetin.')}
      icon={<Bot size={26} />}
      baseRoute={baseRoute}
      backRoute={backRoute}
      showBackButton={Boolean(backRoute)}
      modules={aiModules}
      selectedModuleId={effectiveSubModuleId}
      searchPlaceholder={t('ai_ayar_ara', 'Yapay zeka ayarlarında ara...')}
      extraDropdownActions={extraDropdownActions}
      onBack={onBack}
    />
  );
};

export default YapayZekaAyarlari;
