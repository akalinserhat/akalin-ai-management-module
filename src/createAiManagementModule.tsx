/**
 * @akalin/ai_management_module - Modül Tanım Fabrikası (createAiManagementModule.tsx)
 * @akalin/module_core IModuleDefinition standardına uygun modül tanımı oluşturur.
 */

import React, { lazy } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Bot, Coins } from 'lucide-react';
import type { IModuleDefinition } from '@akalin/module_core';
import { IAiManagementAdapter } from './types';
import { AiManagementServiceProvider, defaultAiManagementAdapter } from './adapters/AiManagementServiceContext';

const YapayZekaAyarlariPage = lazy(() => import('./pages/YapayZekaAyarlari'));
const AiSaglayicilarPage = lazy(() => import('./pages/AiSaglayicilar'));
const AiSaglayiciFormPage = lazy(() => import('./pages/AiSaglayiciForm'));
const AiProtokollerPage = lazy(() => import('./pages/AiProtokoller'));
const AiProtokolFormPage = lazy(() => import('./pages/AiProtokolForm'));
const AiTokenYonetimiPage = lazy(() => import('./pages/AiTokenYonetimi'));
const AiAjanlarPage = lazy(() => import('./pages/AiAjanlar'));
const AiAjanFormPage = lazy(() => import('./pages/AiAjanForm'));
const AiAjanHizliIstekFormPage = lazy(() => import('./pages/AiAjanHizliIstekForm'));
const AiAjanFlowchartOgeAyarPage = lazy(() => import('./pages/BaseAiAjanFlowchartOgeAyarPage'));
const BaslaFlowchartOgeAyarPage = lazy(() => import('./pages/BaslaFlowchartOgeAyarPage'));
const FormAcFlowchartOgeAyarPage = lazy(() => import('./pages/FormAcFlowchartOgeAyarPage'));
const AiIslemFlowchartOgeAyarPage = lazy(() => import('./pages/AiIslemFlowchartOgeAyarPage'));
const AiMcpYonetimiPage = lazy(() => import('./pages/AiMcpYonetimi'));
const MCPSelectionListPage = lazy(() => import('./pages/MCPSelectionList'));

/**
 * Flowchart öğe ayar sayfaları için dinamik yönlendirici bileşen
 * Adım parametresi (ogeId) 'BASLA' ise BaslaFlowchartOgeAyarPage'e,
 * 'AI_ISLEM' ise AiIslemFlowchartOgeAyarPage'e,
 * 'FORM_AC' ise FormAcFlowchartOgeAyarPage'e yönlendirir.
 */
const FlowchartOgeAyarDispatcher: React.FC = () => {
  const { ogeId } = useParams<{ ogeId?: string }>();
  const location = useLocation();
  const idUpper = (ogeId || '').toUpperCase();
  const nodeTip = (location.state?.nodeData?.tip || '').toUpperCase();

  if (idUpper === 'BASLA' || idUpper === 'START' || nodeTip === 'BASLA') {
    return <BaslaFlowchartOgeAyarPage />;
  }
  if (nodeTip === 'AI_ISLEM' || idUpper.startsWith('AI_ISLEM')) {
    return <AiIslemFlowchartOgeAyarPage />;
  }
  if (
    nodeTip === 'FORM_AC' ||
    nodeTip === 'EKRAN_AC' ||
    idUpper.startsWith('FORM_AC') ||
    idUpper.startsWith('ADIM_')
  ) {
    return <FormAcFlowchartOgeAyarPage />;
  }
  return <AiAjanFlowchartOgeAyarPage />;
};

export interface CreateAiManagementModuleOptions {
  adapter?: IAiManagementAdapter;
  order?: number;
  baseRoute?: string;
  appName?: string;
  customComponents?: Record<string, React.ComponentType<any>>;
}

