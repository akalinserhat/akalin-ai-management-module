/**
 * @akalin/ai_management_module - Yapay Zeka Token & Cüzdan Yönetimi (AiTokenYonetimi.tsx)
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseSystemPage ve TabLayout mimarisi ile token cüzdanlarını, model fiyatlandırmasını ve harcama günlüğünü yönetmek
 * - Arama filtreleme işlemlerini merkezi GlobalSearch modülü üzerinden yönetmek
 * - Multi-tenant firma token bakiyelerini ve cüzdanlarını merkezi olarak izlemek
 * - Firmalara admin paneli üzerinden anlık token kredisi yüklemek (Token satışı/paket aktivasyonu)
 * - Model katsayı ve fiyatlandırma çarpanlarını (1.0x, 3.0x vb.) dinamik yönetmek
 * - Tüm yapay zeka harcamalarının atomik denetim günlüğünü (Ledger) gerçek firma adları ile listelemek
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { 
  Coins, Plus, RefreshCw, TrendingUp, ShieldAlert, CheckCircle2, 
  Clock, Building2, Layers, Edit3, Trash2, Zap
} from 'lucide-react';
import { 
  BaseSystemPage, 
  BasePopup, 
  BaseSwitch, 
  BaseTabItem,
  useGlobalSearch,
  useSearchFieldsRegister,
  SearchType
} from '@akalin/ui';
import { aiTokenService } from '../services/aiTokenService';
import { 
  FirmaTokenCuzdan, 
  TokenKrediYukleDto, 
  AiTokenHarcamaGecmisi, 
  AiModelFiyatlandirma 
} from '../types';

export const AiTokenYonetimi: React.FC = () => {
  const { t } = useTranslation();
  const [cuzdanlar, setCuzdanlar] = useState<FirmaTokenCuzdan[]>([]);
  const [harcamalar, setHarcamalar] = useState<AiTokenHarcamaGecmisi[]>([]);
  const [tarifeler, setTarifeler] = useState<AiModelFiyatlandirma[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>('cuzdanlar');

  // Kredi Yükleme Modal
  const [krediModalOpen, setKrediModalOpen] = useState(false);
  const [seciliCuzdan, setSeciliCuzdan] = useState<FirmaTokenCuzdan | null>(null);
  const [krediMiktari, setKrediMiktari] = useState<number>(1_000_000);
  const [paketAdi, setPaketAdi] = useState<string>('');
  const [aciklama, setAciklama] = useState<string>('');
  const [yukleniyor, setYukleniyor] = useState(false);

  // Tarife Düzenleme Modal
  const [tarifeModalOpen, setTarifeModalOpen] = useState(false);
  const [editingTarife, setEditingTarife] = useState<Partial<AiModelFiyatlandirma> | null>(null);
  const [tarifeSaving, setTarifeSaving] = useState(false);

  // GlobalSearch Alanlarının Kaydı
  const searchFields: SearchType[] = useMemo(() => [
    { 
      id: 'Tumu', 
      label: t('auto_tumu', 'Tümü'), 
      iconName: 'Search',
      type: 'text', 
      placeholder: t('auto_token_ara_placeholder', 'Firma adı, paket veya model ara...') 
    },
    { 
      id: 'Firma', 
      label: t('auto_firma', 'Firma'), 
      iconName: 'Building2',
      type: 'text', 
      placeholder: t('auto_firma_ara_placeholder', 'Firma adına göre ara...') 
    },
    { 
      id: 'Paket', 
      label: t('auto_paket', 'Paket'), 
      iconName: 'Coins',
      type: 'text', 
      placeholder: t('auto_paket_ara_placeholder', 'Paket adına göre ara...') 
    },
    { 
      id: 'Model', 
      label: t('auto_model', 'Model'), 
      iconName: 'Layers',
      type: 'text', 
      placeholder: t('auto_model_ara_placeholder', 'Model adına göre ara...') 
    }
  ], [t]);

  useSearchFieldsRegister(searchFields);

  // GlobalSearch Durumunu Okuma
  const { state: globalSearchState } = useGlobalSearch();
  const rawSearchTerm = globalSearchState?.searchTerm || '';
  const searchTerm = rawSearchTerm.trim().toLowerCase();
  const searchType = globalSearchState?.activeSearchType?.id || 'Tumu';

  const loadData = async () => {
    try {
      setLoading(true);
      const [cuzdanData, harcamaData, tarifeData] = await Promise.all([
        aiTokenService.getTumCuzdanlar(),
        aiTokenService.getHarcamalar(undefined, 100),
        aiTokenService.getTarifeler()
      ]);
      setCuzdanlar(cuzdanData || []);
      setHarcamalar(harcamaData || []);
      setTarifeler(tarifeData || []);
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_token_veri_hatasi', 'Token verileri yüklenirken hata oluştu.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toplam İstatistikler
  const toplamYuklenen = useMemo(() => cuzdanlar.reduce((acc, c) => acc + (c.toplamYuklenenKredi || 0), 0), [cuzdanlar]);
  const toplamHarcanan = useMemo(() => cuzdanlar.reduce((acc, c) => acc + (c.harcananKredi || 0), 0), [cuzdanlar]);
  const toplamKalan = useMemo(() => cuzdanlar.reduce((acc, c) => acc + (c.kalanKredi || 0), 0), [cuzdanlar]);

  const handleOpenKrediYukle = (cuzdan: FirmaTokenCuzdan) => {
    setSeciliCuzdan(cuzdan);
    setKrediMiktari(1_000_000);
    setPaketAdi(cuzdan.paketAdi && cuzdan.paketAdi !== 'Henüz Paket Tanımlanmamış' ? cuzdan.paketAdi : t('auto_standart_kredi_paketi', 'Standart Token Paketi'));
    setAciklama('');
    setKrediModalOpen(true);
  };

  const handleKrediYukleSubmit = async () => {
    if (!seciliCuzdan) return;
    if (krediMiktari <= 0) {
      toast.error(t('auto_gecersiz_kredi', 'Lütfen geçerli bir kredi miktarı giriniz.'));
      return;
    }

    try {
      setYukleniyor(true);
      const dto: TokenKrediYukleDto = {
        firmaId: seciliCuzdan.firmaId,
        krediMiktari: krediMiktari,
        paketAdi: paketAdi.trim() || t('auto_token_kredisi', 'Token Kredisi'),
        aciklama: aciklama.trim() || undefined
      };

      await aiTokenService.krediYukle(dto);
      toast.success(t('auto_kredi_yuklendi_basari', '{{firma}} firmasına {{miktar}} kredi başarıyla yüklendi.', {
        firma: seciliCuzdan.firmaAdi,
        miktar: krediMiktari.toLocaleString()
      }));
      setKrediModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_kredi_yukleme_hatasi', 'Kredi yüklenemedi.'));
    } finally {
      setYukleniyor(false);
    }
  };

  const handleSaveTarife = async () => {
    if (!editingTarife?.modelPattern || !editingTarife?.krediCarpani) {
      toast.error(t('auto_tarife_alanlar_zorunlu', 'Model deseni ve kredi çarpanı zorunludur.'));
      return;
    }

    try {
      setTarifeSaving(true);
      await aiTokenService.saveTarife(editingTarife);
      toast.success(t('auto_tarife_kaydedildi', 'Model fiyatlandırma tarifesi kaydedildi.'));
      setTarifeModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_tarife_kayit_hatasi', 'Tarife kaydedilemedi.'));
    } finally {
      setTarifeSaving(false);
    }
  };

  const handleDeleteTarife = async (id: number) => {
    try {
      await aiTokenService.deleteTarife(id);
      toast.success(t('auto_tarife_silindi', 'Tarife silindi.'));
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.mesaj || t('auto_tarife_silme_hatasi', 'Tarife silinemedi.'));
    }
  };

  // GlobalSearch Filtresi: Cüzdanlar
  const filteredCuzdanlar = useMemo(() => {
    if (!searchTerm) return cuzdanlar;
    return cuzdanlar.filter(c => {
      const matchFirma = c.firmaAdi && c.firmaAdi.toLowerCase().includes(searchTerm);
      const matchPaket = c.paketAdi && c.paketAdi.toLowerCase().includes(searchTerm);
      if (searchType === 'Firma') return matchFirma;
      if (searchType === 'Paket') return matchPaket;
      return matchFirma || matchPaket;
    });
  }, [cuzdanlar, searchTerm, searchType]);

  // GlobalSearch Filtresi: Tarifeler
  const filteredTarifeler = useMemo(() => {
    if (!searchTerm) return tarifeler;
    return tarifeler.filter(tItem => {
      const matchPattern = tItem.modelPattern && tItem.modelPattern.toLowerCase().includes(searchTerm);
      const matchAciklama = tItem.aciklama && tItem.aciklama.toLowerCase().includes(searchTerm);
      if (searchType === 'Model') return matchPattern;
      return matchPattern || matchAciklama;
    });
  }, [tarifeler, searchTerm, searchType]);

  // GlobalSearch Filtresi: Harcamalar
  const filteredHarcamalar = useMemo(() => {
    if (!searchTerm) return harcamalar;
    return harcamalar.filter(h => {
      const matchFirma = (h.firmaAdi && h.firmaAdi.toLowerCase().includes(searchTerm)) || String(h.firmaId).includes(searchTerm);
      const matchModel = h.modelAdi && h.modelAdi.toLowerCase().includes(searchTerm);
      const matchIslem = h.islemTuru && h.islemTuru.toLowerCase().includes(searchTerm);
      if (searchType === 'Firma') return matchFirma;
      if (searchType === 'Model') return matchModel;
      return matchFirma || matchModel || matchIslem;
    });
  }, [harcamalar, searchTerm, searchType]);

  // Tab 1 İçeriği: Firma Cüzdanları
  const renderCuzdanlarTab = () => (
    <div className="flex-col gap-16 py-12">
      <div className="flex-row items-center justify-between">
        <div className="text-xs text-secondary font-medium">
          {searchTerm ? (
            <span className="flex-row items-center gap-6">
              <span>{t('auto_arama_filtresi', 'Arama filtresi uygulandı:')}</span>
              <span className="font-semibold text-primary">"{rawSearchTerm}"</span>
              <span className="chip-primary text-xs">
                {t('auto_sonuc_sayisi', '{{count}} sonuç', { count: filteredCuzdanlar.length })}
              </span>
            </span>
          ) : (
            t('auto_toplam_firma_gosterim', 'Toplam {{count}} firma listeleniyor', { count: filteredCuzdanlar.length })
          )}
        </div>
      </div>

      <div className="ai-table-container">
        <table className="ai-custom-table">
          <thead>
            <tr>
              <th>{t('auto_firma_adi', 'Firma')}</th>
              <th>{t('auto_kalan_bakiye', 'Kalan Bakiye')}</th>
              <th>{t('auto_harcanan', 'Harcanan')}</th>
              <th>{t('auto_toplam_yuklenen', 'Toplam Yüklenen')}</th>
              <th>{t('auto_kullanim_orani', 'Kullanım Durumu')}</th>
              <th>{t('auto_paket_adi', 'Aktif Paket')}</th>
              <th>{t('auto_son_yukleme', 'Son Yükleme')}</th>
              <th className="text-right">{t('auto_islemler', 'İşlemler')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCuzdanlar.map(c => {
              const yuzde = c.toplamYuklenenKredi > 0 
                ? Math.min(100, Math.round((c.harcananKredi / c.toplamYuklenenKredi) * 100)) 
                : 0;

              return (
                <tr key={`${c.firmaId}-${c.id}`}>
                  <td className="font-semibold text-primary">{c.firmaAdi}</td>
                  <td>
                    <span className={c.kalanKredi > 0 ? 'chip-success font-bold' : 'chip-danger font-bold'}>
                      {c.kalanKredi.toLocaleString()} tkn
                    </span>
                  </td>
                  <td className="text-secondary">{c.harcananKredi.toLocaleString()} tkn</td>
                  <td className="text-primary">{c.toplamYuklenenKredi.toLocaleString()} tkn</td>
                  <td>
                    <div className="flex-row items-center justify-between text-xs text-secondary">
                      <span>%{yuzde}</span>
                    </div>
                    <div className="ai-token-progress-bar">
                      <div 
                        className="ai-token-progress-fill" 
                        style={{ width: `${yuzde}%` }}
                      />
                    </div>
                  </td>
                  <td>
                    <span className="chip-primary">{c.paketAdi}</span>
                  </td>
                  <td className="text-secondary text-sm">
                    {c.sonYuklemeTarihi ? new Date(c.sonYuklemeTarihi).toLocaleDateString() : '-'}
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => handleOpenKrediYukle(c)}
                    >
                      <Plus size={14} />
                      <span>{t('auto_kredi_yukle', 'Kredi Yükle')}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredCuzdanlar.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="ai-table-empty">
                    <Building2 size={32} />
                    <span>{t('auto_arama_sonucu_bulunamadi', 'Aramaya uygun firma cüzdanı bulunamadı.')}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Tab 2 İçeriği: Model Fiyatlandırma
  const renderTarifelerTab = () => (
    <div className="flex-col gap-16 py-12">
      <div className="flex-row items-center justify-between">
        <div className="flex-col gap-4">
          <span className="text-secondary text-sm">
            {t('auto_tarife_aciklama', 'Kullanılan LLM modeline göre harcanan token\'lar belirlenen katsayı ile çarpılarak firma bakiyesinden düşülür.')}
          </span>
          {searchTerm && (
            <span className="text-xs text-secondary font-medium">
              {t('auto_arama_filtresi', 'Arama filtresi uygulandı:')} <strong className="text-primary">"{rawSearchTerm}"</strong> ({filteredTarifeler.length} sonuç)
            </span>
          )}
        </div>
        <button 
          type="button"
          className="btn-primary btn-sm flex-shrink-0"
          onClick={() => {
            setEditingTarife({ modelPattern: '', krediCarpani: 1.0, aciklama: '', aktifMi: true });
            setTarifeModalOpen(true);
          }}
        >
          <Plus size={14} />
          <span>{t('auto_yeni_tarife_ekle', 'Yeni Model Tarifesi')}</span>
        </button>
      </div>

      <div className="ai-table-container">
        <table className="ai-custom-table">
          <thead>
            <tr>
              <th>{t('auto_model_deseni', 'Model Deseni (Pattern)')}</th>
              <th>{t('auto_kredi_carpani', 'Kredi Çarpanı (Katsayı)')}</th>
              <th>{t('auto_aciklama', 'Açıklama')}</th>
              <th>{t('auto_durum', 'Durum')}</th>
              <th className="text-right">{t('auto_islemler', 'İşlemler')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTarifeler.map(tItem => (
              <tr key={tItem.id}>
                <td className="font-mono font-bold text-primary">{tItem.modelPattern}</td>
                <td>
                  <span className="chip-primary font-bold text-sm">
                    {tItem.krediCarpani}x
                  </span>
                </td>
                <td className="text-secondary">{tItem.aciklama || '-'}</td>
                <td>
                  <span className={tItem.aktifMi ? 'chip-success' : 'chip-danger'}>
                    {tItem.aktifMi ? t('auto_aktif', 'Aktif') : t('auto_pasif', 'Pasif')}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex-row items-center justify-end gap-8">
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setEditingTarife({ ...tItem });
                        setTarifeModalOpen(true);
                      }}
                    >
                      <Edit3 size={14} />
                      <span>{t('auto_duzenle', 'Düzenle')}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => handleDeleteTarife(tItem.id)}
                    >
                      <Trash2 size={14} />
                      <span>{t('auto_sil', 'Sil')}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTarifeler.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="ai-table-empty">
                    <Layers size={32} />
                    <span>{t('auto_tarife_bulunamadi', 'Tanımlı model tarifesi bulunamadı.')}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Tab 3 İçeriği: Canlı Harcama Günlüğü
  const renderHarcamalarTab = () => (
    <div className="flex-col gap-16 py-12">
      <div className="flex-row items-center justify-between">
        <div className="flex-col gap-4">
          <span className="text-secondary text-sm">
            {t('auto_harcama_aciklama', 'Tüm firma ve yapay zeka ajanlarının sistem içi token tüketim denetim günlüğü (Ledger).')}
          </span>
          {searchTerm && (
            <span className="text-xs text-secondary font-medium">
              {t('auto_arama_filtresi', 'Arama filtresi uygulandı:')} <strong className="text-primary">"{rawSearchTerm}"</strong> ({filteredHarcamalar.length} sonuç)
            </span>
          )}
        </div>
        <button type="button" className="btn-secondary btn-sm flex-shrink-0" onClick={loadData}>
          <RefreshCw size={14} />
          <span>{t('auto_yenile', 'Yenile')}</span>
        </button>
      </div>

      <div className="ai-table-container">
        <table className="ai-custom-table">
          <thead>
            <tr>
              <th>{t('auto_tarih', 'Tarih / Saat')}</th>
              <th>{t('auto_firma', 'Firma')}</th>
              <th>{t('auto_model', 'Model')}</th>
              <th>{t('auto_islem_turu', 'İşlem')}</th>
              <th>{t('auto_prompt_tkn', 'Girdi (Prompt)')}</th>
              <th>{t('auto_compl_tkn', 'Çıktı (Compl.)')}</th>
              <th>{t('auto_katsayi', 'Katsayı')}</th>
              <th>{t('auto_dusulen_kredi', 'Düşülen Kredi')}</th>
              <th>{t('auto_sure', 'Süre')}</th>
              <th>{t('auto_durum', 'Durum')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredHarcamalar.map(h => (
              <tr key={h.id}>
                <td className="text-secondary text-sm">
                  {new Date(h.tarih).toLocaleString()}
                </td>
                <td className="font-semibold text-primary">
                  {h.firmaAdi || t('auto_firma_no', 'Firma #{{id}}', { id: h.firmaId })}
                </td>
                <td className="font-mono text-sm">{h.modelAdi}</td>
                <td>
                  <span className="chip-primary">{h.islemTuru}</span>
                </td>
                <td className="text-secondary">{h.promptTokens.toLocaleString()}</td>
                <td className="text-secondary">{h.completionTokens.toLocaleString()}</td>
                <td className="font-semibold">{h.modelKatsayisi}x</td>
                <td className="font-bold">
                  {h.dusulenKredi < 0 ? (
                    <span className="text-success">+{Math.abs(h.dusulenKredi).toLocaleString()}</span>
                  ) : (
                    <span className="text-danger">-{h.dusulenKredi.toLocaleString()}</span>
                  )}
                </td>
                <td className="text-secondary text-xs">{Math.round(h.yanitSuresiMs)} ms</td>
                <td>
                  <span className={h.basariliMi ? 'chip-success' : 'chip-danger'}>
                    {h.basariliMi ? t('auto_basarili', 'Başarılı') : t('auto_hata', 'Hata')}
                  </span>
                </td>
              </tr>
            ))}
            {filteredHarcamalar.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="ai-table-empty">
                    <Clock size={32} />
                    <span>{t('auto_harcama_kaydi_yok', 'Henüz harcama kaydı bulunmuyor.')}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // BaseSystemPage TabLayout Sekme Tanımları
  const tabs: BaseTabItem[] = useMemo(() => [
    {
      id: 'cuzdanlar',
      label: t('auto_firma_cuzdanlari', 'Firma Token Cüzdanları'),
      icon: <Coins size={16} />,
      badge: filteredCuzdanlar.length,
      content: renderCuzdanlarTab()
    },
    {
      id: 'tarifeler',
      label: t('auto_model_fiyatlandirma', 'Model Fiyatlandırma & Katsayılar'),
      icon: <Layers size={16} />,
      badge: filteredTarifeler.length,
      content: renderTarifelerTab()
    },
    {
      id: 'harcamalar',
      label: t('auto_harcama_ledger', 'Canlı Harcama Günlüğü (Ledger)'),
      icon: <Clock size={16} />,
      badge: filteredHarcamalar.length > 0 ? filteredHarcamalar.length : undefined,
      content: renderHarcamalarTab()
    }
  ], [filteredCuzdanlar, filteredTarifeler, filteredHarcamalar, t, searchTerm, rawSearchTerm]);

  // Üst İstatistik Kartları (TabLayout headerContent)
  const tabHeaderStats = (
    <div className="ai-token-stats-grid">
      <div className="ai-token-stat-card">
        <div className="ai-token-stat-icon primary">
          <Coins size={24} />
        </div>
        <div className="ai-token-stat-info">
          <span className="ai-token-stat-title">{t('auto_toplam_satilan_kredi', 'Toplam Yüklenen Kredi')}</span>
          <span className="ai-token-stat-value">{toplamYuklenen.toLocaleString()}</span>
        </div>
      </div>

      <div className="ai-token-stat-card">
        <div className="ai-token-stat-icon warning">
          <TrendingUp size={24} />
        </div>
        <div className="ai-token-stat-info">
          <span className="ai-token-stat-title">{t('auto_toplam_harcanan_kredi', 'Toplam Harcanan Kredi')}</span>
          <span className="ai-token-stat-value">{toplamHarcanan.toLocaleString()}</span>
        </div>
      </div>

      <div className="ai-token-stat-card">
        <div className="ai-token-stat-icon success">
          <ShieldAlert size={24} />
        </div>
        <div className="ai-token-stat-info">
          <span className="ai-token-stat-title">{t('auto_toplam_kalan_bakiye', 'Toplam Kalan Bakiye')}</span>
          <span className="ai-token-stat-value">{toplamKalan.toLocaleString()}</span>
        </div>
      </div>

      <div className="ai-token-stat-card">
        <div className="ai-token-stat-icon purple">
          <Building2 size={24} />
        </div>
        <div className="ai-token-stat-info">
          <span className="ai-token-stat-title">{t('auto_kayitli_firma_sayisi', 'Aktif Firma Cüzdanı')}</span>
          <span className="ai-token-stat-value">{cuzdanlar.length}</span>
        </div>
      </div>
    </div>
  );

  return (
    <BaseSystemPage
      title={t('auto_ai_token_cuzdan_yonetimi', 'Yapay Zeka Token & Kredi Yönetimi')}
      subtitle={t('auto_ai_token_aciklama', 'Webakus ekosisteminde token satışı, firma cüzdan bakiyeleri, model katsayı çarpanları ve anlık harcama defteri.')}
      icon={<Coins size={26} />}
      baseRoute="/ai-token-yonetimi"
      headerSync={false}
      tabs={tabs}
      activeTabId={activeTab}
      onTabChange={id => setActiveTab(String(id))}
      tabHeaderContent={tabHeaderStats}
      searchPlaceholder={t('auto_token_ara_placeholder', 'Firma adı, paket veya model ara...')}
      searchableFields={searchFields}
      customHeaderActions={
        <button type="button" className="btn-secondary flex items-center gap-8" onClick={loadData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>{t('auto_yenile', 'Yenile')}</span>
        </button>
      }
    >
      {/* Kredi Yükleme Modal */}
      {krediModalOpen && seciliCuzdan && (
        <BasePopup
          isOpen={krediModalOpen}
          onClose={() => setKrediModalOpen(false)}
          title={t('auto_kredi_yukle_baslik', 'Token Kredisi Yükle')}
          size="md"
          customFooter={
            <div className="flex-row items-center justify-end gap-10 w-full">
              <button type="button" className="btn-secondary" onClick={() => setKrediModalOpen(false)}>
                {t('auto_vazgec', 'Vazgeç')}
              </button>
              <button 
                type="button"
                className="btn-primary" 
                onClick={handleKrediYukleSubmit}
                disabled={yukleniyor}
              >
                {yukleniyor ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                <span>{t('auto_krediyi_onayla', 'Krediyi Yükle ve Aktifleştir')}</span>
              </button>
            </div>
          }
        >
          <div className="flex-col gap-16">
            <div className="text-xs text-secondary">
              {t('auto_kredi_yukle_aciklama', '{{firma}} firmasının yapay zeka cüzdanına token bakiyesi ekleyin.', { firma: seciliCuzdan.firmaAdi })}
            </div>
            <div className="p-12 bg-primary rounded border border-glass">
              <div className="text-xs text-secondary">{t('auto_mevcut_kalan_bakiye', 'Firmanın Mevcut Kalan Bakiyesi')}</div>
              <div className="text-xl font-bold text-primary mt-4">
                {seciliCuzdan.kalanKredi.toLocaleString()} Token
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_hazir_paketler', 'Hızlı Paket Seçimi')}</label>
              <div className="flex-row flex-wrap gap-8">
                {[
                  { miktar: 500_000, label: '500K Token' },
                  { miktar: 1_000_000, label: '1M Token' },
                  { miktar: 5_000_000, label: '5M Token' },
                  { miktar: 10_000_000, label: '10M Token' }
                ].map(pkg => (
                  <button
                    key={pkg.miktar}
                    type="button"
                    className={`ai-chip-option ${krediMiktari === pkg.miktar ? 'active' : ''}`}
                    onClick={() => {
                      setKrediMiktari(pkg.miktar);
                      setPaketAdi(pkg.label);
                    }}
                  >
                    <Zap size={13} />
                    <span>{pkg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_ozel_kredi_miktari', 'Özel Kredi Miktarı (Token)')}</label>
              <input
                type="number"
                className="form-control"
                value={krediMiktari}
                onChange={e => setKrediMiktari(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_paket_adi_etiket', 'Paket / Fatura Referansı')}</label>
              <input
                type="text"
                className="form-control"
                value={paketAdi}
                onChange={e => setPaketAdi(e.target.value)}
                placeholder={t('auto_paket_placeholder', 'Örn: Yıllık ERP Bakım Paketi Kredisi')}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_aciklama_notu', 'Yükleme Notu / Açıklama')}</label>
              <input
                type="text"
                className="form-control"
                value={aciklama}
                onChange={e => setAciklama(e.target.value)}
                placeholder={t('auto_aciklama_placeholder', 'Müşteri talebi veya havale dekont no...')}
              />
            </div>
          </div>
        </BasePopup>
      )}

      {/* Tarife Düzenleme Modal */}
      {tarifeModalOpen && editingTarife && (
        <BasePopup
          isOpen={tarifeModalOpen}
          onClose={() => setTarifeModalOpen(false)}
          title={editingTarife.id ? t('auto_tarife_duzenle', 'Model Tarifesini Düzenle') : t('auto_yeni_tarife', 'Yeni Model Tarifesi')}
          size="md"
          customFooter={
            <div className="flex-row items-center justify-end gap-10 w-full">
              <button type="button" className="btn-secondary" onClick={() => setTarifeModalOpen(false)}>
                {t('auto_vazgec', 'Vazgeç')}
              </button>
              <button 
                type="button"
                className="btn-primary" 
                onClick={handleSaveTarife}
                disabled={tarifeSaving}
              >
                {tarifeSaving ? <RefreshCw size={16} className="spin" /> : <CheckCircle2 size={16} />}
                <span>{t('auto_kaydet', 'Kaydet')}</span>
              </button>
            </div>
          }
        >
          <div className="flex-col gap-14">
            <div className="text-xs text-secondary">
              {t('auto_tarife_modal_aciklama', 'LLM model adına göre token maliyet çarpanını belirleyin.')}
            </div>
            <div className="form-group">
              <label className="form-label">{t('auto_model_pattern', 'Model Deseni / Pattern')}</label>
              <input
                type="text"
                className="form-control font-mono"
                value={editingTarife.modelPattern || ''}
                onChange={e => setEditingTarife({ ...editingTarife, modelPattern: e.target.value })}
                placeholder="Örn: gpt-4o, claude-3-7*, deepseek-*"
              />
              <span className="text-secondary text-xs mt-4">
                {t('auto_wildcard_ipucu', '* işareti ile başlayan veya biten modelleri topluca gruplayabilirsiniz.')}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_kredi_carpani', 'Kredi Çarpanı (Katsayı)')}</label>
              <input
                type="number"
                step="0.1"
                className="form-control"
                value={editingTarife.krediCarpani || 1.0}
                onChange={e => setEditingTarife({ ...editingTarife, krediCarpani: parseFloat(e.target.value) || 1.0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('auto_aciklama', 'Açıklama')}</label>
              <input
                type="text"
                className="form-control"
                value={editingTarife.aciklama || ''}
                onChange={e => setEditingTarife({ ...editingTarife, aciklama: e.target.value })}
                placeholder="Örn: OpenAI Flagship Model (3.0x Kredi)"
              />
            </div>

            <BaseSwitch
              checked={editingTarife.aktifMi ?? true}
              onChange={(val: any) => setEditingTarife({ ...editingTarife, aktifMi: typeof val === 'boolean' ? val : val?.target?.checked })}
              label={t('auto_tarife_aktif', 'Tarife Aktif')}
            />
          </div>
        </BasePopup>
      )}
    </BaseSystemPage>
  );
};

export default AiTokenYonetimi;
