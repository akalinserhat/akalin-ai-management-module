/**
 * @akalin/ai_management_module - Temel Flowchart Öğe Ayarları Kart Sayfası (BaseAiAjanFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Tüm Flowchart akış düğümü ayar sayfaları (Başla, Form Aç, AI İşlemi, Karar, Belge vb.) için ortak temel kart sayfası iskeletini sunmak
 * - @akalin/ui TabLayout bileşenini kullanarak her düğümde "Ayarlar" ve "Önceki Düğüm" sekmeli mimarisini standartlaştırmak
 * - Her düğüm tipi için vermeyi taahhüt ettiği sabit bir JSON Schema (FlowchartNodeJsonSchema) sözleşmesi tanımlamak
 * - "Form Aç" (FORM_AC) düğümüne özel olarak, düğümün kendi JSON şeması ve verisi içerisinde açtığı Belgenin veya Kartın kendi JSON Schema'sını ve Kaydet çıktısını (`belgeVerisi`) barındırmak
 * - Bir önceki düğümün taahhüt ettiği sabit JSON Schema yapısını "Önceki Düğüm" sekmesinde detaylı olarak göstermek ve "Ayarlar" sekmesinde bu şema değerlerini kullanabilmeyi sağlamak
 * - @akalin/ui BaseCardPage temel bileşenini sarmalayarak standart form mimarisi, ActionMenu ve Breadcrumb senkronizasyonu sağlamak
 * - Zero Bottom Button, Header-Only Actions, Sıfır Header Rozeti, Sıfır Inline CSS ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Sliders,
  Workflow,
  FileText,
  Database,
  Sparkles,
  ArrowRight,
  Check,
  Plus,
  Play,
  Monitor,
  Cpu,
  GitBranch,
  Braces,
  Copy,
  Code2,
  Layers,
  CheckCircle2,
  CornerDownRight,
  Paperclip,
  AtSign,
  Files,
  Cloud,
  X,
  Filter
} from 'lucide-react';
import {
  BaseCardPage,
  BaseSwitch,
  JsonView,
  NotInput,
  TabLayout,
  useHeaderApi,
  type BaseTabItem,
  type NotInputProps
} from '@akalin/ui';
import type {
  AiAkisDugumu,
  AiOncekiDugumGirdiAyarlari,
  FlowchartAttachedFileBinding,
  FlowchartNodeJsonSchema,
  FlowchartNodeJsonSchemaProperty
} from '../types';
import {
  DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB,
  DEFAULT_ONCEKI_DUGUM_GIRDISI,
  getFlowchartOgeAyarDefaultActiveTab,
  getFlowchartOgeAyarDefaultValues
} from '../defaults/flowchartOgeAyarDefaultValue';
import { useFlowchartOgeAyarAutoFocus } from '../hooks/useFlowchartOgeAyarAutoFocus';

export interface FlowchartPreviousNodeOutputField {
  key: string;
  propertyPath: string;
  expression: string;
  label: string;
  description: string;
  schemaType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  dataType: 'belge' | 'veri' | 'metin' | 'karar';
  required?: boolean;
  isNested?: boolean;
  /** "Form Aç" düğümünün açtığı Belge/Kartın kendi JSON şemasından gelen alan mı? */
  isEntityField?: boolean;
  exampleValue?: any;
  sourceNodeId: string;
  sourceNodeTitle: string;
  sourceNodeType: string;
}

export interface OpenedEntityFixedJsonSchema {
  entityCode: string;
  entityTitle: string;
  entityCategory: 'belge' | 'kart' | 'liste';
  schemaId: string;
  description: string;
  required: string[];
  properties: Record<string, FlowchartNodeJsonSchemaProperty>;
  example: Record<string, any>;
}

export interface FlowchartOgeAyarContextValue {
  previousNodes: AiAkisDugumu[];
  immediatePreviousNode: AiAkisDugumu | null;
  activeSourceNode: AiAkisDugumu | null;
  previousNodeJsonSchema: FlowchartNodeJsonSchema | null;
  currentNodeOutputJsonSchema: FlowchartNodeJsonSchema;
  availableInputVariables: FlowchartPreviousNodeOutputField[];
  oncekiDugumGirdisi: Required<AiOncekiDugumGirdiAyarlari>;
  updateOncekiDugumGirdisi: (patch: Partial<AiOncekiDugumGirdiAyarlari>) => void;
  insertVariableIntoPrompt: (expression: string) => void;
  activeTab: string | number;
  setActiveTab: (tabId: string | number) => void;
}

const FlowchartOgeAyarContext = createContext<FlowchartOgeAyarContextValue | null>(null);

export const useFlowchartOgeAyarContext = () => useContext(FlowchartOgeAyarContext);

/**
 * "Form Aç" (FORM_AC) düğümünün açtığı Belge veya Kartın Kaydet işleminde ürettiği
 * kendi sabit JSON Schema (belgeVerisi) sözleşmesini çözümler.
 */
