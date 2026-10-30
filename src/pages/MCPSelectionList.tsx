/**
 * @file MCPSelectionList.tsx
 * @description
 * @akalin/ai_management_module - MCP ve Form Seçim Listesi Bileşeni (MCPSelectionList)
 *
 * Başlıca Sorumlulukları:
 * - @akalin/ui BaseSelectionList temel sınıfından türetilmek
 * - mode === 'modul' (Varsayılan): Modül seviyesi (1. Kademe) seçim listesi sunar
 * - mode === 'varlik' ("Form Seçimi"): AiAjanForm "MCP Yetkileri" sekmesindeki ağaç (TreeView) yapısını sunar;
 *   yalnızca "Fonksiyonlar" (Function) klasörü ve MCP fonksiyonları gizlenir, Modül -> Liste -> Belge/Kart hiyerarşisi gösterilir
 * - Sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Boxes, CreditCard, FileText, Table, Power } from 'lucide-react';
import {
  BaseSelectionList,
  type BaseSelectionListProps,
  type Column,
  type FetchDataArgs
} from '@akalin/ui';
import {
  buildMcpTreeData,
  countMcpNodeStats,
  type McpTreeNode
} from './AiMcpYonetimi';

export interface McpStageOneItem extends Omit<McpTreeNode, 'children'> {
  varlikSayisi: number;
  listeSayisi: number;
  belgeKartSayisi: number;
  mcpAracSayisi: number;
  altVarliklar?: McpTreeNode[];
}

export interface McpFormTreeNode extends McpTreeNode {
  modulAdi?: string;
  varlikTuruLabel?: string;
  children?: McpFormTreeNode[];
}

export type McpSelectionMode = 'modul' | 'varlik';

export interface MCPSelectionListProps extends Partial<BaseSelectionListProps<any>> {
  mode?: McpSelectionMode;
  seciliAracKodlari?: string[];
  onlyActive?: boolean;
  categoryFilter?: 'all' | 'kart' | 'belge' | 'liste';
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (item: any) => void;
  onMultiSelect?: (items: any[]) => void;
  isMultiSelect?: boolean;
  initialSearchText?: string;
  initialSearchTerm?: string;
  title?: string;
  subtitle?: string;
  inModal?: boolean;
}

export const MCPSelectionList: React.FC<MCPSelectionListProps> = ({
  mode = 'modul',
  seciliAracKodlari,
  onlyActive,
  categoryFilter = 'all',
  isOpen = true,
  onClose,
  onSelect,
  onMultiSelect,
  isMultiSelect = false,
  initialSearchText = '',
  initialSearchTerm = '',
  title,
  subtitle,
  inModal = true,
  ...restProps
}) => {
  const { t } = useTranslation();
  const effectiveSearchText = initialSearchText || initialSearchTerm;

  // 1. Kademe: Modül Listesi (mode === 'modul')
  const stageOneList = useMemo<McpStageOneItem[]>(() => {
    if (mode !== 'modul') return [];
    const fullTree = buildMcpTreeData(t);
    return fullTree
      .filter((node) => node.kademe === 1)
      .map((node) => {
        const { listCount, belgeKartCount, mcpCount } = countMcpNodeStats(node);

        const { children, ...restNode } = node;
        return {
          ...restNode,
          varlikSayisi: listCount + belgeKartCount,
          listeSayisi: listCount,
          belgeKartSayisi: belgeKartCount,
          mcpAracSayisi: mcpCount,
          altVarliklar: children
        };
      });
  }, [mode, t]);

  // Ağaç Yapılı Form Seçim Listesi (mode === 'varlik' - AiAjanForm "MCP Yetkileri" ile birebir aynı, yalnızca Function klasörü hariç)
  const varlikTreeList = useMemo<McpFormTreeNode[]>(() => {
    if (mode !== 'varlik') return [];

    const fullTree = buildMcpTreeData(t);
    const rawCodes: string[] = Array.isArray(seciliAracKodlari) ? seciliAracKodlari : [];
    const positiveCodes = rawCodes.filter((c) => typeof c === 'string' && !c.startsWith('!'));
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

    const resolveVarlikLabel = (kat: string): string => {
      if (kat === 'belge') return t('belge', 'Belge');
      if (kat === 'kart') return t('kart', 'Kart');
      if (kat === 'liste') return t('liste', 'Liste');
      return t('modul', 'Modül');
    };

    // Düğümü aktiflik durumu, modül bilgisi ile zenginleştir ve "Fonksiyonlar" (klasor / mcp) düğümlerini çıkar
    const stripFunctionsAndDecorate = (
      node: McpTreeNode,
      modKod: string,
      modAd: string
    ): McpFormTreeNode | null => {
      if (node.kategori === 'klasor' || node.kategori === 'mcp') {
        return null;
      }

      const nodeIdLower = (node.id || '').toLowerCase();
      const rawChildren = (node.children || [])
        .map((child) => stripFunctionsAndDecorate(child, modKod, modAd))
        .filter((c): c is McpFormTreeNode => c !== null);

      const filteredChildren =
        categoryFilter && categoryFilter !== 'all' && node.kademe === 2
          ? rawChildren.filter((c) => c.kategori === categoryFilter)
          : rawChildren;

      return {
        ...node,
        aktifMi: !disabledSet.has(nodeIdLower),
        modulKodu: modKod,
        modulAdi: modAd,
        varlikTuruLabel: resolveVarlikLabel(node.kategori),
        children: filteredChildren.length > 0 ? filteredChildren : undefined
      };
    };

    const result: McpFormTreeNode[] = [];

    if (positiveCodes.length > 0 && onlyActive !== false) {
      fullTree.forEach((moduleNode) => {
        const modKod = moduleNode.kod || '';
        const modAd = moduleNode.ad || modKod;

        // Durum A: Doğrudan 1. Kademe (Modül) yetkilendirilmiş mi?
        if (isNodeSelected(moduleNode)) {
          const decorated = stripFunctionsAndDecorate(moduleNode, modKod, modAd);
          if (decorated) {
            result.push(decorated);
          }
          return;
        }

        // Durum B: Alt Liste, Belge/Kart veya Fonksiyonlardan tekil seçimler var mı?
        const matchingLists: McpTreeNode[] = [];

        (moduleNode.children || []).forEach((listNode) => {
          if (isNodeSelected(listNode)) {
            matchingLists.push(listNode);
            return;
          }

          const belgeKartNodes = (listNode.children || []).filter(
            (c) => c.kategori === 'belge' || c.kategori === 'kart'
          );
          const matchingBelgeKart = belgeKartNodes.filter(isNodeSelected);
          const selectedBelgeKartCodes = new Set(
            matchingBelgeKart.map((bk) => (bk.kod || '').toLowerCase())
          );

          const folderNode = (listNode.children || []).find((c) => c.kategori === 'klasor');
          const matchingTools = (folderNode?.children || []).filter((toolNode) => {
            if (isNodeSelected(toolNode)) return true;
            const vKod = (toolNode.varlikKodu || '').toLowerCase();
            return Boolean(vKod && selectedBelgeKartCodes.has(vKod));
          });

          if (matchingBelgeKart.length > 0 || matchingTools.length > 0) {
            const nextChildren: McpTreeNode[] =
              matchingBelgeKart.length > 0 ? matchingBelgeKart : belgeKartNodes;
            matchingLists.push({
              ...listNode,
              children: nextChildren
            });
          }
        });

        if (matchingLists.length > 0) {
          const decorated = stripFunctionsAndDecorate(
            {
              ...moduleNode,
              children: matchingLists
            },
            modKod,
            modAd
          );
          if (decorated) {
            result.push(decorated);
          }
        }
      });
    }

    // Ajanın henüz tanımlı MCP yetkisi yoksa veya onlyActive === false ise tüm modül ağacını (Function klasörü olmadan) göster
    if (result.length === 0) {
      fullTree.forEach((moduleNode) => {
        const modKod = moduleNode.kod || '';
        const modAd = moduleNode.ad || modKod;
        const decorated = stripFunctionsAndDecorate(moduleNode, modKod, modAd);
        if (decorated) {
          result.push(decorated);
        }
      });
    }

    return result;
  }, [mode, seciliAracKodlari, onlyActive, categoryFilter, t]);

  // Arama Alanları: Modül Modu
  const modulSearchableFields = useMemo(
    () => [
      {
        id: 'Tumu',
        label: t('tumu', 'Tümü'),
        type: 'text',
        iconName: 'Search',
        placeholder: t('mcp_modul_ara_placeholder', 'Modül adı, kodu veya açıklaması ara...')
      },
      {
        id: 'Ad',
        label: t('modul_adi', 'Modül Adı'),
        type: 'text',
        iconName: 'Layers',
        placeholder: t('modul_adi_girin', 'Modül adı girin...')
      },
      {
        id: 'Kod',
        label: t('modul_kodu', 'Modül Kodu'),
        type: 'text',
        iconName: 'Code2',
        placeholder: t('modul_kodu_girin', 'Modül kodu girin...')
      }
    ],
    [t]
  );

  // Arama Alanları: Form Seçim Modu (Modül / Liste / Belge & Kart)
  const varlikSearchableFields = useMemo(
    () => [
      {
        id: 'Tumu',
        label: t('tumu', 'Tümü'),
        type: 'text',
        iconName: 'Search',
        placeholder: t(
          'mcp_varlik_ara_placeholder',
          'Belge, kart veya liste adı, kodu, modülü ara...'
        )
      },
      {
        id: 'Ad',
        label: t('varlik_adi', 'Form / Varlık Adı'),
        type: 'text',
        iconName: 'FileText',
        placeholder: t('varlik_adi_girin', 'Form veya varlık adı girin...')
      },
      {
        id: 'Kod',
        label: t('varlik_kodu', 'Kod'),
        type: 'text',
        iconName: 'Code2',
        placeholder: t('varlik_kodu_girin', 'Varlık kodu girin...')
      },
      {
        id: 'Modul',
        label: t('modul_adi', 'Modül Adı'),
        type: 'text',
        iconName: 'Boxes',
        placeholder: t('modul_adi_girin', 'Modül adı girin...')
      }
    ],
    [t]
  );

  // Sütunlar: Modül Modu
  const modulColumns = useMemo<Column<McpStageOneItem>[]>(
    () => [
      {
        id: 'ad',
        accessor: 'ad',
        header: t('modul', 'Modül'),
        minWidth: '320px',
        sortable: true,
        render: (node: McpStageOneItem) => (
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
                  ({node.varlikSayisi} {t('varlik', 'Varlık')} • {node.mcpAracSayisi}{' '}
                  {t('mcp_araci', 'MCP Aracı')})
                </span>
              </div>
              {node.aciklama && (
                <span className="text-12 text-secondary line-clamp-1">{node.aciklama}</span>
              )}
            </div>
          </div>
        )
      },
      {
        id: 'kod',
        accessor: 'kod',
        header: t('kod', 'Modül Kodu'),
        width: '220px',
        sortable: true,
        render: (node: McpStageOneItem) => (
          <span className="font-mono text-xs text-secondary bg-surface-subtle px-8 py-3 rounded border border-border font-medium">
            {node.kod}
          </span>
        )
      },
      {
        id: 'kategori',
        accessor: 'kategori',
        header: t('kademe_kategori', 'Kademe & Kategori'),
        width: '160px',
        render: () => (
          <span className="badge badge-neutral text-xs font-semibold px-8 py-2 rounded">
            1. {t('modul', 'Modül')}
          </span>
        )
      },
      {
        id: 'rota',
        accessor: 'rota',
        header: t('rota', 'Rota'),
        minWidth: '180px',
        render: (node: McpStageOneItem) =>
          node.rota ? (
            <span className="font-mono text-xs text-secondary truncate max-w-240 block" title={node.rota}>
              {node.rota}
            </span>
          ) : (
            <span className="text-secondary text-xs">-</span>
          )
      }
    ],
    [t]
  );

  // Sütunlar: Form Seçim Modu (AiAjanForm "MCP Yetkileri" listesiyle birebir aynı kolon ve görünüm)
  const varlikColumns = useMemo<Column<McpFormTreeNode>[]>(
    () => [
      {
        id: 'ad',
        header: t('modul_varlik_mcp_fonksiyonu', 'Modül / Varlık'),
        accessor: 'ad',
        minWidth: '360px',
        render: (node: McpFormTreeNode) => {
          // 1. Kademe: Modül Seviyesi
          if (node.kademe === 1) {
            const { listCount, belgeKartCount } = countMcpNodeStats(node);

            return (
              <div className="flex items-center gap-10 py-3">
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
                      ({listCount} {t('liste', 'Liste')} • {belgeKartCount}{' '}
                      {t('belge_kart', 'Belge/Kart')})
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
            const { belgeKartCount } = countMcpNodeStats(node);

            return (
              <div className="flex items-center gap-10 py-2">
                <span className="badge badge-primary text-xs font-semibold px-8 py-2 rounded-full flex items-center gap-4">
                  <Table size={12} />
                  {t('liste', 'Liste')}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center gap-6">
                    <span className="font-semibold text-primary text-13">{node.ad}</span>
                    <span className="text-11 text-secondary">
                      ({belgeKartCount} {t('belge_kart', 'Belge/Kart')})
                    </span>
                  </div>
                  {node.aciklama && (
                    <span className="text-11 text-secondary line-clamp-1">{node.aciklama}</span>
                  )}
                </div>
              </div>
            );
          }

          // 3. Kademe: Belge / Kart Seviyesi
          const isBelge = node.kategori === 'belge';

          return (
            <div className="flex items-center gap-10 py-2">
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
      },
      {
        id: 'kod',
        header: t('kod_fonksiyon', 'Kod'),
        accessor: 'kod',
        sortable: true,
        width: '240px',
        render: (node: McpFormTreeNode) => (
          <span className="font-mono text-xs text-secondary bg-surface-subtle px-8 py-3 rounded border border-border font-medium">
            {node.kod}
          </span>
        )
      },
      {
        id: 'kategori',
        header: t('kademe_kategori', 'Kademe & Kategori'),
        accessor: 'kategori',
        sortable: true,
        width: '160px',
        render: (node: McpFormTreeNode) => {
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
          return (
            <span className="badge badge-secondary text-xs font-semibold px-8 py-2 rounded flex items-center gap-4 w-fit">
              <CreditCard size={11} />
              3. {t('kart', 'Kart')}
            </span>
          );
        }
      },
      {
        id: 'aciklama',
        header: t('aciklama', 'Açıklama'),
        accessor: 'aciklama',
        render: (node: McpFormTreeNode) => (
          <span className="ai-hizli-istek-prompt-preview" title={node.aciklama || ''}>
            {node.aciklama || '-'}
          </span>
        )
      },
      {
        id: 'aktifMi',
        header: t('durum', 'Durum'),
        accessor: 'aktifMi',
        width: '110px',
        render: (node: McpFormTreeNode) => {
          const isActive = node.aktifMi !== false;
          return (
            <span
              className={`badge text-xs font-semibold px-8 py-2 rounded-full inline-flex items-center gap-4 ${isActive ? 'badge-success' : 'badge-neutral'
                }`}
            >
              <Power size={11} />
              {isActive ? t('aktif', 'Aktif') : t('pasif', 'Pasif')}
            </span>
          );
        }
      }
    ],
    [t]
  );

  const handleFetchData = useCallback(
    async (args: FetchDataArgs) => {
      const activeSearch =
        args?.aramaData && args.aramaData.value !== undefined
          ? String(args.aramaData.value)
          : effectiveSearchText;
      const searchType = args?.aramaData?.type || 'Tumu';
      const q = (activeSearch || '').trim().toLocaleLowerCase('tr-TR');

      if (mode === 'varlik') {
        const matchesQuery = (item: McpFormTreeNode): boolean => {
          if (!q) return true;
          const adMatch = (item.ad || '').toLocaleLowerCase('tr-TR').includes(q);
          const kodMatch = (item.kod || '').toLocaleLowerCase('tr-TR').includes(q);
          const descMatch = (item.aciklama || '').toLocaleLowerCase('tr-TR').includes(q);
          const rotaMatch = (item.rota || '').toLocaleLowerCase('tr-TR').includes(q);
          const modulMatch = (item.modulAdi || '').toLocaleLowerCase('tr-TR').includes(q);

          if (searchType === 'Ad') return adMatch;
          if (searchType === 'Kod') return kodMatch;
          if (searchType === 'Modul') return modulMatch;
          return adMatch || kodMatch || descMatch || rotaMatch || modulMatch;
        };

        const filterTree = (nodes: McpFormTreeNode[]): McpFormTreeNode[] => {
          if (!q) return nodes;
          const matched: McpFormTreeNode[] = [];

          nodes.forEach((node) => {
            const selfMatches = matchesQuery(node);
            const filteredChildren = node.children ? filterTree(node.children) : [];

            if (selfMatches) {
              // Üst düğüm eşleşirse kendi alt ağacıyla birlikte göster
              matched.push({
                ...node,
                children: filteredChildren.length > 0 ? filteredChildren : node.children
              });
            } else if (filteredChildren.length > 0) {
              // Sadece alt düğümler eşleştiyse ebeveyni eşleşen çocuklarıyla göster
              matched.push({
                ...node,
                children: filteredChildren
              });
            }
          });

          return matched;
        };

        let filtered = filterTree(varlikTreeList);

        if (args?.sortField) {
          const field = args.sortField as keyof McpFormTreeNode;
          const dir = args.sortOrder === 'desc' ? -1 : 1;
          filtered = [...filtered].sort((a, b) => {
            const valA = String(a[field] ?? '');
            const valB = String(b[field] ?? '');
            return valA.localeCompare(valB, 'tr-TR') * dir;
          });
        }

        return {
          data: filtered,
          totalCount: filtered.length
        };
      }

      // mode === 'modul'
      let filtered = [...stageOneList];
      if (q) {
        filtered = filtered.filter((item) => {
          const adMatch = (item.ad || '').toLocaleLowerCase('tr-TR').includes(q);
          const kodMatch = (item.kod || '').toLocaleLowerCase('tr-TR').includes(q);
          const descMatch = (item.aciklama || '').toLocaleLowerCase('tr-TR').includes(q);
          const rotaMatch = (item.rota || '').toLocaleLowerCase('tr-TR').includes(q);

          if (searchType === 'Ad') return adMatch;
          if (searchType === 'Kod') return kodMatch;
          return adMatch || kodMatch || descMatch || rotaMatch;
        });
      }

      if (args?.sortField) {
        const field = args.sortField as keyof McpStageOneItem;
        const dir = args.sortOrder === 'desc' ? -1 : 1;
        filtered.sort((a, b) => {
          const valA = String(a[field] ?? '');
          const valB = String(b[field] ?? '');
          return valA.localeCompare(valB, 'tr-TR') * dir;
        });
      }

      return {
        data: filtered,
        totalCount: filtered.length
      };
    },
    [mode, varlikTreeList, stageOneList, effectiveSearchText]
  );

  const handleSelect = useCallback(
    (item: any) => {
      if (!item) return;
      if (Array.isArray(item)) {
        if (onMultiSelect) {
          onMultiSelect(item);
        } else if (onSelect && item[0]) {
          onSelect(item[0]);
        }
        return;
      }
      if (onSelect) {
        onSelect(item);
      }
    },
    [onSelect, onMultiSelect]
  );

  if (!isOpen) return null;

  const defaultTitle =
    mode === 'varlik'
      ? t('form_secimi', 'Form Seçimi')
      : t('mcp_modul_secimi', 'MCP Modül Seçimi');

  const defaultSubtitle =
    mode === 'varlik'
      ? t(
        'mcp_varlik_secimi_alt_baslik',
        'Açılacak veya işlem yapılacak Belge, Kart veya Listeyi seçin.'
      )
      : t(
        'mcp_modul_secimi_alt_baslik',
        'Yetkilendirmek veya işlem yapmak istediğiniz MCP modülünü seçin.'
      );

  const activeColumns = mode === 'varlik' ? (varlikColumns as any) : (modulColumns as any);
  const activeSearchableFields =
    mode === 'varlik' ? varlikSearchableFields : modulSearchableFields;
  const activeIcon = mode === 'varlik' ? <Boxes size={22} /> : <Layers size={22} />;

  return (
    <BaseSelectionList
      inModal={inModal}
      title={title || defaultTitle}
      subtitle={subtitle || defaultSubtitle}
      icon={activeIcon}
      onClose={onClose}
      initialSearchText={effectiveSearchText}
      columns={activeColumns}
      fetchData={handleFetchData}
      keyExtractor={(item: any) => item.id}
      searchableFields={activeSearchableFields}
      isMultiSelect={isMultiSelect}
      onSelect={handleSelect}
      onMultiSelect={onMultiSelect}
      defaultSortField={mode === 'varlik' ? undefined : 'ad'}
      defaultSortOrder="asc"
      dataTableProps={
        mode === 'varlik'
          ? {
            enableTreeView: true,
            childrenField: 'children',
            defaultExpandAll: true,
            treeColumnId: 'ad',
            showRowIndex: false
          }
          : undefined
      }
      emptyMessage={
        mode === 'varlik'
          ? t(
            'mcp_varlik_bulunamadi',
            'Arama kriterlerine uygun Belge, Kart veya Liste bulunamadı.'
          )
          : t('mcp_kayit_bulunamadi', 'Arama kriterlerine uygun modül bulunamadı.')
      }
      {...restProps}
    />
  );
};

export default MCPSelectionList;
