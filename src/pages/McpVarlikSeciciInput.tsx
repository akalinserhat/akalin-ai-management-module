/**
 * @file McpVarlikSeciciInput.tsx
 * @description
 * @akalin/ai_management_module - MCP Form & Varlık Seçici Bileşeni (McpVarlikSeciciInput)
 *
 * Başlıca Sorumlulukları:
 * - @akalin/ui BaseSeciciInput mimarisine %100 uyumlu olmak (CariSeciciInput standardı)
 * - Tıklandığında veya menü tetiklendiğinde MCPSelectionList bileşenini modal içinde mode="varlik" ile açmak
 * - Modül fonksiyonlarını kesinlikle göstermemek, yalnızca Liste, Belge ve Kart varlıklarının seçimine olanak tanımak
 * - Seçili varlığa göre dinamik ikon (CreditCard, FileText, Table) ve formatlı etiket ([Belge] Satış Faturası — Fatura Modülü) sunmak
 * - Temizleme (Clear) ve doğrudan klavye etkileşimlerini yönetmek
 * - Sıfır inline CSS ve %100 i18n uyumlu çalışmak
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, FileText, Table, Boxes } from 'lucide-react';
import { BaseSeciciInput, type HarfDonusumu } from '@akalin/ui';
import { MCPSelectionList } from './MCPSelectionList';
import type { AgentActiveMcpEntity } from './AiMcpYonetimi';

export interface McpVarlikSeciciInputProps {
  id?: string;
  value?: any;
  selectedEntity?: AgentActiveMcpEntity | null;
  seciliAracKodlari?: string[];
  onlyActive?: boolean;
  categoryFilter?: 'all' | 'kart' | 'belge' | 'liste';
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  detailsUrl?: string | null;
  detailsUrlTitle?: string;
  alertTitle?: string;
  alertMessage?: string;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  icon?: React.ReactNode;
  menuIcon?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onMenuClick?: () => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: any, displayValue: string, entity: AgentActiveMcpEntity | null) => void;
  onSelect?: (entity: AgentActiveMcpEntity) => void;
  onClear?: () => void;
  hasSelection?: boolean;
  modalTitle?: string;
  modalSubtitle?: string;
  selectionListProps?: any;
  casing?: HarfDonusumu;
  harfDonusumu?: HarfDonusumu;
  harfFormati?: HarfDonusumu;
  textTransform?: HarfDonusumu;
  [key: string]: any;
}

export const McpVarlikSeciciInput: React.FC<McpVarlikSeciciInputProps> = ({
  id = 'mcpVarlikId',
  value,
  selectedEntity: propSelectedEntity,
  seciliAracKodlari,
  onlyActive,
  categoryFilter = 'all',
  placeholder,
  disabled = false,
  autoFocus = false,
  error = false,
  readOnly = false,
  clearable = true,
  detailsUrl = null,
  detailsUrlTitle,
  alertTitle,
  alertMessage,
  inputClassName = 'form-input',
  inputStyle,
  icon: propIcon,
  menuIcon,
  isOpen: propIsOpen,
  onClose: propOnClose,
  onOpen: propOnOpen,
  onMenuClick,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  onChange,
  onSelect,
  onClear,
  hasSelection: propHasSelection,
  modalTitle,
  modalSubtitle,
  selectionListProps,
  casing,
  harfDonusumu,
  harfFormati,
  textTransform,
  ...restProps
}) => {
  const { t } = useTranslation();

  const isControlled = propIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isSelectionOpen = isControlled ? Boolean(propIsOpen) : internalIsOpen;

  const [selectedItem, setSelectedItem] = useState<AgentActiveMcpEntity | null>(
    propSelectedEntity || null
  );

  useEffect(() => {
    if (propSelectedEntity !== undefined) {
      setSelectedItem(propSelectedEntity);
    }
  }, [propSelectedEntity]);

  const activeEntity = selectedItem || propSelectedEntity;

  const getCleanStringValue = useCallback((val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      const typeLabel = val.varlikTuruLabel || (val.kategori ? val.kategori.toUpperCase() : '');
      const prefix = typeLabel ? `[${typeLabel}] ` : '';
      const modulePart = val.modulAdi ? ` — ${val.modulAdi}` : '';
      const codePart = val.rota || val.kod ? ` (${val.rota || val.kod})` : '';
      return `${prefix}${val.ad || val.name || val.kod || ''}${modulePart}${codePart}`;
    }
    return String(val);
  }, []);

  const isControlledValue = value !== undefined;
  const [internalInputValue, setInternalInputValue] = useState<string>(() => {
    if (activeEntity) return getCleanStringValue(activeEntity);
    if (typeof value === 'string') return value;
    return '';
  });

  useEffect(() => {
    if (activeEntity) {
      setInternalInputValue(getCleanStringValue(activeEntity));
    } else if (!isControlledValue) {
      if (typeof value === 'string') {
        setInternalInputValue(value);
      } else if (value && typeof value === 'object') {
        setInternalInputValue(getCleanStringValue(value));
      } else if (value === null || value === undefined || value === '') {
        setSelectedItem(null);
        setInternalInputValue('');
      }
    }
  }, [activeEntity, value, isControlledValue, getCleanStringValue]);

  const displayValue = isControlledValue
    ? (activeEntity ? getCleanStringValue(activeEntity) : getCleanStringValue(value))
    : internalInputValue;

  const hasSelection = Boolean(
    propHasSelection !== undefined ? propHasSelection : (activeEntity !== null && Boolean(activeEntity))
  );

  const resolvedIcon = useMemo(() => {
    if (propIcon) return propIcon;
    if (activeEntity) {
      if (activeEntity.kategori === 'kart') return <CreditCard size={16} />;
      if (activeEntity.kategori === 'belge') return <FileText size={16} />;
      if (activeEntity.kategori === 'liste') return <Table size={16} />;
    }
    return <Boxes size={16} />;
  }, [propIcon, activeEntity]);

  const handleOpen = useCallback(() => {
    if (disabled || readOnly) return;
    setInternalIsOpen(true);
    if (propOnOpen) propOnOpen();
  }, [disabled, readOnly, propOnOpen]);

  const handleClose = useCallback(() => {
    setInternalIsOpen(false);
    if (propOnClose) propOnClose();
  }, [propOnClose]);

  const handleMenuClick = useCallback(() => {
    if (disabled) return;
    if (onMenuClick) {
      onMenuClick();
    } else {
      handleOpen();
    }
  }, [disabled, handleOpen, onMenuClick]);

  const handleEntitySelect = useCallback(
    (entity: AgentActiveMcpEntity) => {
      setSelectedItem(entity);
      const strVal = getCleanStringValue(entity);
      if (!isControlledValue) {
        setInternalInputValue(strVal);
      }
      if (onSelect) {
        onSelect(entity);
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: strVal, name: id },
          currentTarget: { value: strVal, name: id }
        };
        onChange(syntheticEvent as any, strVal, entity);
      }
      handleClose();
    },
    [getCleanStringValue, isControlledValue, onSelect, onChange, id, handleClose]
  );

  const handleClear = useCallback(() => {
    setSelectedItem(null);
    if (!isControlledValue) {
      setInternalInputValue('');
    }
    if (onClear) {
      onClear();
    }
    if (onChange) {
      const syntheticEvent = {
        target: { value: '', name: id },
        currentTarget: { value: '', name: id }
      };
      onChange(syntheticEvent as any, '', null);
    }
  }, [isControlledValue, onClear, onChange, id]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, rawValue?: any) => {
      const val = rawValue !== undefined ? rawValue : (e?.target?.value ?? '');
      if (!isControlledValue) {
        setInternalInputValue(val);
      }
      setSelectedItem(null);
      if (onChange) {
        onChange(e, val, null);
      }
    },
    [onChange, isControlledValue]
  );

  return (
    <>
      <BaseSeciciInput
        id={id}
        placeholder={placeholder || t('mcp_belge_kart_liste_secin', 'Açılacak Belge, Kart veya Listeyi seçin...')}
        detailsUrl={detailsUrl}
        detailsUrlTitle={detailsUrlTitle || t('varlik_detayini_ac', 'Seçili Varlığı Aç')}
        alertTitle={alertTitle}
        alertMessage={alertMessage || t('secili_mcp_varligi_temizlenecektir', 'Seçili form ve MCP varlığı kaldırılacaktır.')}
        icon={resolvedIcon}
        menuIcon={menuIcon}
        clearable={clearable}
        disabled={disabled}
        autoFocus={autoFocus}
        error={error}
        readOnly={readOnly}
        inputClassName={inputClassName}
        inputStyle={inputStyle}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        hasSelection={hasSelection}
        onClear={handleClear}
        onClick={onClick}
        onMenuClick={handleMenuClick}
        casing={casing}
        harfDonusumu={harfDonusumu}
        harfFormati={harfFormati}
        textTransform={textTransform}
        {...restProps}
      />

      {isSelectionOpen && (
        <MCPSelectionList
          isOpen={true}
          inModal={true}
          mode="varlik"
          seciliAracKodlari={seciliAracKodlari}
          onlyActive={onlyActive}
          categoryFilter={categoryFilter}
          title={modalTitle || t('mcp_varlik_secimi', 'MCP Belge, Kart & Liste Seçimi')}
          subtitle={
            modalSubtitle ||
            t(
              'mcp_varlik_secimi_alt_baslik',
              'Açılacak veya işlem yapılacak Belge, Kart veya Listeyi seçin.'
            )
          }
          initialSearchText={displayValue}
          onClose={handleClose}
          onSelect={handleEntitySelect}
          {...selectionListProps}
        />
      )}
    </>
  );
};

export default McpVarlikSeciciInput;