export const getOpenedEntityFixedJsonSchema = (
  node: Partial<AiAkisDugumu> | null | undefined,
  prefix: string = '$onceki',
  tFn?: (key: string, defaultText?: string, options?: any) => string
): OpenedEntityFixedJsonSchema => {
  const tr = (key: string, fallback: string) => (tFn ? tFn(key, fallback) : fallback);
  const rawCode = (node?.varlikKodu || node?.mcpVarlikId || '').toLowerCase();
  const rawRoute = (node?.hedefRota || '').toLowerCase();
  const rawTitle = (node?.varlikAdi || '').trim();
  const rawCategory = ((node?.varlikTuru || 'belge').toLowerCase() === 'kart'
    ? 'kart'
    : 'belge') as 'belge' | 'kart';
  const entityExprPrefix = `${prefix}.belgeVerisi`;

  // 1. KAMPANYA BELGESİ (KampanyaForm / KampanyaBelgesiCreateDto)
  if (
    rawCode.includes('kampanya') ||
    rawRoute.includes('kampanya') ||
    rawTitle.toLowerCase().includes('kampanya')
  ) {
    const entityTitle = rawTitle || tr('entity_kampanya_belgesi', 'Kampanya Tanımı Belgesi');
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      id: {
        type: 'number',
        title: tr('schema_entity_id', 'Belge Kayıt ID'),
        description: tr('schema_entity_kampanya_id_desc', 'Kaydedilen kampanya belgesinin veritabanı tekil kimliği'),
        expression: `{{ ${entityExprPrefix}.id }}`,
        required: true,
        example: 1042
      },
      belgeNo: {
        type: 'string',
        title: tr('schema_entity_belge_no', 'Kampanya Belge No'),
        description: tr('schema_entity_kampanya_belge_no_desc', 'Kampanya belgesinin sistem numarası'),
        expression: `{{ ${entityExprPrefix}.belgeNo }}`,
        required: true,
        example: 'KMP-2026-0118'
      },
      adi: {
        type: 'string',
        title: tr('schema_entity_kampanya_adi', 'Kampanya Belgesi Adı'),
        description: tr('schema_entity_kampanya_adi_desc', 'Kaydedilen kampanya belgesinin ana başlığı'),
        expression: `{{ ${entityExprPrefix}.adi }}`,
        required: true,
        example: 'Kasım 2026 BSH Ankastre & Beyaz Eşya Kampanyası'
      },
      baslangicTarihi: {
        type: 'string',
        format: 'date',
        title: tr('schema_prop_baslangic_tarihi', 'Başlangıç Tarihi'),
        description: tr('schema_entity_kampanya_baslangic_desc', 'Kampanya geçerlilik başlangıç tarihi (YYYY-MM-DD)'),
        expression: `{{ ${entityExprPrefix}.baslangicTarihi }}`,
        required: true,
        example: '2026-11-01'
      },
      bitisTarihi: {
        type: 'string',
        format: 'date',
        title: tr('schema_prop_bitis_tarihi', 'Bitiş Tarihi'),
        description: tr('schema_entity_kampanya_bitis_desc', 'Kampanya geçerlilik bitiş tarihi (YYYY-MM-DD)'),
        expression: `{{ ${entityExprPrefix}.bitisTarihi }}`,
        required: true,
        example: '2026-11-30'
      },
      hakedisSonTarihi: {
        type: 'string',
        format: 'date',
        title: tr('schema_entity_hakedis_son_tarihi', 'Hakediş Son Tarihi'),
        description: tr('schema_entity_hakedis_son_tarihi_desc', 'Üretici firma hakediş başvuru son tarihi'),
        expression: `{{ ${entityExprPrefix}.hakedisSonTarihi }}`,
        required: false,
        example: '2026-12-15'
      },
      aktifMi: {
        type: 'boolean',
        title: tr('schema_entity_aktif_mi', 'Aktiflik Durumu'),
        description: tr('schema_entity_aktif_mi_desc', 'Belgenin aktif olup olmadığı bilgisi'),
        expression: `{{ ${entityExprPrefix}.aktifMi }}`,
        required: true,
        example: true
      },
      kampanyalar: {
        type: 'array',
        format: 'json',
        title: tr('schema_entity_kampanya_satirlari', 'Kampanya Kuralları ve Ürün Kalemleri'),
        description: tr(
          'schema_entity_kampanya_satirlari_desc',
          'Belge içerisinde kaydedilen kampanya satırları, aksiyon tutarları/oranları ve ürün kısıt kuralları'
        ),
        expression: `{{ ${entityExprPrefix}.kampanyalar }}`,
        required: true,
        itemsType: 'object',
        itemsProperties: {
          kodu: {
            type: 'string',
            title: tr('schema_entity_kural_kodu', 'Kampanya Satır Kodu'),
            description: tr('schema_entity_kural_kodu_desc', 'Kampanya satırının kodu'),
            expression: `{{ ${entityExprPrefix}.kampanyalar[0].kodu }}`,
            required: true,
            example: 'KMP-01'
          },
          adi: {
            type: 'string',
            title: tr('schema_entity_kural_adi', 'Kampanya Satır Adı'),
            description: tr('schema_entity_kural_adi_desc', 'Kampanya kuralının adı'),
            expression: `{{ ${entityExprPrefix}.kampanyalar[0].adi }}`,
            required: true,
            example: 'Seçili Buzdolaplarında 3.500 TL Fiyat Farkı Desteği'
          },
          aksiyonDegeri: {
            type: 'number',
            title: tr('schema_entity_aksiyon_degeri', 'İndirim / Hakediş Tutarı veya Oranı'),
            description: tr('schema_entity_aksiyon_degeri_desc', 'Uygulanan indirim oranı veya hakediş tutarı'),
            expression: `{{ ${entityExprPrefix}.kampanyalar[0].aksiyonDegeri }}`,
            required: true,
            example: 3500
          }
        },
        example: [
          {
            kodu: 'KMP-01',
            adi: 'Seçili Buzdolaplarında 3.500 TL Fiyat Farkı Desteği',
            aksiyonTipi: 2,
            aksiyonDegeri: 3500,
            firmaHakEdisOrani: 100,
            kurallar: [{ kuralAlani: 1, kuralOperatoru: 1, kuralDegeri: 'KGN56IWE0N', gerekliMiktar: 1 }]
          }
        ]
      }
    };

    return {
      entityCode: 'KampanyaBelgesi',
      entityTitle,
      entityCategory: 'belge',
      schemaId: 'https://webakus.ai/schemas/entities/kampanya-belgesi-output.schema.json',
      description: tr(
        'schema_entity_kampanya_desc',
        'Kampanya Tanımı belgesi kaydedildiğinde üretilen sabit JSON veri şeması (Başlık, Tarih Aralığı ve Kampanya Kural Satırları).'
      ),
      required: ['id', 'belgeNo', 'adi', 'baslangicTarihi', 'bitisTarihi', 'aktifMi', 'kampanyalar'],
      properties,
      example: {
        id: 1042,
        belgeNo: 'KMP-2026-0118',
        adi: 'Kasım 2026 BSH Ankastre & Beyaz Eşya Kampanyası',
        baslangicTarihi: '2026-11-01',
        bitisTarihi: '2026-11-30',
        hakedisSonTarihi: '2026-12-15',
        aktifMi: true,
        kampanyalar: properties.kampanyalar.example
      }
    };
  }

  // 2. DOSYA İÇE AKTAR KARTI / SİHİRBAZI (FileImportPage - /araclar/dosya-al)
  if (
    rawCode.includes('dosya-ice-aktar') ||
    rawCode.includes('fileimport') ||
    rawRoute.includes('dosya-al') ||
    rawRoute.includes('file-import')
  ) {
    const entityTitle = rawTitle || tr('entity_dosya_ice_aktar', 'Dosya İçeri Aktar');
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      dosyaSayisi: {
        type: 'number',
        title: tr('schema_entity_dosya_sayisi', 'İçe Aktarılan Dosya Sayısı'),
        description: tr('schema_entity_dosya_sayisi_desc', 'Kullanıcının seçip içe aktardığı toplam belge/dosya adedi'),
        expression: `{{ ${entityExprPrefix}.dosyaSayisi }}`,
        required: true,
        example: 1
      },
      dosyalar: {
        type: 'string',
        title: tr('schema_entity_dosya_isimleri', 'İçe Aktarılan Dosya İsimleri Özeti'),
        description: tr('schema_entity_dosya_isimleri_desc', 'Seçilen dosyaların virgülle ayrılmış isim listesi'),
        expression: `{{ ${entityExprPrefix}.dosyalar }}`,
        required: true,
        example: 'BSH_Kasim_Kampanya_Bulteni.pdf'
      },
      importedFiles: {
        type: 'array',
        format: 'file-attachment',
        title: tr('schema_entity_imported_files', 'İçe Aktarılan Dosyalar ve Metin İçerikleri (Dizi)'),
        description: tr(
          'schema_entity_imported_files_desc',
          'Dosya İçeri Aktar ekranında Kaydet/Aktar düğmesine basıldığında dönen dosya nesneleri ve çözümlenmiş metinleri'
        ),
        expression: `{{ ${entityExprPrefix}.importedFiles }}`,
        required: true,
        itemsType: 'object',
        itemsProperties: {
          dosyaAdi: {
            type: 'string',
            title: tr('schema_prop_dosya_adi', 'Dosya Adı'),
            description: tr('schema_prop_dosya_adi_desc', 'Dosyanın tam adı'),
            expression: `{{ ${entityExprPrefix}.importedFiles[0].dosyaAdi }}`,
            required: true,
            example: 'BSH_Kasim_Kampanya_Bulteni.pdf'
          },
          uzanti: {
            type: 'string',
            title: tr('schema_prop_dosya_uzantisi', 'Dosya Uzantısı'),
            description: tr('schema_prop_dosya_uzantisi_desc', 'Dosyanın uzantısı (pdf, docx, xlsx, txt vb.)'),
            expression: `{{ ${entityExprPrefix}.importedFiles[0].uzanti }}`,
            required: true,
            example: 'pdf'
          },
          bulutDosyaId: {
            type: 'string',
            title: tr('schema_prop_bulut_dosya_id', 'Bulut Dosya ID'),
            description: tr('schema_prop_bulut_dosya_id_desc', 'Bulut depolamaya kaydedildiyse tekil dosya kimliği'),
            expression: `{{ ${entityExprPrefix}.importedFiles[0].bulutDosyaId }}`,
            required: false,
            example: 'cloud_9941'
          },
          metinIcerigi: {
            type: 'string',
            format: 'markdown',
            title: tr('schema_prop_dosya_metin_icerigi', 'Çıkarılan Belge Metin İçeriği'),
            description: tr('schema_prop_dosya_metin_icerigi_desc', 'Dosyadan okunan ham metin / tablo içeriği'),
            expression: `{{ ${entityExprPrefix}.importedFiles[0].metinIcerigi }}`,
            required: true,
            example: '1-30 Kasım 2026 tarihleri arasında geçerli kampanya ürünleri ve destek tutarları...'
          }
        },
        example: [
          {
            dosyaAdi: 'BSH_Kasim_Kampanya_Bulteni.pdf',
            uzanti: 'pdf',
            boyut: 248910,
            kaynak: 'local',
            bulutDosyaId: 'cloud_9941',
            metinIcerigi: '1-30 Kasım 2026 tarihleri arasında geçerli kampanya ürünleri ve destek tutarları...'
          }
        ]
      },
      birlestirilmisMetin: {
        type: 'string',
        format: 'markdown',
        title: tr('schema_entity_birlestirilmis_metin', 'Birleştirilmiş Tam Belge Metni'),
        description: tr(
          'schema_entity_birlestirilmis_metin_desc',
          'İçe aktarılan tüm belgelerin birleştirilmiş tam metin içeriği'
        ),
        expression: `{{ ${entityExprPrefix}.birlestirilmisMetin }}`,
        required: true,
        example: '--- BSH_Kasim_Kampanya_Bulteni.pdf ---\n1-30 Kasım 2026 tarihleri arasında geçerli kampanya...'
      }
    };

    return {
      entityCode: 'DosyaIceAktar',
      entityTitle,
      entityCategory: 'kart',
      schemaId: 'https://webakus.ai/schemas/entities/dosya-ice-aktar-output.schema.json',
      description: tr(
        'schema_entity_dosya_ice_aktar_desc',
        'Dosya İçeri Aktar ekranında dosya seçilip kaydedildiğinde üretilen sabit JSON veri şeması.'
      ),
      required: ['dosyaSayisi', 'dosyalar', 'importedFiles', 'birlestirilmisMetin'],
      properties,
      example: {
        dosyaSayisi: 1,
        dosyalar: 'BSH_Kasim_Kampanya_Bulteni.pdf',
        importedFiles: properties.importedFiles.example,
        birlestirilmisMetin: properties.birlestirilmisMetin.example
      }
    };
  }

  // 3. BSH FİYAT FARKI BELGESİ / KARTI (BshFiyatFarkiForm)
  if (rawCode.includes('bsh') || rawRoute.includes('bsh-fiyat-farki')) {
    const entityTitle = rawTitle || tr('entity_bsh_fiyat_farki', 'BSH Fiyat Farkı');
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      id: {
        type: 'number',
        title: tr('schema_entity_id', 'Kayıt ID'),
        description: tr('schema_entity_bsh_id_desc', 'Kaydedilen BSH Fiyat Farkı kaydının kimliği'),
        expression: `{{ ${entityExprPrefix}.id }}`,
        required: true,
        example: 512
      },
      belgeNo: {
        type: 'string',
        title: tr('schema_entity_belge_no', 'Belge Numarası'),
        description: tr('schema_entity_bsh_belge_no_desc', 'BSH Fiyat Farkı mutabakat belge numarası'),
        expression: `{{ ${entityExprPrefix}.belgeNo }}`,
        required: true,
        example: 'BSH-2026-1101'
      },
      aciklama: {
        type: 'string',
        title: tr('schema_entity_aciklama', 'Dönem / Belge Açıklaması'),
        description: tr('schema_entity_bsh_aciklama_desc', 'Fiyat farkı dönemi ve bülten açıklaması'),
        expression: `{{ ${entityExprPrefix}.aciklama }}`,
        required: true,
        example: 'Kasım 2026 BSH Sell-Out Fiyat Farkı Mutabakatı'
      },
      baslangicTarihi: {
        type: 'string',
        format: 'date',
        title: tr('schema_prop_baslangic_tarihi', 'Başlangıç Tarihi'),
        description: tr('schema_prop_baslangic_tarihi_desc', 'Dönem başlangıç tarihi'),
        expression: `{{ ${entityExprPrefix}.baslangicTarihi }}`,
        required: true,
        example: '2026-11-01'
      },
      bitisTarihi: {
        type: 'string',
        format: 'date',
        title: tr('schema_prop_bitis_tarihi', 'Bitiş Tarihi'),
        description: tr('schema_prop_bitis_tarihi_desc', 'Dönem bitiş tarihi'),
        expression: `{{ ${entityExprPrefix}.bitisTarihi }}`,
        required: true,
        example: '2026-11-30'
      },
      toplamTutar: {
        type: 'number',
        title: tr('schema_entity_toplam_tutar', 'Toplam Fiyat Farkı Tutarı'),
        description: tr('schema_entity_toplam_tutar_desc', 'Hesaplanan toplam destek / fiyat farkı tutarı'),
        expression: `{{ ${entityExprPrefix}.toplamTutar }}`,
        required: true,
        example: 42500
      },
      kalemler: {
        type: 'array',
        format: 'json',
        title: tr('schema_entity_bsh_kalemler', 'Fiyat Farkı Ürün Satırları (Kalemler)'),
        description: tr('schema_entity_bsh_kalemler_desc', 'Belgede yer alan ürün kodları, miktarlar ve birim fiyat farkı satırları'),
        expression: `{{ ${entityExprPrefix}.kalemler }}`,
        required: true,
        itemsType: 'object',
        itemsProperties: {
          urunKodu: {
            type: 'string',
            title: tr('schema_entity_urun_kodu', 'Ürün / Model Kodu'),
            description: tr('schema_entity_urun_kodu_desc', 'Üretici model veya stok kodu'),
            expression: `{{ ${entityExprPrefix}.kalemler[0].urunKodu }}`,
            required: true,
            example: 'KGN56IWE0N'
          },
          birimFiyatFarki: {
            type: 'number',
            title: tr('schema_entity_birim_fiyat_farki', 'Birim Fiyat Farkı'),
            description: tr('schema_entity_birim_fiyat_farki_desc', 'Birim başına destek tutarı'),
            expression: `{{ ${entityExprPrefix}.kalemler[0].birimFiyatFarki }}`,
            required: true,
            example: 3500
          }
        },
        example: [
          {
            urunKodu: 'KGN56IWE0N',
            urunAdi: 'Bosch XXL Buzdolabı',
            miktar: 5,
            birimFiyatFarki: 3500,
            toplamTutar: 17500
          }
        ]
      }
    };

    return {
      entityCode: 'BshFiyatFarki',
      entityTitle,
      entityCategory: 'belge',
      schemaId: 'https://webakus.ai/schemas/entities/bsh-fiyat-farki-output.schema.json',
      description: tr(
        'schema_entity_bsh_desc',
        'BSH Fiyat Farkı ekranı kaydedildiğinde üretilen sabit JSON veri şeması.'
      ),
      required: ['id', 'belgeNo', 'aciklama', 'baslangicTarihi', 'bitisTarihi', 'toplamTutar', 'kalemler'],
      properties,
      example: {
        id: 512,
        belgeNo: 'BSH-2026-1101',
        aciklama: 'Kasım 2026 BSH Sell-Out Fiyat Farkı Mutabakatı',
        baslangicTarihi: '2026-11-01',
        bitisTarihi: '2026-11-30',
        toplamTutar: 42500,
        kalemler: properties.kalemler.example
      }
    };
  }

  // 4. FİYAT LİSTESİ BELGESİ (FiyatListesiForm)
  if (rawCode.includes('fiyat-listesi') || rawRoute.includes('fiyat-listeleri')) {
    const entityTitle = rawTitle || tr('entity_fiyat_listesi', 'Fiyat Listesi Belgesi');
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      id: {
        type: 'number',
        title: tr('schema_entity_id', 'Fiyat Listesi ID'),
        description: tr('schema_entity_fiyat_listesi_id_desc', 'Kaydedilen fiyat listesinin kimliği'),
        expression: `{{ ${entityExprPrefix}.id }}`,
        required: true,
        example: 308
      },
      kod: {
        type: 'string',
        title: tr('schema_entity_fiyat_listesi_kod', 'Fiyat Listesi Kodu'),
        description: tr('schema_entity_fiyat_listesi_kod_desc', 'Fiyat listesinin benzersiz kodu'),
        expression: `{{ ${entityExprPrefix}.kod }}`,
        required: true,
        example: 'FL-2026-11'
      },
      ad: {
        type: 'string',
        title: tr('schema_entity_fiyat_listesi_ad', 'Fiyat Listesi Adı'),
        description: tr('schema_entity_fiyat_listesi_ad_desc', 'Fiyat listesinin başlığı'),
        expression: `{{ ${entityExprPrefix}.ad }}`,
        required: true,
        example: 'Kasım 2026 Perakende Satış Fiyat Listesi'
      },
      paraBirimi: {
        type: 'string',
        title: tr('schema_entity_para_birimi', 'Para Birimi'),
        description: tr('schema_entity_para_birimi_desc', 'Liste döviz cinsi (TRY, USD, EUR)'),
        expression: `{{ ${entityExprPrefix}.paraBirimi }}`,
        required: true,
        example: 'TRY'
      },
      kalemler: {
        type: 'array',
        format: 'json',
        title: tr('schema_entity_fiyat_kalemleri', 'Fiyat Listesi Satırları'),
        description: tr('schema_entity_fiyat_kalemleri_desc', 'Kaydedilen ürün ve birim fiyat satırları'),
        expression: `{{ ${entityExprPrefix}.kalemler }}`,
        required: true,
        itemsType: 'object',
        example: [{ urunKodu: 'KGN56IWE0N', birimFiyat: 44900, paraBirimi: 'TRY' }]
      }
    };

    return {
      entityCode: 'FiyatListesi',
      entityTitle,
      entityCategory: 'belge',
      schemaId: 'https://webakus.ai/schemas/entities/fiyat-listesi-output.schema.json',
      description: tr(
        'schema_entity_fiyat_listesi_desc',
        'Fiyat Listesi belgesi kaydedildiğinde üretilen sabit JSON veri şeması.'
      ),
      required: ['id', 'kod', 'ad', 'paraBirimi', 'kalemler'],
      properties,
      example: {
        id: 308,
        kod: 'FL-2026-11',
        ad: 'Kasım 2026 Perakende Satış Fiyat Listesi',
        paraBirimi: 'TRY',
        kalemler: properties.kalemler.example
      }
    };
  }

  // 5. GENEL KART ŞEMASI (Cari Kart, Ürün Kartı vb. tüm Kartlar için)
  if (rawCategory === 'kart' || rawCode.includes('kart') || rawCode.includes('cari') || rawCode.includes('urun')) {
    const entityTitle = rawTitle || tr('entity_standart_kart', 'ERP Kart Kaydı');
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      id: {
        type: 'number',
        title: tr('schema_entity_id', 'Kart Kayıt ID'),
        description: tr('schema_entity_kart_id_desc', 'Kaydedilen kartın sistem kimliği (ID)'),
        expression: `{{ ${entityExprPrefix}.id }}`,
        required: true,
        example: 2045
      },
      kod: {
        type: 'string',
        title: tr('schema_entity_kart_kodu', 'Kart Kodu'),
        description: tr('schema_entity_kart_kodu_desc', 'Kaydedilen kartın benzersiz kodu'),
        expression: `{{ ${entityExprPrefix}.kod }}`,
        required: true,
        example: 'KRT-2026-089'
      },
      ad: {
        type: 'string',
        title: tr('schema_entity_kart_adi', 'Kart Adı / Unvanı'),
        description: tr('schema_entity_kart_adi_desc', 'Kaydedilen kartın adı veya cari unvanı'),
        expression: `{{ ${entityExprPrefix}.ad }}`,
        required: true,
        example: entityTitle
      },
      aktifMi: {
        type: 'boolean',
        title: tr('schema_entity_aktif_mi', 'Aktiflik Durumu'),
        description: tr('schema_entity_aktif_mi_desc', 'Kartın aktiflik durumu'),
        expression: `{{ ${entityExprPrefix}.aktifMi }}`,
        required: true,
        example: true
      }
    };

    return {
      entityCode: node?.varlikKodu || 'ErpKart',
      entityTitle,
      entityCategory: 'kart',
      schemaId: `https://webakus.ai/schemas/entities/${rawCode || 'erp-kart'}-output.schema.json`,
      description: tr(
        'schema_entity_genel_kart_desc',
        'Açılan kart ekranında Kaydet işleminde üretilen sabit JSON veri şeması.'
      ),
      required: ['id', 'kod', 'ad', 'aktifMi'],
      properties,
      example: {
        id: 2045,
        kod: 'KRT-2026-089',
        ad: entityTitle,
        aktifMi: true
      }
    };
  }

  // 6. STANDART ERP BELGESİ ŞEMASI (Fatura, Sipariş, İrsaliye ve diğer tüm Belgeler için)
  const entityTitle = rawTitle || tr('entity_standart_belge', 'ERP Belge Kaydı');
  const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
    id: {
      type: 'number',
      title: tr('schema_entity_id', 'Belge Kayıt ID'),
      description: tr('schema_entity_belge_id_desc', 'Kaydedilen belgenin veritabanı tekil kimliği (ID)'),
      expression: `{{ ${entityExprPrefix}.id }}`,
      required: true,
      example: 4096
    },
    belgeNo: {
      type: 'string',
      title: tr('schema_entity_belge_no', 'Belge Numarası'),
      description: tr('schema_entity_belge_no_desc', 'Kaydedilen belgenin resmi/sistem numarası'),
      expression: `{{ ${entityExprPrefix}.belgeNo }}`,
      required: true,
      example: 'BLG-2026-00492'
    },
    belgeTarihi: {
      type: 'string',
      format: 'date',
      title: tr('schema_entity_belge_tarihi', 'Belge Tarihi'),
      description: tr('schema_entity_belge_tarihi_desc', 'Belgenin düzenlenme tarihi (YYYY-MM-DD)'),
      expression: `{{ ${entityExprPrefix}.belgeTarihi }}`,
      required: true,
      example: '2026-10-31'
    },
    cariUnvan: {
      type: 'string',
      title: tr('schema_entity_cari_unvan', 'Cari Hesap Unvanı / Başlık'),
      description: tr('schema_entity_cari_unvan_desc', 'Belgenin ilişkili olduğu cari unvanı veya belge başlığı'),
      expression: `{{ ${entityExprPrefix}.cariUnvan }}`,
      required: false,
      example: 'BSH Ev Aletleri San. ve Tic. A.Ş.'
    },
    aciklama: {
      type: 'string',
      title: tr('schema_entity_aciklama', 'Belge Açıklaması'),
      description: tr('schema_entity_aciklama_desc', 'Belge üst bilgi açıklaması ve notu'),
      expression: `{{ ${entityExprPrefix}.aciklama }}`,
      required: false,
      example: `${entityTitle} kaydı`
    },
    genelToplam: {
      type: 'number',
      title: tr('schema_entity_genel_toplam', 'Belge Genel Toplamı'),
      description: tr('schema_entity_genel_toplam_desc', 'Belgenin vergiler dahil genel toplam tutarı'),
      expression: `{{ ${entityExprPrefix}.genelToplam }}`,
      required: true,
      example: 125000
    },
    kalemler: {
      type: 'array',
      format: 'json',
      title: tr('schema_entity_belge_kalemleri', 'Belge Kalemleri / Satırları (Grid)'),
      description: tr('schema_entity_belge_kalemleri_desc', 'Belge tablosunda kaydedilen tüm satır/kalem verileri'),
      expression: `{{ ${entityExprPrefix}.kalemler }}`,
      required: true,
      itemsType: 'object',
      itemsProperties: {
        stokKodu: {
          type: 'string',
          title: tr('schema_entity_urun_kodu', 'Stok / Ürün Kodu'),
          description: tr('schema_entity_urun_kodu_desc', 'Satırdaki ürünün stok kodu'),
          expression: `{{ ${entityExprPrefix}.kalemler[0].stokKodu }}`,
          required: true,
          example: 'KGN56IWE0N'
        },
        miktar: {
          type: 'number',
          title: tr('schema_entity_miktar', 'Miktar'),
          description: tr('schema_entity_miktar_desc', 'Satır miktarı'),
          expression: `{{ ${entityExprPrefix}.kalemler[0].miktar }}`,
          required: true,
          example: 2
        },
        birimFiyat: {
          type: 'number',
          title: tr('schema_entity_birim_fiyat', 'Birim Fiyat'),
          description: tr('schema_entity_birim_fiyat_desc', 'Satır birim fiyatı'),
          expression: `{{ ${entityExprPrefix}.kalemler[0].birimFiyat }}`,
          required: true,
          example: 42500
        }
      },
      example: [
        {
          stokKodu: 'KGN56IWE0N',
          miktar: 2,
          birimFiyat: 42500,
          tutar: 85000
        }
      ]
    }
  };

  return {
    entityCode: node?.varlikKodu || 'ErpBelge',
    entityTitle,
    entityCategory: 'belge',
    schemaId: `https://webakus.ai/schemas/entities/${rawCode || 'erp-belge'}-output.schema.json`,
    description: tr(
      'schema_entity_genel_belge_desc',
      'Açılan belge ekranında Kaydet işleminde üretilen sabit JSON veri şeması (Üst Bilgiler, Kalemler ve Alt Toplamlar).'
    ),
    required: ['id', 'belgeNo', 'belgeTarihi', 'genelToplam', 'kalemler'],
    properties,
    example: {
      id: 4096,
      belgeNo: 'BLG-2026-00492',
      belgeTarihi: '2026-10-31',
      cariUnvan: 'BSH Ev Aletleri San. ve Tic. A.Ş.',
      aciklama: `${entityTitle} kaydı`,
      genelToplam: 125000,
      kalemler: properties.kalemler.example
    }
  };
};

