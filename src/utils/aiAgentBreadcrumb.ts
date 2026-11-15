/**
 * @akalin/ai_management_module - AI Ajanları ve Görev Akışı Rota & Breadcrumb Yardımcıları (aiAgentBreadcrumb.ts)
 *
 * Tüm AI Ajanı ve Flowchart Alt Sayfalarında (AiAjanHizliIstekForm ve *FlowchartOgeAyarPage)
 * üst rotanın ("Yapay Zeka Ayarları" -> "Ajanlar" -> "{Ajan}" -> "{Görev Akışı}" ...)
 * kaybolmadan tutarlı ve tıklanabilir oluşturulmasını sağlar.
 */

import type { BreadcrumbSubItem } from '@akalin/ui';

export interface AiAgentRouteContext {
  isUnderAyarlar: boolean;
  isUnderSettingsAiAgents: boolean;
  isUnderSettingsAiAjanlar: boolean;
  isUnderSettingsAgents: boolean;
  aiSettingsRoute: string | null;
  baseAgentRoute: string;
}

/**
 * Aktif URL yoluna göre Yapay Zeka Ayarları üst rotasını ve Ajanlar temel rotasını çözümler.
 */
export const resolveAiAgentRouteContext = (pathname: string): AiAgentRouteContext => {
  const isUnderAyarlar = pathname.startsWith('/ayarlar');
  const isUnderSettingsAiAgents = pathname.startsWith('/settings/ai/agents');
  const isUnderSettingsAiAjanlar = pathname.startsWith('/settings/ai/AiAjanlar');
  const isUnderSettingsAgents = pathname.startsWith('/settings/agents');

  const baseAgentRoute = isUnderSettingsAiAgents
    ? '/settings/ai/agents'
    : isUnderSettingsAiAjanlar
      ? '/settings/ai/AiAjanlar'
      : isUnderSettingsAgents
        ? '/settings/agents'
        : isUnderAyarlar
          ? '/ayarlar/YapayZekaAyarlari/AiAjanlar'
          : '/ai-ajanlar';

  const aiSettingsRoute = isUnderAyarlar
    ? '/ayarlar/YapayZekaAyarlari'
    : isUnderSettingsAiAgents || isUnderSettingsAiAjanlar
      ? '/settings/ai'
      : null;

  return {
    isUnderAyarlar,
    isUnderSettingsAiAgents,
    isUnderSettingsAiAjanlar,
    isUnderSettingsAgents,
    aiSettingsRoute,
    baseAgentRoute
  };
};

export interface BuildAiAgentSubTrailParams {
  pathname: string;
  t: (key: string, defaultText?: string) => string;
  navigate: (to: string, options?: { state?: any }) => void;
  agentId?: string | number | null;
  agentTitle?: string | null;
  istekId?: string | number | null;
  istekTitle?: string | null;
  agentData?: any;
  istekData?: any;
  onIstekClick?: () => void;
  activeLabel: string;
  isIstekActive?: boolean;
  extraItemsBeforeActive?: BreadcrumbSubItem[];
}

/**
 * AI Ajanı Görev Akışı ve Flowchart Öğe Ayar sayfaları için standart `subTrail` dizisi üretir.
 * `/ayarlar/...` altında açıldığında mutlaka `Yapay Zeka Ayarları` adımını da dahil eder.
 */
export const buildAiAgentSubTrail = ({
  pathname,
  t,
  navigate,
  agentId,
  agentTitle,
  istekId,
  istekTitle,
  agentData,
  istekData,
  onIstekClick,
  activeLabel,
  isIstekActive = false,
  extraItemsBeforeActive
}: BuildAiAgentSubTrailParams): BreadcrumbSubItem[] => {
  const { aiSettingsRoute, baseAgentRoute } = resolveAiAgentRouteContext(pathname);
  const resolvedAgentId = agentId !== undefined && agentId !== null && String(agentId).trim() !== ''
    ? String(agentId).trim()
    : null;
  const resolvedAgentTitle =
    agentTitle?.trim() || (resolvedAgentId ? `#${resolvedAgentId}` : t('ai_ajani', 'AI Ajanı'));

  const items: BreadcrumbSubItem[] = [];

  if (aiSettingsRoute) {
    items.push({
      label: t('yapay_zeka_ayarlari', 'Yapay Zeka Ayarları'),
      onClick: () => navigate(aiSettingsRoute)
    });
  }

  items.push({
    label: t('ai_ajanlar_baslik', 'Ajanlar'),
    onClick: () => navigate(baseAgentRoute)
  });

  items.push({
    label: resolvedAgentTitle,
    onClick: resolvedAgentId
      ? () => navigate(`${baseAgentRoute}/${resolvedAgentId}`, { state: { activeTabId: 'hizliIstekler' } })
      : () => navigate(baseAgentRoute)
  });

  if (isIstekActive) {
    items.push({
      label: activeLabel,
      active: true
    });
    return items;
  }

  const resolvedIstekId = istekId !== undefined && istekId !== null && String(istekId).trim() !== ''
    ? String(istekId).trim()
    : null;
  const resolvedIstekClick = onIstekClick || (
    resolvedAgentId && resolvedIstekId
      ? () => navigate(`${baseAgentRoute}/${resolvedAgentId}/hizli-istek/${resolvedIstekId}`, {
          state: {
            agentData,
            hizliIstekItem: istekData
          }
        })
      : undefined
  );

  items.push({
    label: istekTitle?.trim() || t('gorev_akisi', 'Görev Akışı'),
    onClick: resolvedIstekClick
  });

  if (extraItemsBeforeActive && extraItemsBeforeActive.length > 0) {
    items.push(...extraItemsBeforeActive);
  }

  items.push({
    label: activeLabel,
    active: true
  });

  return items;
};
