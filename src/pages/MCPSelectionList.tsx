/**
 * @file MCPSelectionList.tsx
 * @description
 * @akalin/ai_management_module - MCP Seçim Listesi Bileşeni (MCPSelectionList)
 *
 * Başlıca Sorumlulukları:
 * - @akalin/ui BaseSelectionList temel sınıfından türetilmek
 * - mode === 'modul' (Varsayılan): Modül seviyesi (1. Kademe) seçim listesi sunar
 * - mode === 'varlik': Modül fonksiyonlarını kesinlikle göstermez; yalnızca Liste, Belge ve Kart varlıklarını listeler
 * - Sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, Boxes, CreditCard, FileText, Table } from 'lucide-react';
import {
  BaseSelectionList,
  type BaseSelectionListProps,
  type Column,
  type FetchDataArgs
} from '@akalin/ui';
import {
  buildMcpTreeData,
  countMcpNodeStats,
  getAgentActiveMcpEntities,
  getAllMcpEntities,
  type McpTreeNode,
  type AgentActiveMcpEntity
} from './AiMcpYonetimi';

export interface McpStageOneItem extends Omit<McpTreeNode, 'children'> {
  varlikSayisi: number;
  listeSayisi: number;
  belgeKartSayisi: number;
  mcpAracSayisi: number;
  altVarliklar?: McpTreeNode[];
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

  // Varlık Listesi: Liste, Belge, Kart (mode === 'varlik' - Fonksiyonlar KESİNLİKLE HARİÇ TUTULUR)
  const varlikList = useMemo<AgentActiveMcpEntity[]>(() => {
    if (mode !== 'varlik') return [];

    let items: AgentActiveMcpEntity[] = [];
    if (seciliAracKodlari && seciliAracKodlari.length > 0 && onlyActive !== false) {
      items = getAgentActiveMcpEntities(seciliAracKodlari, t);
    }
    // Ajanın henüz seçili aracı yoksa veya onlyActive false ise tüm varlıkları getir
    if (items.length === 0) {
      items = getAllMcpEntities(t);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      items = items.filter((item) => item.kategori === categoryFilter);
    }
    return items;
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

  // Arama Alanları: Varlık Modu (Liste, Belge, Kart)
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
        label: t('varlik_adi', 'Varlık Adı'),
        type: 'text',
        iconName: 'FileText',
        placeholder: t('varlik_adi_girin', 'Varlık adı girin...')
      },
      {
        id: 'Kod',
        label: t('varlik_kodu', 'Varlık Kodu'),
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

  // Sütunlar: Varlık Modu (Belgeler, Kartlar, Listeler)
  const varlikColumns = useMemo<Column<AgentActiveMcpEntity>[]>(
    () => [
      {
        id: 'ad',
        accessor: 'ad',
        header: t('varlik_adi', 'Belge / Kart / Liste'),
        minWidth: '320px',
        sortable: true,
        render: (entity: AgentActiveMcpEntity) => (
          <div className="flex items-center gap-10 py-4">
            <div className={`flex items-center justify-center p-8 rounded-xl border ${
              entity.kategori === 'kart'
                ? 'bg-info-subtle border-info-border text-info'
                : entity.kategori === 'belge'
                  ? 'bg-primary-subtle border-primary-border text-primary'
                  : 'bg-surface-subtle border-border text-secondary'
            }`}>
              {entity.kategori === 'kart' && <CreditCard size={18} />}
              {entity.kategori === 'belge' && <FileText size={18} />}
              {entity.kategori === 'liste' && <Table size={18} />}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-8">
                <span className="font-bold text-primary text-14">{entity.ad}</span>
                <span className={`badge text-xs font-semibold px-6 py-1 rounded ${
                  entity.kategori === 'kart'
                    ? 'badge-info'
                    : entity.kategori === 'belge'
                      ? 'badge-primary'
                      : 'badge-neutral'
                }`}>
                  {entity.varlikTuruLabel}
                </span>
                <span className="text-12 text-secondary font-medium">
                  • {entity.modulAdi}
                </span>
              </div>
              {entity.aciklama && (
                <span className="text-12 text-secondary line-clamp-1">{entity.aciklama}</span>
              )}
            </div>
          </div>
        )
      },
      {
        id: 'kod',
        accessor: 'kod',
        header: t('varlik_kodu', 'Varlık Kodu'),
        width: '200px',
        sortable: true,
        render: (entity: AgentActiveMcpEntity) => (
          <span className="font-mono text-xs text-secondary bg-surface-subtle px-8 py-3 rounded border border-border font-medium">
            {entity.kod}
          </span>
        )
      },
      {
        id: 'kategori',
        accessor: 'kategori',
        header: t('varlik_turu', 'Varlık Türü'),
        width: '140px',
        sortable: true,
        render: (entity: AgentActiveMcpEntity) => (
          <span className="text-xs text-secondary font-medium">
            {entity.varlikTuruLabel}
          </span>
        )
      },
      {
        id: 'modulAdi',
        accessor: 'modulAdi',
        header: t('modul', 'Bağlı Modül'),
        width: '180px',
        sortable: true,
        render: (entity: AgentActiveMcpEntity) => (
          <span className="text-xs text-secondary font-medium">
            {entity.modulAdi}
          </span>
        )
      },
      {
        id: 'rota',
        accessor: 'rota',
        header: t('rota', 'Ekran Rotası'),
        minWidth: '180px',
        render: (entity: AgentActiveMcpEntity) =>
          entity.rota ? (
            <span className="font-mono text-xs text-secondary truncate max-w-240 block" title={entity.rota}>
              {entity.rota}
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

      if (mode === 'varlik') {
        let filtered = [...varlikList];
        if (q) {
          filtered = filtered.filter((item) => {
            const adMatch = (item.ad || '').toLocaleLowerCase('tr-TR').includes(q);
            const kodMatch = (item.kod || '').toLocaleLowerCase('tr-TR').includes(q);
            const descMatch = (item.aciklama || '').toLocaleLowerCase('tr-TR').includes(q);
            const rotaMatch = (item.rota || '').toLocaleLowerCase('tr-TR').includes(q);
            const modulMatch = (item.modulAdi || '').toLocaleLowerCase('tr-TR').includes(q);

            if (searchType === 'Ad') return adMatch;
            if (searchType === 'Kod') return kodMatch;
            if (searchType === 'Modul') return modulMatch;
            return adMatch || kodMatch || descMatch || rotaMatch || modulMatch;
          });
        }

        if (args?.sortField) {
          const field = args.sortField as keyof AgentActiveMcpEntity;
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
    [mode, varlikList, stageOneList, effectiveSearchText]
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
      ? t('mcp_varlik_secimi', 'MCP Belge, Kart & Liste Seçimi')
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
      defaultSortField="ad"
      defaultSortOrder="asc"
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