/**
 * Her düğüm tipinin (BASLA, FORM_AC, AI_ISLEM, KARAR_ONAY vb.) kendisinden sonraki düğüme
 * vermeyi taahhüt ettiği sabit JSON Schema (Data Contract) sözleşmesini üretir.
 * "Form Aç" (FORM_AC) düğümünde, düğümün kendi JSON verisi içerisinde açtığı Belgenin veya Kartın
 * JSON verisi (`belgeVerisi`) iç içe (nested) olarak yer alır.
 */
export const getNodeFixedOutputJsonSchema = (
  node: Partial<AiAkisDugumu> | null | undefined,
  stepIndex: number = 0,
  isImmediate: boolean = true,
  tFn?: (key: string, defaultText?: string, options?: any) => string
): FlowchartNodeJsonSchema => {
  const tr = (key: string, fallback: string, options?: any) => (tFn ? tFn(key, fallback, options) : fallback);
  const nType = (node?.tip || 'AI_ISLEM').toUpperCase();
  const nodeId = node?.id || (nType === 'BASLA' ? 'BASLA' : `adim_${stepIndex + 1}`);
  const prefix = nType === 'BASLA' ? '$basla' : isImmediate ? '$onceki' : `$adim_${stepIndex + 1}`;

  if (nType === 'BASLA') {
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      dugumId: {
        type: 'string',
        title: tr('schema_prop_dugum_id', 'Düğüm Kimliği (ID)'),
        description: tr('schema_prop_dugum_id_desc', 'Başlangıç düğümünün benzersiz akış kimliği'),
        expression: `{{ ${prefix}.dugumId }}`,
        required: true,
        example: 'BASLA'
      },
      dugumTipi: {
        type: 'string',
        title: tr('schema_prop_dugum_tipi', 'Düğüm Tipi'),
        description: tr('schema_prop_dugum_tipi_desc', 'Sabit düğüm türü kodu'),
        expression: `{{ ${prefix}.dugumTipi }}`,
        required: true,
        example: 'BASLA'
      },
      kullaniciIstegi: {
        type: 'string',
        title: tr('n8n_var_kullanici_istegi', 'Kullanıcının Başlangıç İsteği'),
        description: tr(
          'n8n_var_kullanici_istegi_aciklama',
          'Akışı başlatan kullanıcının yazdığı ilk mesaj veya hızlı erişim komutu'
        ),
        expression: `{{ ${prefix}.kullaniciIstegi }}`,
        required: true,
        example: node?.dugmeMetni || node?.dugmeBasligi || 'Kampanya yazısından belge oluştur.'
      },
      baslangicTalimati: {
        type: 'string',
        title: tr('schema_prop_baslangic_talimati', 'Görev Akışı Başlangıç Talimatı'),
        description: tr(
          'schema_prop_baslangic_talimati_desc',
          'Başla düğümünde tanımlanan görev amacı ve sistem başlangıç yönergesi'
        ),
        expression: `{{ ${prefix}.baslangicTalimati }}`,
        required: true,
        example:
          node?.prompt ||
          'Üretici firma tarafından gönderilen kampanya metnine göre kampanya belge kurallarını oluşturan görev akışı'
      },
      tetiklenmeTuru: {
        type: 'string',
        title: tr('schema_prop_tetiklenme_turu', 'Tetiklenme Türü'),
        description: tr(
          'schema_prop_tetiklenme_turu_desc',
          'Akışın hızlı erişim düğmesiyle mi yoksa doğal dil mesajıyla mı başlatıldığı bilgisi'
        ),
        expression: `{{ ${prefix}.tetiklenmeTuru }}`,
        required: true,
        example:
          node?.hizliErisimAktifMi || node?.hizliErisimDugmesi
            ? 'HIZLI_ERISIM_DUGMESI'
            : 'SOHBET_NIYET_ESLESTIRME'
      },
      ekDosyalar: {
        type: 'array',
        format: 'file-attachment',
        title: tr('n8n_var_baslangic_belgeleri', 'Başlangıçta Eklenen Belgeler'),
        description: tr(
          'n8n_var_baslangic_belgeleri_aciklama',
          'Sohbet başlatılırken eklenen dosya veya belgelerin sabit şema listesi'
        ),
        expression: `{{ ${prefix}.ekDosyalar }}`,
        required: true,
        itemsType: 'object',
        itemsProperties: {
          dosyaAdi: {
            type: 'string',
            title: tr('schema_prop_dosya_adi', 'Dosya Adı'),
            description: tr('schema_prop_dosya_adi_desc', 'Yüklenen belgenin dosya adı'),
            expression: `{{ ${prefix}.ekDosyalar[0].dosyaAdi }}`,
            required: true,
            example: 'kampanya_bulteni.pdf'
          },
          uzanti: {
            type: 'string',
            title: tr('schema_prop_dosya_uzantisi', 'Dosya Uzantısı / MIME'),
            description: tr('schema_prop_dosya_uzantisi_desc', 'Dosya formatı (pdf, docx, xlsx, png)'),
            expression: `{{ ${prefix}.ekDosyalar[0].uzanti }}`,
            required: true,
            example: 'application/pdf'
          },
          bulutDosyaId: {
            type: 'string',
            title: tr('schema_prop_bulut_dosya_id', 'Bulut / Sistem Dosya ID'),
            description: tr('schema_prop_bulut_dosya_id_desc', 'Depolama sistemindeki tekil belge kimliği'),
            expression: `{{ ${prefix}.ekDosyalar[0].bulutDosyaId }}`,
            required: false,
            example: 'cloud_doc_9012'
          },
          metinIcerigi: {
            type: 'string',
            format: 'markdown',
            title: tr('schema_prop_dosya_metin_icerigi', 'Çözümlenmiş Belge Metni'),
            description: tr('schema_prop_dosya_metin_icerigi_desc', 'Belgeden çıkarılan ham metin içeriği'),
            expression: `{{ ${prefix}.ekDosyalar[0].metinIcerigi }}`,
            required: false,
            example: '1-30 Kasım tarihleri arasında geçerli beyaz eşya kampanya koşulları...'
          }
        },
        example: [
          {
            dosyaAdi: 'kampanya_bulteni.pdf',
            uzanti: 'application/pdf',
            bulutDosyaId: 'cloud_doc_9012',
            metinIcerigi: '1-30 Kasım tarihleri arasında geçerli beyaz eşya kampanya koşulları...'
          }
        ]
      },
      baslangicZamani: {
        type: 'string',
        format: 'date-time',
        title: tr('schema_prop_baslangic_zamani', 'Başlangıç Zaman Damgası (ISO 8601)'),
        description: tr('schema_prop_baslangic_zamani_desc', 'Akışın tetiklendiği tarih ve saat bilgisi'),
        expression: `{{ ${prefix}.baslangicZamani }}`,
        required: true,
        example: '2026-10-31T09:00:00Z'
      }
    };

    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      schemaId: 'https://webakus.ai/schemas/flowchart/basla-output.schema.json',
      title: tr('schema_title_basla', 'Başla Düğümü Sabit Çıktı Şeması (StartOutputSchema)'),
      description: tr(
        'schema_desc_basla',
        'Başla düğümünün bir sonraki adıma aktarmayı taahhüt ettiği kullanıcı isteği, başlangıç yönergesi ve ek dosya şeması.'
      ),
      nodeType: 'BASLA',
      type: 'object',
      required: [
        'dugumId',
        'dugumTipi',
        'kullaniciIstegi',
        'baslangicTalimati',
        'tetiklenmeTuru',
        'ekDosyalar',
        'baslangicZamani'
      ],
      properties,
      examplePayload: {
        dugumId: nodeId,
        dugumTipi: 'BASLA',
        kullaniciIstegi: properties.kullaniciIstegi.example,
        baslangicTalimati: properties.baslangicTalimati.example,
        tetiklenmeTuru: properties.tetiklenmeTuru.example,
        ekDosyalar: properties.ekDosyalar.example,
        baslangicZamani: properties.baslangicZamani.example
      }
    };
  }

  if (nType === 'FORM_AC' || nType === 'EKRAN_AC') {
    const openedEntitySchema = getOpenedEntityFixedJsonSchema(node, prefix, tFn);
    const varlikAdiOrnek = node?.varlikAdi || openedEntitySchema.entityTitle;
    const modulKoduOrnek = node?.modulKodu || 'product_module';
    const varlikKoduOrnek = node?.varlikKodu || openedEntitySchema.entityCode;
    const hedefRotaOrnek = node?.hedefRota || '/kampanyalar/yeni';

    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      dugumId: {
        type: 'string',
        title: tr('schema_prop_dugum_id', 'Düğüm Kimliği (ID)'),
        description: tr('schema_prop_dugum_id_desc', 'Form Aç düğümünün benzersiz akış kimliği'),
        expression: `{{ ${prefix}.dugumId }}`,
        required: true,
        example: nodeId
      },
      dugumTipi: {
        type: 'string',
        title: tr('schema_prop_dugum_tipi', 'Düğüm Tipi'),
        description: tr('schema_prop_dugum_tipi_desc', 'Sabit düğüm türü kodu (FORM_AC)'),
        expression: `{{ ${prefix}.dugumTipi }}`,
        required: true,
        example: 'FORM_AC'
      },
      islemDurumu: {
        type: 'string',
        title: tr('schema_prop_islem_durumu', 'Form İşlem Durumu'),
        description: tr(
          'schema_prop_islem_durumu_desc',
          'Açılan formda gerçekleştirilen işlemin tamamlanma durumu (KAYDEDILDI | BELGE_AKTARILDI)'
        ),
        expression: `{{ ${prefix}.islemDurumu }}`,
        required: true,
        example: 'KAYDEDILDI'
      },
      acilanVarlik: {
        type: 'object',
        format: 'json',
        title: tr('schema_prop_varlik_bilgisi', 'Açılan Belge / Kart Kimlik Bilgisi'),
        description: tr(
          'schema_prop_varlik_bilgisi_desc',
          'Form Aç düğümünün açtığı ERP belgesinin veya kartının kimlik, tür ve rota bilgileri'
        ),
        expression: `{{ ${prefix}.acilanVarlik }}`,
        required: true,
        properties: {
          modulKodu: {
            type: 'string',
            title: tr('schema_prop_modul_kodu', 'Modül Kodu'),
            description: tr('schema_prop_modul_kodu_desc', 'İlgili ERP modülünün sistem kodu'),
            expression: `{{ ${prefix}.acilanVarlik.modulKodu }}`,
            required: true,
            example: modulKoduOrnek
          },
          varlikKodu: {
            type: 'string',
            title: tr('schema_prop_varlik_kodu', 'Belge / Kart Kodu'),
            description: tr('schema_prop_varlik_kodu_desc', 'Açılan belge veya kartın MCP varlık kodu'),
            expression: `{{ ${prefix}.acilanVarlik.varlikKodu }}`,
            required: true,
            example: varlikKoduOrnek
          },
          varlikAdi: {
            type: 'string',
            title: tr('schema_prop_varlik_adi', 'Açılan Belge / Kart Adı'),
            description: tr('schema_prop_varlik_adi_desc', 'Açılan formun veya belgenin görünen adı'),
            expression: `{{ ${prefix}.acilanVarlik.varlikAdi }}`,
            required: true,
            example: varlikAdiOrnek
          },
          varlikTuru: {
            type: 'string',
            title: tr('schema_prop_varlik_turu', 'Varlık Türü (Belge / Kart)'),
            description: tr('schema_prop_varlik_turu_desc', 'Açılan ekranın belge mi yoksa kart mı olduğu'),
            expression: `{{ ${prefix}.acilanVarlik.varlikTuru }}`,
            required: true,
            example: openedEntitySchema.entityCategory
          },
          hedefRota: {
            type: 'string',
            title: tr('schema_prop_hedef_rota', 'Hedef Ekran Rotası (URL)'),
            description: tr('schema_prop_hedef_rota_desc', 'Formun uygulama içi yönlendirme adresi'),
            expression: `{{ ${prefix}.acilanVarlik.hedefRota }}`,
            required: true,
            example: hedefRotaOrnek
          }
        },
        example: {
          modulKodu: modulKoduOrnek,
          varlikKodu: varlikKoduOrnek,
          varlikAdi: varlikAdiOrnek,
          varlikTuru: openedEntitySchema.entityCategory,
          hedefRota: hedefRotaOrnek
        }
      },
      belgeVerisi: {
        type: 'object',
        format: `entity-schema:${openedEntitySchema.entityCode}`,
        title: `${tr(
          'schema_prop_acilan_belge_kart_json',
          'Açılan Belgenin / Kartın JSON Verisi'
        )} (${varlikAdiOrnek})`,
        description: openedEntitySchema.description,
        expression: `{{ ${prefix}.belgeVerisi }}`,
        required: true,
        properties: openedEntitySchema.properties,
        example: openedEntitySchema.example
      },
      eklenenBelgeler: {
        type: 'array',
        format: 'file-attachment',
        title: tr('n8n_var_eklenen_belgeler', 'İçeri Aktarılan Belgeler / Dosyalar'),
        description: tr(
          'n8n_var_eklenen_belgeler_aciklama',
          'Açılan belge/kartta seçilen, ilişkilendirilen veya içeri aktarılan PDF, Word, Excel, görsel ve bulut dosyaları'
        ),
        expression: `{{ ${prefix}.eklenenBelgeler }}`,
        required: true,
        itemsType: 'object',
        itemsProperties: {
          dosyaAdi: {
            type: 'string',
            title: tr('schema_prop_dosya_adi', 'Belge / Dosya Adı'),
            description: tr('schema_prop_dosya_adi_desc', 'İçeri aktarılan dosyanın adı'),
            expression: `{{ ${prefix}.eklenenBelgeler[0].dosyaAdi }}`,
            required: true,
            example: 'BSH_Kasim_Kampanya_Sirkuleri.pdf'
          },
          uzanti: {
            type: 'string',
            title: tr('schema_prop_dosya_uzantisi', 'Dosya Formatı / MIME'),
            description: tr('schema_prop_dosya_uzantisi_desc', 'Dosyanın MIME tipi veya uzantısı'),
            expression: `{{ ${prefix}.eklenenBelgeler[0].uzanti }}`,
            required: true,
            example: 'application/pdf'
          },
          bulutDosyaId: {
            type: 'string',
            title: tr('schema_prop_bulut_dosya_id', 'Bulut Dosya Kimliği'),
            description: tr('schema_prop_bulut_dosya_id_desc', 'Bulut depolamadaki tekil referans numarası'),
            expression: `{{ ${prefix}.eklenenBelgeler[0].bulutDosyaId }}`,
            required: false,
            example: 'file_bsh_2026_11'
          },
          metinIcerigi: {
            type: 'string',
            format: 'markdown',
            title: tr('schema_prop_dosya_metin_icerigi', 'Dosya Metin İçeriği'),
            description: tr('schema_prop_dosya_metin_icerigi_desc', 'Belgeden okunan tam metin içeriği'),
            expression: `{{ ${prefix}.eklenenBelgeler[0].metinIcerigi }}`,
            required: true,
            example: 'BSH Kasım Ayı Ankastre ve Beyaz Eşya Kampanya Koşulları ve Fiyat Farkı Tablosu...'
          }
        },
        example: [
          {
            dosyaAdi: 'BSH_Kasim_Kampanya_Sirkuleri.pdf',
            uzanti: 'application/pdf',
            bulutDosyaId: 'file_bsh_2026_11',
            metinIcerigi:
              'BSH Kasım Ayı Ankastre ve Beyaz Eşya Kampanya Koşulları ve Fiyat Farkı Tablosu...'
          }
        ]
      },
      belgeMetinIcerigi: {
        type: 'string',
        format: 'markdown',
        title: tr('n8n_var_belge_metin_icerigi', 'Belgeden Çıkarılan Metin İçeriği'),
        description: tr(
          'n8n_var_belge_metin_icerigi_aciklama',
          'İçeri aktarılan belgenin/dosyanın çözümlenmiş ham metin içeriği'
        ),
        expression: `{{ ${prefix}.belgeMetinIcerigi }}`,
        required: true,
        example:
          'Kampanya Başlığı: BSH Kasım Fırsatı | Geçerlilik: 01.11.2026 - 30.11.2026 | Model: KGN56IWE0N - Destek Tutarı: 3.500 TL'
      }
    };

    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      schemaId: `https://webakus.ai/schemas/flowchart/form-ac-${openedEntitySchema.entityCode.toLowerCase()}.schema.json`,
      title: `${tr('schema_title_form_ac', 'Form Aç Düğümü Sabit Çıktı Şeması')} • ${varlikAdiOrnek}`,
      description: tr(
        'schema_desc_form_ac_with_entity',
        'Form Aç düğümünün kendi JSON verisi içerisinde açtığı "{{varlikAdi}}" belgesinin/kartının Kaydet çıktısı JSON verisini (belgeVerisi) ve eklenen dosyaları sonraki düğümlere aktaran sabit şema sözleşmesi.',
        { varlikAdi: varlikAdiOrnek }
      ),
      nodeType: 'FORM_AC',
      type: 'object',
      required: [
        'dugumId',
        'dugumTipi',
        'islemDurumu',
        'acilanVarlik',
        'belgeVerisi',
        'eklenenBelgeler',
        'belgeMetinIcerigi'
      ],
      properties,
      examplePayload: {
        dugumId: nodeId,
        dugumTipi: 'FORM_AC',
        islemDurumu: properties.islemDurumu.example,
        acilanVarlik: properties.acilanVarlik.example,
        belgeVerisi: openedEntitySchema.example,
        eklenenBelgeler: properties.eklenenBelgeler.example,
        belgeMetinIcerigi: properties.belgeMetinIcerigi.example
      }
    };
  }

  if (nType === 'KARAR_ONAY') {
    const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
      dugumId: {
        type: 'string',
        title: tr('schema_prop_dugum_id', 'Düğüm Kimliği (ID)'),
        description: tr('schema_prop_dugum_id_desc', 'Karar / Onay düğümünün benzersiz kimliği'),
        expression: `{{ ${prefix}.dugumId }}`,
        required: true,
        example: nodeId
      },
      dugumTipi: {
        type: 'string',
        title: tr('schema_prop_dugum_tipi', 'Düğüm Tipi'),
        description: tr('schema_prop_dugum_tipi_desc', 'Sabit düğüm türü kodu (KARAR_ONAY)'),
        expression: `{{ ${prefix}.dugumTipi }}`,
        required: true,
        example: 'KARAR_ONAY'
      },
      onayDurumu: {
        type: 'boolean',
        title: tr('n8n_var_onay_durumu', 'Kullanıcı Onay Kararı (Evet / Hayır)'),
        description: tr('n8n_var_onay_durumu_aciklama', 'Kullanıcının verdiği onay veya red yanıtı'),
        expression: `{{ ${prefix}.onayDurumu }}`,
        required: true,
        example: true
      },
      secilenDal: {
        type: 'string',
        title: tr('schema_prop_secilen_dal', 'Seçilen Akış Dalı (EVET / HAYIR)'),
        description: tr('schema_prop_secilen_dal_desc', 'Karar düğümünden çıkılan yönlendirme kolu'),
        expression: `{{ ${prefix}.secilenDal }}`,
        required: true,
        example: 'EVET'
      },
      kullaniciNotu: {
        type: 'string',
        title: tr('n8n_var_kullanici_notu', 'Kullanıcı Açıklama Notu'),
        description: tr('n8n_var_kullanici_notu_aciklama', 'Onay adımında kullanıcının eklediği mesaj'),
        expression: `{{ ${prefix}.kullaniciNotu }}`,
        required: false,
        example: 'Kampanya kuralları kontrol edildi, onaylıyorum.'
      }
    };

    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      schemaId: 'https://webakus.ai/schemas/flowchart/karar-onay-output.schema.json',
      title: tr('schema_title_karar_onay', 'Karar / Onay Düğümü Sabit Çıktı Şeması (DecisionOutputSchema)'),
      description: tr(
        'schema_desc_karar_onay',
        'Karar düğümünün bir sonraki adıma vermeyi taahhüt ettiği onay durumu, seçilen dal ve kullanıcı notu şeması.'
      ),
      nodeType: 'KARAR_ONAY',
      type: 'object',
      required: ['dugumId', 'dugumTipi', 'onayDurumu', 'secilenDal'],
      properties,
      examplePayload: {
        dugumId: nodeId,
        dugumTipi: 'KARAR_ONAY',
        onayDurumu: true,
        secilenDal: 'EVET',
        kullaniciNotu: properties.kullaniciNotu.example
      }
    };
  }

  // AI_ISLEM, MCP_SORGULA, BELGE_OLUSTUR ve diğer işlem düğümleri
  const properties: Record<string, FlowchartNodeJsonSchemaProperty> = {
    dugumId: {
      type: 'string',
      title: tr('schema_prop_dugum_id', 'Düğüm Kimliği (ID)'),
      description: tr('schema_prop_dugum_id_desc', 'AI İşlemi düğümünün benzersiz akış kimliği'),
      expression: `{{ ${prefix}.dugumId }}`,
      required: true,
      example: nodeId
    },
    dugumTipi: {
      type: 'string',
      title: tr('schema_prop_dugum_tipi', 'Düğüm Tipi'),
      description: tr('schema_prop_dugum_tipi_desc', 'Sabit düğüm türü kodu (AI_ISLEM)'),
      expression: `{{ ${prefix}.dugumTipi }}`,
      required: true,
      example: 'AI_ISLEM'
    },
    basariliMi: {
      type: 'boolean',
      title: tr('schema_prop_basarili_mi', 'İşlem Başarı Durumu'),
      description: tr('schema_prop_basarili_mi_desc', 'AI işleminin hatasız tamamlanıp tamamlanmadığı bilgisi'),
      expression: `{{ ${prefix}.basariliMi }}`,
      required: true,
      example: true
    },
    aiYaniti: {
      type: 'string',
      format: 'markdown',
      title: tr('n8n_var_ai_yaniti', 'Önceki AI İşlemi Analiz Sonucu'),
      description: tr(
        'n8n_var_ai_yaniti_aciklama',
        'Önceki AI adımının ürettiği analiz metni, kurallar ve özet çıktı'
      ),
      expression: `{{ ${prefix}.aiYaniti }}`,
      required: true,
      example: 'Kampanya bülteni analiz edildi; 12 ürün kalemi ve 3 kampanya kuralı tespit edildi.'
    },
    cikarilanVeri: {
      type: 'object',
      format: 'json',
      title: tr('n8n_var_cikarilan_veri', 'Çıkarılan Yapısal Veri / Kalemler (JSON)'),
      description: tr(
        'n8n_var_cikarilan_veri_aciklama',
        'Önceki adımda belgeden veya sorgudan elde edilen yapılandırılmış JSON verisi'
      ),
      expression: `{{ ${prefix}.cikarilanVeri }}`,
      required: true,
      properties: {
        baslik: {
          type: 'string',
          title: tr('schema_prop_cikarilan_baslik', 'Çıkarılan Belge / Kampanya Başlığı'),
          description: tr('schema_prop_cikarilan_baslik_desc', 'Analiz edilen belgeden tespit edilen ana başlık'),
          expression: `{{ ${prefix}.cikarilanVeri.baslik }}`,
          required: true,
          example: 'Kasım 2026 Beyaz Eşya Kampanyası'
        },
        baslangicTarihi: {
          type: 'string',
          format: 'date-time',
          title: tr('schema_prop_baslangic_tarihi', 'Başlangıç Tarihi'),
          description: tr('schema_prop_baslangic_tarihi_desc', 'Belgeden çıkarılan geçerlilik başlangıç tarihi'),
          expression: `{{ ${prefix}.cikarilanVeri.baslangicTarihi }}`,
          required: false,
          example: '2026-11-01'
        },
        bitisTarihi: {
          type: 'string',
          format: 'date-time',
          title: tr('schema_prop_bitis_tarihi', 'Bitiş Tarihi'),
          description: tr('schema_prop_bitis_tarihi_desc', 'Belgeden çıkarılan geçerlilik bitiş tarihi'),
          expression: `{{ ${prefix}.cikarilanVeri.bitisTarihi }}`,
          required: false,
          example: '2026-11-30'
        },
        kurallar: {
          type: 'array',
          title: tr('schema_prop_kurallar_listesi', 'Çıkarılan Kurallar Listesi'),
          description: tr('schema_prop_kurallar_listesi_desc', 'Belgeden ayrıştırılan maddeler ve uygulama kuralları'),
          expression: `{{ ${prefix}.cikarilanVeri.kurallar }}`,
          required: true,
          example: ['En az 2 adet ankastre ürün alımında geçerlidir.']
        },
        kalemler: {
          type: 'array',
          title: tr('schema_prop_kalemler_listesi', 'Çıkarılan Ürün / Fiyat Kalemleri'),
          description: tr('schema_prop_kalemler_listesi_desc', 'Tablodan okunan stok kodu, model ve tutar satırları'),
          expression: `{{ ${prefix}.cikarilanVeri.kalemler }}`,
          required: true,
          example: [{ stokKodu: 'KGN56IWE0N', destekTutari: 3500, paraBirimi: 'TRY' }]
        }
      },
      example: {
        baslik: 'Kasım 2026 Beyaz Eşya Kampanyası',
        baslangicTarihi: '2026-11-01',
        bitisTarihi: '2026-11-30',
        kurallar: ['En az 2 adet ankastre ürün alımında geçerlidir.'],
        kalemler: [{ stokKodu: 'KGN56IWE0N', destekTutari: 3500, paraBirimi: 'TRY' }]
      }
    },
    olusturulanBelge: {
      type: 'object',
      format: 'json',
      title: tr('n8n_var_olusturulan_belge', 'Oluşturulan Belge / Kart Taslağı'),
      description: tr(
        'n8n_var_olusturulan_belge_aciklama',
        'Önceki düğümde hazırlanan veya aktarılan belge referansı'
      ),
      expression: `{{ ${prefix}.olusturulanBelge }}`,
      required: true,
      properties: {
        belgeTuru: {
          type: 'string',
          title: tr('schema_prop_belge_turu', 'Belge Türü Kodu'),
          description: tr('schema_prop_belge_turu_desc', 'Oluşturulan ERP belgesinin türü'),
          expression: `{{ ${prefix}.olusturulanBelge.belgeTuru }}`,
          required: true,
          example: 'KAMPANYA_BELGESI'
        },
        belgeId: {
          type: 'string',
          title: tr('schema_prop_belge_id', 'Oluşturulan Belge ID'),
          description: tr('schema_prop_belge_id_desc', 'Oluşturulan taslak veya kesin kaydın kimliği'),
          expression: `{{ ${prefix}.olusturulanBelge.belgeId }}`,
          required: true,
          example: 'DOC-2026-881'
        }
      },
      example: {
        belgeTuru: 'KAMPANYA_BELGESI',
        belgeId: 'DOC-2026-881'
      }
    }
  };

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: 'https://webakus.ai/schemas/flowchart/ai-islem-output.schema.json',
    title: tr('schema_title_ai_islem', 'AI İşlemi Düğümü Sabit Çıktı Şeması (AiProcessOutputSchema)'),
    description: tr(
      'schema_desc_ai_islem',
      'AI İşlemi düğümünün bir sonraki adıma vermeyi taahhüt ettiği analiz sonucu, çıkarılan yapısal JSON verisi ve belge taslağı şeması.'
    ),
    nodeType: 'AI_ISLEM',
    type: 'object',
    required: ['dugumId', 'dugumTipi', 'basariliMi', 'aiYaniti', 'cikarilanVeri', 'olusturulanBelge'],
    properties,
    examplePayload: {
      dugumId: nodeId,
      dugumTipi: 'AI_ISLEM',
      basariliMi: true,
      aiYaniti: properties.aiYaniti.example,
      cikarilanVeri: properties.cikarilanVeri.example,
      olusturulanBelge: properties.olusturulanBelge.example
    }
  };
};

