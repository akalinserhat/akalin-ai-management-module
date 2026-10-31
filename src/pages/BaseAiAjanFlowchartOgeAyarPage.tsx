/**
 * @akalin/ai_management_module - Temel Flowchart Öğe Ayarları Kart Sayfası (BaseAiAjanFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - Tüm Flowchart akış düğümü ayar sayfaları (Başla, Form Aç, AI İşlemi, Karar, Belge vb.) için ortak temel kart sayfası iskeletini sunmak
 * - @akalin/ui TabLayout bileşenini kullanarak her düğümde "Ayarlar" ve "Önceki Düğüm" sekmeli mimarisini standartlaştırmak
 * - Her düğüm tipi için vermeyi taahhüt ettiği sabit bir JSON Schema (FlowchartNodeJsonSchema) sözleşmesi tanımlamak
 * - Bir önceki düğümün taahhüt ettiği sabit JSON Schema yapısını "Önceki Düğüm" sekmesinde detaylı olarak göstermek ve "Ayarlar" sekmesinde bu şema değerlerini kullanabilmeyi sağlamak
 * - @akalin/ui BaseCardPage temel bileşenini sarmalayarak standart form mimarisi, ActionMenu ve Breadcrumb senkronizasyonu sağlamak
 * - Zero Bottom Button, Header-Only Actions, Sıfır Header Rozeti, Sıfır Inline CSS ve %100 i18n kurallarına tam uyum sağlamak
 */

import React, { useState, useMemo, useEffect, createContext, useContext } from 'react';
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
  Info,
  Braces,
  Copy,
  Code2,
  Layers,
  CheckCircle2,
  CornerDownRight
} from 'lucide-react';
import {
  BaseCardPage,
  BaseSwitch,
  TabLayout,
  useHeaderApi,
  type BaseTabItem
} from '@akalin/ui';
import type {
  AiAkisDugumu,
  AiOncekiDugumGirdiAyarlari,
  FlowchartNodeJsonSchema,
  FlowchartNodeJsonSchemaProperty
} from '../types';

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
  exampleValue?: any;
  sourceNodeId: string;
  sourceNodeTitle: string;
  sourceNodeType: string;
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
 * Her düğüm tipinin (BASLA, FORM_AC, AI_ISLEM, KARAR_ONAY vb.) kendisinden sonraki düğüme
 * vermeyi taahhüt ettiği sabit JSON Schema (Data Contract) sözleşmesini üretir.
 */
