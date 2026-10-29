/**
 * @akalin/ai_management_module - Flowchart Öğe Ayarları Sayfası (AiAjanFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Flowchart akış diyagramı düğümlerinin parametrelerini ve ayarlarını yapılandırmak
 * - @akalin/ui BaseCardPage temel bileşenini kullanarak standart kart sayfası mimarisini sunmak
 * - Zero Bottom Button, Header ActionMenu, dinamik Breadcrumb ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Sliders } from 'lucide-react';
import {
  BaseCardPage,
  useHeaderApi
} from '@akalin/ui';

export interface AiAjanFlowchartOgeAyarPageProps {
  agentId?: string | number;
  istekId?: string;
  nodeId?: string;
  initialNodeData?: any;
  onSave?: (nodeData: any) => Promise<void> | void;
  onClose?: () => void;
  onBack?: () => void;
  backRoute?: string;
}

export const AiAjanFlowchartOgeAyarPage: React.FC<AiAjanFlowchartOgeAyarPageProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
  initialNodeData,
  onSave: propOnSave,
  onClose,
  onBack,
  backRoute
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();
  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>(initialNodeData || {});

  const pageDisplayName = useMemo(() => {
    if (formData?.baslik?.trim()) {
      return `${formData.baslik.trim()} • ${t('oge_ayarlari', 'Öğe Ayarları')}`;
    }
    return t('flowchart_oge_ayarlari', 'Flowchart Öğe Ayarları');
  }, [formData?.baslik, t]);

  useEffect(() => {
    if (setHeaderBreadcrumbOptions) {
      setHeaderBreadcrumbOptions({
        recordTitle: pageDisplayName
      });
    }
    return () => {
      if (setHeaderBreadcrumbOptions) {
        setHeaderBreadcrumbOptions(null);
      }
    };
  }, [pageDisplayName, setHeaderBreadcrumbOptions]);

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
      setIsSaving(true);
      if (propOnSave) {
        await propOnSave(formData);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BaseCardPage
      id="flowchartOgeAyarPage"
      title={pageDisplayName}
      pageTitle={pageDisplayName}
      recordTitle={pageDisplayName}
      icon={<Sliders size={24} color="var(--accent-primary)" />}
      subtitleLeft={t('flowchart_oge_yapilandirma_aciklama', 'Akış diyagramı düğüm parametreleri ve yapılandırma ayarları')}
      showBackButton={true}
      onClose={handleClose}
      onSave={handleSave}
      isSaving={isSaving}
      className="fade-in"
    >
      <div className="flowchart-oge-ayar-content p-24">
        {/* Flowchart öğe ayar alanlarının ekleneceği boş gövde */}
      </div>
    </BaseCardPage>
  );
};

export default AiAjanFlowchartOgeAyarPage;