export function createAiManagementModule(options: CreateAiManagementModuleOptions = {}): IModuleDefinition {
  const adapter = options.adapter || defaultAiManagementAdapter;
  const appName = options.appName || 'Webakus Admin';
  const baseRoute = options.baseRoute || '/yapay-zeka-ayarlari';

  const withProvider = (Component: React.ComponentType<any>) => {
    return React.createElement(
      AiManagementServiceProvider,
      { adapter, appName, baseRoute },
      React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(Component)
      )
    );
  };

  const YapayZekaAyarlariComponent = options.customComponents?.YapayZekaAyarlari || YapayZekaAyarlariPage;
  const AiSaglayicilarComponent = options.customComponents?.AiSaglayicilar || AiSaglayicilarPage;
  const AiSaglayiciFormComponent = options.customComponents?.AiSaglayiciForm || AiSaglayiciFormPage;
  const AiProtokollerComponent = options.customComponents?.AiProtokoller || AiProtokollerPage;
  const AiProtokolFormComponent = options.customComponents?.AiProtokolForm || AiProtokolFormPage;
  const AiTokenYonetimiComponent = options.customComponents?.AiTokenYonetimi || AiTokenYonetimiPage;
  const AiAjanlarComponent = options.customComponents?.AiAjanlar || AiAjanlarPage;
  const AiAjanFormComponent = options.customComponents?.AiAjanForm || AiAjanFormPage;
  const AiAjanHizliIstekFormComponent = options.customComponents?.AiAjanHizliIstekForm || AiAjanHizliIstekFormPage;
  const AiAjanFlowchartOgeAyarComponent = options.customComponents?.AiAjanFlowchartOgeAyarPage || AiAjanFlowchartOgeAyarPage;
  const BaslaFlowchartOgeAyarComponent = options.customComponents?.BaslaFlowchartOgeAyarPage || BaslaFlowchartOgeAyarPage;
  const AiMcpYonetimiComponent = options.customComponents?.AiMcpYonetimi || AiMcpYonetimiPage;
  const MCPSelectionListComponent = options.customComponents?.MCPSelectionList || MCPSelectionListPage;

  return {
    id: 'ai_yonetimi',
    title: 'Yapay Zeka & LLM',
    icon: React.createElement(Bot, { size: 20 }),
    iconName: 'Bot',
    order: options.order ?? 30,
    routes: [
      {
        path: '/yapay-zeka-ayarlari',
        element: withProvider(YapayZekaAyarlariComponent),
        title: 'Yapay Zeka Ayarları'
      },
      {
        path: '/ai-saglayicilar',
        element: withProvider(AiSaglayicilarComponent),
        title: 'Model Sağlayıcıları'
      },
      {
        path: '/ai-saglayicilar/yeni',
        element: withProvider(AiSaglayiciFormComponent),
        title: 'Yeni Model Sağlayıcısı'
      },
      {
        path: '/ai-saglayicilar/duzenle/:id',
        element: withProvider(AiSaglayiciFormComponent),
        title: 'Model Sağlayıcısı Yapılandır'
      },
      {
        path: '/ai-saglayicilar/:id',
        element: withProvider(AiSaglayiciFormComponent),
        title: 'Model Sağlayıcısı Yapılandır'
      },
      {
        path: '/ai-protokoller',
        element: withProvider(AiProtokollerComponent),
        title: 'API Protokolleri'
      },
      {
        path: '/ai-protokoller/yeni',
        element: withProvider(AiProtokolFormComponent),
        title: 'Yeni AI Protokolü'
      },
      {
        path: '/ai-protokoller/duzenle/:id',
        element: withProvider(AiProtokolFormComponent),
        title: 'AI Protokolü Düzenle'
      },
      {
        path: '/ai-protokoller/:id',
        element: withProvider(AiProtokolFormComponent),
        title: 'AI Protokolü Düzenle'
      },
      {
        path: '/ai-token-yonetimi',
        element: withProvider(AiTokenYonetimiComponent),
        title: 'Token Cüzdanı & Satış'
      },
      {
        path: '/ai-ajanlar',
        element: withProvider(AiAjanlarComponent),
        title: 'Ajanlar'
      },
      {
        path: '/ai-ajanlar/yeni',
        element: withProvider(AiAjanFormComponent),
        title: 'Yeni Yapay Zeka Ajanı'
      },
      {
        path: '/ai-ajanlar/duzenle/:id',
        element: withProvider(AiAjanFormComponent),
        title: 'Ajanı Yapılandır'
      },
      {
        path: '/ai-ajanlar/:id',
        element: withProvider(AiAjanFormComponent),
        title: 'Ajanı Yapılandır'
      },
      {
        path: '/ai-ajanlar/yeni/mcp-secim',
        element: withProvider(AiAjanFormComponent),
        title: 'MCP Modül Seçimi'
      },
      {
        path: '/ai-ajanlar/:id/mcp-secim',
        element: withProvider(AiAjanFormComponent),
        title: 'MCP Modül Seçimi'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiAjanlar/yeni/mcp-secim',
        element: withProvider(AiAjanFormComponent),
        title: 'MCP Modül Seçimi'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiAjanlar/:id/mcp-secim',
        element: withProvider(AiAjanFormComponent),
        title: 'MCP Modül Seçimi'
      },
      {
        path: '/ai-ajanlar/:id/hizli-istek/:istekId',
        element: withProvider(AiAjanHizliIstekFormComponent),
        title: 'Görev Akışı (Flowchart)'
      },
      {
        path: '/ai-ajanlar/:id/hizli-istek/yeni',
        element: withProvider(AiAjanHizliIstekFormComponent),
        title: 'Yeni Görev Akışı'
      },
      {
        path: '/ai-ajanlar/:id/hizli-istek/:istekId/adim/BASLA',
        element: withProvider(BaslaFlowchartOgeAyarComponent),
        title: 'Başla Düğümü Ayarları'
      },
      {
        path: '/ai-ajanlar/:id/hizli-istek/:istekId/adim/:ogeId',
        element: withProvider(FlowchartOgeAyarDispatcher),
        title: 'Flowchart Öğe Ayarları'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiAjanlar/:id/hizli-istek/:istekId',
        element: withProvider(AiAjanHizliIstekFormComponent),
        title: 'Görev Akışı (Flowchart)'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiAjanlar/:id/hizli-istek/:istekId/adim/BASLA',
        element: withProvider(BaslaFlowchartOgeAyarComponent),
        title: 'Başla Düğümü Ayarları'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiAjanlar/:id/hizli-istek/:istekId/adim/:ogeId',
        element: withProvider(FlowchartOgeAyarDispatcher),
        title: 'Flowchart Öğe Ayarları'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiAjanlar/:id/hizli-istek/yeni',
        element: withProvider(AiAjanHizliIstekFormComponent),
        title: 'Yeni Görev Akışı'
      },
      {
        path: '/ai-mcp',
        element: withProvider(AiMcpYonetimiComponent),
        title: 'Model Context Protocol (MCP)'
      },
      {
        path: '/ayarlar/YapayZekaAyarlari/AiMcp',
        element: withProvider(AiMcpYonetimiComponent),
        title: 'Model Context Protocol (MCP)'
      }
    ],
    menuItems: [
      {
        id: 'menu_ai_yonetimi',
        label: 'Yapay Zeka & LLM',
        icon: React.createElement(Bot, { size: 20 }),
        isDropdown: true,
        order: options.order ?? 30
      },
      {
        id: 'menu_ai_token_yonetimi',
        parentId: 'menu_ai_yonetimi',
        label: 'Token Cüzdanı & Satış',
        path: '/ai-token-yonetimi',
        icon: React.createElement(Coins, { size: 16 }),
        order: 10
      }
    ],
    components: {
      YapayZekaAyarlari: YapayZekaAyarlariComponent,
      AiSaglayicilar: AiSaglayicilarComponent,
      AiSaglayiciForm: AiSaglayiciFormComponent,
      AiProtokoller: AiProtokollerComponent,
      AiProtokolForm: AiProtokolFormComponent,
      AiTokenYonetimi: AiTokenYonetimiComponent,
      AiAjanlar: AiAjanlarComponent,
      AiAjanForm: AiAjanFormComponent,
      AiAjanHizliIstekForm: AiAjanHizliIstekFormComponent,
      AiMcpYonetimi: AiMcpYonetimiComponent,
      MCPSelectionList: MCPSelectionListComponent
    }
  };
}

export default createAiManagementModule;