export const getNodeFixedOutputJsonSchema = (
  node: Partial<AiAkisDugumu> | null | undefined,
  stepIndex: number = 0,
  isImmediate: boolean = true,
  tFn?: (key: string, defaultText?: string, options?: any) => string
): FlowchartNodeJsonSchema => {
  const tr = (key: string, fallback: string) => (tFn ? tFn(key, fallback) : fallback);
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
        example: node?.dugmeMetni || 'Kampanya yazısından belge oluştur.'
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
        example: node?.hizliErisimAktifMi ? 'HIZLI_ERISIM_DUGMESI' : 'SOHBET_NIYET_ESLESTIRME'
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
    const varlikAdiOrnek = node?.varlikAdi || 'BSH Fiyat Farkı';
    const modulKoduOrnek = node?.modulKodu || 'kampanya_modulu';
    const varlikKoduOrnek = node?.varlikKodu || 'bsh_fiyat_farki';
    const hedefRotaOrnek = node?.hedefRota || '/kampanya/bsh-fiyat-farki';

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
          'Açılan formda gerçekleştirilen işlemin tamamlanma durumu (KAYDEDILDI | BELGE_AKTARILDI | ACILDI)'
        ),
        expression: `{{ ${prefix}.islemDurumu }}`,
        required: true,
        example: 'BELGE_AKTARILDI'
      },
      varlikBilgisi: {
        type: 'object',
        format: 'json',
        title: tr('schema_prop_varlik_bilgisi', 'Açılan Form / MCP Varlık Bilgisi'),
        description: tr(
          'schema_prop_varlik_bilgisi_desc',
          'Bu düğümde açılan ERP formunun, belgenin veya kartın sabit kimlik ve rota bilgileri'
        ),
        expression: `{{ ${prefix}.varlikBilgisi }}`,
        required: true,
        properties: {
          modulKodu: {
            type: 'string',
            title: tr('schema_prop_modul_kodu', 'Modül Kodu'),
            description: tr('schema_prop_modul_kodu_desc', 'İlgili ERP modülünün sistem kodu'),
            expression: `{{ ${prefix}.varlikBilgisi.modulKodu }}`,
            required: true,
            example: modulKoduOrnek
          },
          varlikKodu: {
            type: 'string',
            title: tr('schema_prop_varlik_kodu', 'Varlık Kodu'),
            description: tr('schema_prop_varlik_kodu_desc', 'Açılan belge veya kartın MCP varlık kodu'),
            expression: `{{ ${prefix}.varlikBilgisi.varlikKodu }}`,
            required: true,
            example: varlikKoduOrnek
          },
          varlikAdi: {
            type: 'string',
            title: tr('schema_prop_varlik_adi', 'Varlık / Ekran Adı'),
            description: tr('schema_prop_varlik_adi_desc', 'Açılan formun veya belgenin görünen adı'),
            expression: `{{ ${prefix}.varlikBilgisi.varlikAdi }}`,
            required: true,
            example: varlikAdiOrnek
          },
          hedefRota: {
            type: 'string',
            title: tr('schema_prop_hedef_rota', 'Hedef Ekran Rotası (URL)'),
            description: tr('schema_prop_hedef_rota_desc', 'Formun uygulama içi yönlendirme adresi'),
            expression: `{{ ${prefix}.varlikBilgisi.hedefRota }}`,
            required: true,
            example: hedefRotaOrnek
          }
        },
        example: {
          modulKodu: modulKoduOrnek,
          varlikKodu: varlikKoduOrnek,
          varlikAdi: varlikAdiOrnek,
          hedefRota: hedefRotaOrnek
        }
      },
      eklenenBelgeler: {
        type: 'array',
        format: 'file-attachment',
        title: tr('n8n_var_eklenen_belgeler', 'İçeri Aktarılan Belgeler / Dosyalar'),
        description: tr(
          'n8n_var_eklenen_belgeler_aciklama',
          'Önceki form/ekranda seçilen veya içeri aktarılan PDF, Word, Excel, görsel ve bulut dosyaları'
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
          kaynak: {
            type: 'string',
            title: tr('schema_prop_belge_kaynagi', 'Aktarım Kaynağı'),
            description: tr('schema_prop_belge_kaynagi_desc', 'Bilgisayar, Bulut Depolama veya Form Eki'),
            expression: `{{ ${prefix}.eklenenBelgeler[0].kaynak }}`,
            required: true,
            example: 'BULUT_DEPOLAMA'
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
            kaynak: 'BULUT_DEPOLAMA',
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
      },
      kayitId: {
        type: 'string',
        title: tr('n8n_var_kayit_id', 'Kaydedilen Kayıt ID ve Özeti'),
        description: tr(
          'n8n_var_kayit_id_aciklama',
          'Oluşturulan veya güncellenen kaydın sistem kimliği (ID) ve başlık bilgisi'
        ),
        expression: `{{ ${prefix}.kayitId }}`,
        required: true,
        example: 'REC-2026-00482'
      },
      kaydedilenVeri: {
        type: 'object',
        format: 'json',
        title: tr('n8n_var_kaydedilen_form_verisi', 'Kaydedilen Form / Kart Verisi (JSON)'),
        description: tr(
          'n8n_var_kaydedilen_form_verisi_aciklama',
          'Açılan form veya kart kaydedildiğinde yakalanan tüm alanlar ve satır verileri'
        ),
        expression: `{{ ${prefix}.kaydedilenVeri }}`,
        required: true,
        example: {
          id: 'REC-2026-00482',
          belgeNo: 'KMP-2026-1104',
          varlikAdi: varlikAdiOrnek,
          durum: 'AKTIF'
        }
      }
    };

    return {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      schemaId: 'https://webakus.ai/schemas/flowchart/form-ac-output.schema.json',
      title: tr('schema_title_form_ac', 'Form Aç Düğümü Sabit Çıktı Şeması (FormOpenOutputSchema)'),
      description: tr(
        'schema_desc_form_ac',
        'Form Aç düğümünün bir sonraki adıma vermeyi taahhüt ettiği içeri aktarılan belgeler, çözümlenmiş belge metni ve kaydedilen form verisi şeması.'
      ),
      nodeType: 'FORM_AC',
      type: 'object',
      required: [
        'dugumId',
        'dugumTipi',
        'islemDurumu',
        'varlikBilgisi',
        'eklenenBelgeler',
        'belgeMetinIcerigi',
        'kayitId',
        'kaydedilenVeri'
      ],
      properties,
      examplePayload: {
        dugumId: nodeId,
        dugumTipi: 'FORM_AC',
        islemDurumu: properties.islemDurumu.example,
        varlikBilgisi: properties.varlikBilgisi.example,
        eklenenBelgeler: properties.eklenenBelgeler.example,
        belgeMetinIcerigi: properties.belgeMetinIcerigi.example,
        kayitId: properties.kayitId.example,
        kaydedilenVeri: properties.kaydedilenVeri.example
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
      propKey.toLowerCase().includes('belge') ||
      propKey.toLowerCase().includes('dosya')
    ) {
      return 'belge';
    }
    if (prop.type === 'boolean' || propKey === 'secilenDal') {
      return 'karar';
    }
    if (prop.type === 'object' || prop.type === 'array' || propKey.toLowerCase().includes('id')) {
      return 'veri';
    }
    return 'metin';
  };

  Object.entries(schema.properties).forEach(([propKey, prop]) => {
    if (propKey === 'dugumId' || propKey === 'dugumTipi') return;

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
          label: `${prop.title} → ${subProp.title}`,
          description: subProp.description,
          schemaType: subProp.type,
          dataType: resolveCategory(subKey, subProp),
          required: subProp.required,
          isNested: true,
          exampleValue: subProp.example,
          sourceNodeId: node.id,
          sourceNodeTitle: nodeLabel,
          sourceNodeType: nType
        });
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

const DEFAULT_ONCEKI_DUGUM_GIRDISI: Required<AiOncekiDugumGirdiAyarlari> = {
  aktifMi: true,
  kaynakDugumId: 'OTOMATIK_ONCEKI',
  belgeleriAktar: true,
  formVerileriniAktar: true,
  aiCiktisiniAktar: true,
  seciliDegiskenler: []
};

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

  const effectiveAgentId = propAgentId || params.id;
  const effectiveIstekId = propIstekId || params.istekId;
  const effectiveNodeId =
    propNodeId || controlledFormData?.id || initialNodeData?.id || params.ogeId;

  const [internalIsSaving, setInternalIsSaving] = useState<boolean>(false);
  const [internalFormData, setInternalFormData] = useState<any>(initialNodeData || {});
  const [fetchedIstekData, setFetchedIstekData] = useState<any>(null);
  const [internalActiveTab, setInternalActiveTab] = useState<string | number>('ayarlar');
  const [schemaViewMode, setSchemaViewMode] = useState<'json_schema' | 'example_payload'>(
    'json_schema'
  );
  const [showNestedInSettings, setShowNestedInSettings] = useState<boolean>(false);

  const effectiveActiveTab =
    controlledActiveTabId !== undefined ? controlledActiveTabId : internalActiveTab;

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
        .catch(() => {});
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
      seciliDegiskenler: Array.isArray(raw.seciliDegiskenler) ? raw.seciliDegiskenler : []
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
  }, [oncekiDugumGirdisi.kaynakDugumId, previousNodes.length, activeSourceNodeInfo, immediatePrevDisplayName, t]);

  const visibleSettingsVariables = useMemo(() => {
    if (showNestedInSettings) return availableInputVariables;
    return availableInputVariables.filter((v) => !v.isNested);
  }, [availableInputVariables, showNestedInSettings]);

  // "Ayarlar" sekmesi içeriği: Önceki düğümün şema değerlerini kullanma çubuğu + düğümün kendi ayarları (children)
  const renderAyarlarTabContent = () => (
    <div className="flowchart-ayarlar-tab-pane">
      {!isStartNode && previousNodeJsonSchema && (
        <div className="basla-ayar-page-container n8n-settings-schema-bar-wrapper">
          <section className="basla-ayar-card n8n-settings-schema-card">
            <div className="n8n-settings-schema-header">
              <div className="n8n-settings-schema-header-left">
                <div className="basla-ayar-icon-box emerald">
                  <Braces size={18} />
                </div>
                <div className="n8n-settings-schema-titles">
                  <div className="n8n-settings-schema-title-row">
                    <h4 className="n8n-settings-schema-title">
                      {t(
                        'onceki_dugum_sema_degerlerini_kullan',
                        'Önceki Düğümün Sabit JSON Schema Değerlerini Kullan'
                      )}
                    </h4>
                    <span className="n8n-settings-schema-source-pill">
                      {renderNodeSmallIcon(activeSourceNodeInfo.node?.tip)}
                      <span>{activeSourceDisplayName}</span>
                    </span>
                  </div>
                  <p className="n8n-settings-schema-subtitle">
                    {t(
                      'onceki_dugum_sema_degerlerini_kullan_aciklama',
                      'Bir önceki düğümün vermeyi taahhüt ettiği JSON Schema alanlarına tıklayarak bu düğümün ayarlarında (Prompt / Yönerge) doğrudan kullanabilirsiniz.'
                    )}
                  </p>
                </div>
              </div>

              <div className="n8n-settings-schema-header-actions">
                {availableInputVariables.some((v) => v.isNested) && (
                  <button
                    type="button"
                    className="n8n-schema-toggle-nested-btn"
                    onClick={() => setShowNestedInSettings((prev) => !prev)}
                  >
                    <Layers size={13} />
                    <span>
                      {showNestedInSettings
                        ? t('alt_alanlari_gizle', 'Alt Alanları Gizle')
                        : t('alt_sema_alanlarini_goster', 'Alt Şema Alanlarını Göster')}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="n8n-inspect-schema-tab-btn"
                  onClick={() => handleTabChange('onceki_dugum')}
                >
                  <Workflow size={14} />
                  <span>
                    {t('onceki_dugum_semasini_incele', 'Önceki Düğüm Şemasını Gör')}
                  </span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            <div className="n8n-settings-schema-chips-body">
              <div className="n8n-schema-variables-grid">
                {visibleSettingsVariables.map((item) => {
                  const isUsedInPrompt = Boolean(
                    (effectiveFormData?.prompt &&
                      String(effectiveFormData.prompt).includes(item.expression)) ||
                      (effectiveFormData?.kullaniciMesaji &&
                        String(effectiveFormData.kullaniciMesaji).includes(item.expression))
                  );
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`n8n-schema-var-chip ${isUsedInPrompt ? 'is-used' : ''} ${
                        item.isNested ? 'is-nested' : ''
                      }`}
                      onClick={() => insertVariableIntoPrompt(item.expression)}
                      title={item.description}
                    >
                      <div className="n8n-schema-var-top">
                        <span className={`n8n-schema-var-type type-${item.dataType}`}>
                          {item.schemaType.toUpperCase()}
                        </span>
                        <code className="n8n-schema-var-code">{item.expression}</code>
                        <span className="n8n-schema-var-action-icon">
                          {isUsedInPrompt ? <Check size={13} /> : <Plus size={13} />}
                        </span>
                      </div>
                      <div className="n8n-schema-var-meta">
                        <span className="n8n-schema-var-label">{item.label}</span>
                        <span className="n8n-schema-var-source">{item.sourceNodeTitle}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}

      {children}
    </div>
  );

  // "Önceki Düğüm" sekmesi içeriği: Önceki düğümün vermeyi taahhüt ettiği sabit JSON Schema ve girdi kanalları
  const renderOncekiDugumTabContent = () => {
    if (isStartNode || !previousNodeJsonSchema) return null;

    const displayedJsonObject =
      schemaViewMode === 'json_schema'
        ? {
            $schema: previousNodeJsonSchema.$schema,
            $id: previousNodeJsonSchema.schemaId,
            title: previousNodeJsonSchema.title,
            description: previousNodeJsonSchema.description,
            type: previousNodeJsonSchema.type,
            required: previousNodeJsonSchema.required,
            properties: previousNodeJsonSchema.properties
          }
        : previousNodeJsonSchema.examplePayload;

    return (
      <div className="basla-ayar-page-container n8n-onceki-dugum-tab-container">
        {/* 1. KART: ÖNCEKİ DÜĞÜM BAĞLANTISI VE VERİ AKTARIM KANALLARI */}
        <section className="basla-ayar-card n8n-input-context-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box emerald">
                <Workflow size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'onceki_dugumden_gelen_bilgi_ve_belgeler',
                    'Önceki Düğümden Gelen Bilgi ve Belgeler (Girdi Bağlamı)'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'onceki_dugumden_gelen_bilgi_aciklama',
                    'Akışta bu adımdan önce çalışan düğümlerin ürettiği belgeleri, form kayıtlarını ve çıktı verilerini bu düğüme girdi (input) olarak bağlayın.'
                  )}
                </p>
              </div>
            </div>

            <div
              className={`basla-ayar-switch-pill ${oncekiDugumGirdisi.aktifMi ? 'is-active' : ''}`}
            >
              <BaseSwitch
                id={`${id}_oncekiDugumGirdisiSwitch`}
                checked={oncekiDugumGirdisi.aktifMi}
                onChange={(e: any) => {
                  const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                  updateOncekiDugumGirdisi({ aktifMi: checked });
                }}
                label={
                  <span className="text-sm font-semibold">
                    {oncekiDugumGirdisi.aktifMi
                      ? t('girdi_baglantisi_aktif', 'Girdi Bağlantısı Aktif')
                      : t('pasif', 'Pasif')}
                  </span>
                }
              />
            </div>
          </div>

          <div className="basla-ayar-card-body">
            {/* GÖRSEL AKIŞ ZİNCİRİ VE KAYNAK DÜĞÜM SEÇİCİ */}
            <div className="n8n-input-pipeline-bar">
              <div className="n8n-input-pipeline-left">
                <span className="n8n-input-pipeline-label">
                  {t('veri_kaynagi_dugumu', 'Veri & Belge Kaynağı Düğüm:')}
                </span>
                <div className="n8n-input-source-pills">
                  <button
                    type="button"
                    className={`n8n-source-node-btn ${
                      oncekiDugumGirdisi.kaynakDugumId === 'OTOMATIK_ONCEKI' ? 'active' : ''
                    }`}
                    onClick={() => updateOncekiDugumGirdisi({ kaynakDugumId: 'OTOMATIK_ONCEKI' })}
                  >
                    {renderNodeSmallIcon(immediatePreviousNode?.tip)}
                    <span>
                      {t('bir_onceki_dugum_otomatik', 'Bir Önceki Düğüm')}:{' '}
                      <strong>{immediatePrevDisplayName}</strong>
                    </span>
                  </button>

                  {previousNodes.length > 1 &&
                    previousNodes.map((pNode, idx) => {
                      const pTitle = formatNodeDisplayTitle(pNode, idx);
                      return (
                        <button
                          key={pNode.id || idx}
                          type="button"
                          className={`n8n-source-node-btn ${
                            oncekiDugumGirdisi.kaynakDugumId === pNode.id ? 'active' : ''
                          }`}
                          onClick={() => updateOncekiDugumGirdisi({ kaynakDugumId: pNode.id })}
                        >
                          {renderNodeSmallIcon(pNode.tip)}
                          <span>
                            #{idx + 1} {pTitle}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="n8n-input-target-indicator">
                <ArrowRight size={14} className="n8n-input-arrow-icon" />
                <span className="n8n-current-node-badge">{pageDisplayName}</span>
              </div>
            </div>

            {/* AKTARILACAK VERİ VE BELGE KANALLARI */}
            <div className="n8n-input-channels-grid">
              <div
                className={`n8n-input-channel-card ${
                  oncekiDugumGirdisi.belgeleriAktar ? 'is-active' : ''
                }`}
                onClick={() =>
                  updateOncekiDugumGirdisi({
                    belgeleriAktar: !oncekiDugumGirdisi.belgeleriAktar
                  })
                }
              >
                <div className="n8n-input-channel-top">
                  <div className="n8n-input-channel-icon doc">
                    <FileText size={16} />
                  </div>
                  <div className="n8n-input-channel-title-wrap">
                    <span className="n8n-input-channel-title">
                      {t('gelen_belgeleri_ve_dosyalari_al', 'Gelen Belgeler ve Dosya Ekleri')}
                    </span>
                    <span className="n8n-input-channel-badge">
                      {oncekiDugumGirdisi.belgeleriAktar
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  </div>
                </div>
                <p className="n8n-input-channel-desc">
                  {t(
                    'gelen_belgeleri_ve_dosyalari_al_aciklama',
                    'Önceki düğümde içeri aktarılan veya yüklenen dosyaları (PDF, Word, Excel, Görsel, Ham Metin) bu düğüme belge eki olarak ilet.'
                  )}
                </p>
              </div>

              <div
                className={`n8n-input-channel-card ${
                  oncekiDugumGirdisi.formVerileriniAktar ? 'is-active' : ''
                }`}
                onClick={() =>
                  updateOncekiDugumGirdisi({
                    formVerileriniAktar: !oncekiDugumGirdisi.formVerileriniAktar
                  })
                }
              >
                <div className="n8n-input-channel-top">
                  <div className="n8n-input-channel-icon data">
                    <Database size={16} />
                  </div>
                  <div className="n8n-input-channel-title-wrap">
                    <span className="n8n-input-channel-title">
                      {t(
                        'kaydedilen_form_ve_varlik_verilerini_al',
                        'Kaydedilen Form ve Kayıt Verileri'
                      )}
                    </span>
                    <span className="n8n-input-channel-badge">
                      {oncekiDugumGirdisi.formVerileriniAktar
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  </div>
                </div>
                <p className="n8n-input-channel-desc">
                  {t(
                    'kaydedilen_form_ve_varlik_verilerini_al_aciklama',
                    'Önceki adımda açılan form veya kartta kaydedilen alan bilgilerini (Kayıt ID, JSON alanları, satırlar) bu düğüme aktar.'
                  )}
                </p>
              </div>

              <div
                className={`n8n-input-channel-card ${
                  oncekiDugumGirdisi.aiCiktisiniAktar ? 'is-active' : ''
                }`}
                onClick={() =>
                  updateOncekiDugumGirdisi({
                    aiCiktisiniAktar: !oncekiDugumGirdisi.aiCiktisiniAktar
                  })
                }
              >
                <div className="n8n-input-channel-top">
                  <div className="n8n-input-channel-icon ai">
                    <Sparkles size={16} />
                  </div>
                  <div className="n8n-input-channel-title-wrap">
                    <span className="n8n-input-channel-title">
                      {t(
                        'onceki_adim_ai_ciktisi_ve_baglami_al',
                        'Önceki Adım Çıktısı ve Sohbet Bağlamı'
                      )}
                    </span>
                    <span className="n8n-input-channel-badge">
                      {oncekiDugumGirdisi.aiCiktisiniAktar
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  </div>
                </div>
                <p className="n8n-input-channel-desc">
                  {t(
                    'onceki_adim_ai_ciktisi_ve_baglami_al_aciklama',
                    'Önceki düğümün ürettiği AI analiz sonucunu, özetini ve başlangıçtaki kullanıcı isteğini bu adımın bağlamına dahil et.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. KART: ÖNCEKİ DÜĞÜMÜN VERMEYİ TAAHHÜT ETTİĞİ SABİT JSON SCHEMA SÖZLEŞMESİ */}
        <section className="basla-ayar-card n8n-json-schema-contract-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <Braces size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t(
                    'onceki_dugum_taahhut_edilen_json_schema',
                    'Önceki Düğümün Vermeyi Taahhüt Ettiği Sabit JSON Schema'
                  )}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {previousNodeJsonSchema.description}
                </p>
              </div>
            </div>

            <div className="n8n-schema-contract-badges">
              <span className="n8n-schema-contract-node-pill">
                {renderNodeSmallIcon(activeSourceNodeInfo.node?.tip)}
                <span>{activeSourceDisplayName}</span>
              </span>
              <span className="n8n-schema-draft-badge">JSON Schema 2020-12</span>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="n8n-json-schema-split-layout">
              {/* SOL PANEL: ŞEMA ALANLARI LİSTESİ VE AYARLARDA KULLAN AKSİYONLARI */}
              <div className="n8n-json-schema-fields-column">
                <div className="n8n-json-schema-col-header">
                  <div className="n8n-json-schema-col-title">
                    <Layers size={15} />
                    <span>
                      {t('taahhut_edilen_sema_alanlari', 'Taahhüt Edilen Şema Alanları (Properties)')}
                    </span>
                  </div>
                  <span className="n8n-json-schema-col-count">
                    {Object.keys(previousNodeJsonSchema.properties).length}{' '}
                    {t('kök_alan', 'kök alan')}
                  </span>
                </div>

                <div className="n8n-schema-prop-list">
                  {Object.entries(previousNodeJsonSchema.properties).map(([propKey, prop]) => {
                    const isUsed = Boolean(
                      effectiveFormData?.prompt &&
                        String(effectiveFormData.prompt).includes(prop.expression)
                    );
                    const subEntries = prop.properties
                      ? Object.entries(prop.properties)
                      : prop.itemsProperties
                        ? Object.entries(prop.itemsProperties)
                        : [];

                    return (
                      <div key={propKey} className="n8n-schema-prop-card">
                        <div className="n8n-schema-prop-main">
                          <div className="n8n-schema-prop-top-row">
                            <div className="n8n-schema-prop-Identity">
                              <span className="n8n-schema-prop-name">{propKey}</span>
                              <span className={`n8n-schema-prop-type-badge type-${prop.type}`}>
                                {prop.type}
                                {prop.itemsType ? `<${prop.itemsType}>` : ''}
                              </span>
                              {prop.format && (
                                <span className="n8n-schema-prop-format-badge">{prop.format}</span>
                              )}
                              {prop.required && (
                                <span className="n8n-schema-prop-required-badge">
                                  {t('zorunlu', 'Zorunlu')}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className={`n8n-schema-use-in-settings-btn ${
                                isUsed ? 'is-used' : ''
                              }`}
                              onClick={() => {
                                insertVariableIntoPrompt(prop.expression);
                              }}
                            >
                              {isUsed ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                              <span>
                                {isUsed
                                  ? t('ayarlarda_kullaniliyor', 'Ayarlarda Kullanılıyor')
                                  : t('ayarlarda_kullan', 'Ayarlar’da Kullan')}
                              </span>
                            </button>
                          </div>

                          <div className="n8n-schema-prop-title">{prop.title}</div>
                          <p className="n8n-schema-prop-desc">{prop.description}</p>

                          <div className="n8n-schema-prop-expr-row">
                            <span className="n8n-schema-prop-expr-label">
                              {t('referans_ifadesi', 'Referans İfadesi:')}
                            </span>
                            <code className="n8n-schema-prop-expr-code">{prop.expression}</code>
                          </div>
                        </div>

                        {subEntries.length > 0 && (
                          <div className="n8n-schema-subprops-container">
                            <div className="n8n-schema-subprops-title">
                              <CornerDownRight size={13} />
                              <span>
                                {prop.type === 'array'
                                  ? t('dizi_ogesi_alt_semasi', 'Dizi Öğesi Alt Şeması (items.properties)')
                                  : t('nesne_alt_alanlari', 'Nesne Alt Alanları (properties)')}
                              </span>
                            </div>
                            <div className="n8n-schema-subprops-list">
                              {subEntries.map(([subKey, subProp]) => {
                                const isSubUsed = Boolean(
                                  effectiveFormData?.prompt &&
                                    String(effectiveFormData.prompt).includes(subProp.expression)
                                );
                                return (
                                  <div key={subKey} className="n8n-schema-subprop-item">
                                    <div className="n8n-schema-subprop-left">
                                      <div className="n8n-schema-subprop-header">
                                        <span className="n8n-schema-subprop-key">{subKey}</span>
                                        <span
                                          className={`n8n-schema-prop-type-badge type-${subProp.type}`}
                                        >
                                          {subProp.type}
                                        </span>
                                        <span className="n8n-schema-subprop-label">
                                          {subProp.title}
                                        </span>
                                      </div>
                                      <code className="n8n-schema-subprop-code">
                                        {subProp.expression}
                                      </code>
                                    </div>
                                    <button
                                      type="button"
                                      className={`n8n-schema-subprop-use-btn ${
                                        isSubUsed ? 'is-used' : ''
                                      }`}
                                      onClick={() => insertVariableIntoPrompt(subProp.expression)}
                                    >
                                      {isSubUsed ? <Check size={12} /> : <Plus size={12} />}
                                      <span>
                                        {isSubUsed
                                          ? t('eklendi', 'Eklendi')
                                          : t('kullan', 'Kullan')}
                                      </span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAĞ PANEL: HAM JSON SCHEMA SÖZLEŞMESİ VE ÖRNEK VERİ (PAYLOAD) GÖRÜNÜMÜ */}
              <div className="n8n-json-schema-code-column">
                <div className="n8n-json-schema-code-header">
                  <div className="n8n-json-schema-mode-tabs">
                    <button
                      type="button"
                      className={`n8n-json-mode-btn ${
                        schemaViewMode === 'json_schema' ? 'active' : ''
                      }`}
                      onClick={() => setSchemaViewMode('json_schema')}
                    >
                      <Braces size={13} />
                      <span>{t('sabit_json_schema', 'Sabit JSON Schema')}</span>
                    </button>
                    <button
                      type="button"
                      className={`n8n-json-mode-btn ${
                        schemaViewMode === 'example_payload' ? 'active' : ''
                      }`}
                      onClick={() => setSchemaViewMode('example_payload')}
                    >
                      <Code2 size={13} />
                      <span>{t('ornek_cikti_verisi', 'Örnek Çıktı Verisi (JSON)')}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="n8n-json-copy-btn"
                    onClick={() => handleCopyJsonSchema(displayedJsonObject)}
                  >
                    <Copy size={13} />
                    <span>{t('kopyala', 'Kopyala')}</span>
                  </button>
                </div>

                <div className="n8n-json-schema-code-MetaBar">
                  <span className="n8n-json-schema-id-text">{previousNodeJsonSchema.schemaId}</span>
                  <button
                    type="button"
                    className="n8n-goto-settings-link-btn"
                    onClick={() => handleTabChange('ayarlar')}
                  >
                    <span>{t('ayarlar_sekmesine_gec', 'Ayarlar Sekmesine Geç')}</span>
                    <ArrowRight size={12} />
                  </button>
                </div>

                <pre className="n8n-json-schema-pre">
                  <code>{JSON.stringify(displayedJsonObject, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

  // TabLayout sekmelerini oluştur
  const layoutTabs = useMemo<BaseTabItem[]>(() => {
    if (customTabs && customTabs.length > 0) {
      return customTabs;
    }

    const baseTabs: BaseTabItem[] = [
      {
        id: 'ayarlar',
        label: t('ayarlar', 'Ayarlar'),
        icon: <Sliders size={16} />,
        content: renderAyarlarTabContent()
      }
    ];

    if (!isStartNode) {
      baseTabs.push({
        id: 'onceki_dugum',
        label: t('onceki_dugum', 'Önceki Düğüm'),
        icon: <Workflow size={16} />,
        content: renderOncekiDugumTabContent()
      });
    }

    return baseTabs;
  }, [
    customTabs,
    isStartNode,
    previousNodeJsonSchema,
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