/**
 * Sabit JSON Schema içindeki özellikleri "Ayarlar" ve "Önceki Düğüm" sekmelerinde
 * tıklanabilir değişken listesine dönüştürür.
 * "Form Aç" düğümünün açtığı Belge/Kartın kendi JSON verisi (`belgeVerisi.*`) birinci sınıf (isNested: false)
 * şema alanı olarak doğrudan "Ayarlar" sekmesinde de gösterilir.
 */
export const extractVariablesFromNodeSchema = (
  node: AiAkisDugumu,
  schema: FlowchartNodeJsonSchema,
  nodeLabel: string
): FlowchartPreviousNodeOutputField[] => {
  const result: FlowchartPreviousNodeOutputField[] = [];
  const nType = (node.tip || schema.nodeType || '').toUpperCase();

  const resolveCategory = (
    propKey: string,
    prop: FlowchartNodeJsonSchemaProperty
  ): 'belge' | 'veri' | 'metin' | 'karar' => {
    if (
      prop.format === 'file-attachment' ||
      propKey.toLowerCase().includes('dosya') ||
      propKey === 'eklenenBelgeler'
    ) {
      return 'belge';
    }
    if (prop.type === 'boolean' || propKey === 'secilenDal') {
      return 'karar';
    }
    if (prop.type === 'object' || prop.type === 'array' || prop.type === 'number' || propKey.toLowerCase().includes('id')) {
      return 'veri';
    }
    return 'metin';
  };

  Object.entries(schema.properties).forEach(([propKey, prop]) => {
    if (propKey === 'dugumId' || propKey === 'dugumTipi') return;

    const isEmbeddedEntityData = propKey === 'belgeVerisi';

    result.push({
      key: `${node.id}_${propKey}`,
      propertyPath: propKey,
      expression: prop.expression,
      label: prop.title,
      description: prop.description,
      schemaType: prop.type,
      dataType: resolveCategory(propKey, prop),
      required: prop.required,
      isNested: false,
      isEntityField: isEmbeddedEntityData,
      exampleValue: prop.example,
      sourceNodeId: node.id,
      sourceNodeTitle: nodeLabel,
      sourceNodeType: nType
    });

    if (prop.properties) {
      Object.entries(prop.properties).forEach(([subKey, subProp]) => {
        result.push({
          key: `${node.id}_${propKey}_${subKey}`,
          propertyPath: `${propKey}.${subKey}`,
          expression: subProp.expression,
          label: isEmbeddedEntityData ? subProp.title : `${prop.title} → ${subProp.title}`,
          description: subProp.description,
          schemaType: subProp.type,
          dataType: resolveCategory(subKey, subProp),
          required: subProp.required,
          // "Form Aç" düğümünün açtığı Belge/Kartın kendi JSON alanlarını doğrudan "Ayarlar" sekmesinde göster
          isNested: !isEmbeddedEntityData,
          isEntityField: isEmbeddedEntityData,
          exampleValue: subProp.example,
          sourceNodeId: node.id,
          sourceNodeTitle: nodeLabel,
          sourceNodeType: nType
        });

        if (isEmbeddedEntityData && subProp.itemsProperties) {
          Object.entries(subProp.itemsProperties).forEach(([itemKey, itemProp]) => {
            result.push({
              key: `${node.id}_${propKey}_${subKey}_item_${itemKey}`,
              propertyPath: `${propKey}.${subKey}[0].${itemKey}`,
              expression: itemProp.expression,
              label: `${subProp.title} → ${itemProp.title}`,
              description: itemProp.description,
              schemaType: itemProp.type,
              dataType: resolveCategory(itemKey, itemProp),
              required: itemProp.required,
              isNested: true,
              isEntityField: true,
              exampleValue: itemProp.example,
              sourceNodeId: node.id,
              sourceNodeTitle: nodeLabel,
              sourceNodeType: nType
            });
          });
        }
      });
    }

    if (prop.itemsProperties) {
      Object.entries(prop.itemsProperties).forEach(([subKey, subProp]) => {
        result.push({
          key: `${node.id}_${propKey}_item_${subKey}`,
          propertyPath: `${propKey}[0].${subKey}`,
          expression: subProp.expression,
          label: `${prop.title} → ${subProp.title}`,
          description: subProp.description,
          schemaType: subProp.type,
          dataType: resolveCategory(subKey, subProp),
          required: subProp.required,
          isNested: true,
          isEntityField: false,
          exampleValue: subProp.example,
          sourceNodeId: node.id,
          sourceNodeTitle: nodeLabel,
          sourceNodeType: nType
        });
      });
    }
  });

  return result;
};

