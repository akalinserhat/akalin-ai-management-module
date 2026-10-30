/**
 * @akalin/ai_management_module - Model Context Protocol (MCP) Yönetim Sayfası (AiMcpYonetimi.tsx)
 * 
 * Başlıca Sorumlulukları ve Görevleri:
 * - BaseSystemPage ve DataTable (enableTreeView={true}) mimarisi ile 3 kademeli hiyerarşik yapı sunmak:
 *   1. Kademe: Sistemde kayıtlı ERP ve Admin modülleri (ModuleRegistry.getModules())
 *   2. Kademe: Her modüle ait tescilli listeler, kartlar ve belgeler (ModuleRegistry.getModuleEntities())
 *   3. Kademe: Bu öğelere bağlı otonom MCP fonksiyonları (erp_create_document, erp_query_data, erp_get_document_schema, erp_navigate, erp_get_page_context vb.)
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
  kademe: 1 | 2 | 3;
  ad: string;
  kod: string;
  kategori: 'modul' | 'liste' | 'kart' | 'belge' | 'mcp';
  aciklama?: string;
  rota?: string;
  isleyici?: string;
  parametreSemasi?: any;
  ornekIstek?: string;
  modulKodu?: string;
  varlikKodu?: string;
  varlikTuru?: string;
  isSistem?: boolean;
  rawModule?: IModuleDefinition;
  rawEntity?: IModuleEntityDefinition;
  children?: McpTreeNode[];
}

export interface AiMcpYonetimiProps {
  embedded?: boolean;
  backRoute?: string;
  onBack?: () => void;
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

    // 2. Kademe: Modüle tescil edilmiş listeler, kartlar ve belgeler
    let entities = ModuleRegistry.getModuleEntities(modKod);
    if ((!entities.tree || entities.tree.length === 0) && mod.title) {
      const fromTitle = ModuleRegistry.getModuleEntities(mod.title);
      if (fromTitle.tree && fromTitle.tree.length > 0) entities = fromTitle;
    }
    if ((!entities.tree || entities.tree.length === 0) && mod.name) {
      const fromName = ModuleRegistry.getModuleEntities(mod.name);
      if (fromName.tree && fromName.tree.length > 0) entities = fromName;
    }

    const entityList: IModuleEntityDefinition[] = [
      ...(entities.documents || []),
      ...(entities.cards || []),
      ...(entities.lists || [])
    ];

    const finalEntities: IModuleEntityDefinition[] = entityList.length > 0 ? entityList : [
      {
        id: `${modKod}_genel_liste`,
        category: 'liste',
        titleKey: `${modKod}_genel_liste`,
        title: `${modAd} ${t('listesi', 'Listesi')}`,
        description: `${modAd} ${t('kayitlari_ve_tablo_verileri', 'kayıtları ve tablo verileri')}`,
        route: modBaseRoute
      }
    ];

    // 2. Kademe Düğümlerini Üret
    const entityNodes: McpTreeNode[] = finalEntities.map((ent): McpTreeNode => {
      const entKod = ent.id;
      const entAd = ent.title || ent.titleKey || entKod;
      const entCat = (ent.category || 'liste') as 'liste' | 'kart' | 'belge';
      const entRoute = ent.route || ent.listRoute || ent.formRoute || modBaseRoute;

      // 3. Kademe: Bu varlığa ait MCP Fonksiyonları
      const mcpFunctions: McpTreeNode[] = [];

      if (entCat === 'belge') {
        mcpFunctions.push({
          id: `mcp_${entKod}_create_document`,
          kademe: 3,
          ad: t('mcp_func_create_doc_title', 'Yeni Belge ve Taslak Hazırlama (BELGE_DOLDUR)'),
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
          id: `mcp_${entKod}_schema`,
          kademe: 3,
          ad: t('mcp_func_schema_title', 'Belge Şeması & Alan Doğrulama Kuralları'),
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
          id: `mcp_${entKod}_navigate`,
          kademe: 3,
          ad: t('mcp_func_navigate_title', 'Belge Ekranına Yönlendirme & Sayfa Açma'),
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
          id: `mcp_${entKod}_context`,
          kademe: 3,
          ad: t('mcp_func_context_title', 'Aktif Form & Belge Bağlamı Okuma'),
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
          id: `mcp_${entKod}_create_card`,
          kademe: 3,
          ad: t('mcp_func_create_card_title', 'Yeni Kart Açma & Alan Doldurma'),
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
          id: `mcp_${entKod}_schema`,
          kademe: 3,
          ad: t('mcp_func_card_schema_title', 'Kart Şeması & Validasyon Kuralları'),
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
          id: `mcp_${entKod}_navigate`,
          kademe: 3,
          ad: t('mcp_func_card_nav_title', 'Kart Formuna Navigasyon'),
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
          id: `mcp_${entKod}_query`,
          kademe: 3,
          ad: t('mcp_func_query_title', 'Canlı Veritabanı & Tablo Kayıt Sorgulama'),
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
          id: `mcp_${entKod}_navigate`,
          kademe: 3,
          ad: t('mcp_func_list_nav_title', 'Liste Sayfasına Navigasyon'),
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
          id: `mcp_${entKod}_context`,
          kademe: 3,
          ad: t('mcp_func_list_ctx_title', 'Tablo Filtre & Seçili Satır Bağlamı'),
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
            id: `mcp_${entKod}_custom_${ca.action}`,
            kademe: 3,
            ad: `${ca.labelKey || ca.action} (${t('ozel_aksiyon', 'Özel Aksiyon')})`,
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

      return {
        id: `ent_${modKod}_${entCat}_${entKod}`,
        kademe: 2,
        ad: entAd,
        kod: entKod,
        kategori: entCat,
        modulKodu: modKod,
        rota: entRoute,
        aciklama: ent.description || '',
        rawEntity: ent,
        children: mcpFunctions
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
      children: entityNodes
    };
  });
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

  // ─── 3 KADEMELİ TREE VIEW VERİ MOTORU ────────────────────────────────────────

  const rawTreeData = useMemo<McpTreeNode[]>(() => buildMcpTreeData(t), [t]);

  // ─── FİLTRELENMİŞ TREE VIEW VERİSİ ──────────────────────────────────────────

  const filteredTreeData = useMemo<McpTreeNode[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rawTreeData;

    return rawTreeData
      .map((modNode): McpTreeNode | null => {
        const filteredEntities = (modNode.children || [])
          .map((entNode): McpTreeNode | null => {
            const filteredTools = (entNode.children || []).filter(toolNode => {
              return (
                toolNode.ad.toLowerCase().includes(q) ||
                toolNode.kod.toLowerCase().includes(q) ||
                (toolNode.aciklama && toolNode.aciklama.toLowerCase().includes(q)) ||
                (toolNode.isleyici && toolNode.isleyici.toLowerCase().includes(q))
              );
            });

            const entMatches = (
              entNode.ad.toLowerCase().includes(q) ||
              entNode.kod.toLowerCase().includes(q) ||
              (entNode.aciklama && entNode.aciklama.toLowerCase().includes(q)) ||
              (entNode.rota && entNode.rota.toLowerCase().includes(q))
            );

            if (entMatches || filteredTools.length > 0) {
              return {
                ...entNode,
                children: filteredTools
              };
            }
            return null;
          })
          .filter((n): n is McpTreeNode => n !== null);

        const modMatches = (
          modNode.ad.toLowerCase().includes(q) ||
          modNode.kod.toLowerCase().includes(q) ||
          (modNode.aciklama && modNode.aciklama.toLowerCase().includes(q))
        );

        if (modMatches || filteredEntities.length > 0) {
          return {
            ...modNode,
            children: filteredEntities
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

  // Sayfa açıldığında modülleri ve varlıkları açık başlat
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
      label: t('sadece_modulleri_genislet', 'Sadece Modülleri Genişlet'),
      icon: <Layers size={15} />,
      onClick: handleExpandModulesOnly
    },
    {
      label: t('tumunu_daralt', 'Tümünü Daralt (Tüm Dalları Kapat)'),
      icon: <ChevronsDownUp size={15} />,
      onClick: handleCollapseAll
    }
  ], [t, handleExpandAll, handleExpandModulesOnly, handleCollapseAll]);

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
      minWidth: '360px',
      render: (node: McpTreeNode) => {
        // 1. Kademe: Modül Seviyesi
        if (node.kademe === 1) {
          const entityCount = node.children ? node.children.length : 0;
          let mcpCount = 0;
          node.children?.forEach(c => {
            mcpCount += c.children ? c.children.length : 0;
          });

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
                    ({entityCount} {t('varlik', 'Varlık')} • {mcpCount} {t('mcp_araci', 'MCP Aracı')})
                  </span>
                </div>
                {node.aciklama && (
                  <span className="text-12 text-secondary line-clamp-1">{node.aciklama}</span>
                )}
              </div>
            </div>
          );
        }

        // 2. Kademe: Varlık Seviyesi (Liste, Kart, Belge)
        if (node.kademe === 2) {
          const isBelge = node.kategori === 'belge';
          const isKart = node.kategori === 'kart';
          const isListe = node.kategori === 'liste';
          const childMcpCount = node.children ? node.children.length : 0;

          return (
            <div className="flex items-center gap-10 py-3">
              <span
                className={`badge text-xs font-semibold px-8 py-2 rounded-full flex items-center gap-4 ${isBelge
                  ? 'badge-success'
                  : isKart
                    ? 'badge-secondary'
                    : isListe
                      ? 'badge-primary'
                      : 'badge-info'
                  }`}
              >
                {isBelge ? (
                  <>
                    <FileText size={12} />
                    {t('belge', 'Belge')}
                  </>
                ) : isKart ? (
                  <>
                    <CreditCard size={12} />
                    {t('kart', 'Kart')}
                  </>
                ) : (
                  <>
                    <Table size={12} />
                    {t('liste', 'Liste')}
                  </>
                )}
              </span>

              <div className="flex flex-col">
                <div className="flex items-center gap-6">
                  <span className="font-semibold text-primary text-13">{node.ad}</span>
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

        // 3. Kademe: MCP Fonksiyonu Seviyesi
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
        if (node.kademe === 3) {
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
        if (node.kademe === 2) {
          let badgeColor = 'badge-primary';
          let label = t('liste', 'Liste');
          if (node.kategori === 'belge') {
            badgeColor = 'badge-success';
            label = t('belge', 'Belge');
          } else if (node.kategori === 'kart') {
            badgeColor = 'badge-secondary';
            label = t('kart', 'Kart');
          }
          return (
            <span className={`badge ${badgeColor} text-xs font-semibold px-8 py-2 rounded`}>
              2. {label}
            </span>
          );
        }
        return (
          <span className="badge badge-accent text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
            <Wrench size={11} />
            3. {t('mcp_fonksiyonu', 'MCP')}
          </span>
        );
      }
    },
    {
      id: 'hedef',
      header: t('isleyici_veya_rota', 'İşleyici / Rota'),
      minWidth: '220px',
      render: (node: McpTreeNode) => {
        if (node.kademe === 3 && node.isleyici) {
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
        if (node.kademe === 3) {
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
      {/* 3 Kademeli Hiyerarşik TreeView Tablosu */}
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
