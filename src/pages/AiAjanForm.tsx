/**
 * Webakus AdminUI - Yapay Zeka (AI) Ajanı, Madde Bazlı Kural & Override Sayfası (AiAjanForm)
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseCardPage temel bileşeninden türetilerek tüm diğer kart sayfalarıyla %100 görsel ve mimari tutarlılık sağlamak
 * - Breadcrumb üzerinde ajanın adının (recordTitle) anlık senkronize edilmesi
 * - Master-Detail (Sol Liste + Sağ Geniş Editör) mimarisiyle Madde Madde Kural ve OOP Override yönetimi
 * - Base (Kök) Ajan seçimi ve miras alınan kuralların görsel olarak yönetilmesi
 * - LLMSeciciInput ve YZModelSecici ile sağlayıcı ve model yapılandırması
 * - Model Context Protocol (MCP) ERP araçlarının ajana yetkilendirilmesi
 * - Hızlı İstekler & UI butonlarının yönetimi
 * - Sayfa başlığında ActionMenu ve global Kaydet (Cmd+S / Ctrl+S) entegrasyonu
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Bot, Sparkles, Sliders, Cpu, Code2, Search, Copy,
  Compass, FilePlus, Database, Layers, Terminal, Info,
  Zap, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp, Eye, CheckCircle2,
  SlidersHorizontal, GitBranch, ArrowUp, ArrowDown, Check, X, Shield, ShieldAlert,
  FileCode, Layers2, BookOpen, FileSpreadsheet, FileText, Users, AlertCircle, TrendingUp, FolderOpen,
  Power, Package, Edit2, Thermometer
} from 'lucide-react';
import {
  BaseCardPage,
  BaseCard,
  BasitInput,
  BaseButton,
  SaveButton,
  CancelButton,
  TamsayiInput,
  BaseSwitch,
  BasePopup,
  LLMSeciciInput,
  YZModelSecici,
  PageLoader,
  useHeaderApi,
  useAlertDialog,
  BaseListPage,
  ActionMenu,
  DataTable,
  EkleFloatCircleButton,
  type Column,
  type ActionMenuItem,
  type BaseTabItem
} from '@akalin/ui';
import {
  AiModelSelection,
  type AiModelConfig
} from '@akalin/ai-assistants';

// ─── UI Aksiyonu Seçenekleri ──────────────────────────────────────────────────
export const UI_ACTION_OPTIONS = [
  { id: 'YOK', value: 'YOK', tanim: '💬 Salt Metin İstemi (Ekran Açma)', label: '💬 Salt Metin İstemi (Ekran Açma)', badge: 'Metin', color: '#64748b' },
  { id: 'BULUT_DOSYA_SEC', value: 'BULUT_DOSYA_SEC', tanim: '📁 Bulut Dosyası Seçici (FilesOnClouds)', label: '📁 Bulut Dosyası Seçici (FilesOnClouds)', badge: 'Bulut Dosyası', color: '#3b82f6' },
  { id: 'METIN_YAPISTIR_MODAL', value: 'METIN_YAPISTIR_MODAL', tanim: 'Metin / Kampanya Giriş Penceresi Aç (Önce Metin Al)', label: '📝 Metin / Kampanya Giriş Penceresi Aç (Önce Metin Al)', badge: 'Metin Girişi', color: '#ec4899' },
  { id: 'EXCEL_IMPORT', value: 'EXCEL_IMPORT', tanim: '📊 Excel İçe Aktarım Ekranı (/excel-import)', label: '📊 Excel İçe Aktarım Ekranı (/excel-import)', badge: 'Excel Aktarım', color: '#10b981' },
  { id: 'CARI_SEC', value: 'CARI_SEC', tanim: '👤 Cari Kart Seçici (CariSeciciModal)', label: '👤 Cari Kart Seçici (CariSeciciModal)', badge: 'Cari Seçici', color: '#8b5cf6' },
  { id: 'URUN_SEC', value: 'URUN_SEC', tanim: '📦 Ürün & Hizmet Seçici (UrunSeciciModal)', label: '📦 Ürün & Hizmet Seçici (UrunSeciciModal)', badge: 'Ürün Seçici', color: '#f59e0b' },
  { id: 'OZEL_ROTA', value: 'OZEL_ROTA', tanim: '🔗 Özel ERP Rota Yönlendirmesi', label: '🔗 Özel ERP Rota Yönlendirmesi', badge: 'Rota / Sayfa', color: '#06b6d4' }
];

// ─── Hızlı İstek Şablonları (Presets) ─────────────────────────────────────────
export const HIZLI_ISTEK_PRESETS = [
  {
    baslik: '📁 Bulut Dosyasından Fiyat/Belge Aktar',
    prompt: 'Seçilen dökümanı analiz et, ürün kodlarını, miktarları ve fiyatları çıkararak forma aktar.',
    ikon: 'FileSpreadsheet',
    uiAksiyonu: 'BULUT_DOSYA_SEC'
  },
  {
    baslik: '📝 Metinden / Kampanya Yazısından Belge Oluştur',
    prompt: 'Girilen kampanya veya fiyat listesi metnini analiz et, koşulları ve kalemleri çıkararak belge taslağı oluştur.',
    ikon: 'FileText',
    uiAksiyonu: 'METIN_YAPISTIR_MODAL'
  },
  {
    baslik: '📊 Excel İçe Aktarım Ekranını Aç',
    prompt: 'Excel dosyasındaki ürün ve fiyat sütunlarını bu formla eşleştir ve aktar.',
    ikon: 'FileText',
    uiAksiyonu: 'EXCEL_IMPORT'
  },
  {
    baslik: '👤 Seçili Cariye Özel Fiyat Çıkar',
    prompt: 'Seçilen cari hesabın geçmiş alış/satış koşullarını analiz ederek özel fiyat listesi öner.',
    ikon: 'Users',
    uiAksiyonu: 'CARI_SEC'
  },
  {
    baslik: '🔍 Riskli ve Düşük Karlı Kalemleri Raporla',
    prompt: 'Formdaki birim fiyatları son alış maliyetleriyle karşılaştırarak kar marjı düşük kalemleri listele.',
    ikon: 'AlertCircle',
    uiAksiyonu: 'YOK'
  },
  {
    baslik: '📈 Bu Sayfadaki Verileri Özetle',
    prompt: 'Açık olan belgenin genel toplamlarını, kalem sayılarını ve kritik noktalarını özetle.',
    ikon: 'TrendingUp',
    uiAksiyonu: 'YOK'
  }
];

// ─── Standart ERP Kural Şablonları (Presets) ──────────────────────────────────
const ERP_RULE_PRESETS = [
  {
    baslik: 'Yetkilendirme & Güvenlik Sınırları',
    aciklama: 'Kullanıcı yetki ve gizlilik politikası',
    icerik: 'Yalnızca kullanıcının yetkili olduğu şube ve firma verileri üzerinden işlem yap. Gizli verileri veya maliyet analizlerini kullanıcı açıkça sormadıkça yanıtlarda paylaşma.'
  },
  {
    baslik: 'ERP Modül & Ekran Yönlendirmesi',
    aciklama: 'Otomatik ERP sayfa navigasyonu',
    icerik: 'Kullanıcının talebini yerine getirdikten sonra ilgili ERP ekranına (Stok Kartı, Sipariş Formu, Fatura Listesi vb.) gitmesi için erp_navigate aracını kullan ve kullanıcıyı yönlendir.'
  },
  {
    baslik: 'MCP Araç Çağırma & Belge Standardı',
    aciklama: 'Belge oluşturma ve MCP araç kuralı',
    icerik: 'Belge ve veri oluşturma işlemlerinde erp_create_document gibi tanımlı MCP araçlarını çağırarak işlem yap. Sohbet metninde kullanıcıya ham JSON dökümü yapmak yerine şık bir Türkçe yönetici özeti sun.'
  },
  {
    baslik: 'Fiyat Politikası & İskonto Sınırı',
    aciklama: 'Fiyat ve iskonto limitleri',
    icerik: 'Ürün fiyat listelerini ve KDV dahil/hariç birim fiyatlarını doğru listeler üzerinden kontrol et. Tanımlı iskonto limitinin üzerinde indirim uygulama.'
  },
  {
    baslik: 'Veri Doğrulama & Teyit',
    aciklama: 'Eksik veri onay mekanizması',
    icerik: 'Cari hesap veya ürün kodları eksik veya belirsizse kullanıcıdan onay iste, hiçbir veriyi tahmini veya varsayımsal olarak doldurma.'
  }
];

// ─── Araç Kategori ve İkon Eşleştirici ──────────────────────────────────────────
const getToolIcon = (iconName, categoryName) => {
  const name = (iconName || '').toLowerCase();
  const cat = (categoryName || '').toLowerCase();

  if (name === 'compass' || cat.includes('navigasyon')) return <Compass size={18} />;
  if (name === 'fileplus' || cat.includes('belge') || cat.includes('işlem')) return <FilePlus size={18} />;
  if (name === 'database' || cat.includes('veri') || cat.includes('analiz') || cat.includes('rapor')) return <Database size={18} />;
  if (name === 'layers' || cat.includes('sistem') || cat.includes('bağlam')) return <Layers size={18} />;
  return <Terminal size={18} />;
};

// ─── Hızlı İstek İkon Seçici ──────────────────────────────────────────────────
export const getHizliIstekIcon = (iconName?: string) => {
  switch (iconName) {
    case 'FileSpreadsheet': return <FileSpreadsheet size={16} />;
    case 'FileText': return <FileText size={16} />;
    case 'FolderOpen': return <FolderOpen size={16} />;
    case 'Package': return <Package size={16} />;
    case 'Users': return <Users size={16} />;
    case 'TrendingUp': return <TrendingUp size={16} />;
    case 'AlertCircle': return <AlertCircle size={16} />;
    default: return <Sparkles size={16} />;
  }
};

// ─── Canlı Prompt Derleyici ───────────────────────────────────────────────────
const compilePromptPreview = (rules = []) => {
  return rules
    .filter(r => r.durum !== 'DevreDisi' && r.icerik?.trim())
    .sort((a, b) => (a.sira || 0) - (b.sira || 0))
    .map(r => `[${(r.baslik || 'KURAL').toUpperCase()}]:\n${r.icerik.trim()}`)
    .join('\n\n');
};

// ─── Ana Sayfa Bileşeni (BaseCardPage Tabanlı AiAjanForm) ─────────────────────
export interface AiAjanFormProps {
  id?: string | number;
  initialData?: any;
  onClose?: () => void;
  onSuccess?: () => void;
  onBack?: () => void;
  backRoute?: string;
  isOpen?: boolean;
  providers?: any[];
  tools?: any[];
  templates?: any[];
  allAgents?: any[];
}

export const AiAjanForm: React.FC<AiAjanFormProps> = ({
  id: propId,
  initialData: propInitialData,
  onSuccess,
  onClose,
  onBack,
  backRoute,
  isOpen,
  providers = [],
  tools = [],
  templates = [],
  allAgents = []
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; moduleId?: string; subModuleId?: string }>();
  const { showAlert } = useAlertDialog();
  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const defaultBackRoute = isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari/AiAjanlar' : '/ai-ajanlar';
  const effectiveBackRoute = backRoute || defaultBackRoute;

  const rawId = (propId && propId !== 'yeni')
    ? propId
    : (params.id && params.id !== 'yeni' && !isNaN(Number(params.id)) ? params.id : null);
  const effectiveId = (rawId && !isNaN(Number(rawId))) ? rawId : null;

  const [localInitialData, setLocalInitialData] = useState<any>(() => {
    if (propInitialData) return propInitialData;
    if (location.state?.agentData) return location.state.agentData;
    if (location.state?.deriveFromAgent) {
      const src = location.state.deriveFromAgent;
      return {
        ad: `${src.ad} (${t('auto_ozel', 'Özel')})`,
        kod: `${src.kod}_OZEL`,
        rol: src.rol,
        aciklama: src.aciklama,
        ikon: src.ikon,
        renk: src.renk,
        kapsam: src.kapsam || 1,
        ustAjanId: src.id,
        ustAjanAdi: src.ad,
        kurallar: src.kurallar?.map((k: any) => ({
          ...k,
          durum: 'MirasAlindi',
          orijinalBaseIcerik: k.icerik
        })) || [],
        aiSaglayiciId: src.aiSaglayiciId,
        modelAdi: src.modelAdi,
        sicaklik: src.sicaklik,
        maxTokens: src.maxTokens,
        aktifMi: true,
        sistemKaydiMi: false,
        ajanAraclari: src.ajanAraclari,
        hizliIstekler: src.hizliIstekler ? JSON.parse(JSON.stringify(src.hizliIstekler)) : []
      };
    }
    if (location.state?.initialScope) {
      return { kapsam: location.state.initialScope };
    }
    return null;
  });

  const [dataLoading, setDataLoading] = useState(Boolean(effectiveId && !localInitialData));
  const [internalProviders, setInternalProviders] = useState<any[]>(providers);
  const [internalTools, setInternalTools] = useState<any[]>(tools);
  const [internalTemplates, setInternalTemplates] = useState<any[]>(templates);
  const [internalAllAgents, setInternalAllAgents] = useState<any[]>(allAgents);
  const [isSaving, setIsSaving] = useState(false);

  // Doğrudan sayfaya gelindiğinde katalog verilerini yükle
  useEffect(() => {
    if (internalProviders.length === 0 || internalTools.length === 0 || internalAllAgents.length === 0) {
      Promise.all([
        internalProviders.length === 0 ? axios.get('/api/AiSaglayicilar') : Promise.resolve({ data: internalProviders }),
        internalTools.length === 0 ? axios.get('/api/AiAraclar/katalog') : Promise.resolve({ data: internalTools }),
        internalTemplates.length === 0 ? axios.get('/api/AiAraclar/sablonlar') : Promise.resolve({ data: internalTemplates }),
        internalAllAgents.length === 0 ? axios.get('/api/AiAjanlar') : Promise.resolve({ data: internalAllAgents })
      ]).then(([pRes, tRes, tmplRes, aRes]) => {
        if (pRes?.data && internalProviders.length === 0) setInternalProviders(pRes.data);
        if (tRes?.data && internalTools.length === 0) setInternalTools(tRes.data);
        if (tmplRes?.data && internalTemplates.length === 0) setInternalTemplates(tmplRes.data);
        if (aRes?.data && internalAllAgents.length === 0) setInternalAllAgents(aRes.data);
      }).catch(err => {
        console.error('AI Ajan katalog verileri yüklenirken hata:', err);
      });
    }
  }, []);

  // Doğrudan ID ile açıldığında ajan detaylarını çek
  useEffect(() => {
    if (effectiveId && !localInitialData) {
      setDataLoading(true);
      axios.get(`/api/AiAjanlar/${effectiveId}`)
        .then(res => {
          if (res.data) {
            setLocalInitialData(res.data);
          }
        })
        .catch(err => {
          console.error(err);
          toast.error(t('auto_ajan_yukleme_hata', 'Ajan bilgisi yüklenirken hata oluştu.'));
        })
        .finally(() => setDataLoading(false));
    }
  }, [effectiveId]);

  const [activeTabId, setActiveTabId] = useState('genel');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [ruleFilter, setRuleFilter] = useState('Tümü');
  const [hizliIsteklerRefreshKey, setHizliIsteklerRefreshKey] = useState(0);

  // Hızlı İstek Ekle / Düzenle Modal Durumu
  const [hizliIstekModal, setHizliIstekModal] = useState<{
    isOpen: boolean;
    item: any | null;
  }>({
    isOpen: false,
    item: null
  });

  const [modalFormState, setModalFormState] = useState<any>({
    id: '',
    baslik: '',
    prompt: '',
    ikon: 'Sparkles',
    uiAksiyonu: 'YOK',
    aktifMi: true
  });

  // Hızlı İstekler listesini başlat (Miras veya localInitialData'dan)
  const initialHizliIstekler = useMemo(() => {
    if (Array.isArray(localInitialData?.hizliIstekler) && localInitialData.hizliIstekler.length > 0) {
      return localInitialData.hizliIstekler;
    }
    if (localInitialData?.hizliIsteklerJson) {
      try {
        const parsed = JSON.parse(localInitialData.hizliIsteklerJson);
        if (Array.isArray(parsed)) return parsed;
      } catch { }
    }
    if (localInitialData?.ustAjanId) {
      const parent = internalAllAgents.find(a => a.id === localInitialData.ustAjanId);
      if (parent?.hizliIstekler && parent.hizliIstekler.length > 0) {
        return JSON.parse(JSON.stringify(parent.hizliIstekler));
      }
    }
    return [];
  }, [localInitialData, internalAllAgents]);

  // Alternatif Modeller listesini başlat
  const initialAlternatifModeller = useMemo<string[]>(() => {
    if (Array.isArray(localInitialData?.alternatifModeller) && localInitialData.alternatifModeller.length > 0) {
      return localInitialData.alternatifModeller;
    }
    if (localInitialData?.alternatifModellerJson) {
      try {
        const parsed = JSON.parse(localInitialData.alternatifModellerJson);
        if (Array.isArray(parsed)) return parsed;
      } catch { }
    }
    return [];
  }, [localInitialData]);

  // Kural listesini başlat (Kök ajanların kuralları 'Yeni'/düzenlenebilir olarak başlatılır)
  const initialRules = useMemo(() => {
    if (localInitialData?.kurallar && localInitialData.kurallar.length > 0) {
      if (!localInitialData.ustAjanId) {
        // Kök veya bağımsız ajanın kuralları doğrudan düzenlenebilir olmalıdır
        return localInitialData.kurallar.map(k => ({
          ...k,
          durum: k.durum === 'DevreDisi' ? 'DevreDisi' : (k.durum === 'MirasAlindi' ? 'Yeni' : (k.durum || 'Yeni'))
        }));
      }
      return localInitialData.kurallar;
    }
    if (localInitialData?.ustAjanId) {
      const parent = internalAllAgents.find(a => a.id === localInitialData.ustAjanId);
      if (parent?.kurallar?.length > 0) {
        return parent.kurallar.map(k => ({
          ...k,
          durum: 'MirasAlindi',
          orijinalBaseIcerik: k.icerik
        }));
      }
    }
    return [
      {
        id: 'KIMLIK',
        baslik: 'Ajan Kimliği ve Misyonu',
        icerik: localInitialData?.sistemIstemi || 'Sen Webakus ERP sisteminde çalışan yetkili ve akıllı bir yapay zeka asistanısın.',
        sira: 1,
        durum: 'Yeni',
        kilitliMi: false
      }
    ];
  }, [localInitialData, internalAllAgents]);

  const [formData, setFormData] = useState({
    ad: localInitialData?.ad || '',
    kod: localInitialData?.kod || '',
    rol: localInitialData?.rol || 'Genel ERP Asistanı',
    aciklama: localInitialData?.aciklama || '',
    ikon: localInitialData?.ikon || 'Bot',
    renk: localInitialData?.renk || '#6366f1',
    kapsam: localInitialData?.kapsam || 1,
    ustAjanId: localInitialData?.ustAjanId || null,
    kurallar: initialRules,
    sistemIstemi: localInitialData?.sistemIstemi || '',
    aiSaglayiciId: localInitialData?.aiSaglayiciId || (internalProviders.find(p => p.aktifMi)?.id || internalProviders[0]?.id || ''),
    modelAdi: localInitialData?.modelAdi || (internalProviders.find(p => p.aktifMi)?.varsayilanModel || internalProviders[0]?.varsayilanModel || 'gpt-4o'),
    alternatifModeller: initialAlternatifModeller,
    sicaklik: localInitialData?.sicaklik ?? 0.7,
    maxTokens: localInitialData?.maxTokens || 2048,
    yanitSenteziModu: localInitialData?.yanitSenteziModu ?? 0,
    aktifMi: localInitialData?.aktifMi ?? true,
    sistemKaydiMi: localInitialData?.sistemKaydiMi ?? false,
    seciliAracKodlari: localInitialData?.ajanAraclari?.map(a => a.aracKodu) || internalTools.map(t => t.aracKodu),
    hizliIstekler: initialHizliIstekler
  });

  // localInitialData yüklendiğinde formData'yı senkronize et
  useEffect(() => {
    if (localInitialData) {
      let altModeller: string[] = [];
      if (Array.isArray(localInitialData.alternatifModeller)) {
        altModeller = localInitialData.alternatifModeller;
      } else if (localInitialData.alternatifModellerJson) {
        try {
          const parsed = JSON.parse(localInitialData.alternatifModellerJson);
          if (Array.isArray(parsed)) altModeller = parsed;
        } catch { }
      }

      setFormData(prev => ({
        ...prev,
        ad: localInitialData.ad ?? prev.ad,
        kod: localInitialData.kod ?? prev.kod,
        rol: localInitialData.rol ?? prev.rol,
        aciklama: localInitialData.aciklama ?? prev.aciklama,
        ikon: localInitialData.ikon ?? prev.ikon,
        renk: localInitialData.renk ?? prev.renk,
        kapsam: localInitialData.kapsam ?? prev.kapsam,
        ustAjanId: localInitialData.ustAjanId ?? prev.ustAjanId,
        aiSaglayiciId: localInitialData.aiSaglayiciId ?? prev.aiSaglayiciId,
        modelAdi: localInitialData.modelAdi ?? prev.modelAdi,
        alternatifModeller: altModeller.length > 0 ? altModeller : prev.alternatifModeller,
        sicaklik: localInitialData.sicaklik ?? prev.sicaklik,
        maxTokens: localInitialData.maxTokens ?? prev.maxTokens,
        yanitSenteziModu: localInitialData.yanitSenteziModu ?? prev.yanitSenteziModu,
        aktifMi: localInitialData.aktifMi ?? prev.aktifMi,
        sistemKaydiMi: localInitialData.sistemKaydiMi ?? prev.sistemKaydiMi,
        seciliAracKodlari: localInitialData.ajanAraclari ? localInitialData.ajanAraclari.map((a: any) => a.aracKodu) : prev.seciliAracKodlari,
        kurallar: (localInitialData.kurallar && localInitialData.kurallar.length > 0) ? localInitialData.kurallar : prev.kurallar,
        hizliIstekler: (localInitialData.hizliIstekler && localInitialData.hizliIstekler.length > 0) ? localInitialData.hizliIstekler : prev.hizliIstekler
      }));
    }
  }, [localInitialData]);

  // İlk kuralı seçili yap
  useEffect(() => {
    if (!selectedRuleId && formData.kurallar.length > 0) {
      setSelectedRuleId(formData.kurallar[0].id);
    }
  }, [formData.kurallar, selectedRuleId]);

  // Seçili Kural Nesnesi
  const activeRule = useMemo(() => {
    return formData.kurallar.find(k => k.id === selectedRuleId) || formData.kurallar[0] || null;
  }, [formData.kurallar, selectedRuleId]);

  // Base Ajan Seçenekleri
  const baseAgentOptions = useMemo(() => {
    return internalAllAgents.filter(a => a.id !== (localInitialData?.id || effectiveId));
  }, [internalAllAgents, localInitialData?.id, effectiveId]);

  // Base Ajan Değiştiğinde Kuralları Güncelle
  const handleBaseAgentChange = (e) => {
    const selectedId = e.target.value ? parseInt(e.target.value) : null;
    if (!selectedId) {
      setFormData(prev => ({
        ...prev,
        ustAjanId: null,
        kurallar: prev.kurallar.map(k => ({ ...k, durum: k.durum === 'DevreDisi' ? 'DevreDisi' : 'Yeni' }))
      }));
      return;
    }

    const selectedBase = internalAllAgents.find(a => a.id === selectedId);
    if (selectedBase && selectedBase.kurallar && selectedBase.kurallar.length > 0) {
      const inheritedRules = selectedBase.kurallar.map(k => ({
        id: k.id,
        baslik: k.baslik,
        aciklama: k.aciklama,
        icerik: k.icerik,
        sira: k.sira,
        durum: 'MirasAlindi',
        kilitliMi: k.kilitliMi,
        orijinalBaseIcerik: k.icerik
      }));

      setFormData(prev => ({
        ...prev,
        ustAjanId: selectedId,
        kapsam: selectedBase.kapsam || prev.kapsam,
        kurallar: inheritedRules,
        rol: prev.rol === 'Genel ERP Asistanı' ? selectedBase.rol : prev.rol,
        renk: selectedBase.renk || prev.renk,
        hizliIstekler: (prev.hizliIstekler && prev.hizliIstekler.length > 0)
          ? prev.hizliIstekler
          : (selectedBase.hizliIstekler ? JSON.parse(JSON.stringify(selectedBase.hizliIstekler)) : [])
      }));
      setSelectedRuleId(inheritedRules[0]?.id || null);
      toast.success(`'${selectedBase.ad}' kuralları ve kapsamı miras alındı.`);
    } else {
      setFormData(prev => ({ ...prev, ustAjanId: selectedId }));
    }
  };

  // ─── HIZLI İSTEK OPERASYONLARI ────────────────────────────────────────────────
  const handleOpenHizliIstekModal = (item: any = null, index: number | null = null) => {
    if (item) {
      setModalFormState({
        id: item.id,
        baslik: item.baslik || '',
        prompt: item.prompt || '',
        ikon: item.ikon || 'Sparkles',
        uiAksiyonu: item.uiAksiyonu || 'YOK',
        aktifMi: item.aktifMi !== false,
        sira: item.sira
      });
      setHizliIstekModal({ isOpen: true, item });
    } else {
      setModalFormState({
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        baslik: '',
        prompt: '',
        ikon: 'Sparkles',
        uiAksiyonu: 'YOK',
        aktifMi: true,
        sira: (formData.hizliIstekler?.length || 0) + 1
      });
      setHizliIstekModal({ isOpen: true, item: null });
    }
  };

  const handleSaveHizliIstekModal = () => {
    if (!modalFormState.baslik?.trim()) {
      toast.error(t('istek_baslik_zorunlu', 'Lütfen istek başlığını giriniz.'));
      return;
    }

    if (hizliIstekModal.item) {
      // Düzenleme
      setFormData(prev => ({
        ...prev,
        hizliIstekler: (prev.hizliIstekler || []).map(x =>
          x.id === modalFormState.id ? { ...x, ...modalFormState } : x
        )
      }));
      toast.success(t('istek_guncellendi', 'Hızlı istek güncellendi.'));
    } else {
      // Yeni ekleme
      setFormData(prev => ({
        ...prev,
        hizliIstekler: [...(prev.hizliIstekler || []), modalFormState]
      }));
      toast.success(t('istek_eklendi', 'Yeni hızlı istek eklendi.'));
    }

    setHizliIstekModal({ isOpen: false, item: null });
    setHizliIsteklerRefreshKey(k => k + 1);
  };

  const handleAddHizliIstek = (preset: any = null) => {
    const newItem = preset ? {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: preset.baslik || 'Yeni ERP İsteği',
      prompt: preset.prompt || '',
      ikon: preset.ikon || 'Sparkles',
      uiAksiyonu: preset.uiAksiyonu || 'YOK',
      uiParametreleriJson: '',
      sira: (formData.hizliIstekler?.length || 0) + 1,
      aktifMi: true
    } : {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: 'Yeni Hızlı ERP İsteği',
      prompt: 'Bu sayfadaki verileri incele ve...',
      ikon: 'Sparkles',
      uiAksiyonu: 'YOK',
      uiParametreleriJson: '',
      sira: (formData.hizliIstekler?.length || 0) + 1,
      aktifMi: true
    };

    setFormData(prev => ({
      ...prev,
      hizliIstekler: [...(prev.hizliIstekler || []), newItem]
    }));
    setHizliIsteklerRefreshKey(k => k + 1);
    toast.success(preset ? `'${preset.baslik}' şablonu eklendi.` : 'Hızlı ERP isteği eklendi.');
  };

  const handleDuplicateHizliIstek = (item: any) => {
    const list = [...(formData.hizliIstekler || [])];
    const idx = list.findIndex(x => x.id === item.id);
    const copy = {
      ...item,
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: `${item.baslik} (${t('kopya', 'Kopya')})`,
      sira: (list.length || 0) + 1
    };
    list.splice(idx + 1, 0, copy);
    const reordered = list.map((x, i) => ({ ...x, sira: i + 1 }));
    setFormData(prev => ({ ...prev, hizliIstekler: reordered }));
    setHizliIsteklerRefreshKey(k => k + 1);
    toast.success(t('istek_cogaltildi', 'Hızlı istek çoğaltıldı.'));
  };

  const handleUpdateHizliIstek = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      hizliIstekler: (prev.hizliIstekler || []).map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
    setHizliIsteklerRefreshKey(k => k + 1);
  };

  const handleRemoveHizliIstek = (id: string) => {
    setFormData(prev => ({
      ...prev,
      hizliIstekler: (prev.hizliIstekler || []).filter(item => item.id !== id)
    }));
    setHizliIsteklerRefreshKey(k => k + 1);
    toast.success(t('istek_kaldirildi', 'İstek kaldırıldı.'));
  };

  const handleMoveHizliIstek = (index: number, direction: 'up' | 'down') => {
    const list = [...(formData.hizliIstekler || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({ ...item, sira: idx + 1 }));
    setFormData(prev => ({ ...prev, hizliIstekler: updated }));
    setHizliIsteklerRefreshKey(k => k + 1);
  };

  // ─── KURAL OPERASYONLARI ─────────────────────────────────────────────────────
  const handleOverrideRule = (ruleId) => {
    setFormData(prev => ({
      ...prev,
      kurallar: prev.kurallar.map(k => {
        if (k.id === ruleId) {
          return {
            ...k,
            durum: 'Ezildi',
            orijinalBaseIcerik: k.orijinalBaseIcerik || k.icerik
          };
        }
        return k;
      })
    }));
    toast.success('Kural düzenleme moduna alındı (Override).');
  };

  const handleResetRule = (ruleId) => {
    setFormData(prev => ({
      ...prev,
      kurallar: prev.kurallar.map(k => {
        if (k.id === ruleId) {
          return {
            ...k,
            icerik: k.orijinalBaseIcerik || k.icerik,
            durum: 'MirasAlindi'
          };
        }
        return k;
      })
    }));
    toast.success('Kural orijinal Base içeriğine sıfırlandı.');
  };

  const handleToggleRuleStatus = (ruleId) => {
    setFormData(prev => ({
      ...prev,
      kurallar: prev.kurallar.map(k => {
        if (k.id === ruleId) {
          if (k.durum === 'DevreDisi') {
            const isModified = k.orijinalBaseIcerik && k.icerik !== k.orijinalBaseIcerik;
            return { ...k, durum: isModified ? 'Ezildi' : (k.orijinalBaseIcerik ? 'MirasAlindi' : 'Yeni') };
          } else {
            return { ...k, durum: 'DevreDisi' };
          }
        }
        return k;
      })
    }));
  };

  const handleUpdateRuleContent = (ruleId, newContent) => {
    setFormData(prev => ({
      ...prev,
      kurallar: prev.kurallar.map(k => {
        if (k.id === ruleId) {
          const isInherited = k.durum === 'MirasAlindi';
          return {
            ...k,
            icerik: newContent,
            durum: isInherited ? 'Ezildi' : (k.durum === 'DevreDisi' ? 'DevreDisi' : (k.orijinalBaseIcerik ? 'Ezildi' : 'Yeni')),
            orijinalBaseIcerik: isInherited ? (k.orijinalBaseIcerik || k.icerik) : k.orijinalBaseIcerik
          };
        }
        return k;
      })
    }));
  };

  const handleUpdateRuleTitle = (ruleId, newTitle) => {
    setFormData(prev => ({
      ...prev,
      kurallar: prev.kurallar.map(k => {
        if (k.id === ruleId) {
          const isInherited = k.durum === 'MirasAlindi';
          return {
            ...k,
            baslik: newTitle,
            durum: isInherited ? 'Ezildi' : k.durum,
            orijinalBaseIcerik: isInherited ? (k.orijinalBaseIcerik || k.icerik) : k.orijinalBaseIcerik
          };
        }
        return k;
      })
    }));
  };

  const handleAddCustomRule = () => {
    const newId = `KURAL_${Date.now()}`;
    const newRule = {
      id: newId,
      baslik: `Özel Kural ${formData.kurallar.length + 1}`,
      icerik: '',
      sira: formData.kurallar.length + 1,
      durum: 'Yeni',
      kilitliMi: false,
      orijinalBaseIcerik: null
    };

    setFormData(prev => ({
      ...prev,
      kurallar: [...prev.kurallar, newRule]
    }));
    setSelectedRuleId(newId);
    toast.success('Yeni kural maddesi eklendi.');
  };

  const handleDuplicateRule = (ruleId) => {
    const target = formData.kurallar.find(k => k.id === ruleId);
    if (!target) return;

    const newId = `KURAL_${Date.now()}`;
    const targetIndex = formData.kurallar.findIndex(k => k.id === ruleId);
    const newRule = {
      id: newId,
      baslik: `${target.baslik} (Kopya)`,
      icerik: target.icerik,
      sira: target.sira + 1,
      durum: 'Yeni',
      kilitliMi: false,
      orijinalBaseIcerik: null
    };

    const updated = [...formData.kurallar];
    updated.splice(targetIndex + 1, 0, newRule);
    const reordered = updated.map((k, idx) => ({ ...k, sira: idx + 1 }));

    setFormData(prev => ({ ...prev, kurallar: reordered }));
    setSelectedRuleId(newId);
    toast.success('Kural maddesi çoğaltıldı.');
  };

  const handleApplyPreset = (preset) => {
    const newId = `KURAL_${Date.now()}`;
    const newRule = {
      id: newId,
      baslik: preset.baslik,
      icerik: preset.icerik,
      sira: formData.kurallar.length + 1,
      durum: 'Yeni',
      kilitliMi: false,
      orijinalBaseIcerik: null
    };

    setFormData(prev => ({
      ...prev,
      kurallar: [...prev.kurallar, newRule]
    }));
    setSelectedRuleId(newId);
    setShowPresetsModal(false);
    toast.success(`'${preset.baslik}' şablonu eklendi.`);
  };

  const handleDeleteRule = (ruleId) => {
    const remaining = formData.kurallar.filter(k => k.id !== ruleId);
    setFormData(prev => ({
      ...prev,
      kurallar: remaining.map((k, idx) => ({ ...k, sira: idx + 1 }))
    }));
    if (selectedRuleId === ruleId) {
      setSelectedRuleId(remaining[0]?.id || null);
    }
    toast.success('Kural maddesi silindi.');
  };

  const handleMoveRule = (index, direction, e) => {
    if (e) e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.kurallar.length) return;

    const list = [...formData.kurallar];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reordered = list.map((k, idx) => ({ ...k, sira: idx + 1 }));
    setFormData(prev => ({ ...prev, kurallar: reordered }));
  };

  // MCP Araçları Filtreleme & Arama
  const [toolSearch, setToolSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [toolScopeFilter, setToolScopeFilter] = useState('ALL');
  const [expandedSchemaTool, setExpandedSchemaTool] = useState(null);

  const { erpToolsCount, adminToolsCount } = useMemo(() => {
    let erp = 0;
    let admin = 0;
    internalTools.forEach(t => {
      if (t.kapsam === 2 || t.aracKodu?.toLowerCase().startsWith('admin_')) admin++;
      else erp++;
    });
    return { erpToolsCount: erp, adminToolsCount: admin };
  }, [internalTools]);

  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    internalTools.forEach(t => {
      if (t.kategoriAdi) set.add(t.kategoriAdi);
    });
    return ['Tümü', ...Array.from(set)];
  }, [internalTools]);

  const filteredTools = useMemo(() => {
    return internalTools.filter(tool => {
      const isToolAdmin = tool.kapsam === 2 || tool.aracKodu?.toLowerCase().startsWith('admin_');
      const isToolErp = !isToolAdmin;

      const matchScope =
        toolScopeFilter === 'ALL' ||
        (toolScopeFilter === 'ERP' && isToolErp) ||
        (toolScopeFilter === 'ADMIN' && isToolAdmin);

      const matchCat = selectedCategory === 'Tümü' || tool.kategoriAdi === selectedCategory;
      const searchLower = toolSearch.toLowerCase().trim();
      const matchSearch = !searchLower ||
        tool.aracAdi?.toLowerCase().includes(searchLower) ||
        tool.aracKodu?.toLowerCase().includes(searchLower) ||
        tool.aciklama?.toLowerCase().includes(searchLower);
      return matchScope && matchCat && matchSearch;
    });
  }, [internalTools, toolScopeFilter, selectedCategory, toolSearch]);

  const handleToggleTool = (aracKodu) => {
    setFormData(prev => {
      const isSelected = prev.seciliAracKodlari.some(k => k.toLowerCase() === aracKodu.toLowerCase());
      return {
        ...prev,
        seciliAracKodlari: isSelected
          ? prev.seciliAracKodlari.filter(k => k.toLowerCase() !== aracKodu.toLowerCase())
          : [...prev.seciliAracKodlari, aracKodu]
      };
    });
  };

  const handleSelectAllTools = () => {
    const targetCodes = filteredTools.map(t => t.aracKodu);
    setFormData(prev => ({
      ...prev,
      seciliAracKodlari: Array.from(new Set([...prev.seciliAracKodlari, ...targetCodes]))
    }));
    toast.success(`${targetCodes.length} adet MCP aracı yetkilendirildi`);
  };

  const handleClearAllTools = () => {
    setFormData(prev => ({
      ...prev,
      seciliAracKodlari: []
    }));
    toast.success('MCP araç seçimleri temizlendi');
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.ad?.trim() || !formData.kod?.trim()) {
      toast.error('Lütfen ajan adı ve benzersiz kodunu giriniz.');
      setActiveTabId('genel');
      return;
    }

    try {
      if (setIsSaving) setIsSaving(true);
      let agentId;

      const payload = {
        ...formData,
        kapsam: parseInt(formData.kapsam, 10) || 1,
        aiSaglayiciId: formData.aiSaglayiciId ? parseInt(formData.aiSaglayiciId, 10) : null,
        sicaklik: parseFloat(formData.sicaklik) || 0.7,
        maxTokens: parseInt(formData.maxTokens, 10) || 2048,
        yanitSenteziModu: parseInt(formData.yanitSenteziModu as any, 10) || 0,
        sistemIstemi: compilePromptPreview(formData.kurallar)
      };

      if (effectiveId || localInitialData?.id) {
        const targetId = effectiveId || localInitialData.id;
        await axios.put(`/api/AiAjanlar/${targetId}`, payload);
        agentId = targetId;
        toast.success(t('auto_ajan_guncellendi', 'Ajan başarıyla güncellendi'));
      } else {
        const res = await axios.post('/api/AiAjanlar', payload);
        agentId = res.data.id;
        toast.success(t('auto_ajan_olusturuldu', 'Yeni ajan oluşturuldu'));
      }

      if (formData.seciliAracKodlari && Array.isArray(formData.seciliAracKodlari)) {
        await axios.post(`/api/AiAraclar/ajan/${agentId}/araclar`, formData.seciliAracKodlari);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        handleClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.mesaj || error.message || t('auto_kayit_hata', 'Kayıt sırasında hata oluştu'));
    } finally {
      setIsSaving(false);
    }
  };

  const [localProviders, setLocalProviders] = useState<any[]>(internalProviders);
  useEffect(() => {
    if (internalProviders && internalProviders.length > 0) {
      setLocalProviders(internalProviders);
    }
  }, [internalProviders]);

  const selectedProvider = localProviders.find(p => p.id === parseInt(formData.aiSaglayiciId));
  const selectedCount = formData.seciliAracKodlari.length;

  // Seçili sağlayıcının model listesi boşsa arka planda canlı modelleri çek ve senkronize et
  useEffect(() => {
    const prov = selectedProvider;
    if (!prov?.id) return;
    const hasModels = Array.isArray(prov.desteklenenModeller) && prov.desteklenenModeller.length > 0;
    const isLocal = Boolean(prov.baseUrl && (prov.baseUrl.includes('localhost') || prov.baseUrl.includes('127.0.0.1')));
    const canFetch = Boolean(prov.apiKeyTanimliMi || prov.saglayiciTuru === 4 || isLocal);

    if (!hasModels && canFetch) {
      axios.post(`/api/AiSaglayicilar/${prov.id}/fetch-models`)
        .then(res => {
          const fetched: string[] = Array.isArray(res.data) ? res.data : [];
          if (fetched.length > 0) {
            const defaultMod = (prov.varsayilanModel && fetched.includes(prov.varsayilanModel))
              ? prov.varsayilanModel
              : fetched[0];
            setLocalProviders(prev => prev.map(p => p.id === prov.id ? {
              ...p,
              desteklenenModeller: fetched,
              varsayilanModel: defaultMod
            } : p));
            setFormData(prev => {
              const currentValid = prev.modelAdi && fetched.includes(prev.modelAdi);
              return {
                ...prev,
                modelAdi: currentValid ? prev.modelAdi : defaultMod
              };
            });
          }
        })
        .catch(() => { });
    }
  }, [selectedProvider?.id]);

  // ─── MODEL YAPILANDIRMASI & YÖNETİMİ ─────────────────────────────────────────
  const parseModelsFromData = useCallback((data: any, providers: any[]): AiModelConfig[] => {
    const list: AiModelConfig[] = [];

    // 1. Birincil Model
    if (data?.modelAdi) {
      const prov = providers.find(p => p.id === Number(data.aiSaglayiciId)) ||
        providers.find(p => p.desteklenenModeller?.some((m: string) => m.toLowerCase() === data.modelAdi.toLowerCase()));
      list.push({
        id: `primary-${data.modelAdi}`,
        modelAdi: data.modelAdi,
        aiSaglayiciId: data.aiSaglayiciId ? Number(data.aiSaglayiciId) : (prov?.id || null),
        saglayiciAdi: prov?.ad || '',
        sicaklik: typeof data.sicaklik === 'number' ? data.sicaklik : 0.7,
        maxTokens: data.maxTokens ? Number(data.maxTokens) : 2048
      });
    }

    // 2. Alternatif Modeller
    let altList: any[] = [];
    if (data?.alternatifModellerJson) {
      try {
        const parsed = JSON.parse(data.alternatifModellerJson);
        if (Array.isArray(parsed)) altList = parsed;
      } catch { }
    }
    if (altList.length === 0 && Array.isArray(data?.alternatifModeller)) {
      altList = data.alternatifModeller;
    }

    for (const alt of altList) {
      if (typeof alt === 'string' && alt.trim()) {
        const trimmed = alt.trim();
        if (!list.some(m => m.modelAdi.toLowerCase() === trimmed.toLowerCase())) {
          const prov = providers.find(p => p.desteklenenModeller?.some((m: string) => m.toLowerCase() === trimmed.toLowerCase())) ||
            providers.find(p => p.varsayilanModel?.toLowerCase() === trimmed.toLowerCase());
          list.push({
            id: `alt-${trimmed}`,
            modelAdi: trimmed,
            aiSaglayiciId: prov?.id || null,
            saglayiciAdi: prov?.ad || '',
            sicaklik: typeof data?.sicaklik === 'number' ? data.sicaklik : 0.7,
            maxTokens: data?.maxTokens ? Number(data.maxTokens) : 2048
          });
        }
      } else if (alt && typeof alt === 'object' && alt.modelAdi) {
        if (!list.some(m => m.modelAdi.toLowerCase() === alt.modelAdi.toLowerCase())) {
          const prov = providers.find(p => p.id === Number(alt.aiSaglayiciId)) ||
            providers.find(p => p.desteklenenModeller?.some((m: string) => m.toLowerCase() === alt.modelAdi.toLowerCase()));
          list.push({
            id: alt.id || `alt-${alt.modelAdi}`,
            modelAdi: alt.modelAdi,
            aiSaglayiciId: alt.aiSaglayiciId ? Number(alt.aiSaglayiciId) : (prov?.id || null),
            saglayiciAdi: alt.saglayiciAdi || prov?.ad || '',
            sicaklik: typeof alt.sicaklik === 'number' ? alt.sicaklik : 0.7,
            maxTokens: alt.maxTokens ? Number(alt.maxTokens) : 2048
          });
        }
      }
    }

    return list;
  }, []);

  const [configuredModels, setConfiguredModels] = useState<AiModelConfig[]>(() => {
    return parseModelsFromData(localInitialData || formData, internalProviders);
  });

  // localInitialData yüklendiğinde modelleri senkronize et
  useEffect(() => {
    if (localInitialData) {
      const parsed = parseModelsFromData(localInitialData, localProviders);
      if (parsed.length > 0) {
        setConfiguredModels(parsed);
      }
    }
  }, [localInitialData, localProviders, parseModelsFromData]);

  // Modeller değiştikçe formData ile senkronize et
  const syncModelsToFormData = useCallback((newModels: AiModelConfig[]) => {
    setConfiguredModels(newModels);
    if (newModels.length > 0) {
      const primary = newModels[0];
      const altModels = newModels.slice(1);
      setFormData(prev => ({
        ...prev,
        aiSaglayiciId: primary.aiSaglayiciId,
        modelAdi: primary.modelAdi,
        sicaklik: primary.sicaklik,
        maxTokens: primary.maxTokens,
        alternatifModeller: altModels.map(m => m.modelAdi),
        alternatifModellerJson: JSON.stringify(altModels)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        aiSaglayiciId: null,
        modelAdi: '',
        alternatifModeller: [],
        alternatifModellerJson: '[]'
      }));
    }
  }, []);

  // AiModelSelection modal state
  const [modelModalState, setModelModalState] = useState<{
    isOpen: boolean;
    item: AiModelConfig | null;
    editIndex: number | null;
  }>({
    isOpen: false,
    item: null,
    editIndex: null
  });

  const handleOpenAddModel = () => {
    setModelModalState({
      isOpen: true,
      item: null,
      editIndex: null
    });
  };

  const handleOpenEditModel = (item: AiModelConfig, index: number) => {
    setModelModalState({
      isOpen: true,
      item,
      editIndex: index
    });
  };

  const handleSaveModel = (config: AiModelConfig) => {
    if (modelModalState.editIndex !== null && modelModalState.editIndex >= 0) {
      const updated = [...configuredModels];
      updated[modelModalState.editIndex] = config;
      syncModelsToFormData(updated);
      toast.success(t('model_guncellendi', `'${config.modelAdi}' modeli güncellendi.`));
    } else {
      const updated = [...configuredModels, config];
      syncModelsToFormData(updated);
      toast.success(t('model_eklendi', `'${config.modelAdi}' listeye eklendi.`));
    }
    setModelModalState({ isOpen: false, item: null, editIndex: null });
  };

  const handleDeleteModel = (index: number) => {
    const target = configuredModels[index];
    const updated = configuredModels.filter((_, i) => i !== index);
    syncModelsToFormData(updated);
    toast.success(t('model_silindi', `'${target?.modelAdi || ''}' kaldırıldı.`));
  };

  // Model DataTable Kolonları
  const modelTableColumns: Column<AiModelConfig>[] = useMemo(() => [
    {
      id: 'modelAdi',
      header: t('model_adi', 'Model Adı'),
      accessor: 'modelAdi',
      render: (item: AiModelConfig, index: number) => {
        const isPrimary = index === 0;
        return (
          <div className="flex-row items-center gap-10">
            <div className={`p-8 rounded flex-center ${isPrimary ? 'bg-primary-subtle text-primary' : 'bg-surface text-secondary'}`}>
              <Cpu size={16} />
            </div>
            <div className="flex-col">
              <div className="flex-row items-center gap-8">
                <span className="font-semibold text-primary text-sm">{item.modelAdi}</span>
                {isPrimary ? (
                  <span className="chip-primary text-xs font-bold flex-row items-center gap-4">
                    <Sparkles size={12} />
                    <span>{t('birincil_aktif_model', 'Birincil (Aktif)')}</span>
                  </span>
                ) : (
                  <span className="badge badge-secondary text-xs">
                    {t('yedek_alternatif_sira', 'Alternatif #{{sira}}', { sira: index })}
                  </span>
                )}
              </div>
              <span className="text-xs text-secondary">
                {isPrimary
                  ? t('birincil_model_aciklama', 'İstekler ilk olarak bu modele yönlendirilir')
                  : t('alternatif_model_aciklama', 'Birincil modele ulaşılamazsa fallback olarak kullanılır')}
              </span>
            </div>
          </div>
        );
      }
    },
    {
      id: 'saglayiciAdi',
      header: t('llm_saglayicisi', 'Sağlayıcı'),
      accessor: 'saglayiciAdi',
      render: (item: AiModelConfig) => (
        <div className="flex-row items-center gap-6">
          <Bot size={14} className="text-secondary" />
          <span className="chip-primary text-xs font-semibold">
            {item.saglayiciAdi || t('belirtilmemis', 'Belirtilmemiş')}
          </span>
        </div>
      )
    },
    {
      id: 'sicaklik',
      header: t('sicaklik', 'Sıcaklık (Creativity)'),
      accessor: 'sicaklik',
      render: (item: AiModelConfig) => {
        const val = typeof item.sicaklik === 'number' ? item.sicaklik : 0.7;
        const category = val <= 0.2
          ? { text: t('deterministik', 'Deterministik'), badgeClass: 'badge-info' }
          : val <= 0.7
            ? { text: t('dengeli', 'Dengeli'), badgeClass: 'badge-success' }
            : { text: t('yaratici', 'Yaratıcı'), badgeClass: 'badge-warning' };
        return (
          <div className="flex-row items-center gap-8">
            <span className="font-bold text-primary text-sm">{val.toFixed(2)}</span>
            <span className={`badge ${category.badgeClass} text-xs font-semibold`}>
              {category.text}
            </span>
          </div>
        );
      }
    },
    {
      id: 'maxTokens',
      header: t('max_tokens_label', 'Maksimum Token'),
      accessor: 'maxTokens',
      render: (item: AiModelConfig) => (
        <span className="font-semibold text-secondary text-sm">
          {(item.maxTokens || 2048).toLocaleString()}
        </span>
      )
    },
    {
      id: 'actions',
      header: t('islemler', 'İşlemler'),
      align: 'right',
      render: (item: AiModelConfig, index: number) => (
        <div className="flex-row items-center justify-end gap-6">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenEditModel(item, index)}
            title={t('duzenle', 'Düzenle')}
          >
            <Edit2 size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm text-danger"
            onClick={() => handleDeleteModel(index)}
            title={t('kaldir', 'Kaldır')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ], [configuredModels, t]);

  // Filtrelenmiş Kurallar (Sol Liste İçin)
  const filteredRules = useMemo(() => {
    if (ruleFilter === 'Tümü') return formData.kurallar;
    return formData.kurallar.filter(r => r.durum === ruleFilter);
  }, [formData.kurallar, ruleFilter]);

  // İstatistikler
  const inheritedCount = formData.kurallar.filter(r => r.durum === 'MirasAlindi').length;
  const overriddenCount = formData.kurallar.filter(r => r.durum === 'Ezildi').length;
  const customCount = formData.kurallar.filter(r => r.durum === 'Yeni').length;

  // ─── HIZLI İSTEKLER TABLO KOLONLARI (BaseListPage Standardı) ─────────────────
  const hizliIstekColumns = useMemo(() => [
    {
      id: 'sira',
      header: '#',
      accessorKey: 'sira',
      size: 50,
      cell: (info: any) => {
        const idx = info.row ? info.row.index : 0;
        return (
          <span style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '800'
          }}>
            #{idx + 1}
          </span>
        );
      }
    },
    {
      id: 'baslik',
      header: t('hizli_istek_kolon_baslik', 'İstek Başlığı'),
      accessorKey: 'baslik',
      cell: (info: any) => {
        const item = info.row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(234, 179, 8, 0.12)',
              color: '#eab308',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {getHizliIstekIcon(item.ikon)}
            </div>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>
              {item.baslik || '-'}
            </span>
          </div>
        );
      }
    },
    {
      id: 'uiAksiyonu',
      header: t('hizli_istek_kolon_aksiyon', 'UI Aksiyonu'),
      accessorKey: 'uiAksiyonu',
      cell: (info: any) => {
        const item = info.row.original;
        const opt = UI_ACTION_OPTIONS.find(o => o.value === item.uiAksiyonu) || UI_ACTION_OPTIONS[0];
        return (
          <span style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            background: `${opt.color}15`,
            color: opt.color,
            border: `1px solid ${opt.color}35`,
            whiteSpace: 'nowrap'
          }}>
            {opt.badge}
          </span>
        );
      }
    },
    {
      id: 'prompt',
      header: t('hizli_istek_kolon_prompt', 'Prompt Şablonu'),
      accessorKey: 'prompt',
      cell: (info: any) => {
        const prompt = info.getValue() || '';
        return (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }} title={prompt}>
            {prompt.length > 70 ? `${prompt.substring(0, 70)}...` : prompt}
          </span>
        );
      }
    },
    {
      id: 'aktifMi',
      header: t('durum', 'Durum'),
      accessorKey: 'aktifMi',
      size: 90,
      cell: (info: any) => {
        const item = info.row.original;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
            <BaseSwitch
              checked={item.aktifMi !== false}
              onChange={(val) => {
                handleUpdateHizliIstek(item.id, 'aktifMi', val);
              }}
            />
            <span style={{ fontSize: '11px', color: item.aktifMi !== false ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '600' }}>
              {item.aktifMi !== false ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
            </span>
          </div>
        );
      }
    }
  ], [t]);

  const getHizliIstekRowActions = (item: any): ActionMenuItem[] => {
    const list = formData.hizliIstekler || [];
    const idx = list.findIndex(x => x.id === item.id);
    const isFirst = idx === 0;
    const isLast = idx === list.length - 1;

    return [
      {
        label: t('duzenle', 'Düzenle'),
        icon: <Edit2 size={14} />,
        onClick: () => handleOpenHizliIstekModal(item, idx)
      },
      {
        label: t('yukari_tasi', 'Yukarı Taşı'),
        icon: <ArrowUp size={14} />,
        disabled: isFirst,
        onClick: () => handleMoveHizliIstek(idx, 'up')
      },
      {
        label: t('asagi_tasi', 'Aşağı Taşı'),
        icon: <ArrowDown size={14} />,
        disabled: isLast,
        onClick: () => handleMoveHizliIstek(idx, 'down')
      },
      {
        label: t('cogalt', 'Çoğalt'),
        icon: <Copy size={14} />,
        onClick: () => handleDuplicateHizliIstek(item)
      },
      {
        label: t('sil', 'Sil'),
        icon: <Trash2 size={14} color="var(--danger, #ef4444)" />,
        variant: 'danger',
        dividerAbove: true,
        onClick: () => {
          showAlert(
            'confirm',
            t('istek_sil_onay_baslik', 'Hızlı İsteği Sil'),
            t('istek_sil_onay_mesaj', `'${item.baslik}' isteğini kaldırmak istediğinize emin misiniz?`),
            () => handleRemoveHizliIstek(item.id),
            t('sil', 'Sil'),
            t('auto_vazgec', 'Vazgeç')
          );
        }
      }
    ];
  };

  // ─── SEKME TANIMLARI (BaseTabItem[]) ──────────────────────────────────────────
  const tabs = [
    {
      id: 'genel',
      label: 'Genel Bilgiler',
      icon: <Bot size={16} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 4px' }}>
          {/* Miras Alınan Base Ajan (Eğer sistem ajanı değilse) */}
          {!formData.sistemKaydiMi && (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  <GitBranch size={16} color="var(--accent-primary)" />
                  Miras Alınan Base (Temel) Ajan
                </label>
                {formData.ustAjanId && (
                  <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: '600' }}>
                    ✓ Base kuralları miras alındı
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  value={formData.ustAjanId || ''}
                  onChange={handleBaseAgentChange}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}
                >
                  <option value="">(Bağımsız / Kök Ajan - Miras Yok)</option>
                  {baseAgentOptions.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.sistemKaydiMi ? `👑 ${agent.ad} (Sistem Base Ajanı)` : `🌿 ${agent.ad}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Bir Base ajan seçildiğinde, onun çekirdek kuralları otomatik yüklenir. "Sistem Kuralları" sekmesinde maddeleri tek tek inceleyip dilediğinizi ezebilirsiniz (Override).
              </div>
            </div>
          )}

          {/* Ajan Kapsamı (ERP / Admin) - Modern Segmented Control */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                <ShieldAlert size={15} color="var(--accent-primary)" />
                {t('ajan_kapsami_baslik', 'Ajan Çalışma Kapsamı & Yetki Alanı')} *
              </label>
              <span style={{
                fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '12px',
                background: formData.kapsam === 2 ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: formData.kapsam === 2 ? '#a855f7' : '#3b82f6',
                border: `1px solid ${formData.kapsam === 2 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
              }}>
                {formData.kapsam === 2 ? t('kapsam_admin_badge', '🛡️ Admin Paneli') : t('kapsam_erp_badge', '🏢 ERP Kullanıcıları')}
              </span>
            </div>

            <div style={{
              display: 'flex',
              background: 'var(--bg-secondary)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid var(--glass-border)',
              gap: '6px'
            }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, kapsam: 1 })}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: formData.kapsam === 1 ? 'var(--accent-primary)' : 'transparent',
                  color: formData.kapsam === 1 ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: formData.kapsam === 1 ? '0 2px 6px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <span>🏢</span>
                <span>{t('kapsam_erp_btn', 'ERP & Şirket Kullanıcıları')}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, kapsam: 2 })}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: formData.kapsam === 2 ? '#8b5cf6' : 'transparent',
                  color: formData.kapsam === 2 ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: formData.kapsam === 2 ? '0 2px 6px rgba(139, 92, 246, 0.35)' : 'none'
                }}
              >
                <span>🛡️</span>
                <span>{t('kapsam_admin_btn', 'Sistem Yönetimi & Admin')}</span>
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {formData.kapsam === 2
                ? t('kapsam_admin_hint', 'Bu ajan yalnızca Admin paneli süper adminlerine özeldir; ERP kullanıcı ekranlarına kapatılır.')
                : t('kapsam_erp_hint', 'Bu ajan ERP web uygulamasındaki şirket kullanıcıları ve yetkili personeller tarafından kullanılır.')}
            </span>
          </div>

          {/* Ajan Adı & Kodu */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                {t('ajan_adi_label', 'Ajan Adı')} *
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.ad}
                onChange={e => setFormData({ ...formData, ad: e.target.value })}
                placeholder={t('ajan_adi_placeholder', 'Örn: ERP Stok & Fiyat Asistanı')}
                required
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                {t('ajan_kodu_label', 'Ajan Kodu (Benzersiz)')} *
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.kod}
                onChange={e => setFormData({ ...formData, kod: e.target.value })}
                placeholder={t('ajan_kodu_placeholder', 'Örn: STOK_ASISTANI')}
                required
              />
            </div>
          </div>

          {/* Rol / Görev Ünvanı & Ajan Açıklaması */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                {t('ajan_rol_label', 'Rol / Görev Ünvanı')}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.rol}
                onChange={e => setFormData({ ...formData, rol: e.target.value })}
                placeholder={t('ajan_rol_placeholder', 'Örn: Envanter ve Depo Uzmanı')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>
                {t('ajan_aciklama_label', 'Ajan Açıklaması')}
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.aciklama}
                onChange={e => setFormData({ ...formData, aciklama: e.target.value })}
                placeholder={t('ajan_aciklama_placeholder', 'Örn: Stok kartları, fiyat listeleri ve depo hareketlerini yönetir.')}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'model',
      label: t('model_ve_parametreler_sekme', 'Model & Parametreler'),
      icon: <Cpu size={16} />,
      content: (
        <div className="ai-model-tab-layer" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Akıllı Yanıt Sentezi & Token Politikası */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {t('ai_yanit_sentezi_politikasi', 'Akıllı Yanıt Sentezi & Token Politikası')}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {t('ai_yanit_sentezi_aciklama', 'Araç ve validasyon çıktılarının LLM tarafından insansı yorumlanması')}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
              {[
                { value: 0, label: t('yanit_sentezi_sistem', '🌐 Sistem Ayarını Kullan'), desc: t('yanit_sentezi_sistem_desc', 'Genel sistem ayarını miras alır') },
                { value: 1, label: t('yanit_sentezi_acik', '✨ Zorunlu Açık (LLM Sentezi)'), desc: t('yanit_sentezi_acik_desc', 'Araç sonuçlarını daima LLM doğal dille sentezler (+1 tur token)') },
                { value: 2, label: t('yanit_sentezi_kapali', '⚡ Zorunlu Kapalı (Hızlı Mod)'), desc: t('yanit_sentezi_kapali_desc', 'Token tasarrufu, doğrudan teknik araç çıktısını döner') }
              ].map(opt => (
                <label
                  key={opt.value}
                  style={{
                    flex: '1 1 240px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: `1px solid ${formData.yanitSenteziModu === opt.value ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
                    background: formData.yanitSenteziModu === opt.value ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <input
                    type="radio"
                    name="yanitSenteziModu"
                    value={opt.value}
                    checked={formData.yanitSenteziModu === opt.value}
                    onChange={() => setFormData(prev => ({ ...prev, yanitSenteziModu: opt.value }))}
                    style={{ marginTop: '2px', accentColor: 'var(--accent-primary)' }}
                  />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="table-responsive rounded border border-glass">
            <DataTable
              data={configuredModels}
              columns={modelTableColumns}
              keyExtractor={(item) => item.id || item.modelAdi}
              enableRowReorder={true}
              showRowIndex={true}
              showRowOrderButtons={true}
              onRowReorder={(newData) => syncModelsToFormData(newData)}
              emptyMessage={t('tanimli_model_yok', 'Tanımlı model bulunmuyor.')}
            />
          </div>

          {/* Dairesel Yüzen Ekle Butonu (Circular Float Add Button) */}
          <EkleFloatCircleButton
            onClick={handleOpenAddModel}
            position="absolute-bottom-right"
            title={t('model_ekle', 'Model Ekle')}
          />
        </div>
      )
    },
    {
      id: 'istem',
      label: `Sistem Kuralları (${formData.kurallar.length})`,
      icon: <SlidersHorizontal size={16} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '520px', position: 'relative' }}>
          {/* Üst İstatistik ve Görünüm Çubuğu */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-primary)',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid var(--glass-border)',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)' }}>Maddeler:</span>
              <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', fontWeight: '700' }}>
                {formData.kurallar.length} Toplam
              </span>
              {inheritedCount > 0 && (
                <span style={{ fontSize: '10.5px', padding: '1px 7px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: '600' }}>
                  {inheritedCount} Miras
                </span>
              )}
              {overriddenCount > 0 && (
                <span style={{ fontSize: '10.5px', padding: '1px 7px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: '600' }}>
                  {overriddenCount} Ezildi
                </span>
              )}
              {customCount > 0 && (
                <span style={{ fontSize: '10.5px', padding: '1px 7px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontWeight: '600' }}>
                  {customCount} Özel
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowPresetsModal(!showPresetsModal)}
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
                title="Sık kullanılan ERP kural şablonlarını listeler"
              >
                <BookOpen size={13} color="var(--accent-primary)" /> Hazır Şablonlar
              </button>
              <button
                type="button"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="btn btn-secondary"
                style={{ fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px' }}
              >
                <Eye size={13} /> {showPromptPreview ? 'Madde Editörüne Dön' : 'Derlenmiş Promptu Gör'}
              </button>
              <button
                type="button"
                onClick={handleAddCustomRule}
                className="btn btn-primary"
                style={{ fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 12px' }}
              >
                <Plus size={13} /> Yeni Madde
              </button>
            </div>
          </div>

          {/* Hazır ERP Şablon Seçici Popover / Panel */}
          {showPresetsModal && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '12px',
              left: '12px',
              zIndex: 30,
              background: 'var(--bg-secondary)',
              border: '2px solid var(--accent-primary)',
              borderRadius: '12px',
              padding: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                  <Sparkles size={16} color="var(--accent-primary)" />
                  Hazır ERP Kural Şablonları (Tek Tıkla Ekle)
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresetsModal(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                {ERP_RULE_PRESETS.map((preset, pIdx) => (
                  <div
                    key={pIdx}
                    onClick={() => handleApplyPreset(preset)}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-primary)' }}>{preset.baslik}</span>
                      <span style={{ fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: '700' }}>+ Ekle</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{preset.aciklama}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Derlenmiş Prompt Önizleme Görünümü */}
          {showPromptPreview ? (
            <div style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              overflow: 'hidden'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="var(--accent-primary)" />
                  Modele Gönderilecek Derlenmiş Sistem İstemi (Compiled System Prompt):
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {compilePromptPreview(formData.kurallar).length} Karakter • ~{Math.round(compilePromptPreview(formData.kurallar).length / 4)} Token
                </span>
              </div>
              <pre style={{
                flex: 1,
                background: 'var(--bg-primary)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-primary)',
                fontFamily: 'ui-monospace, monospace',
                fontSize: '12px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
                margin: 0
              }}>
                {compilePromptPreview(formData.kurallar) || '(Henüz aktif kural tanımlanmadı)'}
              </pre>
            </div>
          ) : (
            /* Master-Detail (Sol Liste + Sağ Geniş Editör) Mimarisi */
            <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: '14px', flex: 1, minHeight: 0 }}>
              {/* SOL PANEL: Madde Gezgini & Listesi */}
              <div style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Sol Filtre Çipleri */}
                <div style={{
                  display: 'flex',
                  gap: '4px',
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--glass-border)',
                  background: 'var(--bg-secondary)'
                }}>
                  {['Tümü', 'MirasAlindi', 'Ezildi', 'Yeni'].map(fil => (
                    <button
                      key={fil}
                      type="button"
                      onClick={() => setRuleFilter(fil)}
                      style={{
                        flex: 1,
                        fontSize: '10.5px',
                        padding: '3px 0',
                        borderRadius: '6px',
                        border: 'none',
                        background: ruleFilter === fil ? 'var(--accent-primary)' : 'transparent',
                        color: ruleFilter === fil ? '#fff' : 'var(--text-secondary)',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {fil === 'Tümü' ? 'Tümü' : fil === 'MirasAlindi' ? 'Base' : fil === 'Ezildi' ? 'Ezilen' : 'Özel'}
                    </button>
                  ))}
                </div>

                {/* Maddeler Listesi */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredRules.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Kural bulunamadı.
                    </div>
                  ) : (
                    filteredRules.map((rule, index) => {
                      const isSelected = activeRule?.id === rule.id;
                      const isInherited = rule.durum === 'MirasAlindi';
                      const isOverridden = rule.durum === 'Ezildi';
                      const isCustom = rule.durum === 'Yeni';
                      const isDisabled = rule.durum === 'DevreDisi';

                      return (
                        <div
                          key={rule.id || index}
                          onClick={() => setSelectedRuleId(rule.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'transparent'}`,
                            background: isSelected
                              ? 'rgba(99, 102, 241, 0.12)'
                              : isDisabled
                                ? 'rgba(0,0,0,0.04)'
                                : 'var(--bg-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            opacity: isDisabled ? 0.5 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                background: isSelected ? 'var(--accent-primary)' : 'var(--bg-primary)',
                                color: isSelected ? '#fff' : 'var(--text-secondary)'
                              }}>
                                #{rule.sira || index + 1}
                              </span>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: isSelected ? '700' : '600',
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {rule.baslik || 'Başlıksız Madde'}
                              </span>
                            </div>

                            {/* Sıra Değiştirme Butonları */}
                            <div style={{ display: 'flex', gap: '2px', opacity: isSelected ? 1 : 0.4 }}>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={(e) => handleMoveRule(index, 'up', e)}
                                style={{ background: 'none', border: 'none', padding: '1px', cursor: index === 0 ? 'default' : 'pointer', color: 'var(--text-primary)' }}
                                title="Yukarı Taşı"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                disabled={index === formData.kurallar.length - 1}
                                onClick={(e) => handleMoveRule(index, 'down', e)}
                                style={{ background: 'none', border: 'none', padding: '1px', cursor: index === formData.kurallar.length - 1 ? 'default' : 'pointer', color: 'var(--text-primary)' }}
                                title="Aşağı Taşı"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                              {rule.icerik ? rule.icerik.substring(0, 35) + '...' : '(İçerik boş)'}
                            </span>

                            {isInherited && <span style={{ color: '#3b82f6', fontWeight: '700' }}>🔹 Base</span>}
                            {isOverridden && <span style={{ color: 'var(--success)', fontWeight: '700' }}>⚡ Override</span>}
                            {isCustom && <span style={{ color: '#ec4899', fontWeight: '700' }}>➕ Özel</span>}
                            {isDisabled && <span style={{ color: 'var(--text-secondary)', fontWeight: '700' }}>⏸️ Pasif</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SAĞ PANEL: Seçili Madde Editörü */}
              {activeRule ? (
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* Editör Üst Başlığı & Kontroller */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-primary)',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--glass-border)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {/* Düzenlenebilir Kural Başlığı & Rozet */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                      <input
                        type="text"
                        value={activeRule.baslik || ''}
                        onChange={e => handleUpdateRuleTitle(activeRule.id, e.target.value)}
                        placeholder="Kural Başlığı (Örn: İskonto Politikası)..."
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--text-primary)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          outline: 'none',
                          flex: 1,
                          maxWidth: '260px'
                        }}
                      />

                      <code style={{ fontSize: '10.5px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                        [{activeRule.id}]
                      </code>

                      {/* Durum Rozeti */}
                      {activeRule.durum === 'MirasAlindi' && (
                        <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          🔹 Base Kural (Miras Alındı)
                        </span>
                      )}
                      {activeRule.durum === 'Ezildi' && (
                        <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          ⚡ Özelleştirildi (Override)
                        </span>
                      )}
                      {activeRule.durum === 'Yeni' && (
                        <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
                          ➕ Yerel / Özel Kural
                        </span>
                      )}
                      {activeRule.durum === 'DevreDisi' && (
                        <span style={{ fontSize: '10.5px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: 'rgba(107, 114, 128, 0.12)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}>
                          ⏸️ Devre Dışı (Modele Gönderilmez)
                        </span>
                      )}
                    </div>

                    {/* Aksiyon Butonları */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {activeRule.durum === 'MirasAlindi' && (
                        <button
                          type="button"
                          onClick={() => handleOverrideRule(activeRule.id)}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Bu kuralı düzenleme moduna alır"
                        >
                          <Zap size={12} /> Kuralı Ez (Override)
                        </button>
                      )}

                      {activeRule.durum === 'Ezildi' && (
                        <button
                          type="button"
                          onClick={() => handleResetRule(activeRule.id)}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}
                          title="Kuralı Base ajandaki orijinal metnine döndürür"
                        >
                          <RotateCcw size={12} /> Base'e Sıfırla
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDuplicateRule(activeRule.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Bu kural maddesinin bir kopyasını oluşturur"
                      >
                        <Copy size={12} /> Çoğalt
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRule(activeRule.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                        title="Bu kural maddesini siler"
                      >
                        <Trash2 size={12} /> Sil
                      </button>

                      {/* Etkin / Devre Dışı Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleRuleStatus(activeRule.id)}
                        style={{
                          fontSize: '11px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: activeRule.durum === 'DevreDisi' ? 'var(--bg-secondary)' : 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid var(--glass-border)',
                          color: activeRule.durum === 'DevreDisi' ? 'var(--text-secondary)' : 'var(--success)',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {activeRule.durum === 'DevreDisi' ? 'Etkinleştir' : 'Devre Dışı'}
                      </button>
                    </div>
                  </div>

                  {/* Editör Metin Alanı */}
                  <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                    {/* Miras Alınmış Kural Bilgi Çubuğu */}
                    {activeRule.durum === 'MirasAlindi' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>
                        <Info size={13} color="#3b82f6" />
                        <span>Bu kural Base ajandan miras alınmıştır. Aşağıdaki metni düzenlemeye başladığınızda kural otomatik olarak bu ajana özel (Override) kaydedilecektir.</span>
                      </div>
                    )}

                    {/* Doğrudan Düzenlenebilir Monospace Editör */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '160px' }}>
                      <textarea
                        value={activeRule.icerik || ''}
                        onChange={e => handleUpdateRuleContent(activeRule.id, e.target.value)}
                        placeholder="Bu madde için yapay zekaya gidecek talimat metnini yazın..."
                        disabled={activeRule.durum === 'DevreDisi'}
                        style={{
                          flex: 1,
                          width: '100%',
                          minHeight: '160px',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          background: activeRule.durum === 'DevreDisi' ? 'transparent' : 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '12.5px',
                          lineHeight: '1.6',
                          resize: 'none',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
                    </div>

                    {/* Eğer Ezilmiş ise Orijinal Base Kuralı Referans Olarak Göster */}
                    {activeRule.durum === 'Ezildi' && activeRule.orijinalBaseIcerik && (
                      <div style={{
                        background: 'var(--bg-primary)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px dashed rgba(59, 130, 246, 0.35)',
                        fontSize: '11px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#3b82f6' }}>
                            <GitBranch size={13} /> Orijinal Base Kural Metni (Referans):
                          </span>
                          <button
                            type="button"
                            onClick={() => handleResetRule(activeRule.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '10.5px', fontWeight: '700' }}
                          >
                            Base Metnine Geri Dön
                          </button>
                        </div>
                        <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text-secondary)', lineHeight: '1.4', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>
                          {activeRule.orijinalBaseIcerik}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>Yapay zeka modeli bu maddeyi diğer aktif kurallarla birleştirerek değerlendirir.</span>
                      <span>{activeRule.icerik?.length || 0} Karakter • {activeRule.icerik?.trim() ? activeRule.icerik.trim().split(/\s+/).length : 0} Kelime • ~{Math.round((activeRule.icerik?.length || 0) / 4)} Token</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                  Düzenlemek için sol taraftan bir kural maddesi seçin.
                </div>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'hizliIstekler',
      label: `Hızlı İstekler & UI (${(formData.hizliIstekler || []).length})`,
      icon: <Zap size={16} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '520px', flex: 1 }}>
          <BaseListPage
            title={t('hizli_istekler_baslik', 'Hızlı ERP İstekleri & UI Eylemleri')}
            subtitle={t('hizli_istekler_alt_baslik', 'Webakus formlarında asistan açıldığında sunulacak dinamik öneri çipleri ve UI araçları.')}
            icon={<Zap size={22} color="#eab308" />}
            addNewText={t('yeni_istek_ekle', 'Yeni İstek Ekle')}
            onAddNew={() => handleOpenHizliIstekModal(null)}
            extraDropdownActions={[
              {
                custom: (
                  <div className="action-menu-header text-xs font-bold text-secondary px-8 py-4">
                    {t('sablonlar_menu_header', 'HAZIR ERP ŞABLONLARI')}
                  </div>
                )
              },
              ...HIZLI_ISTEK_PRESETS.map((preset) => ({
                label: preset.baslik,
                icon: <Sparkles size={14} color="#eab308" />,
                onClick: () => handleAddHizliIstek(preset)
              }))
            ]}
            columns={hizliIstekColumns}
            customFetchData={async () => ({
              data: formData.hizliIstekler || [],
              totalCount: (formData.hizliIstekler || []).length
            })}
            refreshKey={hizliIsteklerRefreshKey}
            onEdit={(item) => handleOpenHizliIstekModal(item)}
            customDeleteData={async (id) => handleRemoveHizliIstek(String(id))}
            customRowActions={getHizliIstekRowActions}
            emptyMessage={t('hizli_istek_bulunamadi', 'Henüz tanımlanmış hızlı ERP isteği bulunmuyor.')}
            enableColumnManagement={false}
            enableViewModeToggle={false}
            enableArchive={false}
            pageSize={50}
            containerClassName="w-full flex-1"
          />
        </div>
      )
    },
    {
      id: 'mcp',
      label: `MCP Yetkileri (${selectedCount})`,
      icon: <Code2 size={16} />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '6px 2px' }}>
          {/* Kapsam Bilgi ve Uyarı Kutusu */}
          {formData.kapsam === 2 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#c084fc',
              fontSize: '12.5px'
            }}>
              <Shield size={16} color="#a855f7" />
              <span>
                <strong>Admin Ajanı Yetki Alanı:</strong> Bu ajan Sistem Yönetimi (Admin) kapsamındadır. Sistem metrikleri, admin navigasyonu ve depolama denetimi gibi Admin MCP araçlarını tam yetkiyle çalıştırabilir.
              </span>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.22)',
              color: 'var(--text-secondary)',
              fontSize: '12.5px'
            }}>
              <Bot size={16} color="#3b82f6" />
              <span>
                <strong>ERP Ajanı Yetki Alanı:</strong> Bu ajan ERP Şirket Kullanıcıları için tasarlanmıştır. Şirket veritabanı sorguları, belge oluşturma ve ERP modül navigasyon araçlarını kullanabilir.
              </span>
            </div>
          )}

          {/* Üst Filtre & Toplu İşlem Çubuğu */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-primary)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Kapsam Filtreleme Butonları */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setToolScopeFilter('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: toolScopeFilter === 'ALL' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: toolScopeFilter === 'ALL' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Tümü ({tools.length})
              </button>
              <button
                type="button"
                onClick={() => setToolScopeFilter('ERP')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: toolScopeFilter === 'ERP' ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-secondary)',
                  color: toolScopeFilter === 'ERP' ? '#3b82f6' : 'var(--text-secondary)',
                  boxShadow: toolScopeFilter === 'ERP' ? 'inset 0 0 0 1.5px #3b82f6' : 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                🏢 ERP Araçları ({erpToolsCount})
              </button>
              <button
                type="button"
                onClick={() => setToolScopeFilter('ADMIN')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: toolScopeFilter === 'ADMIN' ? 'rgba(168, 85, 247, 0.2)' : 'var(--bg-secondary)',
                  color: toolScopeFilter === 'ADMIN' ? '#a855f7' : 'var(--text-secondary)',
                  boxShadow: toolScopeFilter === 'ADMIN' ? 'inset 0 0 0 1.5px #a855f7' : 'none',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Shield size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                Admin Araçları ({adminToolsCount})
              </button>
            </div>

            {/* Arama & Kategori */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', justifyContent: 'flex-end' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '240px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  value={toolSearch}
                  onChange={e => setToolSearch(e.target.value)}
                  placeholder="Araç ara..."
                  style={{
                    width: '100%',
                    padding: '5px 10px 5px 30px',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                  }}
                />
              </div>

              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Toplu Seçim Butonları */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSelectAllTools}
                  className="btn btn-secondary"
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                  title="Şu anda filtrelenmiş listedeki tüm araçları seçer"
                >
                  Listelenenleri Seç
                </button>
                <button
                  type="button"
                  onClick={handleClearAllTools}
                  className="btn btn-secondary"
                  style={{ fontSize: '11.5px', padding: '5px 10px' }}
                >
                  Temizle
                </button>
              </div>
            </div>
          </div>

          {/* Araç Kartları Listesi */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '12px',
            maxHeight: '440px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {filteredTools.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Seçili filtreye uygun MCP aracı bulunamadı.
              </div>
            ) : (
              filteredTools.map(tool => {
                const isSelected = formData.seciliAracKodlari.some(k => k.toLowerCase() === tool.aracKodu.toLowerCase());
                const isExpanded = expandedSchemaTool === tool.aracKodu;
                const isToolAdmin = tool.kapsam === 2 || tool.aracKodu?.toLowerCase().startsWith('admin_');

                return (
                  <div
                    key={tool.id || tool.aracKodu}
                    onClick={() => handleToggleTool(tool.aracKodu)}
                    style={{
                      border: `1px solid ${isSelected ? (isToolAdmin ? '#a855f7' : 'var(--accent-primary)') : 'var(--glass-border)'}`,
                      background: isSelected
                        ? (isToolAdmin ? 'rgba(168, 85, 247, 0.09)' : 'rgba(99, 102, 241, 0.08)')
                        : 'var(--bg-secondary)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Üst Kısım: İkon, Ad, Kapsam Rozeti & Checkbox */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '8px',
                          background: isSelected ? (isToolAdmin ? '#a855f7' : 'var(--accent-primary)') : 'var(--bg-primary)',
                          color: isSelected ? '#fff' : (isToolAdmin ? '#a855f7' : 'var(--text-primary)'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {isToolAdmin ? <Shield size={16} /> : getToolIcon(tool.ikon, tool.kategoriAdi)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {tool.aracAdi || tool.aracKodu}
                            </span>
                            <span style={{
                              fontSize: '9.5px', fontWeight: '700', padding: '1px 5px', borderRadius: '4px',
                              background: isToolAdmin ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.18)',
                              color: isToolAdmin ? '#a855f7' : '#3b82f6'
                            }}>
                              {isToolAdmin ? '🛡️ Admin' : '🏢 ERP'}
                            </span>
                          </div>
                          <code style={{ fontSize: '11px', color: isToolAdmin ? '#a855f7' : 'var(--accent-primary)', fontWeight: '600' }}>
                            {tool.aracKodu}
                          </code>
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }} // onClick ile yönetiliyor
                        style={{
                          width: '16px', height: '16px',
                          accentColor: isToolAdmin ? '#a855f7' : 'var(--accent-primary)',
                          cursor: 'pointer'
                        }}
                      />
                    </div>

                    {/* Açıklama */}
                    {tool.aciklama && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {tool.aciklama}
                      </div>
                    )}

                    {/* Kategori Etiketi & Schema Butonu */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid var(--glass-border)', paddingTop: '6px' }}>
                      <span style={{ fontSize: '10.5px', fontWeight: '600', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                        {tool.kategoriAdi || 'Genel'}
                      </span>

                      {tool.parametreSemasi && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSchemaTool(isExpanded ? null : tool.aracKodu);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isToolAdmin ? '#a855f7' : 'var(--accent-primary)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Terminal size={12} /> {isExpanded ? 'Semayı Gizle' : 'JSON Şeması'}
                        </button>
                      )}
                    </div>

                    {/* Genişletilmiş JSON Şeması */}
                    {isExpanded && tool.parametreSemasi && (
                      <div
                        onClick={e => e.stopPropagation()}
                        style={{
                          marginTop: '6px',
                          background: 'var(--bg-primary)',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Parametre JSON Şeması:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(tool.parametreSemasi);
                              toast.success('JSON Schema kopyalandı');
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '10.5px' }}
                          >
                            Kopyala
                          </button>
                        </div>
                        <pre style={{ margin: 0, overflowX: 'auto', maxHeight: '140px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {JSON.stringify(JSON.parse(tool.parametreSemasi), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )
    }
  ];

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onBack) {
      onBack();
    } else if (backRoute) {
      navigate(backRoute);
    } else if ((location.state as any)?.returnUrl) {
      navigate((location.state as any).returnUrl);
    } else {
      navigate(effectiveBackRoute);
    }
  };

  const isNew = !effectiveId && !localInitialData?.id;

  const agentDisplayName = useMemo(() => {
    if (formData.ad?.trim()) return formData.ad.trim();
    if (localInitialData?.ad?.trim()) return localInitialData.ad.trim();
    if (effectiveId) return `#${effectiveId}`;
    return t('auto_yeni_ai_ajani', 'Yeni Yapay Zeka Ajanı');
  }, [formData.ad, localInitialData?.ad, effectiveId, t]);

  useEffect(() => {
    if (setHeaderBreadcrumbOptions) {
      setHeaderBreadcrumbOptions({
        recordTitle: agentDisplayName
      });
    }
    return () => {
      if (setHeaderBreadcrumbOptions) {
        setHeaderBreadcrumbOptions(null);
      }
    };
  }, [agentDisplayName, setHeaderBreadcrumbOptions]);

  const extraDropdownActions = useMemo(() => {
    const actions: any[] = [
      {
        custom: (
          <BaseSwitch
            id="actionMenuAjanAktifSwitch"
            checked={formData.aktifMi ?? true}
            onChange={(e: any) => setFormData(prev => ({ ...prev, aktifMi: e.target.checked }))}
            label={
              <span className="flex items-center gap-8">
                <Power size={15} className={formData.aktifMi ? "text-success" : "text-secondary"} />
                <span className="font-medium">{t('durum', 'Durum')}:</span>
                <span className={formData.aktifMi ? "text-success font-semibold" : "text-secondary font-semibold"}>
                  {formData.aktifMi ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
                </span>
              </span>
            }
            className="action-menu-switch-item"
          />
        ),
        dividerBelow: true
      },
      {
        label: t('auto_canli_sistem_istemi', 'Canlı Prompt / Sistem İstemi'),
        icon: <Eye size={15} />,
        onClick: () => {
          setActiveTabId('istem');
          setShowPromptPreview(true);
        }
      },
      {
        label: t('auto_yeni_kural_ekle', 'Özel Kural Maddesi Ekle'),
        icon: <Plus size={15} />,
        onClick: () => {
          setActiveTabId('istem');
          handleAddCustomRule();
        }
      },
      {
        label: t('auto_standart_kural_sablonlari', 'Standart Kural Şablonları'),
        icon: <BookOpen size={15} />,
        onClick: () => {
          setActiveTabId('istem');
          setShowPresetsModal(true);
        }
      },
      {
        label: t('auto_hizli_istek_yonetimi', 'Hızlı İstekler & UI Eylemleri'),
        icon: <Zap size={15} />,
        onClick: () => {
          setActiveTabId('hizliIstekler');
        }
      }
    ];

    const currentId = effectiveId || localInitialData?.id;
    if (currentId) {
      actions.push({
        label: t('auto_ajani_sil', 'Ajanı Sil'),
        icon: <Trash2 size={15} />,
        danger: true,
        dividerAbove: true,
        onClick: () => {
          showAlert(
            'confirm',
            t('auto_ajan_sil_baslik', 'Ajanı Sil'),
            t('auto_ajan_sil_mesaj', 'Bu yapay zeka ajanını silmek istediğinize emin misiniz?'),
            async () => {
              try {
                await axios.delete(`/api/AiAjanlar/${currentId}`);
                toast.success(t('auto_ajan_silindi', 'Ajan başarıyla silindi.'));
                if (onSuccess) onSuccess();
                else handleClose();
              } catch (err) {
                showAlert('error', t('Hata', 'Hata'), t('auto_ajan_silme_hata', 'Silme işlemi başarısız'));
              }
            }
          );
        }
      });
    }

    return actions;
  }, [t, effectiveId, localInitialData?.id, showAlert, formData.aktifMi]);

  if (isOpen === false) {
    return null;
  }

  if (dataLoading) {
    return <PageLoader />;
  }

  return (
    <>
      <BaseCardPage
        id="aiAjanForm"
        title={agentDisplayName}
        pageTitle={agentDisplayName}
        recordTitle={agentDisplayName}
        icon={<Sparkles size={24} color={formData.renk || 'var(--accent-primary)'} />}
        subtitleLeft={formData.rol || formData.aciklama || undefined}
        showBackButton={true}
        onClose={handleClose}
        onSave={handleSubmit}
        isSaving={isSaving}
        extraDropdownActions={extraDropdownActions}
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={(tabId) => setActiveTabId(tabId as string)}
        className="fade-in"
      />

      {/* ─── HIZLI İSTEK EKLE / DÜZENLE MODALI (BasePopup) ──────────────── */}
      {hizliIstekModal.isOpen && (
        <BasePopup
          isOpen={hizliIstekModal.isOpen}
          onClose={() => setHizliIstekModal({ isOpen: false, item: null })}
          title={hizliIstekModal.item ? t('hizli_istek_duzenle', 'Hızlı ERP İsteğini Düzenle') : t('yeni_hizli_istek', 'Yeni Hızlı ERP İsteği Ekle')}
          modalSize="md"
          hideFooter={true}
        >
          <div className="flex-col gap-16">
            <div className="card-message-banner flex-row items-center gap-12">
              <Zap size={20} className="text-warning" />
              <div className="text-xs text-secondary">
                {t(
                  'hizli_istek_modal_aciklama',
                  'Kullanıcı form üzerindeki Yapay Zeka Asistanı çipine tıkladığında doğrudan asistan sohbetine yönlendirilecek hazır istek cümlesi ve opsiyonel ERP ekranı yönlendirmesi.'
                )}
              </div>
            </div>

            <div className="form-grid">
              {/* İstek Başlığı */}
              <div className="form-field full-width">
                <label className="form-label flex-row items-center gap-8">
                  <span>{t('hizli_istek_baslik', 'İstek Başlığı')} *</span>
                </label>
                <BasitInput
                  value={modalFormState.baslik}
                  onChange={(e: any) => {
                    const val = e && e.target ? e.target.value : e;
                    setModalFormState(prev => ({ ...prev, baslik: val }));
                  }}
                  placeholder={t('hizli_istek_baslik_placeholder', 'Örn: Cari Bakiye & Ekstre Analizi')}
                />
              </div>

              {/* İkon Seçici */}
              <div className="form-field">
                <label className="form-label flex-row items-center gap-8">
                  <span>{t('hizli_istek_ikon', 'İkon')}</span>
                </label>
                <select
                  className="form-input"
                  value={modalFormState.ikon}
                  onChange={(e) => setModalFormState(prev => ({ ...prev, ikon: e.target.value }))}
                >
                  <option value="Sparkles">✨ Sparkles</option>
                  <option value="Search">🔍 Search</option>
                  <option value="FileText">📄 FileText</option>
                  <option value="Database">🗄️ Database</option>
                  <option value="TrendingUp">📈 TrendingUp</option>
                  <option value="Users">👥 Users</option>
                  <option value="Package">📦 Package</option>
                  <option value="Zap">⚡ Zap</option>
                  <option value="Bot">🤖 Bot</option>
                  <option value="Layers">📑 Layers</option>
                </select>
              </div>

              {/* Aktiflik Durumu */}
              <div className="form-field">
                <label className="form-label flex-row items-center gap-8">
                  <span>{t('durum', 'Durum')}</span>
                </label>
                <div className="mt-8">
                  <BaseSwitch
                    id="modalHizliIstekAktif"
                    checked={modalFormState.aktifMi}
                    onChange={(val: any) => {
                      const checked = typeof val === 'boolean' ? val : val?.target?.checked;
                      setModalFormState(prev => ({ ...prev, aktifMi: checked }));
                    }}
                    label={modalFormState.aktifMi ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
                  />
                </div>
              </div>

              {/* Prompt / Yapay Zeka İstemi */}
              <div className="form-field full-width">
                <label className="form-label flex-row items-center gap-8">
                  <span>{t('hizli_istek_prompt', 'Yapay Zeka İstemi (Prompt)')} *</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={modalFormState.prompt}
                  onChange={(e) => setModalFormState(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder={t('hizli_istek_prompt_placeholder', 'Örn: Açık olan cari kartın son hareketlerini özetle ve risk durumunu bildir.')}
                />
              </div>

              {/* UI Aksiyonu */}
              <div className="form-field full-width">
                <label className="form-label flex-row items-center gap-8">
                  <span>{t('hizli_istek_ui_aksiyonu', 'Açılacak ERP Arayüzü / UI Aksiyonu')}</span>
                </label>
                <select
                  className="form-input"
                  value={modalFormState.uiAksiyonu}
                  onChange={(e) => setModalFormState(prev => ({ ...prev, uiAksiyonu: e.target.value }))}
                >
                  {[
                    { id: 'YOK', tanim: t('💬 Salt Metin İstemi (Ekran Açma)') },
                    { id: 'BULUT_DOSYA_SEC', tanim: t('📁 Bulut Dosyası Seçici (FilesOnClouds)') },
                    { id: 'METIN_YAPISTIR_MODAL', tanim: t('Metin / Kampanya Giriş Penceresi Aç (Önce Metin Al)') },
                    { id: 'EXCEL_IMPORT', tanim: t('📊 Excel İçe Aktarım Ekranı (/excel-import)') },
                    { id: 'CARI_SEC', tanim: t('👤 Cari Kart Seçici (CariSeciciModal)') },
                    { id: 'URUN_SEC', tanim: t('📦 Ürün & Hizmet Seçici (UrunSeciciModal)') },
                    { id: 'OZEL_ROTA', tanim: t('🔗 Özel ERP Rota Yönlendirmesi') }
                  ].map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.tanim}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Aksiyon Butonları */}
            <div className="flex-row items-center justify-between gap-12 modal-footer-actions">
              <CancelButton
                onClick={() => setHizliIstekModal({ isOpen: false, item: null })}
                text={t('vazgec', 'Vazgeç')}
              />
              <SaveButton
                onClick={handleSaveHizliIstekModal}
                text={t('kaydet', 'Kaydet')}
              />
            </div>
          </div>
        </BasePopup>
      )}

      {/* ─── AI MODEL SEÇİM & PARAMETRE MODALI (BasePopup) ──────────────── */}
      <AiModelSelection
        isOpen={modelModalState.isOpen}
        onClose={() => setModelModalState({ isOpen: false, item: null, editIndex: null })}
        onSave={handleSaveModel}
        initialData={modelModalState.item}
        providers={localProviders}
        excludedModelNames={
          modelModalState.editIndex !== null
            ? configuredModels.filter((_, i) => i !== modelModalState.editIndex).map(m => m.modelAdi)
            : configuredModels.map(m => m.modelAdi)
        }
      />
    </>
  );
};

export default AiAjanForm;
