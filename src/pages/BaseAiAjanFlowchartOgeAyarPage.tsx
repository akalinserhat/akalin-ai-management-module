/**
 * @akalin/ai_management_module - Temel Flowchart Öğe Ayarları Kart Sayfası (BaseAiAjanFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Tüm Flowchart akış düğümü ayar sayfaları (Başla, İşlem, Karar, Ekran, Belge vb.) için ortak temel kart sayfası iskeletini sunmak
 * - @akalin/ui BaseCardPage temel bileşenini sarmalayarak standart form mimarisi, ActionMenu ve Breadcrumb senkronizasyonu sağlamak
 * - Türetilen sayfaların içeriklerini (children) ve form durumlarını esnek şekilde yönetmesine imkan tanımak
 * - Zero Bottom Button, Header-Only Actions, Sıfır Header Rozeti ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sliders } from 'lucide-react';
import {
  BaseCardPage,
  useHeaderApi,
  type BaseTabItem
} from '@akalin/ui';

export interface BaseAiAjanFlowchartOgeAyarPageProps {
  id?: string;
  agentId?: string | number;
  istekId?: string;
  nodeId?: string;
  nodeType?: string;
  title?: string;
  pageTitle?: string;
  recordTitle?: string;
  subtitleLeft?: string;
  icon?: React.ReactNode;
  initialNodeData?: any;
  formData?: any;
  onFormDataChange?: (newData: any) => void;
  onSave?: (nodeData: any) => Promise<void> | void;
  onClose?: () => void;
  onBack?: () => void;
  backRoute?: string;
  showBackButton?: boolean;
  isSaving?: boolean;
  extraDropdownActions?: any[];
  tabs?: BaseTabItem[];
  activeTabId?: string | number;
  onTabChange?: (tabId: string | number) => void;
  subTrail?: any[];
  className?: string;
  children?: React.ReactNode;
}

export const BaseAiAjanFlowchartOgeAyarPage: React.FC<BaseAiAjanFlowchartOgeAyarPageProps> = ({
  id = 'flowchartOgeAyarPage',
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
  nodeType,
  title,
  pageTitle,
  recordTitle,
  subtitleLeft,
  icon,
  initialNodeData,
  formData: controlledFormData,
  onFormDataChange,
  onSave: propOnSave,
  onClose,
  onBack,
  backRoute,
  showBackButton = true,
  isSaving: controlledIsSaving,
  extraDropdownActions,
  tabs,
  activeTabId,
  onTabChange,
  subTrail,
  className = '',
  children
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();
  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

  const [internalIsSaving, setInternalIsSaving] = useState<boolean>(false);
  const [internalFormData, setInternalFormData] = useState<any>(initialNodeData || {});

  const effectiveIsSaving = controlledIsSaving !== undefined ? controlledIsSaving : internalIsSaving;
  const effectiveFormData = controlledFormData !== undefined ? controlledFormData : internalFormData;

  const setFormData = (updater: any) => {
    const nextVal = typeof updater === 'function' ? updater(effectiveFormData) : updater;
    if (controlledFormData === undefined) {
      setInternalFormData(nextVal);
    }
    if (onFormDataChange) {
      onFormDataChange(nextVal);
    }
  };

  const pageDisplayName = useMemo(() => {
    if (recordTitle?.trim()) return recordTitle.trim();
    if (title?.trim()) return title.trim();
    if (pageTitle?.trim()) return pageTitle.trim();
    if (effectiveFormData?.baslik?.trim()) {
      return `${effectiveFormData.baslik.trim()} • ${t('oge_ayarlari', 'Öğe Ayarları')}`;
    }
    return t('flowchart_oge_ayarlari', 'Flowchart Öğe Ayarları');
  }, [recordTitle, title, pageTitle, effectiveFormData?.baslik, t]);

  useEffect(() => {
    if (setHeaderBreadcrumbOptions) {
      if (subTrail && subTrail.length > 0) {
        setHeaderBreadcrumbOptions({
          subTrail
        });
      } else {
        setHeaderBreadcrumbOptions({
          recordTitle: pageDisplayName
        });
      }
    }
    return () => {
      if (setHeaderBreadcrumbOptions) {
        setHeaderBreadcrumbOptions(null);
      }
    };
  }, [subTrail, pageDisplayName, setHeaderBreadcrumbOptions]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    } else if (backRoute) {
      navigate(backRoute);
    } else {
      navigate(-1);
    }
  };

  const handleSave = async () => {
    try {
      if (controlledIsSaving === undefined) {
        setInternalIsSaving(true);
      }
      if (propOnSave) {
        await propOnSave(effectiveFormData);
      }
    } finally {
      if (controlledIsSaving === undefined) {
        setInternalIsSaving(false);
      }
    }
  };

  return (
    <BaseCardPage
      id={id}
      title={pageDisplayName}
      pageTitle={pageDisplayName}
      recordTitle={pageDisplayName}
      icon={icon || <Sliders size={24} color="var(--accent-primary)" />}
      subtitleLeft={subtitleLeft || t('flowchart_oge_yapilandirma_aciklama', 'Akış diyagramı düğüm parametreleri ve yapılandırma ayarları')}
      showBackButton={showBackButton}
      onClose={handleClose}
      onSave={handleSave}
      isSaving={effectiveIsSaving}
      extraDropdownActions={extraDropdownActions}
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={onTabChange}
      subTrail={subTrail}
      className={`fade-in ${className}`}
    >
      <div className="flowchart-oge-ayar-content">
        {children}
      </div>
    </BaseCardPage>
  );
};

export default BaseAiAjanFlowchartOgeAyarPage;
