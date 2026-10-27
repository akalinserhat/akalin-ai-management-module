/**
 * @akalin/ai_management_module - Modül Tanım Fabrikası (createAiManagementModule.tsx)
 * @akalin/module_core IModuleDefinition standardına uygun modül tanımı oluşturur.
 */

import React, { lazy } from 'react';
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
const AiMcpYonetimiPage = lazy(() => import('./pages/AiMcpYonetimi'));

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
  const AiMcpYonetimiComponent = options.customComponents?.AiMcpYonetimi || AiMcpYonetimiPage;

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
        title: 'API Protokolleri & Scriptler'
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
      AiMcpYonetimi: AiMcpYonetimiComponent
    }
  };
}

export default createAiManagementModule;
