/**
 * @akalin/ai_management_module - Yapay Zeka (AI) & LLM Yönetim Modülü Ana Giriş Noktası
 */

import './styles/aiManagement.css';

// Tipler
export * from './types';

// Servisler
export * from './services/httpClient';
export * from './services/aiProtokolService';
export * from './services/aiTokenService';
export * from './services/aiSaglayiciService';
export * from './services/aiAjanService';
export * from './services/firmaAiSettingsService';

// Adaptörler & Context
export * from './adapters/AiManagementServiceContext';

// Validatörler
export * from './validators/aiProtokolValidation';
export * from './validators/aiSaglayiciValidation';

// Sayfalar & Bileşenler
export { default as YapayZekaAyarlari, YapayZekaAyarlari as NamedYapayZekaAyarlari } from './pages/YapayZekaAyarlari';
export { default as AiSaglayicilar, AiSaglayicilar as NamedAiSaglayicilar } from './pages/AiSaglayicilar';
export { default as AiSaglayiciForm, AiSaglayiciForm as NamedAiSaglayiciForm } from './pages/AiSaglayiciForm';
export { default as AiProtokoller, AiProtokoller as NamedAiProtokoller } from './pages/AiProtokoller';
export { default as AiProtokolForm, AiProtokolForm as NamedAiProtokolForm } from './pages/AiProtokolForm';
export { default as AiTokenYonetimi, AiTokenYonetimi as NamedAiTokenYonetimi } from './pages/AiTokenYonetimi';
export { default as AiAjanlar, AiAjanlar as NamedAiAjanlar } from './pages/AiAjanlar';
export { default as AiAjanForm, AiAjanForm as NamedAiAjanForm } from './pages/AiAjanForm';
export { default as AiAjanHizliIstekForm, AiAjanHizliIstekForm as NamedAiAjanHizliIstekForm, type AiAjanHizliIstekFormProps } from './pages/AiAjanHizliIstekForm';
export { default as BaseAiAjanFlowchartOgeAyarPage, BaseAiAjanFlowchartOgeAyarPage as NamedBaseAiAjanFlowchartOgeAyarPage, type BaseAiAjanFlowchartOgeAyarPageProps } from './pages/BaseAiAjanFlowchartOgeAyarPage';
export { default as BaslaFlowchartOgeAyarPage, BaslaFlowchartOgeAyarPage as NamedBaslaFlowchartOgeAyarPage, type BaslaFlowchartOgeAyarPageProps } from './pages/BaslaFlowchartOgeAyarPage';
export { default as FormAcFlowchartOgeAyarPage, FormAcFlowchartOgeAyarPage as NamedFormAcFlowchartOgeAyarPage, type FormAcFlowchartOgeAyarPageProps } from './pages/FormAcFlowchartOgeAyarPage';
export { default as McpVarlikSeciciInput, McpVarlikSeciciInput as NamedMcpVarlikSeciciInput, type McpVarlikSeciciInputProps } from './pages/McpVarlikSeciciInput';
export { default as AiMcpYonetimi, AiMcpYonetimi as NamedAiMcpYonetimi, buildMcpTreeData, countMcpNodeStats, getAgentActiveMcpEntities, getAllMcpEntities, type McpTreeNode, type AgentActiveMcpEntity, type AiMcpYonetimiProps } from './pages/AiMcpYonetimi';
export { default as MCPSelectionList, MCPSelectionList as NamedMCPSelectionList, type MCPSelectionListProps, type McpStageOneItem, type McpSelectionMode } from './pages/MCPSelectionList';

// Modül Fabrikası
export * from './createAiManagementModule';
import { createAiManagementModule } from './createAiManagementModule';

export const AiManagementModule = createAiManagementModule();
export default AiManagementModule;