export interface FlowchartPromptMentionInputProps extends Omit<NotInputProps, 'value' | 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValueChange?: (nextValue: string) => void;
  showAttachButton?: boolean;
}

interface SmartFileSourceMetadata {
  sourceNodeId: string;
  sourceNodeTitle: string;
  isFileImportNode: boolean;
  selectionMode: 'single' | 'multiple';
  selectionModeLabel: string;
  fileFilterSummary: string;
  defaultSendToCloud: boolean;
  options: FlowchartAttachedFileBinding[];
}

/**
 * Flowchart düğümü ayar sayfalarındaki Prompt / Yönerge alanlarında:
 * 1) `@` karakteri yazıldığında "Önceki Düğüm" JSON verisindeki alanları tamamlama menüsü olarak sunar
 *    ve seçilen veriyi ismiyle birlikte `@[Önceki Düğüm -> Veri İsmi ($onceki.alanAdi)]` formatında ekler.
 * 2) Ataç (`Paperclip`) düğmesine tıklandığında ise bir önceki düğümden ("Form Aç -> Dosya İçeri Aktar" vb.)
 *    gelecek olan belgeyi veya belgeleri akıllıca algılayarak seçtiren ve Prompt altına görsel "Ekli Belge Kartı"
 *    olarak bağlayan akıllı seçim arayüzünü açar.
 */
