/**
 * @akalin/ai_management_module - Model Context Protocol (MCP) Yönetim Sayfası (AiMcpYonetimi.tsx)
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseSystemPage ve DataTable (enableTreeView={true}) mimarisi ile 4 kademeli hiyerarşik yapı sunmak:
 *   1. Kademe: Sistemde kayıtlı ERP ve Admin modülleri (ModuleRegistry.getModules())
 *   2. Kademe: Her modüle ait tescilli Listeler (ModuleRegistry.getModuleEntities())
 *   3. Kademe: İlgili Listelerin altındaki Belgeler / Kartlar ve "Fonksiyonlar" klasörü
 *   4. Kademe: "Fonksiyonlar" klasörü altında ilgili otonom MCP fonksiyonları (erp_create_document, erp_query_data, erp_get_document_schema, erp_navigate, erp_get_page_context vb.)
 * - Her MCP fonksiyonunun JSON şemasını, kabul edilen parametrelerini, bağlı işleyicisini (IDocumentMcpHandler) ve örnek çağrısını Modal pencerede inceleme olanağı
 * - Hiyerarşik arama, filtreleme, tümünü genişletme/daraltma ve canlı API katalog senkronizasyonu
 * - Sıfır inline CSS (%100 aiManagement.css ve MD3 uyumu) ve tam i18n desteği
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layers,
  Boxes,
  FileText,
  CreditCard,
  Table,
  FolderOpen,
  Wrench,
  Code2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronsUpDown,
  ChevronsDownUp
} from 'lucide-react';
import {
  BaseSystemPage,
  DataTable,
  Modal,
  type Column,
  type ActionMenuItem
} from '@akalin/ui';
import { ModuleRegistry, type IModuleDefinition, type IModuleEntityDefinition } from '@akalin/module_core';

// ─── TİP TANIMLARI ─────────────────────────────────────────────────────────────

export interface McpTreeNode {
  id: string;
  kademe: 1 | 2 | 3 | 4;
  ad: string;
  kod: string;
  kategori: 'modul' | 'liste' | 'kart' | 'belge' | 'klasor' | 'mcp';
  aktifMi?: boolean;
  aciklama?: string;
  rota?: string;
  isleyici?: string;
  parametreSemasi?: any;
  ornekIstek?: string;
  modulKodu?: string;
  varlikKodu?: string;
  varlikTuru?: string;
  isSistem?: boolean;
  hasExternalSettings?: boolean;
  externalSettingsComponent?: React.ComponentType<any>;
  rawModule?: IModuleDefinition;
  rawEntity?: IModuleEntityDefinition;
  children?: McpTreeNode[];
}

export interface AiMcpYonetimiProps {
  embedded?: boolean;
  backRoute?: string;
  onBack?: () => void;
}

// ─── YARDIMCI FONKSİYONLAR ───────────────────────────────────────────────────

/**
 * Bir düğümün altındaki toplam Liste, Belge/Kart ve MCP Fonksiyonu sayılarını递归 (recursive) olarak hesaplar.
 */
export function countMcpNodeStats(node: McpTreeNode): {
  listCount: number;
  belgeKartCount: number;
  mcpCount: number;
} {
  let listCount = 0;
  let belgeKartCount = 0;
  let mcpCount = 0;

  const traverse = (n: McpTreeNode) => {
    if (n.kategori === 'liste') listCount += 1;
    else if (n.kategori === 'belge' || n.kategori === 'kart') belgeKartCount += 1;
    else if (n.kategori === 'mcp') mcpCount += 1;

    if (n.children && n.children.length > 0) {
      n.children.forEach(traverse);
    }
  };

  if (node.children && node.children.length > 0) {
    node.children.forEach(traverse);
  }

  return { listCount, belgeKartCount, mcpCount };
}

/**
 * Verilen varlık (liste, belge veya kart) için standart ve özel MCP fonksiyon düğümlerini üretir.
 */
