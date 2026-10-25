/**
 * @akalin/ai_management_module - Servis Adaptörleri ve React Context (AiManagementServiceContext.tsx)
 * REST ve özel adaptörleri içerir; monolitik bağımlılıkları tamamen soyutlar.
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { IAiManagementAdapter } from '../types';
import { aiProtokolService } from '../services/aiProtokolService';
import { aiTokenService } from '../services/aiTokenService';
import { aiSaglayiciService } from '../services/aiSaglayiciService';
import { aiAjanService } from '../services/aiAjanService';
import { firmaAiSettingsService } from '../services/firmaAiSettingsService';

export const defaultAiManagementAdapter: IAiManagementAdapter = {
  protokol: aiProtokolService,
  token: aiTokenService,
  saglayici: aiSaglayiciService,
  ajan: aiAjanService,
  ayarlar: firmaAiSettingsService
};

export function createRestAiManagementAdapter(customOverrides?: Partial<IAiManagementAdapter>): IAiManagementAdapter {
  return {
    protokol: { ...defaultAiManagementAdapter.protokol, ...(customOverrides?.protokol || {}) },
    token: { ...defaultAiManagementAdapter.token, ...(customOverrides?.token || {}) },
    saglayici: { ...defaultAiManagementAdapter.saglayici, ...(customOverrides?.saglayici || {}) },
    ajan: { ...defaultAiManagementAdapter.ajan, ...(customOverrides?.ajan || {}) },
    ayarlar: { ...defaultAiManagementAdapter.ayarlar, ...(customOverrides?.ayarlar || {}) }
  };
}

export interface AiManagementContextValue {
  adapter: IAiManagementAdapter;
  appName: string;
  baseRoute: string;
}

export const AiManagementServiceContext = createContext<AiManagementContextValue>({
  adapter: defaultAiManagementAdapter,
  appName: 'Webakus Admin',
  baseRoute: '/yapay-zeka-ayarlari'
});

export interface AiManagementServiceProviderProps {
  adapter?: IAiManagementAdapter;
  appName?: string;
  baseRoute?: string;
  children?: ReactNode;
}

export const AiManagementServiceProvider: React.FC<AiManagementServiceProviderProps> = ({
  adapter = defaultAiManagementAdapter,
  appName = 'Webakus Admin',
  baseRoute = '/yapay-zeka-ayarlari',
  children
}) => {
  const value = useMemo(() => ({
    adapter,
    appName,
    baseRoute
  }), [adapter, appName, baseRoute]);

  return (
    <AiManagementServiceContext.Provider value={value}>
      {children}
    </AiManagementServiceContext.Provider>
  );
};

export function useAiManagementService(): AiManagementContextValue {
  return useContext(AiManagementServiceContext);
}

export default AiManagementServiceProvider;
