/**
 * @file MCPSelectionList.tsx
 * @description
 * @akalin/ai_management_module - MCP Seçim Listesi Bileşeni (MCPSelectionList)
 *
 * Başlıca Sorumlulukları:
 * - @akalin/ui BaseSelectionList temel sınıfından türetilmek
 * - Listeyi Ayarlar -> Yapay Zeka Ayarları -> MCP Listesinin (AiMcpYonetimi) veri kaynağından (buildMcpTreeData) almak
 * - Yalnızca 1. aşama (1. Kademe - Modül seviyesi) kayıtlarını listelemek
 * - Sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Boxes } from 'lucide-react';
import {
  BaseSelectionList,
  type BaseSelectionListProps,
  type Column,
  type FetchDataArgs
} from '@akalin/ui';
import { buildMcpTreeData, countMcpNodeStats, type McpTreeNode } from './AiMcpYonetimi';

export interface McpStageOneItem extends Omit<McpTreeNode, 'children'> {
  varlikSayisi: number;
  listeSayisi: number;
  belgeKartSayisi: number;
  mcpAracSayisi: number;
  altVarliklar?: McpTreeNode[];
}

export interface MCPSelectionListProps extends Partial<BaseSelectionListProps<McpStageOneItem>> {
  isOpen?: boolean;
  onClose?: () => void;
  onSelect?: (item: McpStageOneItem) => void;
  onMultiSelect?: (items: McpStageOneItem[]) => void;
  isMultiSelect?: boolean;
  initialSearchText?: string;
  initialSearchTerm?: string;
  title?: string;
  subtitle?: string;
  inModal?: boolean;
}

export const MCPSelectionList: React.FC<MCPSelectionListProps> = ({
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

  // MCP Listesinin veri kaynağından yalnızca 1. aşama (1. Kademe: Modüller) kayıtlarını üret
  const stageOneList = useMemo<McpStageOneItem[]>(() => {
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
  }, [t]);

  const searchableFields = useMemo(
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

  const columns = useMemo<Column<McpStageOneItem>[]>(
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

  const handleFetchData = useCallback(
    async (args: FetchDataArgs) => {
      const activeSearch =
        args?.aramaData && args.aramaData.value !== undefined
          ? String(args.aramaData.value)
          : effectiveSearchText;
      const searchType = args?.aramaData?.type || 'Tumu';
      const q = (activeSearch || '').trim().toLocaleLowerCase('tr-TR');

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
    [stageOneList, effectiveSearchText]
  );

  const handleSelect = useCallback(
    (item: McpStageOneItem | McpStageOneItem[]) => {
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

  return (
    <BaseSelectionList<McpStageOneItem>
      inModal={inModal}
      title={title || t('mcp_modul_secimi', 'MCP Modül Seçimi')}
      subtitle={
        subtitle ||
        t(
          'mcp_modul_secimi_alt_baslik',
          'Yetkilendirmek veya işlem yapmak istediğiniz MCP modülünü seçin.'
        )
      }
      icon={<Layers size={22} />}
      onClose={onClose}
      initialSearchText={effectiveSearchText}
      columns={columns}
      fetchData={handleFetchData}
      keyExtractor={(item) => item.id}
      searchableFields={searchableFields}
      isMultiSelect={isMultiSelect}
      onSelect={handleSelect}
      onMultiSelect={onMultiSelect}
      defaultSortField="ad"
      defaultSortOrder="asc"
      emptyMessage={t('mcp_kayit_bulunamadi', 'Arama kriterlerine uygun modül bulunamadı.')}
      {...restProps}
    />
  );
};

export default MCPSelectionList;