export const FlowchartPromptMentionInput: React.FC<FlowchartPromptMentionInputProps> = ({
  value = '',
  onChange,
  onValueChange,
  showAttachButton = true,
  className = '',
  onKeyDown,
  onClick,
  rightActions,
  ...rest
}) => {
  const { t } = useTranslation();
  const flowchartContext = useFlowchartOgeAyarContext();
  const availableInputVariables = flowchartContext?.availableInputVariables || [];
  const activeSourceNode = flowchartContext?.activeSourceNode || flowchartContext?.immediatePreviousNode || null;
  const previousNodes = flowchartContext?.previousNodes || [];
  const oncekiDugumGirdisi = flowchartContext?.oncekiDugumGirdisi;
  const updateOncekiDugumGirdisi = flowchartContext?.updateOncekiDugumGirdisi;

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const menuListRef = useRef<HTMLDivElement | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isAttachPickerOpen, setIsAttachPickerOpen] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionRange, setMentionRange] = useState<{ start: number; end: number } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Önceki düğümü ("Form Aç -> Dosya İçeri Aktar" vb.) akıllıca analiz ederek seçilebilir belge eklerini oluştur
  const smartFileSource = useMemo<SmartFileSourceMetadata | null>(() => {
    const candidateNode =
      activeSourceNode ||
      [...previousNodes]
        .reverse()
        .find((n) => (n.tip || '').toUpperCase() === 'FORM_AC' || (n.tip || '').toUpperCase() === 'BASLA') ||
      null;

    if (!candidateNode) return null;

    const nType = (candidateNode.tip || '').toUpperCase();
    const rawCode = (candidateNode.varlikKodu || candidateNode.mcpVarlikId || '').toLowerCase();
    const rawRoute = (candidateNode.hedefRota || '').toLowerCase();
    const rawTitle = (candidateNode.varlikAdi || '').trim();
    const rawTitleLower = rawTitle.toLowerCase();

    const isFileImportNode =
      rawCode.includes('dosya-ice-aktar') ||
      rawCode.includes('fileimport') ||
      rawRoute.includes('dosya-al') ||
      rawRoute.includes('file-import') ||
      rawTitleLower.includes('dosya içeri aktar') ||
      rawTitleLower.includes('file import');

    const nodeDisplayTitle = candidateNode.varlikAdi?.trim()
      ? `${candidateNode.baslik || t('form_ac', 'Form Aç')} (${candidateNode.varlikAdi.trim()})`
      : candidateNode.baslik || (nType === 'BASLA' ? t('basla', 'Başla') : t('onceki_dugum', 'Önceki Düğüm'));

    const extSettings = (candidateNode as any).hariciSayfaAyarlari || {};
    const selectionMode: 'single' | 'multiple' =
      extSettings.selectionMode === 'multiple' ? 'multiple' : 'single';
    const selectionModeLabel =
      selectionMode === 'multiple'
        ? t('FileImport_modeMultipleBadge', 'Çoklu Belge Seçimi')
        : t('FileImport_modeSingleBadge', 'Tekli Belge Seçimi');

    const rawFilters: string[] = Array.isArray(extSettings.fileTypeFilters) && extSettings.fileTypeFilters.length > 0
      ? extSettings.fileTypeFilters.map(String)
      : Array.isArray(extSettings.fileTypeFilter) && extSettings.fileTypeFilter.length > 0
        ? extSettings.fileTypeFilter.map(String)
        : typeof extSettings.fileTypeFilter === 'string' && extSettings.fileTypeFilter
          ? [extSettings.fileTypeFilter]
          : ['all'];

    const filterLabelMap: Record<string, string> = {
      all: t('tum_dosya_formatlari', 'Tüm Dosya Formatları'),
      pdf: 'PDF (.pdf)',
      excel: 'Excel (.xlsx / .xls)',
      word: 'Word (.docx / .doc)',
      image: t('gorsel_dosyalari', 'Görsel (.png / .jpg)'),
      csv: 'CSV (.csv)',
      json: 'JSON (.json)',
      xml: 'XML (.xml)',
      archive: t('arsiv_dosyalari', 'Arşiv (.zip / .rar)')
    };

    const fileFilterSummary = rawFilters.includes('all')
      ? filterLabelMap.all
      : rawFilters.map((f) => filterLabelMap[f.toLowerCase()] || f.toUpperCase()).join(', ');

    const defaultSendToCloud = Boolean(extSettings.defaultSendToCloud);
    const exprPrefix = nType === 'BASLA' ? '$basla' : '$onceki';

    const options: FlowchartAttachedFileBinding[] = [];

    if (isFileImportNode) {
      if (selectionMode === 'single') {
        options.push({
          id: `${candidateNode.id}_file_import_single`,
          sourceNodeId: candidateNode.id,
          sourceNodeTitle: nodeDisplayTitle,
          label: t('file_import_tekli_belge_eki', 'İçe Aktarılan Belge (Dosya Eki)'),
          description: t(
            'file_import_tekli_belge_eki_aciklama',
            'Dosya İçeri Aktar ekranında seçilen belgeyi bu AI adımının Prompt\'una doğrudan ekli dosya (Attachment) olarak bağlar.'
          ),
          expressionPath: `${exprPrefix}.belgeVerisi.importedFiles`,
          attachmentMode: 'all_files',
          fileFilterSummary: `${selectionModeLabel} • ${fileFilterSummary}`,
          selectionMode: 'single'
        });
      } else {
        options.push({
          id: `${candidateNode.id}_file_import_all`,
          sourceNodeId: candidateNode.id,
          sourceNodeTitle: nodeDisplayTitle,
          label: t('file_import_tum_belgeler_eki', 'İçe Aktarılan Tüm Belgeler (Çoklu Dosya Eki)'),
          description: t(
            'file_import_tum_belgeler_eki_aciklama',
            'Dosya İçeri Aktar ekranında seçilen tüm belgeleri bu AI adımının Prompt\'una çoklu dosya eki (Attachments) olarak bağlar.'
          ),
          expressionPath: `${exprPrefix}.belgeVerisi.importedFiles`,
          attachmentMode: 'all_files',
          fileFilterSummary: `${selectionModeLabel} • ${fileFilterSummary}`,
          selectionMode: 'multiple'
        });

        options.push({
          id: `${candidateNode.id}_file_import_first`,
          sourceNodeId: candidateNode.id,
          sourceNodeTitle: nodeDisplayTitle,
          label: t('file_import_ilk_ana_belge_eki', '1. İçe Aktarılan Ana Belge (Tekil Dosya Eki)'),
          description: t(
            'file_import_ilk_ana_belge_eki_aciklama',
            'Çoklu belge seçilse bile yalnızca birinci sıradaki ana belgeyi Prompt\'a dosya eki olarak bağlar.'
          ),
          expressionPath: `${exprPrefix}.belgeVerisi.importedFiles[0]`,
          attachmentMode: 'first_file',
          fileFilterSummary: `${t('FileImport_modeSingleBadge', 'Tekli Belge Seçimi')} • ${fileFilterSummary}`,
          selectionMode: 'single'
        });
      }

      options.push({
        id: `${candidateNode.id}_file_import_text`,
        sourceNodeId: candidateNode.id,
        sourceNodeTitle: nodeDisplayTitle,
        label: t('file_import_birlestirilmis_metin_eki', 'Belgelerden Çıkarılan Birleştirilmiş Tam Metin'),
        description: t(
          'file_import_birlestirilmis_metin_eki_aciklama',
          'İçe aktarılan PDF, Word ve Excel belgelerinden çözümlenen tüm metin ve tablo içeriğini Prompt bağlamına ekler.'
        ),
        expressionPath: `${exprPrefix}.belgeVerisi.birlestirilmisMetin`,
        attachmentMode: 'extracted_text',
        fileFilterSummary: `${t('cozumlenmis_metin', 'Çözümlenmiş Metin')} • ${fileFilterSummary}`,
        selectionMode
      });
    } else if (nType === 'FORM_AC' || nType === 'EKRAN_AC') {
      options.push({
        id: `${candidateNode.id}_form_eklenen_belgeler`,
        sourceNodeId: candidateNode.id,
        sourceNodeTitle: nodeDisplayTitle,
        label: t('n8n_var_eklenen_belgeler', 'İçeri Aktarılan Belgeler / Dosyalar'),
        description: t(
          'n8n_var_eklenen_belgeler_aciklama',
          'Açılan belge/kartta seçilen, ilişkilendirilen veya içeri aktarılan PDF, Word, Excel ve görsel dosyalarını Prompt\'a bağlar.'
        ),
        expressionPath: `${exprPrefix}.eklenenBelgeler`,
        attachmentMode: 'all_files',
        fileFilterSummary,
        selectionMode: 'multiple'
      });

      options.push({
        id: `${candidateNode.id}_form_belge_metin`,
        sourceNodeId: candidateNode.id,
        sourceNodeTitle: nodeDisplayTitle,
        label: t('n8n_var_belge_metin_icerigi', 'Belgeden Çıkarılan Metin İçeriği'),
        description: t(
          'n8n_var_belge_metin_icerigi_aciklama',
          'İçeri aktarılan belgenin/dosyanın çözümlenmiş ham metin içeriğini Prompt bağlamına bağlar.'
        ),
        expressionPath: `${exprPrefix}.belgeMetinIcerigi`,
        attachmentMode: 'extracted_text',
        fileFilterSummary: t('cozumlenmis_metin', 'Çözümlenmiş Metin'),
        selectionMode: 'single'
      });
    } else if (nType === 'BASLA') {
      options.push({
        id: `${candidateNode.id}_basla_ek_dosyalar`,
        sourceNodeId: candidateNode.id,
        sourceNodeTitle: nodeDisplayTitle,
        label: t('n8n_var_baslangic_belgeleri', 'Başlangıçta Eklenen Belgeler'),
        description: t(
          'n8n_var_baslangic_belgeleri_aciklama',
          'Sohbet başlatılırken eklenen dosya veya belgeleri bu adıma dosya eki olarak bağlar.'
        ),
        expressionPath: '$basla.ekDosyalar',
        attachmentMode: 'all_files',
        fileFilterSummary: filterLabelMap.all,
        selectionMode: 'multiple'
      });
    }

    return {
      sourceNodeId: candidateNode.id,
      sourceNodeTitle: nodeDisplayTitle,
      isFileImportNode,
      selectionMode,
      selectionModeLabel,
      fileFilterSummary,
      defaultSendToCloud,
      options
    };
  }, [activeSourceNode, previousNodes, t]);

  // Mevcut düğüme bağlanmış belge ekleri listesi
  const attachedFiles = useMemo<FlowchartAttachedFileBinding[]>(() => {
    const savedList = oncekiDugumGirdisi?.bagliBelgeEkleri;
    if (Array.isArray(savedList) && savedList.length > 0) {
      return savedList;
    }
    return [];
  }, [oncekiDugumGirdisi?.bagliBelgeEkleri]);

  const handleToggleFileAttachment = (option: FlowchartAttachedFileBinding) => {
    if (!updateOncekiDugumGirdisi) return;
    const exists = attachedFiles.some((item) => item.id === option.id);
    const nextAttached = exists
      ? attachedFiles.filter((item) => item.id !== option.id)
      : [...attachedFiles, option];

    const existingVars = Array.isArray(oncekiDugumGirdisi?.seciliDegiskenler)
      ? oncekiDugumGirdisi!.seciliDegiskenler
      : [];
    const wrappedExpr = `{{ ${option.expressionPath} }}`;
    const nextVars = exists
      ? existingVars.filter((v) => v !== wrappedExpr)
      : existingVars.includes(wrappedExpr)
        ? existingVars
        : [...existingVars, wrappedExpr];

    updateOncekiDugumGirdisi({
      aktifMi: true,
      belgeleriAktar: nextAttached.length > 0,
      bagliBelgeEkleri: nextAttached,
      seciliDegiskenler: nextVars
    });
  };

  const handleRemoveFileAttachment = (optionId: string) => {
    if (!updateOncekiDugumGirdisi) return;
    const target = attachedFiles.find((item) => item.id === optionId);
    const nextAttached = attachedFiles.filter((item) => item.id !== optionId);
    const existingVars = Array.isArray(oncekiDugumGirdisi?.seciliDegiskenler)
      ? oncekiDugumGirdisi!.seciliDegiskenler
      : [];
    const wrappedExpr = target ? `{{ ${target.expressionPath} }}` : '';
    const nextVars = wrappedExpr ? existingVars.filter((v) => v !== wrappedExpr) : existingVars;

    updateOncekiDugumGirdisi({
      belgeleriAktar: nextAttached.length > 0,
      bagliBelgeEkleri: nextAttached,
      seciliDegiskenler: nextVars
    });
  };

  const filteredVariables = useMemo<FlowchartPreviousNodeOutputField[]>(() => {
    const query = mentionQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return availableInputVariables;

    return availableInputVariables.filter((item) => {
      const labelMatch = item.label.toLocaleLowerCase('tr-TR').includes(query);
      const pathMatch = item.propertyPath.toLocaleLowerCase('tr-TR').includes(query);
      const sourceMatch = item.sourceNodeTitle.toLocaleLowerCase('tr-TR').includes(query);
      const descMatch = item.description.toLocaleLowerCase('tr-TR').includes(query);
      return labelMatch || pathMatch || sourceMatch || descMatch;
    });
  }, [availableInputVariables, mentionQuery]);

  // Menü dışına tıklandığında tamamlama ve ataç menülerini kapat
  useEffect(() => {
    if (!isMenuOpen && !isAttachPickerOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsAttachPickerOpen(false);
        setMentionQuery('');
        setMentionRange(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMenuOpen, isAttachPickerOpen]);

  // Aktif satırı görünür alanda tut
  useEffect(() => {
    if (!isMenuOpen || !menuListRef.current) return;
    const activeEl = menuListRef.current.querySelector<HTMLElement>(
      `[data-mention-idx="${highlightedIndex}"]`
    );
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isMenuOpen]);

  const formatCleanExpressionPath = (field: FlowchartPreviousNodeOutputField): string => {
    const raw = (field.expression || '').replace(/^\{\{\s*|\s*\}\}$/g, '').trim();
    return raw || `$onceki.${field.propertyPath}`;
  };

  /**
   * Seçilen önceki düğüm verisini, düğüm adı + veri ismi + JSON anahtar yolu ile birlikte yazar:
   * Örn: @[Form Aç (Dosya İçeri Aktar) -> Belgeden Çıkarılan Metin İçeriği ($onceki.belgeMetinIcerigi)]
   */
  const formatNamedMentionToken = (field: FlowchartPreviousNodeOutputField): string => {
    const cleanExpr = formatCleanExpressionPath(field);
    return `@[${field.sourceNodeTitle} -> ${field.label} (${cleanExpr})]`;
  };

  const detectMentionAtCursor = (text: string, cursorIndex: number) => {
    const beforeCursor = text.slice(0, cursorIndex);
    const match = beforeCursor.match(/(?:^|[\s(\n])@([^\s@\[\]\n]*)$/);
    if (match) {
      const query = match[1] || '';
      const atStart = cursorIndex - query.length - 1;
      setIsAttachPickerOpen(false);
      setIsMenuOpen(true);
      setMentionQuery(query);
      setMentionRange({ start: atStart, end: cursorIndex });
      setHighlightedIndex(0);
    } else {
      setIsMenuOpen(false);
      setMentionQuery('');
      setMentionRange(null);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = e.target.value;
    const cursorPos = e.target.selectionStart ?? nextText.length;
    onChange(e);
    if (onValueChange) {
      onValueChange(nextText);
    }
    detectMentionAtCursor(nextText, cursorPos);
  };

  const handleSelectField = (field: FlowchartPreviousNodeOutputField) => {
    const currentText = value || '';
    const token = formatNamedMentionToken(field);

    let replaceStart = currentText.length;
    let replaceEnd = currentText.length;

    if (mentionRange) {
      replaceStart = mentionRange.start;
      replaceEnd = mentionRange.end;
    } else if (textareaRef.current) {
      replaceStart = textareaRef.current.selectionStart ?? currentText.length;
      replaceEnd = textareaRef.current.selectionEnd ?? currentText.length;
    }

    const before = currentText.slice(0, replaceStart);
    const after = currentText.slice(replaceEnd);
    const needsLeadingSpace = before.length > 0 && !/[\s(\n]$/.test(before);
    const needsTrailingSpace = !after.startsWith(' ');

    const prefix = needsLeadingSpace ? ' ' : '';
    const suffix = needsTrailingSpace ? ' ' : '';
    const nextText = `${before}${prefix}${token}${suffix}${after}`;
    const nextCursorPos = before.length + prefix.length + token.length + suffix.length;

    const syntheticEvent = {
      target: { value: nextText },
      currentTarget: { value: nextText }
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange(syntheticEvent);
    if (onValueChange) {
      onValueChange(nextText);
    }

    if (updateOncekiDugumGirdisi) {
      const existingVars = Array.isArray(oncekiDugumGirdisi?.seciliDegiskenler)
        ? oncekiDugumGirdisi!.seciliDegiskenler
        : [];
      if (!existingVars.includes(field.expression)) {
        updateOncekiDugumGirdisi({
          aktifMi: true,
          seciliDegiskenler: [...existingVars, field.expression]
        });
      }
    }

    setIsMenuOpen(false);
    setMentionQuery('');
    setMentionRange(null);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursorPos, nextCursorPos);
      }
    });
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMenuOpen && filteredVariables.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredVariables.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + filteredVariables.length) % filteredVariables.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filteredVariables[highlightedIndex] || filteredVariables[0];
        if (selected) {
          handleSelectField(selected);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMenuOpen(false);
        setMentionQuery('');
        setMentionRange(null);
        return;
      }
    } else if ((isMenuOpen || isAttachPickerOpen) && e.key === 'Escape') {
      e.preventDefault();
      setIsMenuOpen(false);
      setIsAttachPickerOpen(false);
      setMentionQuery('');
      setMentionRange(null);
      return;
    }

    if (onKeyDown) {
      onKeyDown(e as any);
    }
  };

  const handleToggleAttachMenu = () => {
    setIsMenuOpen(false);
    setMentionQuery('');
    setMentionRange(null);
    setIsAttachPickerOpen((prev) => !prev);
  };

  const renderCategoryIcon = (category: FlowchartPreviousNodeOutputField['dataType']) => {
    if (category === 'belge') return <FileText size={14} />;
    if (category === 'karar') return <GitBranch size={14} />;
    if (category === 'veri') return <Database size={14} />;
    return <Sparkles size={14} />;
  };

  const sourceTitleSummary =
    availableInputVariables[0]?.sourceNodeTitle || t('onceki_dugum', 'Önceki Düğüm');

  return (
    <div ref={wrapperRef} className="flowchart-prompt-mention-container">
      <NotInput
        ref={textareaRef}
        className={`ai-islem-prompt-input-wrapper ${className}`.trim()}
        value={value}
        onChange={handleTextareaChange as any}
        onKeyDown={handleTextareaKeyDown as any}
        onClick={(e: any) => {
          if (onClick) onClick(e);
        }}
        rightActions={
          rightActions !== undefined ? (
            rightActions
          ) : showAttachButton ? (
            <button
              type="button"
              className={`ai-islem-prompt-attach-btn ${isAttachPickerOpen || attachedFiles.length > 0 ? 'is-active' : ''
                }`}
              onClick={handleToggleAttachMenu}
              title={t(
                'onceki_dugumden_belge_eki_sec',
                'Önceki Düğümden Gelecek Belge / Dosya Ekini Seç'
              )}
              aria-label={t(
                'onceki_dugumden_belge_eki_sec',
                'Önceki Düğümden Gelecek Belge / Dosya Ekini Seç'
              )}
            >
              <Paperclip size={16} />
              {attachedFiles.length > 0 && (
                <span className="ai-islem-prompt-attach-count">{attachedFiles.length}</span>
              )}
            </button>
          ) : undefined
        }
        {...rest}
      />

      {/* PROMPT ALTINDA BAĞLI BELGE EKLERİ VEYA AKILLI FILE IMPORT ÖNERİ BARI */}
      {showAttachButton && smartFileSource && smartFileSource.options.length > 0 && (
        <div className="flowchart-attached-files-bar">
          {attachedFiles.length > 0 ? (
            <div className="flowchart-attached-files-list">
              {attachedFiles.map((item) => (
                <div key={item.id} className="flowchart-attached-file-chip">
                  <div className="flowchart-attached-file-chip-icon">
                    {item.selectionMode === 'multiple' ? <Files size={15} /> : <FileText size={15} />}
                  </div>
                  <div className="flowchart-attached-file-chip-info">
                    <div className="flowchart-attached-file-chip-top">
                      <span className="flowchart-attached-file-source">{item.sourceNodeTitle}</span>
                      <ArrowRight size={11} className="flowchart-mention-arrow" />
                      <span className="flowchart-attached-file-label">{item.label}</span>
                    </div>
                    <div className="flowchart-attached-file-chip-meta">
                      {item.fileFilterSummary && (
                        <span className="flowchart-attached-file-filter-badge">
                          {item.fileFilterSummary}
                        </span>
                      )}
                      <code className="flowchart-attached-file-expr">{item.expressionPath}</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flowchart-attached-file-remove-btn"
                    onClick={() => handleRemoveFileAttachment(item.id)}
                    title={t('belge_ekini_kaldir', 'Belge Ekini Kaldır')}
                    aria-label={t('belge_ekini_kaldir', 'Belge Ekini Kaldır')}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="flowchart-attached-file-manage-btn"
                onClick={() => setIsAttachPickerOpen(true)}
              >
                <Paperclip size={13} />
                <span>{t('belge_eklerini_duzenle', 'Belge Seçimini Düzenle')}</span>
              </button>
            </div>
          ) : (
            <div className="flowchart-smart-file-suggestion-bar">
              <div className="flowchart-smart-file-suggestion-left">
                <span className="flowchart-smart-file-suggestion-icon">
                  <Paperclip size={14} />
                </span>
                <span className="flowchart-smart-file-suggestion-text">
                  <strong>{smartFileSource.sourceNodeTitle}</strong>{' '}
                  {smartFileSource.isFileImportNode
                    ? t(
                      'onceki_dugum_file_import_belge_algilandi',
                      'düğümünden ({{mod}} • {{format}}) gelecek belge/belgeler algılandı.',
                      {
                        mod: smartFileSource.selectionModeLabel,
                        format: smartFileSource.fileFilterSummary
                      }
                    )
                    : t(
                      'onceki_dugum_belge_eki_algilandi',
                      'düğümünden gelebilecek belge ekleri algılandı.'
                    )}
                </span>
              </div>
              <div className="flowchart-smart-file-suggestion-actions">
                <button
                  type="button"
                  className="flowchart-smart-file-quick-attach-btn"
                  onClick={() => handleToggleFileAttachment(smartFileSource.options[0])}
                >
                  <Plus size={13} />
                  <span>
                    {smartFileSource.selectionMode === 'multiple'
                      ? t('gelecek_belgeleri_bagla', 'Gelecek Belgeleri Bağla')
                      : t('gelecek_belgeyi_bagla', 'Gelecek Belgeyi Bağla')}
                  </span>
                </button>
                <button
                  type="button"
                  className="flowchart-smart-file-open-picker-btn"
                  onClick={() => setIsAttachPickerOpen(true)}
                >
                  <span>{t('secenekleri_gor', 'Seçenekler')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AKILLI BELGE / DOSYA EKİ SEÇİCİ POPOVER (ATAÇ İKONUNA TIKLANDIĞINDA AÇILIR) */}
      {isAttachPickerOpen && smartFileSource && (
        <div
          className="flowchart-attach-picker-popover"
          role="dialog"
          aria-label={t(
            'onceki_dugum_belge_eki_secici_baslik',
            'Önceki Düğümden Gelecek Belge / Dosya Eki Seçimi'
          )}
        >
          <div className="flowchart-attach-picker-header">
            <div className="flowchart-attach-picker-header-top">
              <div className="flowchart-attach-picker-title">
                <Paperclip size={15} />
                <span>
                  {t(
                    'onceki_dugum_belge_eki_secici_baslik',
                    'Önceki Düğümden Gelecek Belge / Dosya Eki Seçimi'
                  )}
                </span>
              </div>
              <button
                type="button"
                className="flowchart-attach-picker-close-btn"
                onClick={() => setIsAttachPickerOpen(false)}
                aria-label={t('kapat', 'Kapat')}
              >
                <X size={15} />
              </button>
            </div>

            <div className="flowchart-attach-picker-source-summary">
              <span className="flowchart-attach-source-pill">
                <Monitor size={12} />
                <span>{smartFileSource.sourceNodeTitle}</span>
              </span>
              <span className="flowchart-attach-mode-pill">
                <Files size={12} />
                <span>{smartFileSource.selectionModeLabel}</span>
              </span>
              <span className="flowchart-attach-filter-pill">
                <Filter size={12} />
                <span>{smartFileSource.fileFilterSummary}</span>
              </span>
              {smartFileSource.defaultSendToCloud && (
                <span className="flowchart-attach-cloud-pill">
                  <Cloud size={12} />
                  <span>{t('bulut_kayit_aktif', 'Bulut Kayıt Aktif')}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flowchart-attach-picker-list">
            {smartFileSource.options.map((opt) => {
              const isSelected = attachedFiles.some((item) => item.id === opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`flowchart-attach-option-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleToggleFileAttachment(opt)}
                >
                  <div className="flowchart-attach-option-check">
                    {isSelected ? <CheckCircle2 size={17} /> : <Plus size={16} />}
                  </div>
                  <div className="flowchart-attach-option-body">
                    <div className="flowchart-attach-option-top">
                      <span className="flowchart-attach-option-title">{opt.label}</span>
                      <code className="flowchart-attach-option-code">{opt.expressionPath}</code>
                    </div>
                    <p className="flowchart-attach-option-desc">{opt.description}</p>
                  </div>
                  <span
                    className={`flowchart-attach-option-status ${isSelected ? 'is-selected' : ''}`}
                  >
                    {isSelected ? t('eklendi', 'Bağlandı') : t('bagla', 'Bağla')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* @ VERİ TAMAMLAMA MENÜSÜ */}
      {isMenuOpen && (
        <div
          className="flowchart-mention-dropdown"
          role="listbox"
          aria-label={t('onceki_dugum_veri_secim_menusu', 'Önceki Düğüm Veri Tamamlama Menüsü')}
        >
          <div className="flowchart-mention-dropdown-header">
            <div className="flowchart-mention-dropdown-title">
              <AtSign size={14} />
              <span>
                {t('onceki_dugum_verileri', 'Önceki Düğüm Verileri')} • {sourceTitleSummary}
              </span>
            </div>
            <span className="flowchart-mention-dropdown-kbd">
              {t('mention_klavye_ipucu', '↑↓ Seç • Enter Ekle • Esc Kapat')}
            </span>
          </div>

          <div ref={menuListRef} className="flowchart-mention-dropdown-list">
            {filteredVariables.length === 0 ? (
              <div className="flowchart-mention-empty">
                {t(
                  'eslesen_onceki_dugum_verisi_bulunamadi',
                  'Eşleşen önceki düğüm verisi bulunamadı.'
                )}
              </div>
            ) : (
              filteredVariables.map((field, idx) => {
                const isHighlighted = idx === highlightedIndex;
                const cleanExpr = formatCleanExpressionPath(field);
                return (
                  <button
                    key={field.key}
                    type="button"
                    role="option"
                    aria-selected={isHighlighted}
                    data-mention-idx={idx}
                    className={`flowchart-mention-item ${isHighlighted ? 'is-highlighted' : ''}`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectField(field);
                    }}
                  >
                    <span className={`flowchart-mention-item-icon is-${field.dataType}`}>
                      {renderCategoryIcon(field.dataType)}
                    </span>
                    <span className="flowchart-mention-item-main">
                      <span className="flowchart-mention-item-top">
                        <span className="flowchart-mention-source-badge">
                          {field.sourceNodeTitle}
                        </span>
                        <ArrowRight size={11} className="flowchart-mention-arrow" />
                        <span className="flowchart-mention-field-label">{field.label}</span>
                      </span>
                      <span className="flowchart-mention-item-bottom">
                        <code className="flowchart-mention-prop-code">{cleanExpr}</code>
                        <span className="flowchart-mention-field-desc">{field.description}</span>
                      </span>
                    </span>
                    <span className="flowchart-mention-type-badge">{field.schemaType}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
  agentData?: any;
  istekData?: any;
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
  /** Başla düğümü dışındaki tüm düğümlerde varsayılan olarak true'dur; "Önceki Düğüm" sekmesini ve şema değerlerini gösterir */
  showPreviousNodeInput?: boolean;
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
  agentData: propAgentData,
  istekData: propIstekData,
  formData: controlledFormData,
  onFormDataChange,
  onSave: propOnSave,
  onClose,
  onBack,
  backRoute,
  showBackButton = true,
  isSaving: controlledIsSaving,
  extraDropdownActions,
  tabs: customTabs,
  activeTabId: controlledActiveTabId,
  onTabChange,
  subTrail,
  showPreviousNodeInput,
  className = '',
  children
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();
  const { setHeaderBreadcrumbOptions } = useHeaderApi() || {};
  const ayarlarTabContainerRef = useRef<HTMLDivElement>(null);

  const effectiveAgentId = propAgentId || params.id;
  const effectiveIstekId = propIstekId || params.istekId;
  const effectiveNodeId =
    propNodeId || controlledFormData?.id || initialNodeData?.id || params.ogeId;

  const initialDefaults = useMemo(
    () =>
      getFlowchartOgeAyarDefaultValues({
        activeTabId: location.state?.activeTabId ?? DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB,
        oncekiDugumGirdisi: controlledFormData?.oncekiDugumGirdisi || initialNodeData?.oncekiDugumGirdisi
      }),
    []
  );

  const [internalIsSaving, setInternalIsSaving] = useState<boolean>(false);
  const [internalFormData, setInternalFormData] = useState<any>(initialNodeData || {});
  const [fetchedIstekData, setFetchedIstekData] = useState<any>(null);
  const [internalActiveTab, setInternalActiveTab] = useState<string | number>(() =>
    getFlowchartOgeAyarDefaultActiveTab(location.state?.activeTabId)
  );
  const [schemaViewMode, setSchemaViewMode] = useState<'json_schema' | 'example_payload'>(
    initialDefaults.schemaViewMode
  );
  const [showNestedInSettings, setShowNestedInSettings] = useState<boolean>(
    initialDefaults.showNestedInSettings
  );

  const effectiveActiveTab =
    controlledActiveTabId !== undefined ? controlledActiveTabId : internalActiveTab;

  // Sayfa ilk açıldığında ("Ayarlar" sekmesi) veya "Ayarlar" sekmesine geçildiğinde ilk etkileşimli alana odaklan
  useFlowchartOgeAyarAutoFocus(ayarlarTabContainerRef, effectiveActiveTab);

  const handleTabChange = (nextTabId: string | number) => {
    if (controlledActiveTabId === undefined) {
      setInternalActiveTab(nextTabId);
    }
    if (onTabChange) {
      onTabChange(nextTabId);
    }
  };

  const effectiveIsSaving =
    controlledIsSaving !== undefined ? controlledIsSaving : internalIsSaving;
  const effectiveFormData =
    controlledFormData !== undefined ? controlledFormData : internalFormData;

  const resolvedIstekData = propIstekData || location.state?.istekData || fetchedIstekData;

  useEffect(() => {
    if (!propIstekData && !location.state?.istekData && effectiveAgentId && effectiveIstekId) {
      axios
        .get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then((res) => {
          if (res.data && Array.isArray(res.data.hizliIstekler)) {
            const found = res.data.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
            if (found) setFetchedIstekData(found);
          }
        })
        .catch(() => { });
    }
  }, [propIstekData, location.state?.istekData, effectiveAgentId, effectiveIstekId]);

  const setFormData = (updater: any) => {
    const nextVal = typeof updater === 'function' ? updater(effectiveFormData) : updater;
    if (controlledFormData === undefined) {
      setInternalFormData(nextVal);
    }
    if (onFormDataChange) {
      onFormDataChange(nextVal);
    }
  };

  // Mevcut düğümün "Başla" (kök) düğümü olup olmadığını tespit et
  const effectiveNodeType = nodeType || effectiveFormData?.tip || initialNodeData?.tip || '';
  const isStartNode = useMemo(() => {
    if (showPreviousNodeInput !== undefined) return !showPreviousNodeInput;
    return (
      id === 'baslaFlowchartOgeAyarPage' ||
      effectiveNodeType === 'BASLA' ||
      effectiveNodeId === 'BASLA' ||
      effectiveNodeId === '__START__'
    );
  }, [showPreviousNodeInput, id, effectiveNodeType, effectiveNodeId]);

  // Kendisinden önce gelen düğümleri (Upstream Nodes) çözümle
  const previousNodes = useMemo<AiAkisDugumu[]>(() => {
    if (isStartNode) return [];
    const allNodes: AiAkisDugumu[] = Array.isArray(resolvedIstekData?.akisDugumleri)
      ? resolvedIstekData.akisDugumleri
      : [];

    const startNodeFallback: AiAkisDugumu = {
      id: 'BASLA',
      tip: 'BASLA',
      baslik: t('basla', 'Başla'),
      prompt: resolvedIstekData?.prompt || '',
      hizliErisimAktifMi: resolvedIstekData?.hizliErisimAktifMi,
      dugmeMetni: resolvedIstekData?.dugmeMetni || resolvedIstekData?.baslik || ''
    };

    if (allNodes.length === 0) {
      return [startNodeFallback];
    }

    const currentIdx = allNodes.findIndex(
      (n) =>
        n && (n.id === effectiveNodeId || (effectiveNodeId && n.id === String(effectiveNodeId)))
    );

    const sliced =
      currentIdx > 0 ? allNodes.slice(0, currentIdx) : currentIdx === -1 ? allNodes : [];

    if (sliced.length === 0) {
      return [startNodeFallback];
    }

    // İlk düğüm BASLA değilse zincirin en başına BASLA düğümünü ekle
    const hasStart = sliced.some((n) => (n.tip || '').toUpperCase() === 'BASLA' || n.id === 'BASLA');
    if (!hasStart) {
      return [startNodeFallback, ...sliced];
    }

    return sliced;
  }, [isStartNode, resolvedIstekData, effectiveNodeId, t]);

  const immediatePreviousNode = useMemo<AiAkisDugumu | null>(() => {
    if (previousNodes.length === 0) return null;
    return previousNodes[previousNodes.length - 1];
  }, [previousNodes]);

  // Önceki düğüm girdi ayarlarını çözümle
  const oncekiDugumGirdisi = useMemo<Required<AiOncekiDugumGirdiAyarlari>>(() => {
    const raw = effectiveFormData?.oncekiDugumGirdisi || {};
    return {
      aktifMi: raw.aktifMi !== false,
      kaynakDugumId: raw.kaynakDugumId || 'OTOMATIK_ONCEKI',
      belgeleriAktar: raw.belgeleriAktar !== false,
      formVerileriniAktar: raw.formVerileriniAktar !== false,
      aiCiktisiniAktar: raw.aiCiktisiniAktar !== false,
      seciliDegiskenler: Array.isArray(raw.seciliDegiskenler) ? raw.seciliDegiskenler : [],
      bagliBelgeEkleri: Array.isArray(raw.bagliBelgeEkleri) ? raw.bagliBelgeEkleri : []
    };
  }, [effectiveFormData?.oncekiDugumGirdisi]);

  const updateOncekiDugumGirdisi = (patch: Partial<AiOncekiDugumGirdiAyarlari>) => {
    setFormData((prev: any) => {
      const current = prev?.oncekiDugumGirdisi || {};
      return {
        ...prev,
        oncekiDugumGirdisi: {
          ...DEFAULT_ONCEKI_DUGUM_GIRDISI,
          ...current,
          ...patch
        }
      };
    });
  };

  // Seçili kaynak düğümü çözümle
  const activeSourceNodeInfo = useMemo<{
    node: AiAkisDugumu | null;
    stepIndex: number;
    isImmediate: boolean;
  }>(() => {
    if (isStartNode || previousNodes.length === 0) {
      return { node: null, stepIndex: 0, isImmediate: true };
    }
    const selectedSource = oncekiDugumGirdisi.kaynakDugumId;
    if (selectedSource && selectedSource !== 'OTOMATIK_ONCEKI' && selectedSource !== 'TUM_ONCEKILER') {
      const idx = previousNodes.findIndex((n) => n.id === selectedSource);
      if (idx !== -1) {
        return {
          node: previousNodes[idx],
          stepIndex: idx,
          isImmediate: idx === previousNodes.length - 1
        };
      }
    }
    const lastIdx = previousNodes.length - 1;
    return {
      node: previousNodes[lastIdx],
      stepIndex: lastIdx,
      isImmediate: true
    };
  }, [isStartNode, previousNodes, oncekiDugumGirdisi.kaynakDugumId]);

  // Önceki düğümün vermeyi taahhüt ettiği sabit JSON Schema
  const previousNodeJsonSchema = useMemo<FlowchartNodeJsonSchema | null>(() => {
    if (!activeSourceNodeInfo.node) return null;
    return getNodeFixedOutputJsonSchema(
      activeSourceNodeInfo.node,
      activeSourceNodeInfo.stepIndex,
      activeSourceNodeInfo.isImmediate,
      t
    );
  }, [activeSourceNodeInfo, t]);

  // Mevcut düğümün kendi vermeyi taahhüt ettiği sabit JSON Schema
  const currentNodeOutputJsonSchema = useMemo<FlowchartNodeJsonSchema>(() => {
    return getNodeFixedOutputJsonSchema(
      {
        ...effectiveFormData,
        id: effectiveNodeId || effectiveFormData?.id,
        tip: (effectiveNodeType || 'AI_ISLEM') as any
      },
      previousNodes.length,
      true,
      t
    );
  }, [effectiveFormData, effectiveNodeId, effectiveNodeType, previousNodes.length, t]);

  const formatNodeDisplayTitle = (node: AiAkisDugumu | null, idx?: number) => {
    if (!node) return t('onceki_dugum', 'Önceki Düğüm');
    if (node.varlikAdi?.trim()) {
      return `${node.baslik || t('form_ac', 'Form Aç')} (${node.varlikAdi.trim()})`;
    }
    return node.baslik || (idx !== undefined ? `${idx + 1}. ${t('adim', 'Adım')}` : node.tip);
  };

  // Seçili kaynak düğümün sabit JSON Schema'sından kullanılabilir değişkenleri üret
  const availableInputVariables = useMemo<FlowchartPreviousNodeOutputField[]>(() => {
    if (isStartNode || previousNodes.length === 0) return [];

    if (oncekiDugumGirdisi.kaynakDugumId === 'TUM_ONCEKILER') {
      return previousNodes.flatMap((n, idx) => {
        const isImm = idx === previousNodes.length - 1;
        const schema = getNodeFixedOutputJsonSchema(n, idx, isImm, t);
        return extractVariablesFromNodeSchema(n, schema, formatNodeDisplayTitle(n, idx));
      });
    }

    if (activeSourceNodeInfo.node && previousNodeJsonSchema) {
      return extractVariablesFromNodeSchema(
        activeSourceNodeInfo.node,
        previousNodeJsonSchema,
        formatNodeDisplayTitle(activeSourceNodeInfo.node, activeSourceNodeInfo.stepIndex)
      );
    }

    return [];
  }, [
    isStartNode,
    previousNodes,
    oncekiDugumGirdisi.kaynakDugumId,
    activeSourceNodeInfo,
    previousNodeJsonSchema,
    t
  ]);

  // Bir şema değişkenine tıklandığında mevcut düğümün Ayarlar sekmesindeki yönerge / mesaj alanına ekle
  const insertVariableIntoPrompt = (expression: string) => {
    setFormData((prev: any) => {
      const currentPrompt = prev?.prompt || '';
      const alreadyHas = currentPrompt.includes(expression);
      const nextPrompt = alreadyHas
        ? currentPrompt
        : currentPrompt.trim()
          ? `${currentPrompt.trim()} ${expression}`
          : expression;

      const currentGirdi = prev?.oncekiDugumGirdisi || DEFAULT_ONCEKI_DUGUM_GIRDISI;
      const existingVars: string[] = Array.isArray(currentGirdi.seciliDegiskenler)
        ? currentGirdi.seciliDegiskenler
        : [];
      const nextVars = existingVars.includes(expression)
        ? existingVars
        : [...existingVars, expression];

      return {
        ...prev,
        prompt: nextPrompt,
        oncekiDugumGirdisi: {
          ...DEFAULT_ONCEKI_DUGUM_GIRDISI,
          ...currentGirdi,
          seciliDegiskenler: nextVars
        }
      };
    });

    toast.success(
      t('n8n_degisken_prompta_eklendi', '{{expr}} şema değeri düğüm ayarlarına eklendi.', {
        expr: expression
      })
    );
  };

  const handleCopyJsonSchema = (contentObj: any) => {
    try {
      const formatted = JSON.stringify(contentObj, null, 2);
      navigator.clipboard.writeText(formatted);
      toast.success(t('json_schema_kopyalandi', 'JSON Schema panoya kopyalandı.'));
    } catch {
      toast.error(t('kopyalama_basarisiz', 'Kopyalama işlemi başarısız oldu.'));
    }
  };

  const renderNodeSmallIcon = (tip?: string) => {
    const upper = (tip || '').toUpperCase();
    if (upper === 'BASLA') return <Play size={13} />;
    if (upper === 'FORM_AC' || upper === 'EKRAN_AC') return <Monitor size={13} />;
    if (upper === 'KARAR_ONAY') return <GitBranch size={13} />;
    return <Cpu size={13} />;
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
        const finalData = isStartNode
          ? {
            ...effectiveFormData,
            ciktiJsonSemasi: currentNodeOutputJsonSchema
          }
          : {
            ...effectiveFormData,
            oncekiDugumGirdisi,
            ciktiJsonSemasi: currentNodeOutputJsonSchema
          };
        await propOnSave(finalData);
      }
    } finally {
      if (controlledIsSaving === undefined) {
        setInternalIsSaving(false);
      }
    }
  };

  const immediatePrevDisplayName = useMemo(() => {
    if (!immediatePreviousNode) return t('onceki_dugum', 'Önceki Düğüm');
    if (immediatePreviousNode.varlikAdi?.trim()) {
      return `${immediatePreviousNode.baslik || t('form_ac', 'Form Aç')} • ${immediatePreviousNode.varlikAdi.trim()}`;
    }
    return immediatePreviousNode.baslik || t('onceki_dugum', 'Önceki Düğüm');
  }, [immediatePreviousNode, t]);

  const activeSourceDisplayName = useMemo(() => {
    if (oncekiDugumGirdisi.kaynakDugumId === 'TUM_ONCEKILER') {
      return `${t('tum_onceki_dugumler', 'Tüm Önceki Düğümler')} (${previousNodes.length})`;
    }
    if (!activeSourceNodeInfo.node) return immediatePrevDisplayName;
    return formatNodeDisplayTitle(activeSourceNodeInfo.node, activeSourceNodeInfo.stepIndex);
  }, [
    oncekiDugumGirdisi.kaynakDugumId,
    previousNodes.length,
    activeSourceNodeInfo,
    immediatePrevDisplayName,
    t
  ]);

  const visibleSettingsVariables = useMemo(() => {
    if (showNestedInSettings) return availableInputVariables;
    return availableInputVariables.filter((v) => !v.isNested);
  }, [availableInputVariables, showNestedInSettings]);

  // "Ayarlar" sekmesi içeriği: Düğümün kendi ayarları (children)
  const renderAyarlarTabContent = () => (
    <div ref={ayarlarTabContainerRef} className="flowchart-ayarlar-tab-pane">
      {children}
    </div>
  );

  // "Önceki Düğüm" sekmesi içeriği: Sadece önceki düğümün JSON verisini sade bir şekilde gösterir
  const renderOncekiDugumTabContent = () => {
    const jsonData = !isStartNode && previousNodeJsonSchema ? previousNodeJsonSchema.examplePayload : null;

    return (
      <div className="basla-ayar-page-container n8n-onceki-dugum-tab-container">
        <JsonView
          id={`${id}_oncekiDugumJsonView`}
          title={
            !isStartNode && activeSourceDisplayName
              ? `${activeSourceDisplayName} - ${t('json_verisi', 'JSON Verisi')}`
              : t('onceki_dugum_json_verisi', 'Önceki Düğüm JSON Verisi')
          }
          data={jsonData}
          emptyText={t('onceki_dugum_json_verisi_yok', 'Bu düğümden önce çalışan bir düğüm bulunmuyor.')}
        />
      </div>
    );
  };

  // TabLayout sekmelerini oluştur ("Önceki Düğüm" her zaman ilk sekme, "Ayarlar" ikinci sekme)
  const layoutTabs = useMemo<BaseTabItem[]>(() => {
    if (customTabs && customTabs.length > 0) {
      return customTabs;
    }

    return [
      {
        id: 'onceki_dugum',
        label: t('onceki_dugum', 'Önceki Düğüm'),
        icon: <Workflow size={16} />,
        content: renderOncekiDugumTabContent()
      },
      {
        id: 'ayarlar',
        label: t('ayarlar', 'Ayarlar'),
        icon: <Sliders size={16} />,
        content: renderAyarlarTabContent()
      }
    ];
  }, [
    customTabs,
    isStartNode,
    previousNodeJsonSchema,
    currentNodeOutputJsonSchema,
    visibleSettingsVariables,
    showNestedInSettings,
    oncekiDugumGirdisi,
    effectiveFormData,
    schemaViewMode,
    activeSourceDisplayName,
    immediatePrevDisplayName,
    children,
    t
  ]);

  const contextValue = useMemo<FlowchartOgeAyarContextValue>(
    () => ({
      previousNodes,
      immediatePreviousNode,
      activeSourceNode: activeSourceNodeInfo.node,
      previousNodeJsonSchema,
      currentNodeOutputJsonSchema,
      availableInputVariables,
      oncekiDugumGirdisi,
      updateOncekiDugumGirdisi,
      insertVariableIntoPrompt,
      activeTab: effectiveActiveTab,
      setActiveTab: handleTabChange
    }),
    [
      previousNodes,
      immediatePreviousNode,
      activeSourceNodeInfo.node,
      previousNodeJsonSchema,
      currentNodeOutputJsonSchema,
      availableInputVariables,
      oncekiDugumGirdisi,
      effectiveActiveTab
    ]
  );

  return (
    <FlowchartOgeAyarContext.Provider value={contextValue}>
      <BaseCardPage
        id={id}
        title={pageDisplayName}
        pageTitle={pageDisplayName}
        recordTitle={pageDisplayName}
        icon={icon || <Sliders size={24} color="var(--accent-primary)" />}
        subtitleLeft={
          subtitleLeft ||
          t(
            'flowchart_oge_yapilandirma_aciklama',
            'Akış diyagramı düğüm parametreleri ve yapılandırma ayarları'
          )
        }
        showBackButton={showBackButton}
        onClose={handleClose}
        onSave={handleSave}
        isSaving={effectiveIsSaving}
        extraDropdownActions={extraDropdownActions}
        subTrail={subTrail}
        className={`fade-in ${className}`}
      >
        <div className="flowchart-oge-ayar-content">
          <TabLayout
            tabs={layoutTabs}
            activeTabId={effectiveActiveTab}
            onTabChange={handleTabChange}
            hideIfSingleTab={false}
            className="flowchart-oge-ayar-tab-layout"
          />
        </div>
      </BaseCardPage>
    </FlowchartOgeAyarContext.Provider>
  );
};

export default BaseAiAjanFlowchartOgeAyarPage;
