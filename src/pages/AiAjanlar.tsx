/**
 * Webakus AdminUI - Yapay Zeka (AI) Ajanları ve Model Context Protocol (MCP) Yönetim Sayfası
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseSystemPage ve TabLayout mimarisi üzerine kurulu sistem ayarları modülü
 * - Webakus ERP ve Admin kapsamlarındaki yapay zeka uzman ajanlarını listelemek ve yönetmek
 * - Kapsam Filtreleme Sekmeleri (Tümü / ERP Ajanları / Admin Ajanları) ile ajanları izole etmek
 * - Base (Kök) Ajanlar ile onlardan türetilmiş (Derived) ajanların OOP miras hiyerarşisini görselleştirmek
 * - Ajanların bağlı olduğu sağlayıcı, model, sıcaklık, madde bazlı kural sayıları ve MCP araç yetkilerini görüntülemek
 * - AiAjanForm (BasePopup tabanlı) bileşeni ile yeni ajan ekleme, türetme ve kural override işlemlerini yürütmek
 * - Kesinlikle sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Bot, Sparkles, Plus, Trash2, 
  Edit2, Cpu, RefreshCw, AlertCircle,
  GitBranch, SlidersHorizontal, Zap
} from 'lucide-react';
import { BaseSystemPage, BaseSystemCard, useAlertDialog } from '@akalin/ui';
import AiAjanForm from './AiAjanForm';

// ─── Ana Sayfa Bileşeni ────────────────────────────────────────────────────────
export interface AiAjanlarProps {
  embedded?: boolean;
  backRoute?: string;
  onBack?: () => void;
}

export function AiAjanlar({ 
  embedded = false,
  backRoute: propBackRoute = '/ayarlar/YapayZekaAyarlari',
  onBack 
}: AiAjanlarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; moduleId?: string; subModuleId?: string }>();
  const { showAlert } = useAlertDialog();

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const baseRoute = isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari/AiAjanlar' : '/ai-ajanlar';
  const effectiveBackRoute = propBackRoute || (isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari' : '/yapay-zeka-ayarlari');

  const [agents, setAgents] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Kapsam Filtresi: 'ALL' | 'ERP' | 'ADMIN'
  const [activeScope, setActiveScope] = useState('ALL');

  // Düzenleme / Alt Sayfa Durumu
  const [editingAgent, setEditingAgent] = useState<any>(null);

  const isNewRoute = params.id === 'yeni' || location.pathname.endsWith('/yeni') || location.pathname.includes('/AiAjanlar/yeni/') || location.pathname.includes('/ai-ajanlar/yeni/');
  const activeAgentId = (params.id && params.id !== 'yeni' && !isNaN(Number(params.id))) ? params.id : null;
  const isEditing = isNewRoute || Boolean(activeAgentId) || Boolean(editingAgent);

  // Sayfa İlk Yükleme
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [agentsRes, providersRes, toolsRes, templatesRes] = await Promise.all([
        axios.get('/api/AiAjanlar'),
        axios.get('/api/AiSaglayicilar'),
        axios.get('/api/AiAraclar/katalog'),
        axios.get('/api/AiAraclar/sablonlar')
      ]);

      setAgents(agentsRes.data || []);
      setProviders(providersRes.data || []);
      setTools(toolsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      toast.error(t('auto_ajan_yukleme_hata', 'AI Ajanları ve araç verileri yüklenirken hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Kapsam İstatistikleri ve Filtrelenmiş Liste
  const totalCount = agents.length;
  const erpCount = agents.filter(a => a.kapsam === 1 || !a.kapsam).length;
  const adminCount = agents.filter(a => a.kapsam === 2).length;

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      if (activeScope === 'ERP') return a.kapsam === 1 || !a.kapsam;
      if (activeScope === 'ADMIN') return a.kapsam === 2;
      return true;
    });
  }, [agents, activeScope]);

  const handleOpenCreate = () => {
    setEditingAgent(null);
    navigate(`${baseRoute}/yeni`, {
      state: { initialScope: activeScope === 'ADMIN' ? 2 : 1 }
    });
  };

  const handleOpenEdit = (agent: any) => {
    setEditingAgent(agent);
    navigate(`${baseRoute}/${agent.id}`, {
      state: { agentData: agent }
    });
  };

  const handleCloseModal = () => {
    setEditingAgent(null);
    navigate(baseRoute);
  };

  const handleDelete = (id: any) => {
    showAlert(
      'confirm',
      t('ajan_sil_onay_baslik', 'Ajanı Sil'),
      t('ajan_sil_onay_mesaj', 'Bu ajanı silmek istediğinize emin misiniz?'),
      async () => {
        try {
          await axios.delete(`/api/AiAjanlar/${id}`);
          toast.success(t('ajan_silindi', 'Ajan silindi'));
          fetchInitialData();
        } catch (error) {
          showAlert('error', t('Hata', 'Hata'), t('ajan_silme_hata', 'Silme işlemi başarısız'));
        }
      },
      t('auto_sil_onayla', 'Evet, Sil'),
      t('auto_vazgec', 'Vazgeç')
    );
  };

  const handleDerive = (agent: any) => {
    setEditingAgent(null);
    navigate(`${baseRoute}/yeni`, {
      state: { deriveFromAgent: agent }
    });
  };

  // Scope Tabs
  const scopeTabs = [
    { id: 'ALL', label: `${t('tumu', 'Tümü')} (${totalCount})` },
    { id: 'ERP', label: `🏢 ${t('erp_ajanlari', 'ERP Ajanları')} (${erpCount})` },
    { id: 'ADMIN', label: `🛡️ ${t('admin_ajanlari', 'Admin Ajanları')} (${adminCount})` }
  ];

  const renderContent = () => (
    <>
      {/* Kapsam Bilgi Şeridi */}
      <div className="ai-scope-info-banner">
        {activeScope === 'ADMIN' ? (
          <span className="text-admin-purple font-semibold">
            🛡️ {t('admin_kapsami_bilgi', 'Admin kapsamındaki ajanlar ERP şirket kullanıcılarına kapalıdır.')}
          </span>
        ) : activeScope === 'ERP' ? (
          <span>🏢 {t('erp_kapsami_bilgi', 'ERP kullanıcılarının erişebileceği genel ve şirket asistanları.')}</span>
        ) : (
          <span>{t('toplam_ajan_bilgi', 'Toplam {{count}} aktif AI uzmanı listeleniyor.', { count: totalCount })}</span>
        )}
      </div>

      {/* Ajan Kartları Listesi */}
      {loading ? (
        <div className="glass-card loading-state flex-col items-center justify-center p-48 w-full">
          <RefreshCw size={36} className="spinning loading-icon mb-12 text-primary" />
          <p className="text-secondary">{t('auto_ajanlar_yukleniyor', 'Ajanlar ve MCP araçları taranıyor...')}</p>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center p-48 text-secondary w-full">
          <AlertCircle size={40} className="mb-12 text-muted" />
          <p className="font-semibold text-15 mb-4">{t('secili_kapsamda_ajan_yok', 'Seçili kapsamda kayıtlı AI Ajanı bulunamadı.')}</p>
        </div>
      ) : (
        <div className="ai-ajanlar-grid">
          {filteredAgents.map((agent) => {
            const rulesCount = agent.kurallar?.length || 0;
            const overriddenRulesCount = agent.kurallar?.filter((k: any) => k.durum === 'Ezildi').length || 0;

            return (
              <BaseSystemCard
                key={agent.id}
                id={String(agent.id)}
                icon={<Sparkles size={22} color={agent.renk || 'var(--accent-primary)'} />}
                iconBoxVariant="secondary"
                title={agent.ad}
                subtitle={
                  <div className="flex flex-col gap-2">
                    <span className="text-13 text-secondary font-medium">{agent.rol}</span>
                    {agent.ustAjanAdi && (
                      <div className="flex items-center gap-4 text-11 text-secondary">
                        <GitBranch size={11} className="text-primary" />
                        <span>{t('miras_alindi', 'Miras: {{name}}', { name: agent.ustAjanAdi })}</span>
                      </div>
                    )}
                  </div>
                }
                borderHighlight={agent.aktifMi ? 'primary' : 'none'}
                middleContent={
                  agent.aciklama ? (
                    <p className="text-13 text-secondary m-0 line-height-14">
                      {agent.aciklama}
                    </p>
                  ) : undefined
                }
                details={[
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <Cpu size={14} />
                        <span>{t('auto_saglayici_ve_model', 'Sağlayıcı & Model')}</span>
                      </span>
                    ),
                    value: (
                      <div className="flex items-center gap-6 justify-end flex-wrap">
                        <span>{agent.aiSaglayiciAdi || 'OpenAI'}</span>
                        {agent.aiSaglayiciAktifMi === false && (
                          <span className="text-danger text-11 font-semibold" title={t('saglayici_pasif_uyari', 'Bu sağlayıcı şu anda devre dışı bırakılmıştır')}>
                            ({t('Pasif', 'Pasif')})
                          </span>
                        )}
                        <span className="text-secondary">/</span>
                        <span className="font-semibold text-primary">{agent.modelAdi || 'gpt-4o'}</span>
                      </div>
                    )
                  },
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <SlidersHorizontal size={14} />
                        <span>{t('madde_bazli_kurallar', 'Madde Bazlı Kurallar')}</span>
                      </span>
                    ),
                    value: (
                      <div className="flex items-center gap-6 justify-end">
                        <span>{t('madde_sayisi', '{{count}} Madde', { count: rulesCount })}</span>
                        {overriddenRulesCount > 0 && (
                          <span className="text-success text-11">({overriddenRulesCount} {t('ezildi_rozet', 'Ezildi')})</span>
                        )}
                      </div>
                    )
                  },
                  {
                    label: (
                      <span className="flex items-center gap-6">
                        <Zap size={14} />
                        <span>{t('hizli_istekler_baslik', 'Hızlı İstekler & UI')}</span>
                      </span>
                    ),
                    value: agent.hizliIstekler && agent.hizliIstekler.length > 0 ? (
                      <span>{agent.hizliIstekler.length} {t('istek_sayisi', 'İstek')}</span>
                    ) : (
                      <span className="text-secondary text-11 italic">{t('tanimli_degil', 'Tanımlı değil')}</span>
                    )
                  }
                ]}
                status={{
                  active: Boolean(agent.aktifMi)
                }}
                actions={[
                  {
                    label: t('duzenle', 'Düzenle'),
                    icon: <Edit2 size={15} />,
                    onClick: () => handleOpenEdit(agent)
                  },
                  {
                    label: t('ajan_turet_title', 'Ajan Türet (OOP Miras)'),
                    icon: <GitBranch size={15} />,
                    onClick: () => handleDerive(agent)
                  },
                  ...(!agent.sistemKaydiMi ? [{
                    label: t('auto_sil', 'Sil'),
                    icon: <Trash2 size={15} />,
                    onClick: () => handleDelete(agent.id),
                    danger: true,
                    dividerAbove: true
                  }] : [{
                    label: t('auto_sil', 'Sil'),
                    icon: <Trash2 size={15} />,
                    disabled: true,
                    title: t('kok_ajan_silinemez', 'Sistem tarafından tanımlanan temel ajanlar silinemez.'),
                    danger: true,
                    dividerAbove: true
                  }])
                ]}
                interactive={true}
                onClick={() => handleOpenEdit(agent)}
              />
            );
          })}
        </div>
      )}
    </>
  );

  if (isEditing) {
    return (
      <AiAjanForm
        id={isNewRoute ? undefined : activeAgentId}
        initialData={location.state?.agentData || editingAgent}
        onClose={() => {
          setEditingAgent(null);
          navigate(baseRoute);
        }}
        onSuccess={() => {
          setEditingAgent(null);
          fetchInitialData();
          navigate(baseRoute);
        }}
        onBack={() => {
          setEditingAgent(null);
          navigate(baseRoute);
        }}
        backRoute={baseRoute}
        providers={providers}
        tools={tools}
        templates={templates}
        allAgents={agents}
      />
    );
  }

  if (embedded) {
    return (
      <div className="ai-ajanlar-embedded">
        <div className="flex items-center justify-between gap-12 mb-16 flex-wrap">
          <div className="moduller-tabs">
            {scopeTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`tab-btn ${activeScope === tab.id ? 'active' : ''}`}
                onClick={() => setActiveScope(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-10">
            <button 
              type="button" 
              onClick={fetchInitialData} 
              className="btn btn-secondary flex items-center gap-8"
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              <span>{t('Yenile', 'Yenile')}</span>
            </button>
            <button 
              type="button" 
              onClick={handleOpenCreate} 
              className="btn btn-primary flex items-center gap-8"
            >
              <Plus size={16} />
              <span>{t('yeni_ajan_olustur', 'Yeni Ajan Oluştur')}</span>
            </button>
          </div>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <BaseSystemPage
      title={t('menu_ai_ajanlar', 'Ajanlar')}
      subtitle={t('ai_ajanlar_alt_baslik', 'ERP ve Admin kapsamlı akıllı asistanları yapılandırın; maddeleri tek tıkla özelleştirin.')}
      icon={<Bot size={26} />}
      baseRoute="/ayarlar/YapayZekaAyarlari/AiAjanlar"
      backRoute={effectiveBackRoute}
      onBack={onBack}
      headerSync={false}
      onAdd={handleOpenCreate}
      addButtonTitle={t('yeni_ajan_olustur', 'Yeni Ajan Oluştur')}
      tabs={scopeTabs}
      activeTabId={activeScope}
      onTabChange={(id) => setActiveScope(String(id))}
      onRefresh={fetchInitialData}
      refreshLoading={loading}
    >
      {renderContent()}
    </BaseSystemPage>
  );
}

export default AiAjanlar;

