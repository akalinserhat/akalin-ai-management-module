/**
 * @akalin/ai_management_module - Dinamik Yapay Zeka (AI) API Protokol Yönetimi (AiProtokoller.tsx)
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseSystemPage ve BaseSystemCard mimarisi ile API protokollerini listelemek
 * - Yeni protokol ekleme (onAdd) ve düzenleme isteklerini BaseCardPage tabanlı AiProtokolForm rotasına yönlendirmek
 * - Sistem tanımlı ve özel protokollerin ayrımını sunmak
 * - Protokol silme işlemlerini AlertDialog ile güvenli biçimde yönetmek
 * - Hem tekil sayfa (standalone) hem de YapayZekaAyarlari içinde sekmeli (embedded) olarak çalışabilmek
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { 
  Code2, Terminal, Edit3, Trash2, 
  Zap, RefreshCw, Cpu, Plus
} from 'lucide-react';
import { BaseSystemPage, BaseSystemCard, AlertDialog } from '@akalin/ui';
import { aiProtokolService } from '../services/aiProtokolService';
import { AiProtokol } from '../types';

export interface AiProtokollerProps {
  embedded?: boolean;
  backRoute?: string;
  onBack?: () => void;
}

export const AiProtokoller: React.FC<AiProtokollerProps> = ({ 
  embedded = false,
  backRoute = '/ayarlar/YapayZekaAyarlari',
  onBack
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [protokoller, setProtokoller] = useState<AiProtokol[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchProtokoller = async () => {
    try {
      setLoading(true);
      const data = await aiProtokolService.getAll();
      setProtokoller(data);
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_protokoller_yuklenemedi', 'API Protokolleri yüklenirken hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtokoller();
  }, []);

  const handleOpenCreate = () => {
    navigate('/ai-protokoller/yeni', { state: { returnUrl: currentPath, activeTab: 'genel' } });
  };

  const handleOpenEdit = (p: AiProtokol) => {
    navigate(`/ai-protokoller/duzenle/${p.id}`, { state: { returnUrl: currentPath, activeTab: 'genel' } });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await aiProtokolService.delete(deleteId);
      toast.success(t('auto_protokol_silindi', 'Protokol başarıyla silindi.'));
      setDeleteId(null);
      fetchProtokoller();
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_silme_hatasi', 'Silme işlemi başarısız oldu.'));
    }
  };

  const renderContent = () => (
    <>
      {loading ? (
        <div className="flex-center py-40">
          <RefreshCw size={24} className="spin text-secondary" />
        </div>
      ) : (
        <div className="ai-saglayicilar-grid">
          {protokoller.map(p => (
            <BaseSystemCard
              key={p.id}
              title={p.ad}
              subtitle={p.aciklama || t('auto_aciklama_yok', 'Açıklama belirtilmemiş.')}
              icon={<Code2 size={22} />}
              badge={
                <div className="flex-row items-center gap-8">
                  {p.sistemProtokoluMu ? (
                    <span className="chip-primary">
                      {t('auto_sistem_protokolu', 'Sistem')}
                    </span>
                  ) : (
                    <span className="chip-warning">
                      <Zap size={12} /> {t('auto_ozel_protokol', 'Özel')}
                    </span>
                  )}
                </div>
              }
              onClick={() => handleOpenEdit(p)}
              actions={[
                {
                  label: t('auto_scriptleri_duzenle', 'Scriptleri Düzenle'),
                  icon: <Edit3 size={16} />,
                  onClick: () => handleOpenEdit(p)
                },
                {
                  label: t('auto_canli_test_tab', 'Canlı Test Konsolu'),
                  icon: <Terminal size={16} />,
                  onClick: () => navigate(`/ai-protokoller/duzenle/${p.id}`, { state: { returnUrl: currentPath, activeTab: 'test' } })
                },
                ...(!p.sistemProtokoluMu ? [{
                  label: t('auto_sil', 'Sil'),
                  icon: <Trash2 size={16} />,
                  onClick: () => setDeleteId(p.id),
                  danger: true
                }] : [])
              ]}
              details={[
                {
                  label: (
                    <span className="flex items-center gap-6">
                      <Code2 size={14} />
                      <span>{t('auto_istek_scripti', 'İstek Dönüştürücü')}</span>
                    </span>
                  ),
                  value: (
                    <span className="chip-success font-semibold text-xs">
                      {t('auto_aktif_js', 'Aktif JS')}
                    </span>
                  )
                },
                {
                  label: (
                    <span className="flex items-center gap-6">
                      <Zap size={14} />
                      <span>{t('auto_yanit_scripti', 'Yanıt Ayrıştırıcı')}</span>
                    </span>
                  ),
                  value: (
                    <span className="chip-success font-semibold text-xs">
                      {t('auto_aktif_js', 'Aktif JS')}
                    </span>
                  )
                },
                {
                  label: (
                    <span className="flex items-center gap-6">
                      <Cpu size={14} />
                      <span>{t('auto_bagli_saglayici', 'Bağlı Sağlayıcı')}</span>
                    </span>
                  ),
                  value: (
                    <span className="font-semibold text-primary">
                      {p.bagliSaglayiciSayisi > 0
                        ? t('auto_bagli_saglayici_adet', '{{count}} Sağlayıcı', { count: p.bagliSaglayiciSayisi })
                        : t('auto_bagli_saglayici_yok', 'Yok')}
                    </span>
                  )
                }
              ]}
            />
          ))}
        </div>
      )}

      {/* Silme Onay Dialog */}
      {deleteId && (
        <AlertDialog
          isOpen={true}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title={t('auto_protokol_sil_onay_baslik', 'Protokolü Sil')}
          message={t('auto_protokol_sil_onay_mesaj', 'Bu özel protokolü silmek istediğinize emin misiniz?')}
          type="warning"
          confirmText={t('auto_sil', 'Sil')}
          cancelText={t('auto_vazgec', 'Vazgeç')}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="ai-protokoller-embedded">
        <div className="flex items-center justify-between gap-12 mb-16 flex-wrap">
          <div className="text-secondary text-13">
            {t('auto_protokol_adet', '{{count}} adet protokol kayıtlı', { count: protokoller.length })}
          </div>
          <div className="flex items-center gap-10">
            <button
              type="button"
              onClick={fetchProtokoller}
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
              <span>{t('auto_yeni_protokol_ekle', 'Yeni Protokol Ekle')}</span>
            </button>
          </div>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <BaseSystemPage
      title={t('auto_ai_protokol_yonetimi', 'Yapay Zeka API Protokol Yönetimi')}
      subtitle={t('auto_ai_protokol_aciklama', 'Webakus API\'yi yeniden derlemeden Jint JavaScript scriptleri ile yeni LLM sağlayıcı protokolleri ekleyin ve test edin.')}
      icon={<Code2 size={26} />}
      baseRoute="/ayarlar/YapayZekaAyarlari/AiProtokoller"
      backRoute={backRoute}
      onBack={onBack}
      headerSync={false}
      onRefresh={fetchProtokoller}
      refreshLoading={loading}
      onAdd={handleOpenCreate}
      addButtonTitle={t('auto_yeni_protokol_ekle', 'Yeni Protokol Ekle')}
    >
      {renderContent()}
    </BaseSystemPage>
  );
};

export default AiProtokoller;
