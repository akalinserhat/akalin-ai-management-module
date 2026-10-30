/**
 * Webakus AdminUI - Yapay Zeka (AI) Ajanı, Sabit Sistem İstemi & Görsel Flowchart Görev Akışı Sayfası (AiAjanForm)
 *
 * Başlıca Sorumlulukları ve Görevleri:
 * - Katman 1: Sabit Sistem İstemi (System Prompt & Yetki Sınırları) ile ajanın kimliğini, yetki sınırlarını ve konu dışı soruları nazikçe reddetme politikasını tanımlamak
 * - Katman 2: MCP araçları (erp_query_data, erp_navigate, erp_request_confirmation, erp_create_document vb.) ile ajanın kendi zekasıyla otonom çalışmasını yetkilendirmek
 * - Katman 3: Tanımlı görevler (Hızlı İstekler & Görev Akışları) için Görsel Flowchart (Akış Diyagramı) ve Adım Bazlı Prompt Giriş Ekranı sunmak
 * - BaseCardPage temel bileşeninden türetilerek tüm diğer kart sayfalarıyla %100 görsel ve mimari tutarlılık sağlamak
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Bot, Sparkles, Cpu, Code2, Search, Copy,
  Compass, FilePlus, Database, Layers, Terminal, Info,
  Zap, RotateCcw, Plus, Trash2, Eye, CheckCircle2,
  SlidersHorizontal, GitBranch, ArrowUp, ArrowDown, X, Shield, ShieldAlert,
  BookOpen, FileSpreadsheet, FileText, Users, AlertCircle, TrendingUp, FolderOpen,
  Power, Package, Edit2
} from 'lucide-react';
import {
  BaseCardPage,
  BasitInput,
  SaveButton,
  CancelButton,
  BaseSwitch,
  PageLoader,
  useHeaderApi,
  useAlertDialog,
  DataTable,
  EkleFloatCircleButton,
  ActionMenu,
  type Column,
  type ActionMenuItem
} from '@akalin/ui';
import {
  AiModelSelection,
  type AiModelConfig
} from '@akalin/ai-assistants';
import type { AiAkisDugumu } from '../types';
import AiAjanHizliIstekForm from './AiAjanHizliIstekForm';

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

// ─── Flowchart Düğüm Tipleri ──────────────────────────────────────────────────
export const FLOWCHART_NODE_TYPES = [
  { id: 'BASLA', label: '▶️ Başla', shortLabel: 'Başla' },
  { id: 'BASLANGIC_GIRDI', label: '🏁 Başlangıç & Girdi Al', shortLabel: 'Başlangıç / Girdi' },
  { id: 'MCP_SORGULA', label: '🔍 MCP Veri Sorgulama (Cari / Ürün)', shortLabel: 'MCP Sorgu' },
  { id: 'KARAR_ONAY', label: '⚖️ Kullanıcı Onayı & Seçim (Evet / Hayır)', shortLabel: 'Karar / Onay (E/H)' },
  { id: 'EKRAN_AC', label: '🖥️ ERP Ekranı Aç & Kayıt Bekle (Handshake)', shortLabel: 'Ekran Aç' },
  { id: 'BELGE_OLUSTUR', label: '📄 Belge / Taslak Oluştur', shortLabel: 'Belge Oluştur' },
  { id: 'SONUC', label: '✅ Tamamlama & Yönetici Özeti', shortLabel: 'Sonuç' }
];

// ─── Hazır Görev Akışı (Flowchart) & Hızlı İstek Şablonları ───────────────────
export const HIZLI_ISTEK_PRESETS = [
  {
    baslik: '🛒 Kontrollü Satış & Fatura Oluştur (Adres Onaylı)',
    prompt: 'Müşteri ve ürün bilgilerini kontrol ederek adres onayı al ve satış faturası/siparişi oluştur.',
    ikon: 'Package',
    uiAksiyonu: 'YOK',
    tetiklemeAnahtarlari: 'satış yap, fatura kes, sipariş oluştur, ürün sat, satış faturası',
    akisDugumleri: [
      {
        id: 'ADIM_1',
        tip: 'MCP_SORGULA',
        baslik: 'Cari Hesap & Kayıtlı Adresleri Sorgula',
        aracKodu: 'erp_query_data',
        uiAksiyonu: 'YOK',
        prompt: 'Kullanıcının belirttiği müşteri adını veya unvanını erp_query_data (entity: "cari") aracı ile sorgula. Müşterinin Cari ID bilgisini ve kayıtlı teslimat/fatura adreslerini (Adresler listesi) tespit et.',
        sonrakiDugumId: 'ADIM_2'
      },
      {
        id: 'ADIM_2',
        tip: 'MCP_SORGULA',
        baslik: 'Ürün Kartı & Fiyat Bilgisini Sorgula',
        aracKodu: 'erp_query_data',
        uiAksiyonu: 'YOK',
        prompt: 'Satılacak ürün kodunu veya adını erp_query_data (entity: "urun") aracı ile sorgula. Ürün kodunu, adını ve birim fiyatını doğrula (kullanıcı özel bir satış fiyatı belirttiyse o fiyatı baz al).',
        sonrakiDugumId: 'ADIM_3'
      },
      {
        id: 'ADIM_3',
        tip: 'KARAR_ONAY',
        baslik: 'Teslimat Adresi Onayı İste (Evet / Hayır)',
        aracKodu: 'erp_request_confirmation',
        uiAksiyonu: 'YOK',
        hedefRota: '/cariler/:id/adres?tip=2',
        prompt: 'Fatura veya sipariş taslağını oluşturmadan önce erp_request_confirmation aracını çağırarak müşterinin mevcut kayıtlı adresini kullanıcıya göster ve "Satış bu adrese mi yapılacak?" diye onay iste. Red yönlendirme URL olarak "/cariler/{cariId}/adres?tip=2" gönder.',
        evetDugumId: 'ADIM_4',
        hayirDugumId: 'ADIM_5'
      },
      {
        id: 'ADIM_4',
        tip: 'BELGE_OLUSTUR',
        baslik: 'Satış Faturası / Sipariş Taslağını Oluştur',
        aracKodu: 'erp_create_document',
        uiAksiyonu: 'YOK',
        prompt: 'Kullanıcı mevcut adresi onayladı veya yeni adres kaydını tamamladı. Şimdi erp_create_document (documentType: "Fatura" veya "Siparis") aracını çağırarak gerçek cariId, onaylanan teslimatAdresi, odemeYontemi ve kalemler (urunKodu, miktar, birimFiyat) ile belge taslağını oluştur.',
        sonrakiDugumId: ''
      },
      {
        id: 'ADIM_5',
        tip: 'EKRAN_AC',
        baslik: 'Cari Kart Yeni Adres Ekranını Aç & Kaydı Bekle',
        aracKodu: 'erp_navigate',
        uiAksiyonu: 'OZEL_ROTA',
        hedefRota: '/cariler/:id/adres?tip=2',
        prompt: 'Kullanıcı yeni adres tanımlamak istedi. Sol ana ekranda ilgili müşterinin Cari Kart Adres sekmesi (/cariler/{cariId}/adres?tip=2) açıldı. Kullanıcı yeni adresi kaydedip tamamladığında otomatik olarak Belge Oluşturma adımına (ADIM_4) geç.',
        sonrakiDugumId: 'ADIM_4'
      }
    ] as AiAkisDugumu[]
  },
  {
    baslik: '📝 Kampanya Metninden Belge Oluştur',
    prompt: 'Girilen kampanya veya fiyat listesi metnini analiz et, koşulları ve kalemleri çıkararak belge taslağı oluştur.',
    ikon: 'FileText',
    uiAksiyonu: 'METIN_YAPISTIR_MODAL',
    tetiklemeAnahtarlari: 'kampanya metni, bülten analizi, kampanya belgesi oluştur, metinden kampanya',
    akisDugumleri: [
      {
        id: 'ADIM_1',
        tip: 'BASLANGIC_GIRDI',
        baslik: 'Kampanya / Bülten Metnini Al',
        aracKodu: '',
        uiAksiyonu: 'METIN_YAPISTIR_MODAL',
        prompt: 'Kullanıcıya önce Metin / Kampanya Giriş Penceresi açarak analiz edilecek kampanya bülteni veya fiyat listesi metnini al.',
        sonrakiDugumId: 'ADIM_2'
      },
      {
        id: 'ADIM_2',
        tip: 'MCP_SORGULA',
        baslik: 'Metindeki Ürün Kodlarını ERP Stoklarında Doğrula',
        aracKodu: 'erp_query_data',
        uiAksiyonu: 'YOK',
        prompt: 'Kullanıcının girdiği kampanya metnindeki ürün kodlarını, kampanya fiyatlarını ve tarih aralığını ayrıştır. Gerekirse erp_query_data (entity: "urun") ile ürün karşılıklarını kontrol et.',
        sonrakiDugumId: 'ADIM_3'
      },
      {
        id: 'ADIM_3',
        tip: 'BELGE_OLUSTUR',
        baslik: 'Kampanya / Fiyat Listesi Taslağını Oluştur',
        aracKodu: 'erp_create_document',
        uiAksiyonu: 'YOK',
        prompt: 'Analiz edilen kampanya başlığı, geçerlilik tarihleri ve ürün/fiyat kalemleriyle erp_create_document aracını çağırarak belge taslağını oluştur ve kullanıcıya yönetici özeti sun.',
        sonrakiDugumId: ''
      }
    ] as AiAkisDugumu[]
  },
  {
    baslik: '📁 Bulut Dosyasından Fiyat/Belge Aktar',
    prompt: 'Seçilen dökümanı analiz et, ürün kodlarını, miktarları ve fiyatları çıkararak forma aktar.',
    ikon: 'FileSpreadsheet',
    uiAksiyonu: 'BULUT_DOSYA_SEC',
    tetiklemeAnahtarlari: 'bulut dosyası, dosyadan aktar, pdf analiz',
    akisDugumleri: [
      {
        id: 'ADIM_1',
        tip: 'BASLANGIC_GIRDI',
        baslik: 'Bulut Dosyası Seçiciyi Aç',
        aracKodu: 'erp_list_cloud_files',
        uiAksiyonu: 'BULUT_DOSYA_SEC',
        prompt: 'Kullanıcının bulut depolamadan (FilesOnClouds) belge seçmesini sağla ve seçilen dosyanın içeriğini analiz et.',
        sonrakiDugumId: 'ADIM_2'
      },
      {
        id: 'ADIM_2',
        tip: 'BELGE_OLUSTUR',
        baslik: 'Dosyadaki Kalemlerden Belge Taslağı Oluştur',
        aracKodu: 'erp_create_document',
        uiAksiyonu: 'YOK',
        prompt: 'Seçilen bulut dosyasındaki cari, ürün ve fiyat bilgilerini ayrıştırarak erp_create_document aracıyla ERP belge taslağını hazırla.',
        sonrakiDugumId: ''
      }
    ] as AiAkisDugumu[]
  },
  {
    baslik: '📊 Excel İçe Aktarım Ekranını Aç',
    prompt: 'Excel dosyasındaki ürün ve fiyat sütunlarını bu formla eşleştir ve aktar.',
    ikon: 'FileText',
    uiAksiyonu: 'EXCEL_IMPORT',
    tetiklemeAnahtarlari: 'excel aktar, toplu ürün yükle',
    akisDugumleri: [] as AiAkisDugumu[]
  },
  {
    baslik: '👤 Seçili Cariye Özel Fiyat Çıkar',
    prompt: 'Seçilen cari hesabın geçmiş alış/satış koşullarını analiz ederek özel fiyat listesi öner.',
    ikon: 'Users',
    uiAksiyonu: 'CARI_SEC',
    tetiklemeAnahtarlari: 'cari özel fiyat, müşteri fiyat analizi',
    akisDugumleri: [] as AiAkisDugumu[]
  },
  {
    baslik: '🔍 Riskli ve Düşük Karlı Kalemleri Raporla',
    prompt: 'Formdaki birim fiyatları son alış maliyetleriyle karşılaştırarak kar marjı düşük kalemleri listele.',
    ikon: 'AlertCircle',
    uiAksiyonu: 'YOK',
    tetiklemeAnahtarlari: 'düşük kar, zarar kontrolü, maliyet analizi',
    akisDugumleri: [] as AiAkisDugumu[]
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
    baslik: 'Konu Dışı Soruları Nazikçe Reddetme',
    aciklama: 'ERP kapsamı dışındaki talepleri geri çevirme kuralı',
    icerik: 'Görev ve yetki alanın yalnızca Webakus ERP işlemleri, ticari belgeler, cari hesaplar, stok/ürün yönetimi ve şirket içi analizlerle sınırlıdır. Kullanıcı bu kapsamın dışında (genel kültür, yemek tarifi, spor, siyaset, eğlence vb.) bir soru sorduğunda nazik ve profesyonel bir dille yalnızca Webakus ERP süreçlerinde yardımcı olabileceğini belirterek geri çevir.'
  },
  {
    baslik: 'Otonom MCP Araç Kullanımı',
    aciklama: 'MCP fonksiyonlarını kendi zekasıyla kullanma ilkesi',
    icerik: 'Kullanıcının talebi yetki sınırların içerisindeyse, sana tanımlı MCP araçlarının (erp_query_data, erp_navigate, erp_get_page_context vb.) açıklamalarını okuyarak kendi zekanla doğru aracı seç ve çalıştır. Ancak tanımlı bir Görev Akışı (Flowchart) tetiklendiyse o akıştaki adımları sırasıyla ve eksiksiz uygula.'
  },
  {
    baslik: 'Veri Doğrulama & Teyit',
    aciklama: 'Eksik veri onay mekanizması',
    icerik: 'Cari hesap, teslimat adresi veya ürün kodları eksik ya da belirsizse erp_request_confirmation aracıyla kullanıcıdan onay iste; hiçbir veriyi tahmini olarak doldurma.'
  }
];

// ─── Adım Prompt Hızlı Parçacıkları (Flowchart Step Snippets) ─────────────────
const STEP_PROMPT_SNIPPETS = [
  {
    label: '+ Cari & Adres Sorgula',
    text: 'Kullanıcının belirttiği müşteriyi erp_query_data (entity: "cari") aracıyla ara, Cari ID ve kayıtlı Adresler listesini al.'
  },
  {
    label: '+ Ürün & Fiyat Doğrula',
    text: 'Belirtilen ürün kodunu veya adını erp_query_data (entity: "urun") ile sorgula; kullanıcı özel bir satış fiyatı belirttiyse o fiyatı kullan.'
  },
  {
    label: '+ Adres Onay Kartı Göster (Evet/Hayır)',
    text: 'erp_request_confirmation aracını çağırarak müşterinin kayıtlı adresini göster ve "Satış bu adrese mi yapılacak?" diye onay iste. Hayır durumunda "/cariler/{cariId}/adres?tip=2" rotasına yönlendir.'
  },
  {
    label: '+ Belge Taslağı Oluştur',
    text: 'Onaylanan cariId, teslimatAdresi, odemeYontemi ve kalemler (urunKodu, miktar, birimFiyat) bilgileriyle erp_create_document aracını çağır.'
  }
];

// ─── Araç Kategori ve İkon Eşleştirici ──────────────────────────────────────────
const getToolIcon = (iconName?: string, categoryName?: string) => {
  const name = (iconName || '').toLowerCase();
  const cat = (categoryName || '').toLowerCase();

  if (name === 'compass' || cat.includes('navigasyon')) return <Compass size={18} />;
  if (name === 'fileplus' || cat.includes('belge') || cat.includes('işlem')) return <FilePlus size={18} />;
  if (name === 'checkcircle2' || cat.includes('etkileşim') || cat.includes('onay')) return <CheckCircle2 size={18} />;
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
const compilePromptPreview = (rules: any[] = []) => {
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
        sistemIstemi: src.sistemIstemi || '',
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

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return location.state?.activeTabId || 'genel';
  });

  useEffect(() => {
    if (location.state?.activeTabId) {
      setActiveTabId(location.state.activeTabId);
    }
  }, [location.state?.activeTabId]);

  // Katman 1 görünüm modu: 'sabitPrompt' (Sabit Sistem İstemi & Yetki Sınırları) veya 'kurallar' (Madde Bazlı Kurallar)
  const [systemPromptViewMode, setSystemPromptViewMode] = useState<'sabitPrompt' | 'kurallar'>('sabitPrompt');
  const [showPresetsModal, setShowPresetsModal] = useState(false);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleFilter, setRuleFilter] = useState('Tümü');
  const [hizliIsteklerRefreshKey, setHizliIsteklerRefreshKey] = useState(0);

  // Hızlı İstekler listesini başlat
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

  // Kural listesini başlat
  const initialRules = useMemo(() => {
    if (localInitialData?.kurallar && localInitialData.kurallar.length > 0) {
      if (!localInitialData.ustAjanId) {
        return localInitialData.kurallar.map((k: any) => ({
          ...k,
          durum: k.durum === 'DevreDisi' ? 'DevreDisi' : (k.durum === 'MirasAlindi' ? 'Yeni' : (k.durum || 'Yeni'))
        }));
      }
      return localInitialData.kurallar;
    }
    if (localInitialData?.ustAjanId) {
      const parent = internalAllAgents.find(a => a.id === localInitialData.ustAjanId);
      if (parent?.kurallar?.length > 0) {
        return parent.kurallar.map((k: any) => ({
          ...k,
          durum: 'MirasAlindi',
          orijinalBaseIcerik: k.icerik
        }));
      }
    }
    return [
      {
        id: 'KIMLIK',
        baslik: 'Ajan Kimliği ve Yetki Sınırları',
        icerik: localInitialData?.sistemIstemi || 'Sen Webakus ERP sisteminde çalışan yetkili bir yapay zeka asistanısın. Yalnızca ERP kapsamındaki işlemlerde yardımcı ol; konu dışı soruları nazikçe reddet.',
        sira: 1,
        durum: 'Yeni',
        kilitliMi: false
      }
    ];
  }, [localInitialData, internalAllAgents]);

  const [formData, setFormData] = useState<any>({
    ad: localInitialData?.ad || '',
    kod: localInitialData?.kod || '',
    rol: localInitialData?.rol || 'Genel ERP Asistanı',
    aciklama: localInitialData?.aciklama || '',
    ikon: localInitialData?.ikon || 'Bot',
    renk: localInitialData?.renk || '#6366f1',
    kapsam: localInitialData?.kapsam || 1,
    ustAjanId: localInitialData?.ustAjanId || null,
    kurallar: initialRules,
    sistemIstemi: localInitialData?.sistemIstemi || compilePromptPreview(initialRules),
    aiSaglayiciId: localInitialData?.aiSaglayiciId || (internalProviders.find(p => p.aktifMi)?.id || internalProviders[0]?.id || ''),
    modelAdi: localInitialData?.modelAdi || (internalProviders.find(p => p.aktifMi)?.varsayilanModel || internalProviders[0]?.varsayilanModel || 'gpt-4o'),
    alternatifModeller: initialAlternatifModeller,
    sicaklik: localInitialData?.sicaklik ?? 0.7,
    maxTokens: localInitialData?.maxTokens || 2048,
    yanitSenteziModu: localInitialData?.yanitSenteziModu ?? 0,
    aktifMi: localInitialData?.aktifMi ?? true,
    sistemKaydiMi: localInitialData?.sistemKaydiMi ?? false,
    seciliAracKodlari: localInitialData?.ajanAraclari?.map((a: any) => a.aracKodu) || internalTools.map(t => t.aracKodu),
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

      const loadedRules = (localInitialData.kurallar && localInitialData.kurallar.length > 0)
        ? localInitialData.kurallar
        : formData.kurallar;

      setFormData((prev: any) => ({
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
        kurallar: loadedRules,
        sistemIstemi: localInitialData.sistemIstemi?.trim()
          ? localInitialData.sistemIstemi
          : (prev.sistemIstemi || compilePromptPreview(loadedRules)),
        hizliIstekler: (localInitialData.hizliIstekler && localInitialData.hizliIstekler.length > 0) ? localInitialData.hizliIstekler : prev.hizliIstekler
      }));
      setHizliIsteklerRefreshKey(k => k + 1);
    }
  }, [localInitialData]);

  // İlk kuralı seçili yap
  useEffect(() => {
    if (!selectedRuleId && formData.kurallar.length > 0) {
      setSelectedRuleId(formData.kurallar[0].id);
    }
  }, [formData.kurallar, selectedRuleId]);

  const activeRule = useMemo(() => {
    return formData.kurallar.find((k: any) => k.id === selectedRuleId) || formData.kurallar[0] || null;
  }, [formData.kurallar, selectedRuleId]);

  const baseAgentOptions = useMemo(() => {
    return internalAllAgents.filter(a => a.id !== (localInitialData?.id || effectiveId));
  }, [internalAllAgents, localInitialData?.id, effectiveId]);

  const handleBaseAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value ? parseInt(e.target.value, 10) : null;
    if (!selectedId) {
      setFormData((prev: any) => ({
        ...prev,
        ustAjanId: null,
        kurallar: prev.kurallar.map((k: any) => ({ ...k, durum: k.durum === 'DevreDisi' ? 'DevreDisi' : 'Yeni' }))
      }));
      return;
    }

    const selectedBase = internalAllAgents.find(a => a.id === selectedId);
    if (selectedBase && selectedBase.kurallar && selectedBase.kurallar.length > 0) {
      const inheritedRules = selectedBase.kurallar.map((k: any) => ({
        id: k.id,
        baslik: k.baslik,
        aciklama: k.aciklama,
        icerik: k.icerik,
        sira: k.sira,
        durum: 'MirasAlindi',
        kilitliMi: k.kilitliMi,
        orijinalBaseIcerik: k.icerik
      }));

      setFormData((prev: any) => ({
        ...prev,
        ustAjanId: selectedId,
        kapsam: selectedBase.kapsam || prev.kapsam,
        kurallar: inheritedRules,
        sistemIstemi: selectedBase.sistemIstemi || compilePromptPreview(inheritedRules),
        rol: prev.rol === 'Genel ERP Asistanı' ? selectedBase.rol : prev.rol,
        renk: selectedBase.renk || prev.renk,
        hizliIstekler: (prev.hizliIstekler && prev.hizliIstekler.length > 0)
          ? prev.hizliIstekler
          : (selectedBase.hizliIstekler ? JSON.parse(JSON.stringify(selectedBase.hizliIstekler)) : [])
      }));
      setSelectedRuleId(inheritedRules[0]?.id || null);
      toast.success(t('base_ajan_miras_alindi', `'${selectedBase.ad}' kuralları ve kapsamı miras alındı.`));
    } else {
      setFormData((prev: any) => ({ ...prev, ustAjanId: selectedId }));
    }
  };

  // ─── SABİT SİSTEM İSTEMİ (KATMAN 1) YARDIMCILARI ──────────────────────────────
  const handleAppendGuardrailToSystemPrompt = (snippetTitle: string, snippetBody: string) => {
    setFormData((prev: any) => {
      const current = (prev.sistemIstemi || '').trim();
      const block = `[${snippetTitle.toUpperCase()}]:\n${snippetBody}`;
      return {
        ...prev,
        sistemIstemi: current ? `${current}\n\n${block}` : block
      };
    });
    toast.success(t('sistem_istemine_eklendi', `'${snippetTitle}' sistem istemine eklendi.`));
  };

  const handleSyncRulesToSystemPrompt = () => {
    const compiled = compilePromptPreview(formData.kurallar);
    if (!compiled) {
      toast.error(t('aktif_kural_bulunamadi', 'Derlenecek aktif kural maddesi bulunamadı.'));
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      sistemIstemi: compiled
    }));
    toast.success(t('maddeler_sistem_istemine_aktarildi', 'Kural maddeleri Sabit Sistem İstemine aktarıldı.'));
  };

  // ─── HIZLI İSTEK & GÖREV AKIŞI SAYFASINA YÖNLENDİRME (KATMAN 3) ───────────────
  const handleOpenHizliIstekPage = useCallback((item: any = null) => {
    const targetId = item?.id || 'yeni';
    const basePath = effectiveId
      ? (isUnderAyarlar ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveId}` : `/ai-ajanlar/${effectiveId}`)
      : location.pathname.replace(/\/hizli-istek.*$/, '');

    navigate(`${basePath}/hizli-istek/${targetId}`, {
      state: {
        agentData: formData,
        hizliIstekItem: item,
        activeTabId: 'hizliIstekler'
      }
    });
  }, [effectiveId, isUnderAyarlar, location.pathname, formData, navigate]);

  const handleAddHizliIstek = (preset: any = null) => {
    const newItem = preset ? {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: preset.baslik || 'Yeni ERP Görev Akışı',
      prompt: preset.prompt || '',
      ikon: preset.ikon || 'Sparkles',
      uiAksiyonu: preset.uiAksiyonu || 'YOK',
      uiParametreleriJson: '',
      tetiklemeAnahtarlari: preset.tetiklemeAnahtarlari || '',
      akisDugumleri: preset.akisDugumleri ? JSON.parse(JSON.stringify(preset.akisDugumleri)) : [],
      sira: (formData.hizliIstekler?.length || 0) + 1,
      aktifMi: true,
      hizliErisimDugmesi: true
    } : {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: 'Yeni Hızlı ERP İsteği',
      prompt: 'Bu sayfadaki verileri incele ve...',
      ikon: 'Sparkles',
      uiAksiyonu: 'YOK',
      uiParametreleriJson: '',
      tetiklemeAnahtarlari: '',
      akisDugumleri: [],
      sira: (formData.hizliIstekler?.length || 0) + 1,
      aktifMi: true,
      hizliErisimDugmesi: true
    };

    setFormData((prev: any) => ({
      ...prev,
      hizliIstekler: [...(prev.hizliIstekler || []), newItem]
    }));
    setHizliIsteklerRefreshKey(k => k + 1);
    toast.success(preset ? `'${preset.baslik}' şablonu eklendi.` : t('istek_eklendi', 'Hızlı ERP isteği eklendi.'));
  };

  const handleDuplicateHizliIstek = (item: any) => {
    const list = [...(formData.hizliIstekler || [])];
    const idx = list.findIndex(x => x.id === item.id);
    const copy = {
      ...JSON.parse(JSON.stringify(item)),
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      baslik: `${item.baslik} (${t('kopya', 'Kopya')})`,
      sira: (list.length || 0) + 1
    };
    list.splice(idx + 1, 0, copy);
    const reordered = list.map((x, i) => ({ ...x, sira: i + 1 }));
    setFormData((prev: any) => ({ ...prev, hizliIstekler: reordered }));
    setHizliIsteklerRefreshKey(k => k + 1);
    toast.success(t('istek_cogaltildi', 'Görev akışı çoğaltıldı.'));
  };

  const handleUpdateHizliIstek = (id: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      hizliIstekler: (prev.hizliIstekler || []).map((item: any) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
    setHizliIsteklerRefreshKey(k => k + 1);
  };

  const handleRemoveHizliIstek = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      hizliIstekler: (prev.hizliIstekler || []).filter((item: any) => item.id !== id)
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
    setFormData((prev: any) => ({ ...prev, hizliIstekler: updated }));
    setHizliIsteklerRefreshKey(k => k + 1);
  };

  // ─── KURAL OPERASYONLARI ─────────────────────────────────────────────────────
  const handleOverrideRule = (ruleId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      kurallar: prev.kurallar.map((k: any) => {
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
    toast.success(t('kural_override_alindi', 'Kural düzenleme moduna alındı (Override).'));
  };

  const handleResetRule = (ruleId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      kurallar: prev.kurallar.map((k: any) => {
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
    toast.success(t('kural_base_sifirlandi', 'Kural orijinal Base içeriğine sıfırlandı.'));
  };

  const handleToggleRuleStatus = (ruleId: string) => {
    setFormData((prev: any) => ({
      ...prev,
      kurallar: prev.kurallar.map((k: any) => {
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

  const handleUpdateRuleContent = (ruleId: string, newContent: string) => {
    setFormData((prev: any) => ({
      ...prev,
      kurallar: prev.kurallar.map((k: any) => {
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

  const handleUpdateRuleTitle = (ruleId: string, newTitle: string) => {
    setFormData((prev: any) => ({
      ...prev,
      kurallar: prev.kurallar.map((k: any) => {
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
      baslik: `${t('ozel_kural', 'Özel Kural')} ${formData.kurallar.length + 1}`,
      icerik: '',
      sira: formData.kurallar.length + 1,
      durum: 'Yeni',
      kilitliMi: false,
      orijinalBaseIcerik: null
    };

    setFormData((prev: any) => ({
      ...prev,
      kurallar: [...prev.kurallar, newRule]
    }));
    setSelectedRuleId(newId);
    toast.success(t('yeni_kural_eklendi', 'Yeni kural maddesi eklendi.'));
  };

  const handleDuplicateRule = (ruleId: string) => {
    const target = formData.kurallar.find((k: any) => k.id === ruleId);
    if (!target) return;

    const newId = `KURAL_${Date.now()}`;
    const targetIndex = formData.kurallar.findIndex((k: any) => k.id === ruleId);
    const newRule = {
      id: newId,
      baslik: `${target.baslik} (${t('kopya', 'Kopya')})`,
      icerik: target.icerik,
      sira: target.sira + 1,
      durum: 'Yeni',
      kilitliMi: false,
      orijinalBaseIcerik: null
    };

    const updated = [...formData.kurallar];
    updated.splice(targetIndex + 1, 0, newRule);
    const reordered = updated.map((k, idx) => ({ ...k, sira: idx + 1 }));

    setFormData((prev: any) => ({ ...prev, kurallar: reordered }));
    setSelectedRuleId(newId);
    toast.success(t('kural_cogaltildi', 'Kural maddesi çoğaltıldı.'));
  };

  const handleApplyPreset = (preset: any) => {
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

    setFormData((prev: any) => ({
      ...prev,
      kurallar: [...prev.kurallar, newRule]
    }));
    setSelectedRuleId(newId);
    setShowPresetsModal(false);
    toast.success(`'${preset.baslik}' şablonu eklendi.`);
  };

  const handleDeleteRule = (ruleId: string) => {
    const remaining = formData.kurallar.filter((k: any) => k.id !== ruleId);
    setFormData((prev: any) => ({
      ...prev,
      kurallar: remaining.map((k: any, idx: number) => ({ ...k, sira: idx + 1 }))
    }));
    if (selectedRuleId === ruleId) {
      setSelectedRuleId(remaining[0]?.id || null);
    }
    toast.success(t('kural_silindi', 'Kural maddesi silindi.'));
  };

  const handleMoveRule = (index: number, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= formData.kurallar.length) return;

    const list = [...formData.kurallar];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reordered = list.map((k, idx) => ({ ...k, sira: idx + 1 }));
    setFormData((prev: any) => ({ ...prev, kurallar: reordered }));
  };

  // MCP Araçları Filtreleme & Arama
  const [toolSearch, setToolSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [toolScopeFilter, setToolScopeFilter] = useState('ALL');
  const [expandedSchemaTool, setExpandedSchemaTool] = useState<string | null>(null);

  const { erpToolsCount, adminToolsCount } = useMemo(() => {
    let erp = 0;
    let admin = 0;
    internalTools.forEach(tItem => {
      if (tItem.kapsam === 2 || tItem.aracKodu?.toLowerCase().startsWith('admin_')) admin++;
      else erp++;
    });
    return { erpToolsCount: erp, adminToolsCount: admin };
  }, [internalTools]);

  const categories = useMemo<string[]>(() => {
    const set = new Set<string>();
    internalTools.forEach(tItem => {
      if (tItem.kategoriAdi) set.add(tItem.kategoriAdi);
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

  const handleToggleTool = (aracKodu: string) => {
    setFormData((prev: any) => {
      const isSelected = prev.seciliAracKodlari.some((k: string) => k.toLowerCase() === aracKodu.toLowerCase());
      return {
        ...prev,
        seciliAracKodlari: isSelected
          ? prev.seciliAracKodlari.filter((k: string) => k.toLowerCase() !== aracKodu.toLowerCase())
          : [...prev.seciliAracKodlari, aracKodu]
      };
    });
  };

  const handleSelectAllTools = () => {
    const targetCodes = filteredTools.map(tItem => tItem.aracKodu);
    setFormData((prev: any) => ({
      ...prev,
      seciliAracKodlari: Array.from(new Set([...prev.seciliAracKodlari, ...targetCodes]))
    }));
    toast.success(`${targetCodes.length} ${t('mcp_araci_yetkilendirildi', 'adet MCP aracı yetkilendirildi')}`);
  };

  const handleClearAllTools = () => {
    setFormData((prev: any) => ({
      ...prev,
      seciliAracKodlari: []
    }));
    toast.success(t('mcp_arac_secimleri_temizlendi', 'MCP araç seçimleri temizlendi'));
  };

  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.ad?.trim() || !formData.kod?.trim()) {
      toast.error(t('ajan_ad_ve_kod_zorunlu', 'Lütfen ajan adı ve benzersiz kodunu giriniz.'));
      setActiveTabId('genel');
      return;
    }

    try {
      setIsSaving(true);
      let agentId;

      const finalSystemPrompt = formData.sistemIstemi?.trim()
        ? formData.sistemIstemi.trim()
        : compilePromptPreview(formData.kurallar);

      const payload = {
        ...formData,
        kapsam: parseInt(formData.kapsam, 10) || 1,
        aiSaglayiciId: formData.aiSaglayiciId ? parseInt(formData.aiSaglayiciId, 10) : null,
        sicaklik: parseFloat(formData.sicaklik) || 0.7,
        maxTokens: parseInt(formData.maxTokens, 10) || 2048,
        yanitSenteziModu: parseInt(formData.yanitSenteziModu as any, 10) || 0,
        sistemIstemi: finalSystemPrompt
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

  const selectedProvider = localProviders.find(p => p.id === parseInt(formData.aiSaglayiciId, 10));
  const selectedCount = formData.seciliAracKodlari.length;

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
            setFormData((prev: any) => {
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
  const parseModelsFromData = useCallback((data: any, provList: any[]): AiModelConfig[] => {
    const list: AiModelConfig[] = [];

    if (data?.modelAdi) {
      const prov = provList.find(p => p.id === Number(data.aiSaglayiciId)) ||
        provList.find(p => p.desteklenenModeller?.some((m: string) => m.toLowerCase() === data.modelAdi.toLowerCase()));
      list.push({
        id: `primary-${data.modelAdi}`,
        modelAdi: data.modelAdi,
        aiSaglayiciId: data.aiSaglayiciId ? Number(data.aiSaglayiciId) : (prov?.id || null),
        saglayiciAdi: prov?.ad || '',
        sicaklik: typeof data.sicaklik === 'number' ? data.sicaklik : 0.7,
        maxTokens: data.maxTokens ? Number(data.maxTokens) : 2048
      });
    }

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
          const prov = provList.find(p => p.desteklenenModeller?.some((m: string) => m.toLowerCase() === trimmed.toLowerCase())) ||
            provList.find(p => p.varsayilanModel?.toLowerCase() === trimmed.toLowerCase());
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
          const prov = provList.find(p => p.id === Number(alt.aiSaglayiciId)) ||
            provList.find(p => p.desteklenenModeller?.some((m: string) => m.toLowerCase() === alt.modelAdi.toLowerCase()));
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

  useEffect(() => {
    if (localInitialData) {
      const parsed = parseModelsFromData(localInitialData, localProviders);
      if (parsed.length > 0) {
        setConfiguredModels(parsed);
      }
    }
  }, [localInitialData, localProviders, parseModelsFromData]);

  const syncModelsToFormData = useCallback((newModels: AiModelConfig[]) => {
    setConfiguredModels(newModels);
    if (newModels.length > 0) {
      const primary = newModels[0];
      const altModels = newModels.slice(1);
      setFormData((prev: any) => ({
        ...prev,
        aiSaglayiciId: primary.aiSaglayiciId,
        modelAdi: primary.modelAdi,
        sicaklik: primary.sicaklik,
        maxTokens: primary.maxTokens,
        alternatifModeller: altModels.map(m => m.modelAdi),
        alternatifModellerJson: JSON.stringify(altModels)
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        aiSaglayiciId: null,
        modelAdi: '',
        alternatifModeller: [],
        alternatifModellerJson: '[]'
      }));
    }
  }, []);

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

  const filteredRules = useMemo(() => {
    if (ruleFilter === 'Tümü') return formData.kurallar;
    return formData.kurallar.filter((r: any) => r.durum === ruleFilter);
  }, [formData.kurallar, ruleFilter]);

  const inheritedCount = formData.kurallar.filter((r: any) => r.durum === 'MirasAlindi').length;
  const overriddenCount = formData.kurallar.filter((r: any) => r.durum === 'Ezildi').length;
  const customCount = formData.kurallar.filter((r: any) => r.durum === 'Yeni').length;

  // ─── HIZLI İSTEK SATIR İŞLEM MENÜSÜ (ACTION MENU) ───────────────────────────
  const getHizliIstekRowActions = useCallback((item: any): ActionMenuItem[] => {
    const list = formData.hizliIstekler || [];
    const idx = list.findIndex((x: any) => x.id === item.id);
    const isFirst = idx === 0;
    const isLast = idx === list.length - 1;

    return [
      {
        label: t('flowchart_ve_prompt_duzenle', 'Flowchart & Adım Promptlarını Düzenle'),
        icon: <GitBranch size={14} />,
        onClick: () => handleOpenHizliIstekPage(item)
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
        icon: <Trash2 size={14} />,
        variant: 'danger',
        dividerAbove: true,
        onClick: () => {
          showAlert(
            'confirm',
            t('istek_sil_onay_baslik', 'Görev Akışını Sil'),
            t('istek_sil_onay_mesaj', `'${item.baslik}' görev akışını kaldırmak istediğinize emin misiniz?`),
            () => handleRemoveHizliIstek(item.id),
            t('sil', 'Sil'),
            t('auto_vazgec', 'Vazgeç')
          );
        }
      }
    ];
  }, [formData.hizliIstekler, t, showAlert, handleOpenHizliIstekPage]);

  // ─── HIZLI İSTEKLER & GÖREV AKIŞLARI TABLO KOLONLARI ─────────────────────────
  const hizliIstekColumns: Column<any>[] = useMemo(() => [
    {
      id: 'baslik',
      header: t('hizli_istek_kolon_baslik', 'Görev / İstek Başlığı'),
      accessor: 'baslik',
      render: (item: any) => (
        <div className="ai-hizli-istek-title-cell">
          <div className="ai-hizli-istek-icon-box">
            {getHizliIstekIcon(item.ikon)}
          </div>
          <div className="flex-col">
            <span className="ai-hizli-istek-title-text">
              {item.baslik || '-'}
            </span>
            {item.hizliErisimDugmesi !== false && (
              <span className="ai-hizli-istek-trigger-tags">
                <Sparkles size={10} />
                <span>{t('hizli_erisim_dugmesi', 'Hızlı Erişim Düğmesi')}: {item.dugmeBasligi || item.baslik}</span>
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      id: 'uiAksiyonu',
      header: t('hizli_istek_kolon_aksiyon', 'Başlangıç UI Aksiyonu'),
      accessor: 'uiAksiyonu',
      render: (item: any) => {
        const firstNodeAction = Array.isArray(item.akisDugumleri) && item.akisDugumleri.length > 0
          ? item.akisDugumleri[0]?.uiAksiyonu
          : undefined;
        const effectiveAction = (item.uiAksiyonu && item.uiAksiyonu !== 'YOK')
          ? item.uiAksiyonu
          : (firstNodeAction || 'YOK');
        const opt = UI_ACTION_OPTIONS.find(o => o.value === effectiveAction || o.id === effectiveAction) || UI_ACTION_OPTIONS[0];
        return (
          <span className={`ai-hizli-istek-action-badge action-${(opt.id || 'YOK').toLowerCase()}`}>
            {t(opt.badge)}
          </span>
        );
      }
    },
    {
      id: 'akisDugumleri',
      header: t('gorev_akisi_flowchart_kolon', 'Görev Akışı (Flowchart)'),
      accessor: 'akisDugumleri',
      render: (item: any) => {
        const nodes: AiAkisDugumu[] = Array.isArray(item.akisDugumleri) ? item.akisDugumleri : [];
        const hasDecision = nodes.some(n => n.tip === 'KARAR_ONAY');
        return (
          <div
            className="ai-flowchart-table-cell"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenHizliIstekPage(item);
            }}
          >
            {nodes.length > 0 ? (
              <span className="ai-flowchart-count-badge has-flow">
                <GitBranch size={12} />
                <span>
                  {nodes.length} {t('adimli_flowchart', 'Adımlı Flowchart')}
                  {hasDecision ? ` (${t('dallanmali', 'Evet/Hayır Dallanmalı')})` : ''}
                </span>
              </span>
            ) : (
              <span className="ai-flowchart-count-badge single-step">
                <Zap size={11} />
                <span>{t('tek_adim_prompt', 'Tek Adım (Flowchart Tasarla)')}</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'prompt',
      header: t('gorev_amaci_kolon_baslik', 'Görev Amacı / Başlangıç Talimatı'),
      accessor: 'prompt',
      render: (item: any) => {
        const prompt = item.akisDugumleri?.[0]?.prompt || item.prompt || '';
        return (
          <span className="ai-hizli-istek-prompt-preview" title={prompt}>
            {prompt.length > 65 ? `${prompt.substring(0, 65)}...` : (prompt || '-')}
          </span>
        );
      }
    },
    {
      id: 'aktifMi',
      header: t('durum', 'Durum'),
      accessor: 'aktifMi',
      width: 110,
      render: (item: any) => (
        <div className="ai-hizli-istek-status-cell" onClick={e => e.stopPropagation()}>
          <BaseSwitch
            checked={item.aktifMi !== false}
            onChange={(val: any) => {
              const checked = typeof val === 'boolean' ? val : val?.target?.checked;
              handleUpdateHizliIstek(item.id, 'aktifMi', checked);
            }}
          />
          <span className={item.aktifMi !== false ? 'ai-hizli-istek-status-active' : 'ai-hizli-istek-status-passive'}>
            {item.aktifMi !== false ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      header: t('islemler', 'İşlemler'),
      align: 'right',
      width: 60,
      render: (item: any) => (
        <div onClick={e => e.stopPropagation()}>
          <ActionMenu actions={getHizliIstekRowActions(item)} />
        </div>
      )
    }
  ], [t, formData.hizliIstekler, getHizliIstekRowActions]);

  // ─── MCP YETKİLERİ TABLO VERİSİ & KOLONLARI ──────────────────────────────────
  const selectedMcpTools = useMemo(() => {
    const codes: string[] = Array.isArray(formData.seciliAracKodlari) ? formData.seciliAracKodlari : [];
    return codes.map((code) => {
      const found = internalTools.find(
        (tItem: any) => tItem.aracKodu?.toLowerCase() === code.toLowerCase()
      );
      return found || {
        id: code,
        aracKodu: code,
        aracAdi: code,
        kategoriAdi: t('genel', 'Genel'),
        aciklama: '',
        kapsam: code.toLowerCase().startsWith('admin_') ? 2 : 1
      };
    });
  }, [formData.seciliAracKodlari, internalTools, t]);

  const mcpToolColumns: Column<any>[] = useMemo(() => [
    {
      id: 'aracAdi',
      header: t('arac_adi', 'Araç Adı'),
      accessor: 'aracAdi',
      render: (tool: any) => {
        const isToolAdmin = tool.kapsam === 2 || tool.aracKodu?.toLowerCase().startsWith('admin_');
        return (
          <div className="ai-hizli-istek-title-cell">
            <div className="ai-hizli-istek-icon-box">
              {isToolAdmin ? <Shield size={16} /> : getToolIcon(tool.ikon, tool.kategoriAdi)}
            </div>
            <div className="flex-col">
              <span className="ai-hizli-istek-title-text">
                {tool.aracAdi || tool.aracKodu}
              </span>
              <code className="ai-flowchart-tool-tag">
                {tool.aracKodu}
              </code>
            </div>
          </div>
        );
      }
    },
    {
      id: 'kategoriAdi',
      header: t('kategori', 'Kategori'),
      accessor: 'kategoriAdi',
      render: (tool: any) => (
        <span className="ai-flowchart-step-num">
          {tool.kategoriAdi || t('genel', 'Genel')}
        </span>
      )
    },
    {
      id: 'kapsam',
      header: t('kapsam', 'Kapsam'),
      accessor: 'kapsam',
      render: (tool: any) => {
        const isToolAdmin = tool.kapsam === 2 || tool.aracKodu?.toLowerCase().startsWith('admin_');
        return (
          <span className={`ai-ajan-scope-badge ${isToolAdmin ? 'scope-admin' : 'scope-erp'}`}>
            {isToolAdmin ? `🛡️ ${t('admin', 'Admin')}` : `🏢 ${t('erp', 'ERP')}`}
          </span>
        );
      }
    },
    {
      id: 'aciklama',
      header: t('aciklama', 'Açıklama'),
      accessor: 'aciklama',
      render: (tool: any) => (
        <span className="ai-hizli-istek-prompt-preview" title={tool.aciklama || ''}>
          {tool.aciklama || '-'}
        </span>
      )
    },
    {
      id: 'actions',
      header: t('islemler', 'İşlemler'),
      align: 'right',
      width: 60,
      render: (tool: any) => (
        <div onClick={e => e.stopPropagation()}>
          <ActionMenu
            actions={[
              {
                label: t('kaldir', 'Kaldır'),
                icon: <Trash2 size={14} />,
                variant: 'danger',
                onClick: () => handleToggleTool(tool.aracKodu)
              }
            ]}
          />
        </div>
      )
    }
  ], [t]);

  // ─── SEKME TANIMLARI ──────────────────────────────────────────────────────────
  const tabs = [
    {
      id: 'genel',
      label: t('genel_bilgiler_sekme', 'Genel Bilgiler'),
      icon: <Bot size={16} />,
      content: (
        <div className="ai-ajan-tab-container">
          {!formData.sistemKaydiMi && (
            <div className="ai-ajan-section-card">
              <div className="ai-ajan-section-header">
                <label className="ai-ajan-section-title">
                  <GitBranch size={16} />
                  <span>{t('miras_alinan_base_ajan', 'Miras Alınan Base (Temel) Ajan')}</span>
                </label>
                {formData.ustAjanId && (
                  <span className="ai-ajan-inherit-badge">
                    {t('base_kurallari_miras_alindi', '✓ Base kuralları miras alındı')}
                  </span>
                )}
              </div>

              <div className="ai-ajan-select-row">
                <select
                  value={formData.ustAjanId || ''}
                  onChange={handleBaseAgentChange}
                  className="ai-ajan-base-select"
                >
                  <option value="">{t('bagimsiz_kok_ajan_miras_yok', '(Bağımsız / Kök Ajan - Miras Yok)')}</option>
                  {baseAgentOptions.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.sistemKaydiMi ? `👑 ${agent.ad} (${t('sistem_base_ajani', 'Sistem Base Ajanı')})` : `🌿 ${agent.ad}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ai-ajan-hint-text">
                {t('base_ajan_aciklama', 'Bir Base ajan seçildiğinde çekirdek sistem istemi ve görev akışları otomatik yüklenir.')}
              </div>
            </div>
          )}

          {/* Ajan Kapsamı (ERP / Admin) */}
          <div className="ai-ajan-section-card">
            <div className="ai-ajan-section-header">
              <label className="ai-ajan-section-title">
                <ShieldAlert size={15} />
                <span>{t('ajan_kapsami_baslik', 'Ajan Çalışma Kapsamı & Yetki Alanı')} *</span>
              </label>
              <span className={`ai-ajan-scope-badge ${formData.kapsam === 2 ? 'scope-admin' : 'scope-erp'}`}>
                {formData.kapsam === 2 ? t('kapsam_admin_badge', '🛡️ Admin Paneli') : t('kapsam_erp_badge', '🏢 ERP Kullanıcıları')}
              </span>
            </div>

            <div className="ai-ajan-segmented-bar">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, kapsam: 1 })}
                className={`ai-ajan-segment-btn ${formData.kapsam === 1 ? 'active-erp' : ''}`}
              >
                <span>🏢</span>
                <span>{t('kapsam_erp_btn', 'ERP & Şirket Kullanıcıları')}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, kapsam: 2 })}
                className={`ai-ajan-segment-btn ${formData.kapsam === 2 ? 'active-admin' : ''}`}
              >
                <span>🛡️</span>
                <span>{t('kapsam_admin_btn', 'Sistem Yönetimi & Admin')}</span>
              </button>
            </div>
            <span className="ai-ajan-hint-text">
              {formData.kapsam === 2
                ? t('kapsam_admin_hint', 'Bu ajan yalnızca Admin paneli süper adminlerine özeldir; ERP kullanıcı ekranlarına kapatılır.')
                : t('kapsam_erp_hint', 'Bu ajan ERP web uygulamasındaki şirket kullanıcıları ve yetkili personeller tarafından kullanılır.')}
            </span>
          </div>

          {/* Ajan Adı & Kodu */}
          <div className="ai-ajan-two-col-grid">
            <div>
              <label className="ai-ajan-field-label">
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
              <label className="ai-ajan-field-label">
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
          <div className="ai-ajan-two-col-grid">
            <div>
              <label className="ai-ajan-field-label">
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
              <label className="ai-ajan-field-label">
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
        <div className="ai-model-tab-layer">
          <div className="ai-ajan-section-card">
            <div className="ai-ajan-section-header">
              <div className="ai-ajan-section-title">
                <Sparkles size={16} />
                <span>{t('ai_yanit_sentezi_politikasi', 'Akıllı Yanıt Sentezi & Token Politikası')}</span>
              </div>
              <span className="ai-ajan-hint-text">
                {t('ai_yanit_sentezi_aciklama', 'Araç ve validasyon çıktılarının LLM tarafından insansı yorumlanması')}
              </span>
            </div>

            <div className="ai-synthesis-options-row">
              {[
                { value: 0, label: t('yanit_sentezi_sistem', '🌐 Sistem Ayarını Kullan'), desc: t('yanit_sentezi_sistem_desc', 'Genel sistem ayarını miras alır') },
                { value: 1, label: t('yanit_sentezi_acik', '✨ Zorunlu Açık (LLM Sentezi)'), desc: t('yanit_sentezi_acik_desc', 'Araç sonuçlarını daima LLM doğal dille sentezler (+1 tur token)') },
                { value: 2, label: t('yanit_sentezi_kapali', '⚡ Zorunlu Kapalı (Hızlı Mod)'), desc: t('yanit_sentezi_kapali_desc', 'Token tasarrufu, doğrudan teknik araç çıktısını döner') }
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`ai-synthesis-option-card ${formData.yanitSenteziModu === opt.value ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="yanitSenteziModu"
                    value={opt.value}
                    checked={formData.yanitSenteziModu === opt.value}
                    onChange={() => setFormData((prev: any) => ({ ...prev, yanitSenteziModu: opt.value }))}
                    className="ai-synthesis-radio"
                  />
                  <div>
                    <div className="ai-synthesis-opt-title">{opt.label}</div>
                    <div className="ai-synthesis-opt-desc">{opt.desc}</div>
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
      label: t('sabit_sistem_istemi_ve_sinirlar_sekme', 'Sistem İstemi & Sınırlar'),
      icon: <SlidersHorizontal size={16} />,
      content: (
        <div className="ai-system-prompt-tab">
          {/* Üst Mod Seçici: Sabit Sistem İstemi (Anayasa) vs Madde Bazlı Kurallar */}
          <div className="ai-system-prompt-topbar">
            <div className="ai-system-mode-switcher">
              <button
                type="button"
                className={`ai-system-mode-btn ${systemPromptViewMode === 'sabitPrompt' ? 'active' : ''}`}
                onClick={() => setSystemPromptViewMode('sabitPrompt')}
              >
                <Shield size={14} />
                <span>{t('sabit_sistem_istemi_anayasa', 'Sabit Sistem İstemi & Yetki Sınırları (Anayasa)')}</span>
              </button>
              <button
                type="button"
                className={`ai-system-mode-btn ${systemPromptViewMode === 'kurallar' ? 'active' : ''}`}
                onClick={() => setSystemPromptViewMode('kurallar')}
              >
                <Layers size={14} />
                <span>{t('madde_bazli_kurallar', 'Madde Bazlı Kurallar')} ({formData.kurallar.length})</span>
              </button>
            </div>

            {systemPromptViewMode === 'sabitPrompt' ? (
              <div className="ai-guardrail-quick-actions">
                <button
                  type="button"
                  className="ai-guardrail-chip-btn"
                  onClick={() =>
                    handleAppendGuardrailToSystemPrompt(
                      'YETKİ SINIRLARI VE KONU DIŞI REDDİ',
                      'Görev ve yetki alanın yalnızca Webakus ERP işlemleri, ticari belgeler, cari hesaplar, stok/ürün yönetimi ve şirket içi analizlerle sınırlıdır. Kullanıcı bu kapsamın dışında (genel kültür, yemek tarifi, spor, siyaset, sohbet vb.) bir soru sorduğunda nazik bir dille yalnızca Webakus ERP süreçlerinde yardımcı olabileceğini belirterek geri çevir.'
                    )
                  }
                >
                  <ShieldAlert size={13} />
                  <span>{t('konu_disi_reddi_ekle', '+ Yetki Sınırı & Konu Dışı Reddi Ekle')}</span>
                </button>
                <button
                  type="button"
                  className="ai-guardrail-chip-btn"
                  onClick={() =>
                    handleAppendGuardrailToSystemPrompt(
                      'OTONOM MCP VE FLOWCHART ÇALIŞMA İLKESİ',
                      'Yetki sınırların içerisindeki genel taleplerde tanımlı MCP araçlarının açıklamalarını okuyarak kendi zekanla doğru aracı çalıştır. Ancak tanımlı bir Görev Akışı (Flowchart) tetiklendiğinde ilgili akış diyagramındaki adım yönergelerini sırasıyla takip et.'
                    )
                  }
                >
                  <Sparkles size={13} />
                  <span>{t('otonom_mcp_ilkesi_ekle', '+ Otonom MCP & Flowchart İlkesi Ekle')}</span>
                </button>
                <button
                  type="button"
                  className="ai-guardrail-chip-btn"
                  onClick={handleSyncRulesToSystemPrompt}
                  title={t('maddelerden_aktar_aciklama', 'Madde bazlı kuralları birleştirip bu alana yazar')}
                >
                  <RotateCcw size={13} />
                  <span>{t('maddelerden_aktar', 'Maddelerden Derle')}</span>
                </button>
              </div>
            ) : (
              <div className="ai-rules-toolbar-actions">
                <div className="ai-rules-stats-group">
                  <span className="ai-rules-stat-label">{t('maddeler', 'Maddeler')}:</span>
                  <span className="ai-rules-stat-pill total">{formData.kurallar.length} {t('toplam', 'Toplam')}</span>
                  {inheritedCount > 0 && <span className="ai-rules-stat-pill inherited">{inheritedCount} {t('miras', 'Miras')}</span>}
                  {overriddenCount > 0 && <span className="ai-rules-stat-pill overridden">{overriddenCount} {t('ezildi', 'Ezildi')}</span>}
                  {customCount > 0 && <span className="ai-rules-stat-pill custom">{customCount} {t('ozel', 'Özel')}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPresetsModal(!showPresetsModal)}
                  className="btn btn-secondary ai-rules-toolbar-btn"
                >
                  <BookOpen size={13} />
                  <span>{t('hazir_sablonlar', 'Hazır Şablonlar')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomRule}
                  className="btn btn-primary ai-rules-toolbar-btn"
                >
                  <Plus size={13} />
                  <span>{t('yeni_madde', 'Yeni Madde')}</span>
                </button>
              </div>
            )}
          </div>

          {systemPromptViewMode === 'sabitPrompt' ? (
            <>
              <div className="ai-guardrail-banner">
                <div className="ai-guardrail-banner-info">
                  <Shield size={18} />
                  <div className="ai-guardrail-banner-text">
                    <strong>{t('katman_1_sabit_sistem_istemi_baslik', 'Katman 1 — Sabit Sistem İstemi (Ajan Anayasası & Yetki Sınırları):')}</strong>{' '}
                    {t(
                      'katman_1_sabit_sistem_istemi_aciklama',
                      'Burada ajanın kimliğini, yetki sınırlarını ve konu dışı soruları nazikçe reddetme kuralını belirleyin. Ajan, standart ERP sorularını MCP araçlarını okuyarak kendi zekasıyla bu sınırlar içinde çözer; çok adımlı tanımlı görevlerde ise "Görev Akışları & Hızlı İstekler (Flowchart)" sekmesindeki diyagramı takip eder.'
                    )}
                  </div>
                </div>
              </div>

              <div className="ai-system-prompt-editor-box">
                <textarea
                  className="ai-system-prompt-textarea"
                  value={formData.sistemIstemi || ''}
                  onChange={e => setFormData((prev: any) => ({ ...prev, sistemIstemi: e.target.value }))}
                  placeholder={t(
                    'sabit_sistem_istemi_placeholder',
                    'Örn: Sen Webakus ERP sisteminde görev yapan uzman Satış ve Fatura Asistanısın. Yalnızca ERP kapsamındaki cari, stok, sipariş ve fatura işlemlerinde yardımcı olabilirsin. Kullanıcı konu dışı bir şey sorduğunda nazikçe yalnızca Webakus ERP işlemleri konusunda yardımcı olabileceğini belirt...'
                  )}
                />
                <div className="ai-system-prompt-footer">
                  <span>
                    {t('sabit_prompt_notu', 'Kaydettiğinizde bu metin doğrudan ajanın Sabit Sistem İstemi (System Prompt) olarak veritabanına yazılır.')}
                  </span>
                  <span>
                    {(formData.sistemIstemi || '').length} {t('karakter', 'Karakter')} • ~{Math.round(((formData.sistemIstemi || '').length) / 4)} Token
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {showPresetsModal && (
                <div className="ai-rules-presets-popover">
                  <div className="ai-ajan-section-header">
                    <div className="ai-ajan-section-title">
                      <Sparkles size={16} />
                      <span>{t('hazir_erp_kural_sablonlari', 'Hazır ERP Kural Şablonları (Tek Tıkla Ekle)')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPresetsModal(false)}
                      className="ai-flowchart-icon-btn"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="ai-rules-presets-grid">
                    {ERP_RULE_PRESETS.map((preset, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => handleApplyPreset(preset)}
                        className="ai-rules-preset-item"
                      >
                        <div className="ai-ajan-section-header">
                          <span className="font-bold text-xs text-primary">{preset.baslik}</span>
                          <span className="text-xs font-bold text-accent">+ {t('ekle', 'Ekle')}</span>
                        </div>
                        <span className="ai-ajan-hint-text">{preset.aciklama}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="ai-rules-master-detail">
                <div className="ai-rules-sidebar">
                  <div className="ai-rules-filter-bar">
                    {['Tümü', 'MirasAlindi', 'Ezildi', 'Yeni'].map(fil => (
                      <button
                        key={fil}
                        type="button"
                        onClick={() => setRuleFilter(fil)}
                        className={`ai-rules-filter-btn ${ruleFilter === fil ? 'active' : ''}`}
                      >
                        {fil === 'Tümü' ? t('tumu', 'Tümü') : fil === 'MirasAlindi' ? 'Base' : fil === 'Ezildi' ? t('ezilen', 'Ezilen') : t('ozel', 'Özel')}
                      </button>
                    ))}
                  </div>

                  <div className="ai-rules-list-scroll">
                    {filteredRules.length === 0 ? (
                      <div className="ai-flowchart-empty-state">
                        {t('kural_bulunamadi', 'Kural bulunamadı.')}
                      </div>
                    ) : (
                      filteredRules.map((rule: any, index: number) => {
                        const isSelected = activeRule?.id === rule.id;
                        const isDisabled = rule.durum === 'DevreDisi';

                        return (
                          <div
                            key={rule.id || index}
                            onClick={() => setSelectedRuleId(rule.id)}
                            className={`ai-rule-list-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          >
                            <div className="ai-ajan-section-header">
                              <div className="flex-row items-center gap-6">
                                <span className="ai-flowchart-step-num">
                                  #{rule.sira || index + 1}
                                </span>
                                <span className="ai-flowchart-node-title">
                                  {rule.baslik || t('basliksiz_madde', 'Başlıksız Madde')}
                                </span>
                              </div>

                              <div className="ai-flowchart-node-controls">
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={(e) => handleMoveRule(index, 'up', e)}
                                  className="ai-flowchart-icon-btn"
                                  title={t('yukari_tasi', 'Yukarı Taşı')}
                                >
                                  <ArrowUp size={11} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === formData.kurallar.length - 1}
                                  onClick={(e) => handleMoveRule(index, 'down', e)}
                                  className="ai-flowchart-icon-btn"
                                  title={t('asagi_tasi', 'Aşağı Taşı')}
                                >
                                  <ArrowDown size={11} />
                                </button>
                              </div>
                            </div>

                            <div className="ai-ajan-section-header">
                              <span className="ai-ajan-hint-text">
                                {rule.icerik ? `${rule.icerik.substring(0, 35)}...` : t('icerik_bos', '(İçerik boş)')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {activeRule ? (
                  <div className="ai-rule-detail-panel">
                    <div className="ai-rule-detail-header">
                      <div className="flex-row items-center gap-8">
                        <input
                          type="text"
                          value={activeRule.baslik || ''}
                          onChange={e => handleUpdateRuleTitle(activeRule.id, e.target.value)}
                          placeholder={t('kural_basligi_placeholder', 'Kural Başlığı...')}
                          className="ai-rule-title-input"
                        />
                        <code className="ai-flowchart-tool-tag">[{activeRule.id}]</code>
                      </div>

                      <div className="flex-row items-center gap-6">
                        {activeRule.durum === 'MirasAlindi' && (
                          <button
                            type="button"
                            onClick={() => handleOverrideRule(activeRule.id)}
                            className="btn btn-primary btn-sm"
                          >
                            <Zap size={12} /> {t('kurali_ez', 'Kuralı Ez (Override)')}
                          </button>
                        )}
                        {activeRule.durum === 'Ezildi' && (
                          <button
                            type="button"
                            onClick={() => handleResetRule(activeRule.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            <RotateCcw size={12} /> {t('base_sifirla', "Base'e Sıfırla")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDuplicateRule(activeRule.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Copy size={12} /> {t('cogalt', 'Çoğalt')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(activeRule.id)}
                          className="btn btn-secondary btn-sm text-danger"
                        >
                          <Trash2 size={12} /> {t('sil', 'Sil')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleRuleStatus(activeRule.id)}
                          className="btn btn-secondary btn-sm"
                        >
                          {activeRule.durum === 'DevreDisi' ? t('etkinlestir', 'Etkinleştir') : t('devre_disi', 'Devre Dışı')}
                        </button>
                      </div>
                    </div>

                    <div className="ai-rule-detail-body">
                      <textarea
                        value={activeRule.icerik || ''}
                        onChange={e => handleUpdateRuleContent(activeRule.id, e.target.value)}
                        placeholder={t('kural_icerik_placeholder', 'Bu madde için yapay zekaya gidecek talimat metnini yazın...')}
                        disabled={activeRule.durum === 'DevreDisi'}
                        className="ai-system-prompt-textarea"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="ai-flowchart-empty-state">
                    {t('duzenlemek_icin_kural_secin', 'Düzenlemek için sol taraftan bir kural maddesi seçin.')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )
    },
    {
      id: 'hizliIstekler',
      label: `${t('gorev_akislari_sekme', 'Görev Akışları')} (${(formData.hizliIstekler || []).length})`,
      icon: <Zap size={16} />,
      content: (
        <div className="table-responsive rounded border border-glass">
          <DataTable
            data={formData.hizliIstekler || []}
            columns={hizliIstekColumns}
            keyExtractor={(item) => item.id || ''}
            enableRowReorder={true}
            showRowIndex={true}
            showRowOrderButtons={false}
            onRowReorder={(newData) => {
              setFormData((prev: any) => ({ ...prev, hizliIstekler: newData }));
              setHizliIsteklerRefreshKey(k => k + 1);
            }}
            emptyMessage={t('hizli_istek_bulunamadi', 'Henüz tanımlanmış görev akışı veya hızlı ERP isteği bulunmuyor.')}
            onRowDoubleClick={(item) => handleOpenHizliIstekPage(item)}
          />

          <EkleFloatCircleButton
            onClick={() => handleOpenHizliIstekPage(null)}
            position="absolute-bottom-right"
            title={t('yeni_gorev_akisi_ekle', 'Yeni Görev Akışı Ekle')}
          />
        </div>
      )
    },
    {
      id: 'mcp',
      label: `${t('mcp_yetkileri_sekme', 'MCP Yetkileri')} (${selectedCount})`,
      icon: <Code2 size={16} />,
      content: (
        <div className="table-responsive rounded border border-glass">
          <DataTable
            data={selectedMcpTools}
            columns={mcpToolColumns}
            keyExtractor={(item) => String(item.aracKodu || item.id || '')}
            showRowIndex={true}
            emptyMessage={t('mcp_yetkisi_bulunamadi', 'Henüz tanımlanmış MCP yetkisi bulunmuyor.')}
          />

          <EkleFloatCircleButton
            onClick={() => {}}
            position="absolute-bottom-right"
            title={t('mcp_yetkisi_ekle', 'MCP Yetkisi Ekle')}
          />
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
            onChange={(e: any) => setFormData((prev: any) => ({ ...prev, aktifMi: e.target.checked }))}
            label={
              <span className="flex items-center gap-8">
                <Power size={15} className={formData.aktifMi ? 'text-success' : 'text-secondary'} />
                <span className="font-medium">{t('durum', 'Durum')}:</span>
                <span className={formData.aktifMi ? 'text-success font-semibold' : 'text-secondary font-semibold'}>
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
        label: t('sabit_sistem_istemi_duzenle', 'Sabit Sistem İstemi & Yetki Sınırları'),
        icon: <Shield size={15} />,
        onClick: () => {
          setActiveTabId('istem');
          setSystemPromptViewMode('sabitPrompt');
        }
      },
      {
        label: t('gorev_akislari_menu_adimi', 'Görev Akışları (Flowchart)'),
        icon: <GitBranch size={15} />,
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
              } catch {
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

  // ─── ALT SAYFA: GÖREV AKIŞI (FLOWCHART) & HIZLI İSTEK DÜZENLEME ──────────────
  const isHizliIstekRoute = location.pathname.includes('/hizli-istek');
  if (isHizliIstekRoute) {
    const targetParentRoute = effectiveId
      ? (isUnderAyarlar ? `/ayarlar/YapayZekaAyarlari/AiAjanlar/${effectiveId}` : `/ai-ajanlar/${effectiveId}`)
      : (isUnderAyarlar ? '/ayarlar/YapayZekaAyarlari/AiAjanlar' : '/ai-ajanlar');

    return (
      <AiAjanHizliIstekForm
        agentId={effectiveId}
        initialAgentData={formData}
        backRoute={targetParentRoute}
        onClose={() => navigate(targetParentRoute, { state: { activeTabId: 'hizliIstekler' } })}
        onBack={() => navigate(targetParentRoute, { state: { activeTabId: 'hizliIstekler' } })}
        onSuccess={() => {
          if (effectiveId) {
            axios.get(`/api/AiAjanlar/${effectiveId}`)
              .then(res => {
                if (res.data) setFormData(res.data);
              })
              .catch(() => { });
          }
          navigate(targetParentRoute, { state: { activeTabId: 'hizliIstekler' } });
        }}
      />
    );
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