function buildEntityMcpFunctions(
  modKod: string,
  ent: IModuleEntityDefinition,
  kademe: 1 | 2 | 3 | 4,
  t: any,
  adSuffix?: string
): McpTreeNode[] {
  const entKod = ent.id;
  const entCat = (ent.category || 'liste') as 'liste' | 'kart' | 'belge';
  const entRoute = ent.route || ent.listRoute || ent.formRoute || '';
  const suffixText = adSuffix ? ` (${adSuffix})` : '';
  const mcpFunctions: McpTreeNode[] = [];

  if (entCat === 'belge') {
    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_create_document`,
      kademe,
      ad: `${t('mcp_func_create_doc_title', 'Yeni Belge ve Taslak Hazırlama (BELGE_DOLDUR)')}${suffixText}`,
      kod: 'erp_create_document',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Belge',
      isSistem: true,
      isleyici: `${entKod}DocumentHandler (IDocumentMcpHandler)`,
      rota: entRoute,
      aciklama: t(
        'mcp_func_create_doc_desc',
        'Yapay zeka doğal dille bu belgeyi oluşturur, kalemleri ve başlık bilgilerini otomatik doldurur.'
      ),
      parametreSemasi: {
        type: 'object',
        properties: {
          documentType: { type: 'string', default: entKod, description: 'Belge türü kimliği' },
          isDraft: { type: 'boolean', default: true, description: 'Doğrudan taslak kalemlerle doldurulsun mu?' },
          aciklama: { type: 'string', description: 'Belge başlık veya dipnot açıklaması' },
          cariUnvan: { type: 'string', description: 'Hedef cari hesap unvanı' },
          kalemler: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                stokKodu: { type: 'string' },
                miktar: { type: 'number' },
                birimFiyat: { type: 'number' }
              }
            }
          }
        },
        required: ['documentType']
      },
      ornekIstek: `{"name":"erp_create_document","arguments":{"documentType":"${entKod}","isDraft":true,"aciklama":"Yapay Zeka Taslağı"}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_schema`,
      kademe,
      ad: `${t('mcp_func_schema_title', 'Belge Şeması & Alan Doğrulama Kuralları')}${suffixText}`,
      kod: 'erp_get_document_schema',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Belge',
      isSistem: true,
      isleyici: 'InspectDocumentSchemaTool',
      rota: entRoute,
      aciklama: t(
        'mcp_func_schema_desc',
        'Belgenin kabul ettiği JSON şemasını, zorunlu alanlarını ve validasyon kurallarını sorgular.'
      ),
      parametreSemasi: {
        type: 'object',
        properties: {
          documentType: { type: 'string', default: entKod, description: 'Şeması sorgulanacak belge türü' }
        },
        required: ['documentType']
      },
      ornekIstek: `{"name":"erp_get_document_schema","arguments":{"documentType":"${entKod}"}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_navigate`,
      kademe,
      ad: `${t('mcp_func_navigate_title', 'Belge Ekranına Yönlendirme & Sayfa Açma')}${suffixText}`,
      kod: 'erp_navigate',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Belge',
      isSistem: true,
      isleyici: 'NavigateTool',
      rota: entRoute,
      aciklama: t(
        'mcp_func_nav_desc',
        'Kullanıcıyı doğrudan bu belgenin yeni kayıt veya detay sayfasına yönlendirir.'
      ),
      parametreSemasi: {
        type: 'object',
        properties: {
          target: { type: 'string', default: entRoute },
          customRoute: { type: 'string' }
        },
        required: ['target']
      },
      ornekIstek: `{"name":"erp_navigate","arguments":{"target":"${entRoute}"}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_context`,
      kademe,
      ad: `${t('mcp_func_context_title', 'Aktif Form & Belge Bağlamı Okuma')}${suffixText}`,
      kod: 'erp_get_page_context',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Belge',
      isSistem: true,
      isleyici: 'GetPageContextTool',
      rota: entRoute,
      aciklama: t(
        'mcp_func_ctx_desc',
        'Kullanıcının bu belgede o anda açık olan verilerini, aktif sekmesini ve seçimlerini analiz eder.'
      ),
      parametreSemasi: { type: 'object', properties: {} },
      ornekIstek: `{"name":"erp_get_page_context","arguments":{}}`
    });
  } else if (entCat === 'kart') {
    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_create_card`,
      kademe,
      ad: `${t('mcp_func_create_card_title', 'Yeni Kart Açma & Alan Doldurma')}${suffixText}`,
      kod: 'erp_create_document',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Kart',
      isSistem: true,
      isleyici: `${entKod}DocumentHandler`,
      rota: entRoute,
      aciklama: t(
        'mcp_func_card_create_desc',
        'Yapay zeka kart alanlarını (unvan, vergi no, kod, adres vb.) otomatik doldurarak kayda hazırlar.'
      ),
      parametreSemasi: {
        type: 'object',
        properties: {
          documentType: { type: 'string', default: entKod },
          isDraft: { type: 'boolean', default: false },
          fields: { type: 'object', description: 'Doldurulacak kart alanları' }
        },
        required: ['documentType']
      },
      ornekIstek: `{"name":"erp_create_document","arguments":{"documentType":"${entKod}","isDraft":false}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_schema`,
      kademe,
      ad: `${t('mcp_func_card_schema_title', 'Kart Şeması & Validasyon Kuralları')}${suffixText}`,
      kod: 'erp_get_document_schema',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Kart',
      isSistem: true,
      isleyici: 'InspectDocumentSchemaTool',
      rota: entRoute,
      aciklama: t(
        'mcp_func_card_schema_desc',
        'Kartın kabul ettiği JSON alanlarını ve format gereksinimlerini LLM için döner.'
      ),
      parametreSemasi: {
        type: 'object',
        properties: {
          documentType: { type: 'string', default: entKod }
        },
        required: ['documentType']
      },
      ornekIstek: `{"name":"erp_get_document_schema","arguments":{"documentType":"${entKod}"}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_navigate`,
      kademe,
      ad: `${t('mcp_func_card_nav_title', 'Kart Formuna Navigasyon')}${suffixText}`,
      kod: 'erp_navigate',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Kart',
      isSistem: true,
      isleyici: 'NavigateTool',
      rota: entRoute,
      aciklama: t('mcp_func_card_nav_desc', 'Kullanıcıyı kartın yeni kayıt veya düzenleme ekranına yönlendirir.'),
      parametreSemasi: {
        type: 'object',
        properties: { target: { type: 'string', default: entRoute } },
        required: ['target']
      },
      ornekIstek: `{"name":"erp_navigate","arguments":{"target":"${entRoute}"}}`
    });
  } else {
    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_query`,
      kademe,
      ad: `${t('mcp_func_query_title', 'Canlı Veritabanı & Tablo Kayıt Sorgulama')}${suffixText}`,
      kod: 'erp_query_data',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Liste',
      isSistem: true,
      isleyici: 'QueryDataTool',
      rota: entRoute,
      aciklama: t(
        'mcp_func_query_desc',
        'Veritabanından bu listeye ait kayıtları, filtreleri ve özet bilgileri LLM aracılığıyla güvenli sorgular.'
      ),
      parametreSemasi: {
        type: 'object',
        properties: {
          entityType: { type: 'string', default: entKod, description: 'Sorgulanacak tablo/varlık' },
          filter: { type: 'string', description: 'Doğal dil veya SQL filtre ifadesi' },
          limit: { type: 'integer', default: 50, description: 'Maksimum kayıt limiti' }
        },
        required: ['entityType']
      },
      ornekIstek: `{"name":"erp_query_data","arguments":{"entityType":"${entKod}","filter":"aktifMi == true","limit":20}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_navigate`,
      kademe,
      ad: `${t('mcp_func_list_nav_title', 'Liste Sayfasına Navigasyon')}${suffixText}`,
      kod: 'erp_navigate',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Liste',
      isSistem: true,
      isleyici: 'NavigateTool',
      rota: entRoute,
      aciklama: t('mcp_func_list_nav_desc', 'Kullanıcıyı bu listenin gösterildiği tablo ekranına yönlendirir.'),
      parametreSemasi: {
        type: 'object',
        properties: { target: { type: 'string', default: entRoute } },
        required: ['target']
      },
      ornekIstek: `{"name":"erp_navigate","arguments":{"target":"${entRoute}"}}`
    });

    mcpFunctions.push({
      id: `mcp_${modKod}_${entKod}_context`,
      kademe,
      ad: `${t('mcp_func_list_ctx_title', 'Tablo Filtre & Seçili Satır Bağlamı')}${suffixText}`,
      kod: 'erp_get_page_context',
      kategori: 'mcp',
      modulKodu: modKod,
      varlikKodu: entKod,
      varlikTuru: 'Liste',
      isSistem: true,
      isleyici: 'GetPageContextTool',
      rota: entRoute,
      aciklama: t(
        'mcp_func_list_ctx_desc',
        'Kullanıcının bu listede seçtiği satırları veya uyguladığı filtreleri LLM bağlamına aktarır.'
      ),
      parametreSemasi: { type: 'object', properties: {} },
      ornekIstek: `{"name":"erp_get_page_context","arguments":{}}`
    });
  }

  if (ent.customActions && ent.customActions.length > 0) {
    ent.customActions.forEach((ca: any) => {
      mcpFunctions.push({
        id: `mcp_${modKod}_${entKod}_custom_${ca.action}`,
        kademe,
        ad: `${ca.labelKey ? t(ca.labelKey, ca.action) : ca.action} (${t('ozel_aksiyon', 'Özel Aksiyon')})${suffixText}`,
        kod: `action_${ca.action.replace(/-/g, '_')}`,
        kategori: 'mcp',
        modulKodu: modKod,
        varlikKodu: entKod,
        varlikTuru: entCat.toUpperCase(),
        isSistem: false,
        isleyici: 'CustomActionDispatcher',
        rota: entRoute,
        aciklama: ca.description || t('ozel_aksiyon_aciklama', 'Bu varlığa özel tanımlanmış modüler MCP aksiyonu.'),
        parametreSemasi: {
          type: 'object',
          properties: {
            action: { type: 'string', default: ca.action },
            targetId: { type: 'string', description: 'Hedef kayıt ID' }
          }
        },
        ornekIstek: `{"name":"action_${ca.action.replace(/-/g, '_')}","arguments":{"targetId":"123"}}`
      });
    });
  }

  return mcpFunctions;
}

// ─── ORTAK MCP AĞAÇ VERİ MOTORU ───────────────────────────────────────────────

export function buildMcpTreeData(t: any): McpTreeNode[] {
  const modules = ModuleRegistry.getModules();
  if (!modules || modules.length === 0) return [];

  return modules.map((mod): McpTreeNode => {
    // 1. Kademe: Modül Bilgileri
    const modKod = mod.id || '';
    const modAd = mod.title || mod.name || modKod;
    const modBaseRoute = (mod as any).baseRoute || mod.routes?.[0]?.path || '';

    // Modüle tescil edilmiş varlık ağacını (entities.tree) al
    let entities = ModuleRegistry.getModuleEntities(modKod);
    if ((!entities.tree || entities.tree.length === 0) && mod.title) {
      const fromTitle = ModuleRegistry.getModuleEntities(mod.title);
      if (fromTitle.tree && fromTitle.tree.length > 0) entities = fromTitle;
    }
    if ((!entities.tree || entities.tree.length === 0) && mod.name) {
      const fromName = ModuleRegistry.getModuleEntities(mod.name);
      if (fromName.tree && fromName.tree.length > 0) entities = fromName;
    }

    // Tüm varlıkları "Liste -> [Belge | Kart]" hiyerarşisine normalize et
    const normalizedListEntities: IModuleEntityDefinition[] = [];

    if (entities.tree && entities.tree.length > 0) {
      entities.tree.forEach((item) => {
        if (item.category === 'liste') {
          const validChildren = (item.children || []).filter(
            (c) => c.category === 'kart' || c.category === 'belge'
          );

          if (validChildren.length > 0) {
            normalizedListEntities.push({
              ...item,
              children: validChildren
            });
          } else {
            const rawTitle = item.title || (item.titleKey ? t(item.titleKey, item.id) : item.id);
            const baseTitle = rawTitle
              .replace(/\s*Listesi$/i, '')
              .replace(/\s*Liste$/i, '')
              .trim();
            normalizedListEntities.push({
              ...item,
              children: [
                {
                  id: `${item.id}-kart`,
                  category: 'kart',
                  titleKey: `${item.titleKey || item.id}_kart`,
                  title: `${baseTitle} ${t('karti', 'Kartı')}`,
                  description: item.description || `${baseTitle} ${t('detay_ve_yapilandirma_karti', 'detay ve yapılandırma kartı')}`,
                  route: item.formRoute || item.route || modBaseRoute,
                  formRoute: item.formRoute || item.route || modBaseRoute
                }
              ]
            });
          }
        } else if (item.category === 'belge' || item.category === 'kart') {
          const rawTitle = item.title || (item.titleKey ? t(item.titleKey, item.id) : item.id);
          let listTitle = rawTitle;
          if (/\s+Kartı$/i.test(rawTitle)) {
            listTitle = rawTitle.replace(/\s+Kartı$/i, ` ${t('listesi', 'Listesi')}`);
          } else if (!/Listesi$/i.test(rawTitle) && !/Liste$/i.test(rawTitle)) {
            listTitle = `${rawTitle} ${t('listesi', 'Listesi')}`;
          }

          normalizedListEntities.push({
            id: `${item.id}-liste`,
            category: 'liste',
            titleKey: item.titleKey ? `${item.titleKey}_liste` : `${item.id}_liste`,
            title: listTitle,
            description: item.description || `${rawTitle} ${t('kayitlari_ve_tablo_verileri', 'kayıtları ve tablo verileri')}`,
            route: item.listRoute || item.route || modBaseRoute,
            listRoute: item.listRoute || item.route || modBaseRoute,
            children: [item]
          });
        }
      });
    }

    // Yerel & Bulut Dosya Yönetimi modülünde FileImportPage ve FileExportPage ekranlarının her zaman yer almasını garanti et
    if (
      modKod === 'bulut-depolama' ||
      modKod === 'bulut_depolama' ||
      modKod === 'dosya_yonetimi' ||
      modKod === 'file_manager_module'
    ) {
      const hasFileImportOrExport = normalizedListEntities.some((l) =>
        (l.children || []).some(
          (c) => c.id === 'dosya-ice-aktar-karti' || c.id === 'dosya-disa-aktar-karti'
        )
      );

      if (!hasFileImportOrExport) {
        normalizedListEntities.unshift({
          id: 'bulut-dosyalari-liste',
          category: 'liste',
          titleKey: 'bulut_dosyalari_listesi',
          title: t('bulut_dosyalari_listesi', 'Bulut Dosyaları Listesi'),
          description: t(
            'bulut_dosyalari_listesi_aciklama',
            'Yerel cihaz ve Google Drive, Microsoft OneDrive, Dropbox bulut sürücülerindeki dosya ve evrakların listesi.'
          ),
          route: '/araclar/bulut-dosyalari',
          listRoute: '/araclar/bulut-dosyalari',
          children: [
            {
              id: 'dosya-ice-aktar-karti',
              category: 'kart',
              titleKey: 'dosya_ice_aktar_karti',
              title: t('dosya_ice_aktar_karti', 'Dosya İçeri Aktar (FileImportPage)'),
              description: t(
                'dosya_ice_aktar_karti_aciklama',
                'Yerel cihazdan veya bulut depolamadan filtreli dosya ve Excel verisi içeri aktarma ekranı (FileImportPage).'
              ),
              route: '/araclar/dosya-al',
              formRoute: '/araclar/dosya-al',
              hasExternalSettings: true,
              externalSettingsComponent:
                (mod.components as any)?.FileImportPageSettingsForExternal ||
                (mod.components as any)?.FileImportPagesettingsForExternal ||
                (mod.components as any)?.FileImportPage?.externalSettingsComponent
            },
            {
              id: 'dosya-disa-aktar-karti',
              category: 'kart',
              titleKey: 'dosya_disa_aktar_karti',
              title: t('dosya_disa_aktar_karti', 'Dosya Kaydet / Dışa Aktar (FileExportPage)'),
              description: t(
                'dosya_disa_aktar_karti_aciklama',
                'Tablo, rapor ve belgeleri yerel diske veya bulut klasörüne kaydetme ekranı (FileExportPage).'
              ),
              route: '/araclar/dosya-kaydet',
              formRoute: '/araclar/dosya-kaydet'
            },
            {
              id: 'bulut-dosyalari-karti',
              category: 'kart',
              titleKey: 'bulut_dosyalari_karti',
              title: t('bulut_dosyalari_karti', 'Bulut Dosyaları Yönetimi (BulutDosyalariPage)'),
              description: t(
                'bulut_dosyalari_karti_aciklama',
                'Bulut klasör gezgini, dosya yükleme ve belge evrak ilişkilendirme ekranı (BulutDosyalariPage).'
              ),
              route: '/araclar/bulut-dosyalari',
              formRoute: '/araclar/bulut-dosyalari'
            }
          ]
        });
      }
    }

    if (normalizedListEntities.length === 0) {
      if (modKod === 'ai_yonetimi' || modKod === 'ai-management-module') {
        normalizedListEntities.push(
          {
            id: 'ai-saglayicilar-liste',
            category: 'liste',
            titleKey: 'menu_ai_saglayicilar_liste',
            title: t('menu_ai_saglayicilar_liste', 'Model Sağlayıcıları Listesi'),
            description: t('ai_saglayicilar_liste_aciklama', 'Yapay zeka sağlayıcıları, API anahtarları ve aktif modeller listesi.'),
            route: '/ayarlar/YapayZekaAyarlari/AiSaglayicilar',
            children: [
              {
                id: 'ai-saglayici-karti',
                category: 'kart',
                titleKey: 'ai_saglayici_karti',
                title: t('ai_saglayici_karti', 'Model Sağlayıcısı Kartı'),
                description: t('ai_saglayici_karti_aciklama', 'Model sağlayıcısı bağlantı, API anahtarı ve model tanımlama kartı.'),
                route: '/ayarlar/YapayZekaAyarlari/AiSaglayicilar/yeni'
              }
            ]
          },
          {
            id: 'ai-protokoller-liste',
            category: 'liste',
            titleKey: 'menu_ai_protokoller_liste',
            title: t('menu_ai_protokoller_liste', 'API Protokolleri Listesi'),
            description: t('ai_protokoller_liste_aciklama', 'LLM iletişim protokolleri ve uç nokta şablonları listesi.'),
            route: '/ayarlar/YapayZekaAyarlari/AiProtokoller',
            children: [
              {
                id: 'ai-protokol-karti',
                category: 'kart',
                titleKey: 'ai_protokol_karti',
                title: t('ai_protokol_karti', 'API Protokolü Kartı'),
                description: t('ai_protokol_karti_aciklama', 'API protokolü şablon ve uç nokta yapılandırma kartı.'),
                route: '/ayarlar/YapayZekaAyarlari/AiProtokoller/yeni'
              }
            ]
          },
          {
            id: 'ai-ajanlar-liste',
            category: 'liste',
            titleKey: 'menu_ai_ajanlar_liste',
            title: t('menu_ai_ajanlar_liste', 'Yapay Zeka Ajanları Listesi'),
            description: t('ai_ajanlar_liste_aciklama', 'Sistem ve kullanıcı tanımlı yapay zeka ajanları listesi.'),
            route: '/ayarlar/YapayZekaAyarlari/AiAjanlar',
            children: [
              {
                id: 'ai-ajan-karti',
                category: 'kart',
                titleKey: 'ai_ajan_karti',
                title: t('ai_ajan_karti', 'Yapay Zeka Ajanı Kartı'),
                description: t('ai_ajan_karti_aciklama', 'Yapay zeka ajanı sistem istemi, model, görev akışı ve MCP yetkileri kartı.'),
                route: '/ayarlar/YapayZekaAyarlari/AiAjanlar/yeni'
              }
            ]
          },
          {
            id: 'ai-cuzdan-liste',
            category: 'liste',
            titleKey: 'menu_ai_cuzdan_liste',
            title: t('menu_ai_cuzdan_liste', 'Token Cüzdanı & Kullanım Listesi'),
            description: t('ai_cuzdan_liste_aciklama', 'Token bakiyesi, tüketim geçmişi ve bütçe hareketleri listesi.'),
            route: '/ayarlar/YapayZekaAyarlari/AiCuzdan',
            children: [
              {
                id: 'ai-cuzdan-karti',
                category: 'kart',
                titleKey: 'ai_cuzdan_karti',
                title: t('ai_cuzdan_karti', 'Token Cüzdanı & Bütçe Kartı'),
                description: t('ai_cuzdan_karti_aciklama', 'Token cüzdanı bakiye yükleme ve limit ayarları kartı.'),
                route: '/ayarlar/YapayZekaAyarlari/AiCuzdan'
              }
            ]
          }
        );
      } else {
        normalizedListEntities.push({
          id: `${modKod}_genel_liste`,
          category: 'liste',
          titleKey: `${modKod}_genel_liste`,
          title: `${modAd} ${t('listesi', 'Listesi')}`,
          description: `${modAd} ${t('kayitlari_ve_tablo_verileri', 'kayıtları ve tablo verileri')}`,
          route: modBaseRoute,
          children: [
            {
              id: `${modKod}_genel_kart`,
              category: 'kart',
              titleKey: `${modKod}_genel_kart`,
              title: `${modAd} ${t('karti', 'Kartı')}`,
              description: `${modAd} ${t('detay_ve_yapilandirma_karti', 'detay ve yapılandırma kartı')}`,
              route: modBaseRoute
            }
          ]
        });
      }
    }

    // 2. Kademe: Liste Düğümleri
    const listNodes: McpTreeNode[] = normalizedListEntities.map((listEnt): McpTreeNode => {
      const listKod = listEnt.id;
      const listAd = listEnt.title || (listEnt.titleKey ? t(listEnt.titleKey, listKod) : listKod);
      const listRoute = listEnt.route || listEnt.listRoute || listEnt.formRoute || modBaseRoute;
      const childDefs = listEnt.children || [];

      // 3. Kademe (A): İlgili Belge veya Kart Düğümleri (Yaprak olarak listelenir)
      const belgeKartNodes: McpTreeNode[] = childDefs.map((childEnt): McpTreeNode => {
        const childKod = childEnt.id;
        const childAd = childEnt.title || (childEnt.titleKey ? t(childEnt.titleKey, childKod) : childKod);
        const childCat = (childEnt.category === 'belge' ? 'belge' : 'kart') as 'kart' | 'belge';
        const childRoute = childEnt.formRoute || childEnt.route || listRoute;
        const resolvedExtSettingsComp =
          childEnt.externalSettingsComponent ||
          (childKod === 'dosya-ice-aktar-karti'
            ? (mod.components as any)?.FileImportPageSettingsForExternal ||
              (mod.components as any)?.FileImportPagesettingsForExternal ||
              (mod.components as any)?.FileImportPage?.externalSettingsComponent
            : undefined);
        const resolvedHasExtSettings = Boolean(
          childEnt.hasExternalSettings || resolvedExtSettingsComp || childKod === 'dosya-ice-aktar-karti'
        );

        return {
          id: `ent_${modKod}_${childCat}_${childKod}`,
          kademe: 3,
          ad: childAd,
          kod: childKod,
          kategori: childCat,
          modulKodu: modKod,
          varlikKodu: childKod,
          varlikTuru: childCat === 'belge' ? 'Belge' : 'Kart',
          rota: childRoute,
          aciklama: childEnt.description || '',
          hasExternalSettings: resolvedHasExtSettings,
          externalSettingsComponent: resolvedExtSettingsComp,
          rawEntity: childEnt
        };
      });

      // 4. Kademe: Liste ve altındaki Belge/Kartlara ait tüm MCP Fonksiyonları
      const allListMcpFunctions: McpTreeNode[] = [
        ...buildEntityMcpFunctions(
          modKod,
          { ...listEnt, category: 'liste', title: listAd, route: listRoute },
          4,
          t
        )
      ];

      childDefs.forEach((childEnt) => {
        const childAd = childEnt.title || (childEnt.titleKey ? t(childEnt.titleKey, childEnt.id) : childEnt.id);
        const childRoute = childEnt.formRoute || childEnt.route || listRoute;
        const suffix = childDefs.length > 1 ? childAd : undefined;
        allListMcpFunctions.push(
          ...buildEntityMcpFunctions(
            modKod,
            { ...childEnt, title: childAd, route: childRoute },
            4,
            t,
            suffix
          )
        );
      });

      // 3. Kademe (B): "Fonksiyonlar" Klasörü Düğümü
      const fonksiyonlarFolderNode: McpTreeNode = {
        id: `folder_${modKod}_${listKod}_fonksiyonlar`,
        kademe: 3,
        ad: t('fonksiyonlar', 'Fonksiyonlar'),
        kod: 'fonksiyonlar',
        kategori: 'klasor',
        modulKodu: modKod,
        varlikKodu: listKod,
        rota: listRoute,
        aciklama: t(
          'mcp_fonksiyonlari_klasor_aciklama',
          'Bu listeye ve bağlı belge/kartlara ait otonom MCP fonksiyonları'
        ),
        children: allListMcpFunctions
      };

      return {
        id: `ent_${modKod}_liste_${listKod}`,
        kademe: 2,
        ad: listAd,
        kod: listKod,
        kategori: 'liste',
        modulKodu: modKod,
        varlikKodu: listKod,
        varlikTuru: 'Liste',
        rota: listRoute,
        aciklama: listEnt.description || '',
        hasExternalSettings: Boolean(listEnt.hasExternalSettings || listEnt.externalSettingsComponent),
        externalSettingsComponent: listEnt.externalSettingsComponent,
        rawEntity: listEnt,
        children: [...belgeKartNodes, fonksiyonlarFolderNode]
      };
    });

    return {
      id: `mod_${modKod}`,
      kademe: 1,
      ad: modAd,
      kod: modKod,
      kategori: 'modul',
      aciklama: mod.description || '',
      rota: modBaseRoute,
      rawModule: mod,
      children: listNodes
    };
  });
}

export interface AgentActiveMcpEntity {
  id: string;
  kod: string;
  ad: string;
  kategori: 'liste' | 'belge' | 'kart';
  varlikTuruLabel: string;
  modulKodu: string;
  modulAdi: string;
  ustListeAdi?: string;
  rota: string;
  aciklama?: string;
  hasExternalSettings?: boolean;
  externalSettingsComponent?: React.ComponentType<any>;
}

/**
 * Bir ajanın seciliAracKodlari dizisine göre (aktif edilmiş ve '!' ile pasife alınmamış)
 * tüm Liste, Belge ve Kart varlıklarını düzleştirilmiş liste olarak döner.
 */
export function getAgentActiveMcpEntities(
  seciliAracKodlari: string[] | undefined,
  t: any
): AgentActiveMcpEntity[] {
  const rawCodes: string[] = Array.isArray(seciliAracKodlari) ? seciliAracKodlari : [];
  if (rawCodes.length === 0) return [];

  const positiveCodes = rawCodes.filter((c) => typeof c === 'string' && !c.startsWith('!'));
  if (positiveCodes.length === 0) return [];

  const lowerCodes = new Set(positiveCodes.map((c) => (c || '').toLowerCase()));
  const disabledSet = new Set(
    rawCodes
      .filter((c) => typeof c === 'string' && c.startsWith('!'))
      .map((c) => c.slice(1).toLowerCase())
  );

  const normalizeCode = (s: string) => (s || '').toLowerCase().replace(/[-_]/g, '');
  const normalizedCodes = new Set(positiveCodes.map(normalizeCode));

  const isNodeSelected = (node: McpTreeNode): boolean => {
    const k = (node.kod || '').toLowerCase();
    const id = (node.id || '').toLowerCase();
    return (
      lowerCodes.has(k) ||
      lowerCodes.has(id) ||
      normalizedCodes.has(normalizeCode(k)) ||
      normalizedCodes.has(normalizeCode(id))
    );
  };

  const isNodeDisabled = (node: McpTreeNode): boolean => {
    const id = (node.id || '').toLowerCase();
    const k = (node.kod || '').toLowerCase();
    return disabledSet.has(id) || disabledSet.has(k);
  };

  const treeData = buildMcpTreeData(t);
  const activeEntities: AgentActiveMcpEntity[] = [];

  treeData.forEach((modNode) => {
    if (isNodeDisabled(modNode)) return;
    const isModSelected = isNodeSelected(modNode);
    const modKodu = modNode.kod || '';
    const modAdi = modNode.ad || modKodu;

    (modNode.children || []).forEach((listNode) => {
      if (isNodeDisabled(listNode)) return;
      const isListSelected = isModSelected || isNodeSelected(listNode);

      const belgeKartNodes = (listNode.children || []).filter(
        (c) => c.kategori === 'belge' || c.kategori === 'kart'
      );
      const folderNode = (listNode.children || []).find((c) => c.kategori === 'klasor');
      const selectedTools = (folderNode?.children || []).filter(
        (toolNode) => !isNodeDisabled(toolNode) && isNodeSelected(toolNode)
      );
      const selectedToolEntityCodes = new Set(
        selectedTools.map((tn) => (tn.varlikKodu || '').toLowerCase()).filter(Boolean)
      );

      const matchingBelgeKart = belgeKartNodes.filter((bk) => {
        if (isNodeDisabled(bk)) return false;
        if (isListSelected || isNodeSelected(bk)) return true;
        return selectedToolEntityCodes.has((bk.kod || '').toLowerCase());
      });

      const listHasAnyChildMatch = matchingBelgeKart.length > 0 || selectedTools.length > 0;

      // Liste düğümü aktifse ekle
      if (isListSelected || listHasAnyChildMatch) {
        activeEntities.push({
          id: listNode.id,
          kod: listNode.kod,
          ad: listNode.ad,
          kategori: 'liste',
          varlikTuruLabel: t('liste', 'Liste'),
          modulKodu: modKodu,
          modulAdi: modAdi,
          rota: listNode.rota || '',
          aciklama: listNode.aciklama || '',
          hasExternalSettings: Boolean(listNode.hasExternalSettings || listNode.externalSettingsComponent),
          externalSettingsComponent: listNode.externalSettingsComponent
        });
      }

      // Belge ve Kart düğümleri aktifse ekle
      const effectiveBelgeKart = isListSelected
        ? belgeKartNodes.filter((bk) => !isNodeDisabled(bk))
        : matchingBelgeKart;

      effectiveBelgeKart.forEach((bkNode) => {
        const kat = bkNode.kategori === 'belge' ? 'belge' : 'kart';
        activeEntities.push({
          id: bkNode.id,
          kod: bkNode.kod,
          ad: bkNode.ad,
          kategori: kat,
          varlikTuruLabel: kat === 'belge' ? t('belge', 'Belge') : t('kart', 'Kart'),
          modulKodu: modKodu,
          modulAdi: modAdi,
          ustListeAdi: listNode.ad,
          rota: bkNode.rota || listNode.rota || '',
          aciklama: bkNode.aciklama || '',
          hasExternalSettings: Boolean(bkNode.hasExternalSettings || bkNode.externalSettingsComponent),
          externalSettingsComponent: bkNode.externalSettingsComponent
        });
      });
    });
  });

  return activeEntities;
}

/**
 * Sistemdeki tüm kayıtlı modüllerden Liste, Belge ve Kart varlıklarını düz liste olarak döndürür.
 * Modül fonksiyonları (mcp ve klasor) kesinlikle bu listeye dahil edilmez.
 */
export function getAllMcpEntities(t: any): AgentActiveMcpEntity[] {
  const treeData = buildMcpTreeData(t);
  const entities: AgentActiveMcpEntity[] = [];

  treeData.forEach((modNode) => {
    const modKodu = modNode.kod || '';
    const modAdi = modNode.ad || modKodu;

    (modNode.children || []).forEach((listNode) => {
      // 2. Kademe: Liste düğümü
      if (listNode.kategori === 'liste') {
        entities.push({
          id: listNode.id,
          kod: listNode.kod,
          ad: listNode.ad,
          kategori: 'liste',
          varlikTuruLabel: t('liste', 'Liste'),
          modulKodu: modKodu,
          modulAdi: modAdi,
          rota: listNode.rota || '',
          aciklama: listNode.aciklama || '',
          hasExternalSettings: Boolean(listNode.hasExternalSettings || listNode.externalSettingsComponent),
          externalSettingsComponent: listNode.externalSettingsComponent
        });
      }

      // 3. Kademe: Belge ve Kart düğümleri
      const belgeKartNodes = (listNode.children || []).filter(
        (c) => c.kategori === 'belge' || c.kategori === 'kart'
      );

      belgeKartNodes.forEach((bkNode) => {
        const kat = bkNode.kategori === 'belge' ? 'belge' : 'kart';
        entities.push({
          id: bkNode.id,
          kod: bkNode.kod,
          ad: bkNode.ad,
          kategori: kat,
          varlikTuruLabel: kat === 'belge' ? t('belge', 'Belge') : t('kart', 'Kart'),
          modulKodu: modKodu,
          modulAdi: modAdi,
          ustListeAdi: listNode.ad,
          rota: bkNode.rota || listNode.rota || '',
          aciklama: bkNode.aciklama || '',
          hasExternalSettings: Boolean(bkNode.hasExternalSettings || bkNode.externalSettingsComponent),
          externalSettingsComponent: bkNode.externalSettingsComponent
        });
      });
    });
  });

  return entities;
}

// ─── BİLEŞEN ──────────────────────────────────────────────────────────────────

export const AiMcpYonetimi: React.FC<AiMcpYonetimiProps> = ({
  embedded = false,
  backRoute = '/ayarlar/YapayZekaAyarlari',
  onBack
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [apiKatalog, setApiKatalog] = useState<any[]>([]);
  const [selectedMcpNode, setSelectedMcpNode] = useState<McpTreeNode | null>(null);
  const [isCopiedSchema, setIsCopiedSchema] = useState<boolean>(false);
  const [isCopiedSignature, setIsCopiedSignature] = useState<boolean>(false);

  // Tree Genişletme / Daraltma Hafızası
  const [expandedRowIds, setExpandedRowIds] = useState<(string | number)[]>([]);
  const [isInitialExpanded, setIsInitialExpanded] = useState<boolean>(false);

  // ─── API VE VERİ YÜKLEME ─────────────────────────────────────────────────────

  const fetchKatalog = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/AiAraclar/katalog');
      setApiKatalog(res.data || []);
    } catch {
      // Offline fallback: Katalog API'ye erişilemese bile ModuleRegistry tree'yi oluşturur
      setApiKatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKatalog();
  }, [fetchKatalog]);

  // ─── 4 KADEMELİ TREE VIEW VERİ MOTORU ────────────────────────────────────────

  const rawTreeData = useMemo<McpTreeNode[]>(() => buildMcpTreeData(t), [t]);

  // ─── FİLTRELENMİŞ TREE VIEW VERİSİ ──────────────────────────────────────────

  const filteredTreeData = useMemo<McpTreeNode[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rawTreeData;

    const nodeSelfMatches = (node: McpTreeNode): boolean => {
      return (
        node.ad.toLowerCase().includes(q) ||
        node.kod.toLowerCase().includes(q) ||
        Boolean(node.aciklama && node.aciklama.toLowerCase().includes(q)) ||
        Boolean(node.rota && node.rota.toLowerCase().includes(q)) ||
        Boolean(node.isleyici && node.isleyici.toLowerCase().includes(q))
      );
    };

    return rawTreeData
      .map((modNode): McpTreeNode | null => {
        if (nodeSelfMatches(modNode)) {
          return modNode;
        }

        const filteredLists = (modNode.children || [])
          .map((listNode): McpTreeNode | null => {
            if (nodeSelfMatches(listNode)) {
              return listNode;
            }

            const belgeKartChildren = (listNode.children || []).filter(
              (c) => c.kategori === 'belge' || c.kategori === 'kart'
            );
            const matchingBelgeKart = belgeKartChildren.filter(nodeSelfMatches);

            const folderNode = (listNode.children || []).find((c) => c.kategori === 'klasor');
            let filteredFolder: McpTreeNode | null = null;
            if (folderNode) {
              const matchingTools = (folderNode.children || []).filter(nodeSelfMatches);
              if (matchingTools.length > 0 || nodeSelfMatches(folderNode)) {
                filteredFolder = {
                  ...folderNode,
                  children: matchingTools.length > 0 ? matchingTools : folderNode.children
                };
              }
            }

            if (matchingBelgeKart.length > 0 || filteredFolder) {
              const nextChildren: McpTreeNode[] = [
                ...(matchingBelgeKart.length > 0 ? matchingBelgeKart : belgeKartChildren),
                ...(filteredFolder ? [filteredFolder] : folderNode ? [folderNode] : [])
              ];
              return {
                ...listNode,
                children: nextChildren
              };
            }

            return null;
          })
          .filter((n): n is McpTreeNode => n !== null);

        if (filteredLists.length > 0) {
          return {
            ...modNode,
            children: filteredLists
          };
        }
        return null;
      })
      .filter((n): n is McpTreeNode => n !== null);
  }, [rawTreeData, searchTerm]);

  // ─── TÜMÜNÜ GENİŞLET / DARALT MOTORU ────────────────────────────────────────

  const collectAllParentIds = useCallback((nodes: McpTreeNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (items: McpTreeNode[]) => {
      for (const item of items) {
        if (item.children && item.children.length > 0) {
          ids.push(item.id);
          traverse(item.children);
        }
      }
    };
    traverse(nodes);
    return ids;
  }, []);

  const collectModuleAndListIds = useCallback((nodes: McpTreeNode[]): string[] => {
    const ids: string[] = [];
    nodes.forEach((modNode) => {
      ids.push(modNode.id);
      modNode.children?.forEach((listNode) => {
        if (listNode.kategori === 'liste') {
          ids.push(listNode.id);
        }
      });
    });
    return ids;
  }, []);

  // Sayfa açıldığında tüm hiyerarşik dalları açık başlat
  useEffect(() => {
    if (!isInitialExpanded && rawTreeData.length > 0) {
      const allParentIds = collectAllParentIds(rawTreeData);
      setExpandedRowIds(allParentIds);
      setIsInitialExpanded(true);
    }
  }, [isInitialExpanded, rawTreeData, collectAllParentIds]);

  const handleExpandAll = useCallback(() => {
    setExpandedRowIds(collectAllParentIds(filteredTreeData));
  }, [filteredTreeData, collectAllParentIds]);

  const handleExpandListsOnly = useCallback(() => {
    setExpandedRowIds(collectModuleAndListIds(filteredTreeData));
  }, [filteredTreeData, collectModuleAndListIds]);

  const handleExpandModulesOnly = useCallback(() => {
    setExpandedRowIds(filteredTreeData.map(m => m.id));
  }, [filteredTreeData]);

  const handleCollapseAll = useCallback(() => {
    setExpandedRowIds([]);
  }, []);

  const extraDropdownActions = useMemo<ActionMenuItem[]>(() => [
    {
      label: t('tumunu_genislet', 'Tümünü Genişlet (Tüm Dalları Aç)'),
      icon: <ChevronsUpDown size={15} />,
      onClick: handleExpandAll
    },
    {
      label: t('modul_ve_listeleri_genislet', 'Modül ve Listeleri Genişlet (Belge/Kart Görünümü)'),
      icon: <Table size={15} />,
      onClick: handleExpandListsOnly
    },
    {
      label: t('sadece_modulleri_genislet', 'Sadece Modülleri Genişlet'),
      icon: <Layers size={15} />,
      onClick: handleExpandModulesOnly
    },
    {
      label: t('tumunu_daralt', 'Tümünü Daralt (Tüm Dalları Kapat)'),
      icon: <ChevronsDownUp size={15} />,
      onClick: handleCollapseAll
    }
  ], [t, handleExpandAll, handleExpandListsOnly, handleExpandModulesOnly, handleCollapseAll]);

  // ─── ŞEMA MODAL İNCELEME & KOPYALAMA ─────────────────────────────────────────

  const handleOpenSchemaModal = (node: McpTreeNode) => {
    setSelectedMcpNode(node);
    setIsCopiedSchema(false);
    setIsCopiedSignature(false);
  };

  const handleCloseSchemaModal = () => {
    setSelectedMcpNode(null);
  };

  const handleCopySchemaJson = () => {
    if (!selectedMcpNode?.parametreSemasi) return;
    const jsonStr = JSON.stringify(selectedMcpNode.parametreSemasi, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setIsCopiedSchema(true);
    toast.success(t('parametre_semasi_kopyalandi', 'JSON Parametre Şeması panoya kopyalandı'));
    setTimeout(() => setIsCopiedSchema(false), 2000);
  };

  const handleCopySignature = () => {
    if (!selectedMcpNode?.ornekIstek) return;
    navigator.clipboard.writeText(selectedMcpNode.ornekIstek);
    setIsCopiedSignature(true);
    toast.success(t('ornek_istek_kopyalandi', 'Örnek MCP çağrı yükü panoya kopyalandı'));
    setTimeout(() => setIsCopiedSignature(false), 2000);
  };

  // ─── TREE VIEW SÜTUNLARI ────────────────────────────────────────────────────

  const treeColumns = useMemo<Column<McpTreeNode>[]>(() => [
    {
      id: 'ad',
      header: t('modul_varlik_mcp_fonksiyonu', 'Modül / Varlık / MCP Fonksiyonu'),
      minWidth: '380px',
      render: (node: McpTreeNode) => {
        // 1. Kademe: Modül Seviyesi
        if (node.kademe === 1) {
          const { listCount, belgeKartCount, mcpCount } = countMcpNodeStats(node);

          return (
            <div className="flex items-center gap-10 py-4">
              <div className="flex items-center justify-center p-8 rounded-xl bg-surface-subtle border border-border text-primary">
                {node.rawModule?.icon && React.isValidElement(node.rawModule.icon) ? (
                  node.rawModule.icon
                ) : (
                  <Boxes size={20} />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-8">
                  <span className="font-bold text-primary text-14">{node.ad}</span>
                  <span className="badge badge-neutral text-xs font-semibold px-6 py-1 rounded">
                    {t('modul', 'Modül')}
                  </span>
                  <span className="text-11 text-secondary font-medium">
                    ({listCount} {t('liste', 'Liste')} • {belgeKartCount} {t('belge_kart', 'Belge/Kart')} • {mcpCount}{' '}
                    {t('mcp_araci', 'MCP Aracı')})
                  </span>
                </div>
                {node.aciklama && (
                  <span className="text-12 text-secondary line-clamp-1">{node.aciklama}</span>
                )}
              </div>
            </div>
          );
        }

        // 2. Kademe: Liste Seviyesi
        if (node.kademe === 2 || node.kategori === 'liste') {
          const { belgeKartCount, mcpCount } = countMcpNodeStats(node);

          return (
            <div className="flex items-center gap-10 py-3">
              <span className="badge badge-primary text-xs font-semibold px-8 py-2 rounded-full flex items-center gap-4">
                <Table size={12} />
                {t('liste', 'Liste')}
              </span>

              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span className="font-semibold text-primary text-13">{node.ad}</span>
                  <span className="text-11 text-secondary">
                    ({belgeKartCount} {t('belge_kart', 'Belge/Kart')} • {mcpCount} {t('mcp_fonksiyonu', 'Fonksiyon')})
                  </span>
                </div>
                {node.aciklama && (
                  <span className="text-11 text-secondary line-clamp-1">{node.aciklama}</span>
                )}
              </div>
            </div>
          );
        }

        // 3. Kademe (A): İlgili Belge veya Kart Seviyesi (Liste altında gösterilir)
        if (node.kategori === 'belge' || node.kategori === 'kart') {
          const isBelge = node.kategori === 'belge';

          return (
            <div className="flex items-center gap-10 py-3">
              <span
                className={`badge text-xs font-semibold px-8 py-2 rounded-full flex items-center gap-4 ${isBelge ? 'badge-success' : 'badge-secondary'
                  }`}
              >
                {isBelge ? (
                  <>
                    <FileText size={12} />
                    {t('belge', 'Belge')}
                  </>
                ) : (
                  <>
                    <CreditCard size={12} />
                    {t('kart', 'Kart')}
                  </>
                )}
              </span>

              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span className="font-semibold text-primary text-13">{node.ad}</span>
                </div>
                {node.aciklama && (
                  <span className="text-11 text-secondary line-clamp-1">{node.aciklama}</span>
                )}
              </div>
            </div>
          );
        }

        // 3. Kademe (B): "Fonksiyonlar" Klasörü Seviyesi
        if (node.kategori === 'klasor') {
          const childMcpCount = node.children ? node.children.length : 0;

          return (
            <div className="flex items-center gap-10 py-3">
              <div className="flex items-center justify-center p-6 rounded-lg bg-surface-subtle border border-border text-warning">
                <FolderOpen size={15} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span className="font-bold text-primary text-13">{node.ad}</span>
                  <span className="badge badge-warning text-10 font-semibold px-6 py-1 rounded">
                    {t('klasor', 'Klasör')}
                  </span>
                  <span className="text-11 text-secondary">
                    ({childMcpCount} {t('mcp_fonksiyonu', 'Fonksiyon')})
                  </span>
                </div>
                {node.aciklama && (
                  <span className="text-11 text-secondary line-clamp-1">{node.aciklama}</span>
                )}
              </div>
            </div>
          );
        }

        // 4. Kademe: MCP Fonksiyonu Seviyesi (Fonksiyonlar klasörü altında gösterilir)
        return (
          <div className="flex items-center gap-10 py-3">
            <div className="flex items-center justify-center p-6 rounded-lg bg-surface-subtle border border-border text-accent">
              <Wrench size={14} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-6">
                <span className="font-semibold text-primary text-13">{node.ad}</span>
                {node.isSistem && (
                  <span className="badge badge-accent text-10 font-bold px-6 py-1 rounded">
                    MCP Core
                  </span>
                )}
              </div>
              <span className="text-11 text-secondary line-clamp-1">{node.aciklama}</span>
            </div>
          </div>
        );
      }
    },
    {
      id: 'kod',
      header: t('kod_fonksiyon', 'Kod / Fonksiyon Adı'),
      sortable: true,
      width: '240px',
      render: (node: McpTreeNode) => {
        if (node.kategori === 'mcp') {
          return (
            <span className="font-mono text-xs font-bold text-accent bg-surface-subtle px-8 py-3 rounded border border-border inline-flex items-center gap-6">
              <Sparkles size={11} />
              {node.kod}
            </span>
          );
        }
        return (
          <span className="font-mono text-xs text-secondary bg-surface-subtle px-8 py-3 rounded border border-border font-medium">
            {node.kod}
          </span>
        );
      }
    },
    {
      id: 'kategori',
      header: t('kademe_kategori', 'Kademe & Kategori'),
      sortable: true,
      width: '160px',
      render: (node: McpTreeNode) => {
        if (node.kademe === 1) {
          return (
            <span className="badge badge-neutral text-xs font-semibold px-8 py-2 rounded">
              1. {t('modul', 'Modül')}
            </span>
          );
        }
        if (node.kademe === 2 || node.kategori === 'liste') {
          return (
            <span className="badge badge-primary text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
              <Table size={11} />
              2. {t('liste', 'Liste')}
            </span>
          );
        }
        if (node.kategori === 'belge') {
          return (
            <span className="badge badge-success text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
              <FileText size={11} />
              3. {t('belge', 'Belge')}
            </span>
          );
        }
        if (node.kategori === 'kart') {
          return (
            <span className="badge badge-secondary text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
              <CreditCard size={11} />
              3. {t('kart', 'Kart')}
            </span>
          );
        }
        if (node.kategori === 'klasor') {
          return (
            <span className="badge badge-warning text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
              <FolderOpen size={11} />
              3. {t('klasor', 'Klasör')}
            </span>
          );
        }
        return (
          <span className="badge badge-accent text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
            <Wrench size={11} />
            4. {t('mcp_fonksiyonu', 'MCP')}
          </span>
        );
      }
    },
    {
      id: 'hedef',
      header: t('isleyici_veya_rota', 'İşleyici / Rota'),
      minWidth: '220px',
      render: (node: McpTreeNode) => {
        if (node.kategori === 'mcp' && node.isleyici) {
          return (
            <div className="flex items-center gap-6 text-xs font-mono text-primary truncate max-w-260" title={node.isleyici}>
              <ShieldCheck size={13} className="text-success flex-shrink-0" />
              <span className="truncate">{node.isleyici}</span>
            </div>
          );
        }
        if (node.rota) {
          return (
            <span className="font-mono text-xs text-secondary truncate max-w-240 block" title={node.rota}>
              {node.rota}
            </span>
          );
        }
        return <span className="text-secondary text-xs">-</span>;
      }
    },
    {
      id: 'islemler',
      header: t('islemler', 'İşlemler'),
      width: '140px',
      align: 'center',
      render: (node: McpTreeNode) => {
        if (node.kategori === 'mcp') {
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSchemaModal(node);
              }}
              className="btn btn-secondary btn-sm flex items-center gap-6"
              title={t('semayi_incele', 'Şema ve Parametreleri İncele')}
            >
              <Code2 size={13} />
              <span>{t('sema', 'Şema')}</span>
            </button>
          );
        }
        return null;
      }
    }
  ], [t]);

  // ─── ANA SAYFA İÇERİĞİ ──────────────────────────────────────────────────────

  const renderContent = () => (
    <>
      {/* 4 Kademeli Hiyerarşik TreeView Tablosu */}
      <DataTable<McpTreeNode>
        data={filteredTreeData}
        columns={treeColumns}
        enableTreeView={true}
        childrenField="children"
        defaultExpandAll={true}
        expandedRowIds={expandedRowIds}
        onExpandedRowsChange={setExpandedRowIds}
        treeColumnId="ad"
        keyExtractor={(item) => item.id}
        pageSize={100}
        emptyMessage={t('mcp_kayit_bulunamadi', 'Arama kriterlerine uygun modül veya MCP fonksiyonu bulunamadı.')}
        loading={loading}
      />

      {/* Şema ve Parametre İnceleme Modal Penceresi */}
      {selectedMcpNode && (
        <Modal
          isOpen={Boolean(selectedMcpNode)}
          onClose={handleCloseSchemaModal}
          size="lg"
          title={
            <div className="flex items-center gap-8">
              <Code2 size={20} className="text-primary" />
              <span className="font-bold text-16">
                {selectedMcpNode.kod} - {t('mcp_fonksiyon_semasi', 'Parametre ve Şema İnceleme')}
              </span>
            </div>
          }
        >
          <div className="ai-mcp-schema-modal-content">
            {/* Meta Bilgiler */}
            <div className="flex flex-col gap-6 p-14 rounded-lg bg-surface-subtle border border-border">
              <div className="flex items-center justify-between flex-wrap gap-8">
                <span className="text-13 font-bold text-primary">{selectedMcpNode.ad}</span>
                <span className="badge badge-accent text-11 font-semibold px-8 py-2 rounded">
                  {selectedMcpNode.varlikTuru || 'MCP Tool'}
                </span>
              </div>
              <p className="text-12 text-secondary m-0">{selectedMcpNode.aciklama}</p>
              <div className="flex items-center gap-12 text-11 text-secondary mt-4 flex-wrap">
                <span>
                  <strong>{t('modul', 'Modül')}:</strong> {selectedMcpNode.modulKodu}
                </span>
                <span>•</span>
                <span>
                  <strong>{t('varlik', 'Varlık')}:</strong> {selectedMcpNode.varlikKodu}
                </span>
                <span>•</span>
                <span>
                  <strong>{t('isleyici', 'İşleyici')}:</strong> {selectedMcpNode.isleyici}
                </span>
              </div>
            </div>

            {/* JSON Parametre Şeması */}
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <label className="text-12 font-bold text-primary">
                  {t('parametre_semasi_json', 'JSON Parametre Şeması')}
                </label>
                <button
                  type="button"
                  onClick={handleCopySchemaJson}
                  className="btn btn-secondary btn-sm flex items-center gap-6"
                >
                  {isCopiedSchema ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  <span>{isCopiedSchema ? t('kopyalandi', 'Kopyalandı') : t('panoya_kopyala', 'Kopyala')}</span>
                </button>
              </div>
              <div className="ai-mcp-code-block">
                <pre>
                  <code>{JSON.stringify(selectedMcpNode.parametreSemasi || {}, null, 2)}</code>
                </pre>
              </div>
            </div>

            {/* Örnek LLM İstek Çağrısı */}
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <label className="text-12 font-bold text-primary">
                  {t('ornek_llm_cagrisi', 'Örnek Ajan / LLM Çağrı Yükü')}
                </label>
                <button
                  type="button"
                  onClick={handleCopySignature}
                  className="btn btn-secondary btn-sm flex items-center gap-6"
                >
                  {isCopiedSignature ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  <span>{isCopiedSignature ? t('kopyalandi', 'Kopyalandı') : t('cagriyi_kopyala', 'Kopyala')}</span>
                </button>
              </div>
              <div className="ai-mcp-code-block">
                <pre>
                  <code>
                    {selectedMcpNode.ornekIstek
                      ? JSON.stringify(JSON.parse(selectedMcpNode.ornekIstek), null, 2)
                      : '{}'}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );

  if (embedded) {
    return <div className="ai-mcp-embedded">{renderContent()}</div>;
  }

  return (
    <BaseSystemPage
      title={t('menu_ai_mcp', 'Model Context Protocol (MCP)')}
      subtitle={t(
        'ai_mcp_alt_baslik',
        'ERP ve Admin modüllerine ait tescilli liste, kart ve belgeler ile bunlara bağlı otonom MCP fonksiyonları.'
      )}
      icon={<Layers size={26} />}
      baseRoute="/ayarlar/YapayZekaAyarlari/AiMcp"
      backRoute={backRoute}
      onBack={onBack}
      headerSync={false}
      extraDropdownActions={extraDropdownActions}
      searchPlaceholder={t('mcp_arama_placeholder', 'Modül, varlık veya MCP fonksiyonu ara...')}
      searchTerm={searchTerm}
      onSearchChange={(term) => setSearchTerm(term)}
    >
      {renderContent()}
    </BaseSystemPage>
  );
};

export default AiMcpYonetimi;
