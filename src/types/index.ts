/**
 * @akalin/ai_management_module - Tip Tanımları (src/types/index.ts)
 */

export interface AiProtokol {
  id: number;
  ad: string;
  aciklama?: string;
  requestScript: string;
  responseScript: string;
  modelsScript?: string;
  sistemProtokoluMu: boolean;
  bagliSaglayiciSayisi: number;
}

export interface AiProtokolTestDto {
  protokolId?: number;
  requestScript: string;
  responseScript: string;
  modelsScript?: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  testMessage: string;
}

export interface AiScriptResponseOutput {
  content: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface FirmaTokenCuzdan {
  id: number;
  firmaId: number;
  firmaAdi: string;
  toplamYuklenenKredi: number;
  harcananKredi: number;
  kalanKredi: number;
  paketAdi: string;
  otomatikDurdurmaAktifMi: boolean;
  sonYuklemeTarihi?: string;
}

export interface TokenKrediYukleDto {
  firmaId: number;
  krediMiktari: number;
  paketAdi: string;
  aciklama?: string;
}

export interface AiTokenHarcamaGecmisi {
  id: number;
  firmaId: number;
  firmaAdi?: string;
  tarih: string;
  kullaniciId?: number;
  kullaniciAdi?: string;
  aiSaglayiciId?: number;
  saglayiciAdi?: string;
  modelAdi: string;
  promptTokens: number;
  completionTokens: number;
  toplamHamToken: number;
  modelKatsayisi: number;
  dusulenKredi: number;
  islemTuru: string;
  yanitSuresiMs: number;
  basariliMi: boolean;
  hataMesaji?: string;
}

export interface AiModelFiyatlandirma {
  id: number;
  modelPattern: string;
  krediCarpani: number;
  aciklama?: string;
  aktifMi: boolean;
}

export interface AiSaglayici {
  id: number;
  ad: string;
  saglayiciTuru: number;
  aiProtokolId?: number | null;
  baseUrl?: string;
  apiKey?: string;
  varsayilanModel?: string;
  desteklenenModeller?: string[];
  aktifMi: boolean;
  aciklama?: string;
  bagliAjanSayisi?: number;
  sistemKaydiMi?: boolean;
}

export type AiHizliIstekUiAksiyonu =
  | 'YOK'
  | 'BULUT_DOSYA_SEC'
  | 'METIN_YAPISTIR_MODAL'
  | 'EXCEL_IMPORT'
  | 'CARI_SEC'
  | 'URUN_SEC'
  | 'OZEL_ROTA'
  | string;

export type AiAkisDugumuTipi =
  | 'BASLANGIC_GIRDI'
  | 'MCP_SORGULA'
  | 'KARAR_ONAY'
  | 'EKRAN_AC'
  | 'BELGE_OLUSTUR'
  | 'SONUC'
  | string;

export interface AiAkisDugumu {
  id: string;
  tip: AiAkisDugumuTipi;
  baslik: string;
  prompt: string;
  aracKodu?: string;
  uiAksiyonu?: AiHizliIstekUiAksiyonu;
  hedefRota?: string;
  sonrakiDugumId?: string;
  evetDugumId?: string;
  hayirDugumId?: string;
}

export interface AiHizliIstek {
  id?: string;
  baslik: string;
  prompt?: string;
  ikon?: string;
  uiAksiyonu?: AiHizliIstekUiAksiyonu;
  uiParametreleriJson?: string;
  sira?: number;
  aktifMi?: boolean;
  tetiklemeAnahtarlari?: string;
  akisDugumleri?: AiAkisDugumu[];
}

export interface AiAjan {
  id: number;
  ad: string;
  kod: string;
  rol?: string;
  aciklama?: string;
  ikon?: string;
  renk?: string;
  kapsam?: number; // 1: ERP, 2: ADMIN
  ustAjanId?: number | null;
  ustAjanAdi?: string;
  kurallar?: any[];
  aiSaglayiciId?: number | null;
  modelAdi?: string;
  sicaklik?: number;
  maxTokens?: number;
  aktifMi: boolean;
  sistemKaydiMi: boolean;
  ajanAraclari?: any[];
  hizliIstekler?: AiHizliIstek[];
}

export interface AiAracKatalogItem {
  id?: number;
  kod: string;
  ad: string;
  aciklama?: string;
  kategori?: string;
  parametreSemasi?: any;
}

export interface AiAracSablonItem {
  id?: number;
  kod: string;
  ad: string;
  aciklama?: string;
  aracKodlari?: string[];
}

export interface IAiManagementAdapter {
  protokol: {
    getAll(): Promise<AiProtokol[]>;
    getById(id: number): Promise<AiProtokol>;
    create(data: Partial<AiProtokol>): Promise<AiProtokol>;
    update(id: number, data: Partial<AiProtokol>): Promise<AiProtokol>;
    delete(id: number): Promise<void>;
    testProtocol(dto: AiProtokolTestDto): Promise<AiScriptResponseOutput>;
  };
  token: {
    getTumCuzdanlar(): Promise<FirmaTokenCuzdan[]>;
    getCuzdan(firmaId?: number): Promise<FirmaTokenCuzdan>;
    krediYukle(dto: TokenKrediYukleDto): Promise<FirmaTokenCuzdan>;
    getHarcamalar(firmaId?: number, take?: number): Promise<AiTokenHarcamaGecmisi[]>;
    getTarifeler(): Promise<AiModelFiyatlandirma[]>;
    saveTarife(dto: Partial<AiModelFiyatlandirma>): Promise<AiModelFiyatlandirma>;
    deleteTarife(id: number): Promise<void>;
  };
  saglayici: {
    getAll(): Promise<AiSaglayici[]>;
    getById(id: number): Promise<AiSaglayici>;
    create(data: Partial<AiSaglayici>): Promise<AiSaglayici>;
    update(id: number, data: Partial<AiSaglayici>): Promise<AiSaglayici>;
    delete(id: number): Promise<void>;
    testConnection(id: number): Promise<{ success: boolean; message: string }>;
    testStandalone(data: any): Promise<{ success: boolean; message: string }>;
    reset(id: number): Promise<void>;
    fetchModels(id: number): Promise<string[]>;
  };
  ajan: {
    getAll(): Promise<AiAjan[]>;
    getById(id: number): Promise<AiAjan>;
    create(data: Partial<AiAjan>): Promise<AiAjan>;
    update(id: number, data: Partial<AiAjan>): Promise<AiAjan>;
    delete(id: number): Promise<void>;
    getKatalog(): Promise<AiAracKatalogItem[]>;
    getSablonlar(): Promise<AiAracSablonItem[]>;
    setAjanAraclari(agentId: number, aracKodlari: string[]): Promise<void>;
  };
  ayarlar: {
    getYanitSenteziAyar(): Promise<boolean>;
    setYanitSenteziAyar(aktif: boolean): Promise<void>;
  };
}
