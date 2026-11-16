/**
 * @akalin/ai_management_module - "Script İşlemi" Düğümü Ayar Sayfası (ScriptIslemFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Script İşlemi" (SCRIPT_ISLEM - JavaScript Veri Dönüştürücü & MCP Besleyici) düğümünün ayarlarını yönetmek
 * - Önceki "Hafıza" düğümünde depolanan dosyayı (örn: fiyat_farki_tablosu.csv) veya akış bağlamını okuyup JavaScript (Jint Engine) ile işleyerek MCP fonksiyonunu (örn: erp_create_document) besleyecek JSON veri yapısını üretmek
 * - Sabit Düğüm Başlığı ("Script İşlemi"), Zero Bottom Button, Zero Inline CSS, Sıfır Native HTML Input ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Code2,
  Cpu,
  Database,
  Info,
  Sparkles,
  CheckCircle2,
  Wand2,
  Layers,
  ShieldCheck,
  Copy,
  AlertTriangle,
  Play,
  Monitor,
  FileText,
  GitBranch,
  Bot
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BasitInput,
  BaseDropdownSecici,
  BaseSwitch,
  BaseButton,
  type DropdownOption
} from '@akalin/ui';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';
import {
  resolveAiAgentRouteContext,
  buildAiAgentSubTrail
} from '../utils/aiAgentBreadcrumb';

export interface ScriptIslemFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const DEFAULT_CSV_TO_MCP_SCRIPT = `// Girdi Bağlamı: input.content (Hafıza dosyası metni), input.fileName, input.memory
const rawText = String(input.content || '').trim();
const lines = rawText.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);

function parsePrice(val) {
  let s = String(val || '').replace(/\\s*(?:TL|₺|TRY).*$/i, '').trim();
  if (!s) return NaN;
  if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.indexOf(',') !== -1) {
    s = s.replace(',', '.');
  } else if (/^\\d{1,3}(\\.\\d{3})+$/.test(s)) {
    s = s.replace(/\\./g, '');
  }
  return parseFloat(s);
}

let baslangicTarihi = '';
let bitisTarihi = '';
let aciklama = input.documentTitle || 'PDF Kampanya Bildiriminden Otomatik Aktarıldı';
let kdvDahilMi = false;
let kdvOrani = 20;
const kalemler = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.startsWith('\`\`\`')) continue;
  if (line.startsWith('#META')) {
    const parts = line.split(';');
    for (let p = 1; p < parts.length; p++) {
      const idx = parts[p].indexOf('=');
      if (idx > 0) {
        const k = parts[p].substring(0, idx).trim();
        const v = parts[p].substring(idx + 1).trim();
        if (k === 'BaslangicTarihi' && v) baslangicTarihi = v;
        if (k === 'BitisTarihi' && v) bitisTarihi = v;
        if (k === 'Aciklama' && v) aciklama = v;
        if (k === 'KdvDahilMi') kdvDahilMi = (v.toLowerCase() === 'true');
        if (k === 'KdvOrani' && !isNaN(parseFloat(v))) kdvOrani = parseFloat(v);
      }
    }
    continue;
  }

  line = line.replace(/^(?:#?\\d+[\\.\\)\\:\\-\\s]+|\\-\\s+|\\*\\s+)/, '').trim();
  if (!line || line.startsWith('#') || line.startsWith('-')) continue;

  let cols = [];
  if (line.indexOf(';') !== -1) {
    cols = line.split(';').map(c => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
  } else if (line.indexOf('|') !== -1) {
    cols = line.split('|').map(c => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
  } else if (line.indexOf('\\t') !== -1) {
    cols = line.split('\\t').map(c => c.trim().replace(/^"|"$/g, '')).filter(Boolean);
  } else {
    const m = line.match(/([A-Z0-9\\-\\/]{4,})\\s*[,:\\s]\\s*([\\d\\.,]+(?:\\s*(?:TL|₺|TRY))?)\\s*$/i);
    if (m) {
      cols = [m[1].trim(), m[2].trim()];
    }
  }

  if (cols.length >= 2) {
    if (cols.length >= 6 && /^\\d{4}-\\d{2}-\\d{2}$/.test(cols[0]) && /^\\d{4}-\\d{2}-\\d{2}$/.test(cols[1])) {
      if (!baslangicTarihi) baslangicTarihi = cols[0];
      if (!bitisTarihi) bitisTarihi = cols[1];
    }

    const urunKodu = cols[cols.length - 2].replace(/\\s+/g, '');
    const fiyatCol = cols[cols.length - 1];
    if (/^(UrunKodu|ÜrünKodu|BaslangicTarihi|TabloAdi|Model|ModelKodu|Kod)$/i.test(urunKodu)) continue;

    const fiyat = parsePrice(fiyatCol);
    if (urunKodu && urunKodu.length >= 3 && !isNaN(fiyat) && fiyat > 0) {
      kalemler.push({
        tedarikciUrunKodu: urunKodu,
        fiyat: fiyat,
        kdvOrani: kdvOrani,
        kdvDahilMi: kdvDahilMi
      });
    }
  }
}

return JSON.stringify({
  documentType: input.varlikKodu || 'BshFiyatFarki',
  varlikKodu: input.varlikKodu || 'BshFiyatFarki',
  isDraft: true,
  baslangicTarihi: baslangicTarihi,
  bitisTarihi: bitisTarihi,
  aciklama: aciklama,
  kdvOrani: kdvOrani,
  kdvDahilMi: kdvDahilMi,
  baslikVerisi: {
    BaslangicTarihi: baslangicTarihi,
    BitisTarihi: bitisTarihi,
    Aciklama: aciklama
  },
  kalemler: kalemler
});`;

export const ScriptIslemFlowchartOgeAyarPage: React.FC<ScriptIslemFlowchartOgeAyarPageProps> = ({
  agentId: propAgentId,
  istekId: propIstekId,
  nodeId: propNodeId,
  initialNodeData,
  onSuccess,
  backRoute
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id?: string; istekId?: string; ogeId?: string }>();

  const pathAgentIdMatch = location.pathname.match(/(?:AiAjanlar|ai-ajanlar|agents)\/(\d+)/i);
  const pathIstekIdMatch = location.pathname.match(/hizli-istek\/([^/?#]+)/i);
  const pathOgeIdMatch = location.pathname.match(/adim\/([^/?#]+)/i);
  const effectiveAgentId = propAgentId || params.id || (pathAgentIdMatch ? pathAgentIdMatch[1] : undefined);
  const effectiveIstekId = propIstekId || params.istekId || (pathIstekIdMatch ? pathIstekIdMatch[1] : undefined);
  const effectiveOgeId = propNodeId || params.ogeId || (pathOgeIdMatch ? pathOgeIdMatch[1] : undefined);

  const incomingAgentData = location.state?.agentData;
  const incomingIstekData = location.state?.istekData;
  const incomingNodeFromState = location.state?.nodeData || initialNodeData;

  const [agentData, setAgentData] = useState<any>(incomingAgentData || null);
  const [istekData, setIstekData] = useState<any>(incomingIstekData || null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const defaultNodeTitle = t('script_islem', 'Script İşlemi');

  const renderWorkflowNodeSmallIcon = (tip?: string) => {
    const upper = (tip || '').toUpperCase();
    if (upper === 'BASLA') return <Play size={14} />;
    if (upper === 'FORM_AC' || upper === 'EKRAN_AC') return <Monitor size={14} />;
    if (upper === 'HAFIZA') return <Database size={14} />;
    if (upper === 'SCRIPT_ISLEM') return <Code2 size={14} />;
    if (upper === 'BELGE_OLUSTUR') return <FileText size={14} />;
    if (upper === 'KARAR_ONAY') return <GitBranch size={14} />;
    if (upper === 'AI_ISLEM') return <Bot size={14} />;
    return <Cpu size={14} />;
  };

  const [formData, setFormData] = useState<any>(() => {
    const baseNode = incomingNodeFromState || {};
    return {
      id: baseNode.id || effectiveOgeId || `SCRIPT_ISLEM_${Date.now()}`,
      tip: 'SCRIPT_ISLEM',
      baslik: defaultNodeTitle,
      aktifMi: baseNode.aktifMi !== false,
      kaynakDosyaAdi: baseNode.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv',
      aracKodu: baseNode.aracKodu || 'SADECE_JSON_URET',
      varlikKodu: baseNode.varlikKodu || 'BshFiyatFarki',
      scriptKodu: baseNode.scriptKodu || baseNode.prompt || DEFAULT_CSV_TO_MCP_SCRIPT,
      prompt: baseNode.prompt || '',
      uiAksiyonu: 'YOK',
      hedefRota: '',
      oncekiDugumGirdisi: baseNode.oncekiDugumGirdisi || {
        aktifMi: true,
        kaynakDugumId: 'OTOMATIK_ONCEKI',
        belgeleriAktar: true,
        formVerileriniAktar: true,
        aiCiktisiniAktar: true,
        seciliDegiskenler: []
      },
      kayitBekle: baseNode.kayitBekle === true,
      kayitSonrasiTeyitEt: false,
      scriptKaynagi: baseNode.scriptKaynagi || 'STATIK_KOD',
      kaynakAiDugumId: baseNode.kaynakAiDugumId || 'OTOMATIK_ONCEKI',
      tumDugumlereIzinVer: baseNode.tumDugumlereIzinVer !== false,
      kisitlananDugumIdleri: Array.isArray(baseNode.kisitlananDugumIdleri) ? baseNode.kisitlananDugumIdleri : []
    };
  });

  useEffect(() => {
    if (!agentData && effectiveAgentId) {
      axios.get(`/api/AiAjanlar/${effectiveAgentId}`)
        .then((res) => {
          if (res.data) {
            setAgentData(res.data);
            if (effectiveIstekId && Array.isArray(res.data.hizliIstekler)) {
              const foundIstek = res.data.hizliIstekler.find((x: any) => x.id === effectiveIstekId);
              if (foundIstek) {
                setIstekData(foundIstek);
                if (!incomingNodeFromState && effectiveOgeId && Array.isArray(foundIstek.akisDugumleri)) {
                  const foundNode = foundIstek.akisDugumleri.find((n: any) => n.id === effectiveOgeId);
                  if (foundNode) {
                    setFormData({
                      id: foundNode.id,
                      tip: 'SCRIPT_ISLEM',
                      baslik: defaultNodeTitle,
                      aktifMi: foundNode.aktifMi !== false,
                      kaynakDosyaAdi: foundNode.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv',
                      aracKodu: foundNode.aracKodu || 'SADECE_JSON_URET',
                      varlikKodu: foundNode.varlikKodu || 'BshFiyatFarki',
                      scriptKodu: foundNode.scriptKodu || foundNode.prompt || DEFAULT_CSV_TO_MCP_SCRIPT,
                      prompt: foundNode.prompt || '',
                      uiAksiyonu: 'YOK',
                      hedefRota: '',
                      oncekiDugumGirdisi: foundNode.oncekiDugumGirdisi || {
                        aktifMi: true,
                        kaynakDugumId: 'OTOMATIK_ONCEKI',
                        belgeleriAktar: true,
                        formVerileriniAktar: true,
                        aiCiktisiniAktar: true,
                        seciliDegiskenler: []
                      },
                      kayitBekle: foundNode.kayitBekle === true,
                      kayitSonrasiTeyitEt: false,
                      scriptKaynagi: foundNode.scriptKaynagi || 'STATIK_KOD',
                      kaynakAiDugumId: foundNode.kaynakAiDugumId || 'OTOMATIK_ONCEKI',
                      tumDugumlereIzinVer: foundNode.tumDugumlereIzinVer !== false,
                      kisitlananDugumIdleri: Array.isArray(foundNode.kisitlananDugumIdleri) ? foundNode.kisitlananDugumIdleri : []
                    });
                  }
                }
              }
            }
          }
        })
        .catch(() => { });
    }
  }, [agentData, effectiveAgentId, effectiveIstekId, effectiveOgeId, incomingNodeFromState, defaultNodeTitle]);

  const { baseAgentRoute } = resolveAiAgentRouteContext(location.pathname);

  const effectiveBackRoute = useMemo(() => {
    if (backRoute) return backRoute;
    if (effectiveAgentId && effectiveIstekId) {
      return `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;
    }
    return -1 as any;
  }, [backRoute, effectiveAgentId, effectiveIstekId, baseAgentRoute]);

  const entityCodeOptions = useMemo<DropdownOption[]>(() => [
    { id: 'BshFiyatFarki', value: 'BshFiyatFarki', label: t('varlik_bsh_fiyat_farki', 'BshFiyatFarki — BSH Fiyat Farkı Şeması') },
    { id: 'KampanyaBelgesi', value: 'KampanyaBelgesi', label: t('varlik_kampanya_belgesi', 'KampanyaBelgesi — Kampanya Belgesi Şeması') },
    { id: 'FiyatListesi', value: 'FiyatListesi', label: t('varlik_fiyat_listesi', 'FiyatListesi — Fiyat Listesi Şeması') },
    { id: 'SatisFaturasi', value: 'SatisFaturasi', label: t('varlik_satis_faturasi', 'SatisFaturasi — Satış Faturası Şeması') },
    { id: 'AlisFaturasi', value: 'AlisFaturasi', label: t('varlik_alis_faturasi', 'AlisFaturasi — Alış Faturası Şeması') }
  ], [t]);

  const isDynamicCode = formData.scriptKaynagi === 'AI_ISLEMDEN_DINAMIK';

  const scriptKaynagiOptions = useMemo<DropdownOption[]>(() => [
    {
      id: 'STATIK_KOD',
      value: 'STATIK_KOD',
      label: t('script_kaynagi_statik', 'Statik Kod (Manuel Yazılan Script)')
    },
    {
      id: 'AI_ISLEMDEN_DINAMIK',
      value: 'AI_ISLEMDEN_DINAMIK',
      label: t('script_kaynagi_ai_dinamik', 'Dinamik Kod (AI İşlem Düğümünden Al)')
    }
  ], [t]);

  const allWorkflowNodes: any[] = useMemo(() => {
    const currentIstek = istekData || incomingIstekData;
    return Array.isArray(currentIstek?.akisDugumleri) ? currentIstek.akisDugumleri : [];
  }, [istekData, incomingIstekData]);

  const otherWorkflowNodes = useMemo(() => {
    return allWorkflowNodes.filter((n: any) => n.id !== formData.id);
  }, [allWorkflowNodes, formData.id]);

  const aiNodesInWorkflow = useMemo(() => {
    return otherWorkflowNodes.filter((n: any) => (n.tip || '').toUpperCase() === 'AI_ISLEM');
  }, [otherWorkflowNodes]);

  const kaynakAiOptions = useMemo<DropdownOption[]>(() => {
    const list: DropdownOption[] = [
      {
        id: 'OTOMATIK_ONCEKI',
        value: 'OTOMATIK_ONCEKI',
        label: t('script_kaynak_ai_otomatik', 'Otomatik (En Yakın Önceki AI İşlemi Düğümü)')
      }
    ];
    aiNodesInWorkflow.forEach((node: any) => {
      list.push({
        id: node.id,
        value: node.id,
        label: `${node.baslik || t('ai_islem', 'AI İşlemi')} (${node.id})`
      });
    });
    return list;
  }, [aiNodesInWorkflow, t]);

  const handleToggleNodeRestriction = (nodeId: string, isAllowed: boolean) => {
    setFormData((prev: any) => {
      const currentList: string[] = Array.isArray(prev.kisitlananDugumIdleri)
        ? [...prev.kisitlananDugumIdleri]
        : [];
      if (!isAllowed) {
        if (!currentList.includes(nodeId)) {
          currentList.push(nodeId);
        }
      } else {
        const idx = currentList.indexOf(nodeId);
        if (idx !== -1) {
          currentList.splice(idx, 1);
        }
      }
      return {
        ...prev,
        kisitlananDugumIdleri: currentList
      };
    });
  };

  const handleCopySnippet = (nodeId: string) => {
    const snippet = `const veri = getNode("${nodeId}", null);`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet);
      toast.success(
        t('kod_parcacigi_kopyalandi', 'Snippet panoya kopyalandı: {{snippet}}', { snippet })
      );
    }
  };

  // Akıştaki HAFIZA düğümlerinden gelen dosya adlarını otomatik öner
  const memoryFileSuggestions = useMemo(() => {
    const files: string[] = [];
    allWorkflowNodes.forEach((n: any) => {
      if ((n.tip || '').toUpperCase() === 'HAFIZA') {
        const name = (n.dosyaAdi || 'fiyat_farki_tablosu').replace(/\.(csv|json|txt|md|xml)$/i, '').trim() || 'fiyat_farki_tablosu';
        const ext = (n.dosyaUzantisi || 'csv').replace(/^\./, '').toLowerCase().trim() || 'csv';
        files.push(`${name}.${ext}`);
      }
    });
    return files;
  }, [allWorkflowNodes]);

  const buildUpdatedNodePayload = (overrideData?: any) => {
    const merged = {
      ...formData,
      ...(overrideData || {})
    };
    return {
      ...merged,
      id: merged.id || effectiveOgeId || `SCRIPT_ISLEM_${Date.now()}`,
      tip: 'SCRIPT_ISLEM',
      baslik: defaultNodeTitle,
      aktifMi: merged.aktifMi !== false,
      kaynakDosyaAdi: (merged.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv').trim(),
      aracKodu: merged.aracKodu || 'SADECE_JSON_URET',
      varlikKodu: merged.varlikKodu || 'BshFiyatFarki',
      scriptKodu: merged.scriptKodu || DEFAULT_CSV_TO_MCP_SCRIPT,
      uiAksiyonu: 'YOK',
      kayitBekle: Boolean(merged.kayitBekle),
      kayitSonrasiTeyitEt: false,
      scriptKaynagi: merged.scriptKaynagi || 'STATIK_KOD',
      kaynakAiDugumId: merged.kaynakAiDugumId || 'OTOMATIK_ONCEKI',
      tumDugumlereIzinVer: merged.tumDugumlereIzinVer !== false,
      kisitlananDugumIdleri: Array.isArray(merged.kisitlananDugumIdleri) ? merged.kisitlananDugumIdleri : []
    };
  };

  const handleBackOrClose = () => {
    if (typeof effectiveBackRoute === 'string') {
      const currentIstek = istekData || incomingIstekData;
      const existingNodes = Array.isArray(currentIstek?.akisDugumleri)
        ? [...currentIstek.akisDugumleri]
        : [];
      const activeNode = buildUpdatedNodePayload();
      const nodeIdx = existingNodes.findIndex((x: any) => x.id === activeNode.id);

      if (nodeIdx !== -1) {
        existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...activeNode };
      } else {
        existingNodes.push(activeNode);
      }

      navigate(effectiveBackRoute, {
        state: {
          agentData: agentData || incomingAgentData,
          hizliIstekItem: currentIstek
            ? {
              ...currentIstek,
              akisDugumleri: existingNodes
            }
            : undefined
        }
      });
    } else {
      navigate(-1);
    }
  };

  const handleSave = async (overrideNodeData?: any) => {
    const activeNode = buildUpdatedNodePayload(overrideNodeData);

    const currentAgent = agentData || incomingAgentData;
    const currentIstek = istekData || incomingIstekData;

    if (effectiveAgentId && currentAgent && currentIstek) {
      setIsSaving(true);
      try {
        const existingNodes = Array.isArray(currentIstek.akisDugumleri)
          ? [...currentIstek.akisDugumleri]
          : [];
        const nodeIdx = existingNodes.findIndex((x: any) => x.id === activeNode.id);

        if (nodeIdx !== -1) {
          existingNodes[nodeIdx] = { ...existingNodes[nodeIdx], ...activeNode };
        } else {
          existingNodes.push(activeNode);
        }

        const updatedIstek = {
          ...currentIstek,
          akisDugumleri: existingNodes
        };

        const allIstekler = Array.isArray(currentAgent.hizliIstekler)
          ? currentAgent.hizliIstekler.map((item: any) =>
            item.id === updatedIstek.id ? updatedIstek : item
          )
          : [updatedIstek];

        const payload = {
          ...currentAgent,
          hizliIstekler: allIstekler
        };

        await axios.put(`/api/AiAjanlar/${effectiveAgentId}`, payload);
        toast.success(t('script_dugumu_kaydedildi', 'Script İşlemi düğümü ayarları başarıyla kaydedildi.'));

        if (onSuccess) onSuccess();
        if (typeof effectiveBackRoute === 'string') {
          navigate(effectiveBackRoute, {
            state: {
              agentData: payload,
              hizliIstekItem: updatedIstek
            }
          });
        } else {
          navigate(-1);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || t('kayit_hatasi', 'Kaydetme işlemi sırasında bir hata oluştu.');
        toast.error(msg);
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.success(t('script_dugumu_guncellendi', 'Script İşlemi düğümü güncellendi.'));
      handleBackOrClose();
    }
  };

  const handleBackOrCloseRef = useRef<() => void>(() => {});
  handleBackOrCloseRef.current = handleBackOrClose;

  const subTrail = useMemo(
    () =>
      buildAiAgentSubTrail({
        pathname: location.pathname,
        t,
        navigate,
        agentId: effectiveAgentId,
        agentTitle: agentData?.ad || incomingAgentData?.ad,
        istekId: effectiveIstekId,
        istekTitle: istekData?.baslik || incomingIstekData?.baslik,
        agentData: agentData || incomingAgentData,
        istekData: istekData || incomingIstekData,
        onIstekClick: () => handleBackOrCloseRef.current(),
        activeLabel: defaultNodeTitle
      }),
    [
      location.pathname,
      t,
      navigate,
      effectiveAgentId,
      effectiveIstekId,
      agentData,
      incomingAgentData,
      istekData,
      incomingIstekData,
      defaultNodeTitle
    ]
  );

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="scriptIslemFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="SCRIPT_ISLEM"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('script_islem_oge_ayarlari', 'Script İşlemi Düğümü Ayarları')}
      pageTitle={t('script_islem_oge_ayarlari', 'Script İşlemi Düğümü Ayarları')}
      recordTitle={defaultNodeTitle}
      subTrail={subTrail}
      icon={<Code2 size={24} color="var(--accent-primary)" />}
      subtitleLeft={t(
        'script_islem_oge_aciklama',
        'Hafıza düğümünde depolanan tablo veya metin verisini JavaScript ile dönüştürerek sağ çıkış portundan yapısal JSON veri yapısı üretme yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. BÖLÜM: SCRIPT KAYNAĞI VE HEDEF JSON ŞEMA TÜRÜ */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <Database size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('script_veri_donusturucu_baslik', 'JavaScript Veri Dönüştürücü & Çıktı Şema Hedefi')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'script_veri_donusturucu_aciklama',
                    'Tek Sorumluluk İlkesi: Script İşlemi düğümü veriyi JavaScript (Jint Sandbox) ile dönüştürerek sağ çıkış portuna yapısal JSON olarak aktarır.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="script-node-kaynak-turu">
                  {t('script_kaynak_turu_etiket', 'Script Kod Kaynağı')}
                </label>
                <BaseDropdownSecici
                  id="script-node-kaynak-turu"
                  value={formData.scriptKaynagi || 'STATIK_KOD'}
                  options={scriptKaynagiOptions}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      scriptKaynagi: String(val || 'STATIK_KOD')
                    }))
                  }
                  clearable={false}
                />
              </div>

              {isDynamicCode ? (
                <div className="form-group">
                  <label className="basla-ayar-field-label" htmlFor="script-node-kaynak-ai-dugum">
                    {t('script_kaynak_ai_dugum_etiket', 'Kodu Yazacak AI İşlem Düğümü')}
                  </label>
                  <BaseDropdownSecici
                    id="script-node-kaynak-ai-dugum"
                    value={formData.kaynakAiDugumId || 'OTOMATIK_ONCEKI'}
                    options={kaynakAiOptions}
                    onChange={(val: string | number | (string | number)[]) =>
                      setFormData((prev: any) => ({
                        ...prev,
                        kaynakAiDugumId: String(val || 'OTOMATIK_ONCEKI')
                      }))
                    }
                    clearable={false}
                  />
                </div>
              ) : null}

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="script-node-kaynak-dosya">
                  {t('script_kaynak_dosya_adi', 'Okunacak Hafıza Dosyası (Dosya Adı + Uzantısı)')}
                </label>
                <BasitInput
                  id="script-node-kaynak-dosya"
                  value={formData.kaynakDosyaAdi || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      kaynakDosyaAdi: e.target.value
                    }))
                  }
                  placeholder={
                    memoryFileSuggestions[0] ||
                    t('script_kaynak_dosya_placeholder', 'Örn: fiyat_farki_tablosu.csv')
                  }
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="script-node-varlik-kodu">
                  {t('script_uretilecek_json_sema_hedefi', 'Üretilecek JSON Şema Hedefi (input.varlikKodu)')}
                </label>
                <BaseDropdownSecici
                  id="script-node-varlik-kodu"
                  value={formData.varlikKodu || 'BshFiyatFarki'}
                  options={entityCodeOptions}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      varlikKodu: String(val || 'BshFiyatFarki')
                    }))
                  }
                  clearable={false}
                />
              </div>
            </div>

            {isDynamicCode && (
              <div className="basla-ayar-card-footer">
                <span className="basla-ayar-footer-hint text-primary">
                  <Sparkles size={14} />
                  <span>
                    {t(
                      'script_dinamik_kod_bilgi',
                      'Dinamik Kod Modu: LLM tarafından üretilen JavaScript kodu çalışma zamanında otomatik olarak ayıklanacak ve izole Jint Sandbox ortamında çalıştırılacaktır.'
                    )}
                  </span>
                </span>
              </div>
            )}

            {isDynamicCode && aiNodesInWorkflow.length === 0 && (
              <div className="basla-ayar-card-footer">
                <span className="basla-ayar-footer-hint text-warning">
                  <AlertTriangle size={14} />
                  <span>
                    {t(
                      'script_akista_ai_dugum_yok_uyari',
                      'Dikkat: Akışta henüz tanımlı bir AI İşlemi düğümü bulunmuyor. Dinamik kod üretimi için akışa bir AI İşlemi düğümü ekleyin.'
                    )}
                  </span>
                </span>
              </div>
            )}

            {memoryFileSuggestions.length > 0 && (
              <div className="basla-ayar-card-footer">
                <span className="basla-ayar-footer-hint">
                  <CheckCircle2 size={14} />
                  <span>
                    {t('script_mevcut_hafiza_dosyalari', 'Akıştaki Hafıza Dosyaları')}:{' '}
                    <strong>{memoryFileSuggestions.join(', ')}</strong>
                  </span>
                </span>
              </div>
            )}
          </div>
        </section>

        {/* 2. BÖLÜM: ÇALIŞTIRILACAK JAVASCRIPT KODU (JINT ENGINE) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <Code2 size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {isDynamicCode
                    ? t('script_dinamik_kod_baslik', 'Dinamik AI Kodu & Fallback Script (Jint Sandbox)')
                    : t('script_js_kodu_etiket', 'Çalıştırılacak JavaScript Kodu (Jint Sandbox)')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {isDynamicCode
                    ? t(
                        'script_dinamik_kod_ipucu',
                        'Kod akış anında seçilen AI İşlemi tarafından yazılacaktır. LLM çıktısı içindeki JavaScript kodu otomatik ayıklanır. İsteğe bağlı olarak aşağıda acil durum fallback scripti tanımlayabilirsiniz.'
                      )
                    : t(
                        'script_js_kodu_ipucu',
                        'Script içerisinde "input.content" (Hafıza dosyası içeriği), "input.fileName", "input.varlikKodu", "input.memory" ve diğer düğümlerden veri almak için "getNode(nodeId, defaultVal)" fonksiyonuna erişebilirsiniz.'
                      )}
                </p>
              </div>
            </div>
            {!isDynamicCode && (
              <div className="basla-ayar-card-header-right">
                <BaseButton
                  variant="tonal"
                  icon={<Wand2 size={14} />}
                  onClick={() => {
                    setFormData((prev: any) => ({
                      ...prev,
                      scriptKodu: DEFAULT_CSV_TO_MCP_SCRIPT
                    }));
                    toast.success(
                      t('script_sablon_yuklendi', 'Varsayılan CSV → Yapısal JSON dönüştürücü script şablonu yüklendi.')
                    );
                  }}
                >
                  {t('script_varsayilan_sablonu_yukle', 'CSV → JSON Şablonunu Yükle')}
                </BaseButton>
              </div>
            )}
          </div>

          <div className="basla-ayar-card-body">
            <FlowchartPromptMentionInput
              autoFocus
              rows={isDynamicCode ? 8 : 16}
              value={formData.scriptKodu || ''}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  scriptKodu: e.target.value
                }))
              }
              placeholder={
                isDynamicCode
                  ? t(
                      'script_dinamik_fallback_placeholder',
                      '// Opsiyonel Fallback: AI İşlemi kod üretemezse veya hata oluşursa çalıştırılacak yedek JavaScript kodu...'
                    )
                  : t(
                      'script_js_kodu_placeholder',
                      '// input.content veya getNode(...) ile veriyi alıp işleyin ve JSON.stringify(...) döndürün...'
                    )
              }
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'script_girdi_nesnesi_aciklama',
                    'Kullanılabilir: getNode(nodeId, defaultValue) • isNodeExecuted(nodeId) • getNodeStatus(nodeId) • input.content • input.memory • input.document'
                  )}
                </span>
              </span>
              <span className="basla-ayar-char-count">
                <Sparkles size={12} /> JSON → {formData.varlikKodu || 'BshFiyatFarki'}
              </span>
            </div>
          </div>
        </section>

        {/* 3. BÖLÜM: DÜĞÜM VERİ HAVUZU & GÜVENLİK KISITLAMALARI (CROSS-NODE DATA POOL) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box purple">
                <Layers size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('script_veri_havuzu_baslik', 'Düğüm Veri Havuzu & Güvenlik Kısıtlamaları')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'script_veri_havuzu_aciklama',
                    'Akıştaki tüm düğümlerin çalışma çıktıları merkezi havuzda toplanır. Script içerisinden getNode("DÜĞÜM_ID", defaultValue) ile verilere güvenle erişilebilir. İstenirse hassas düğümlere erişim sınırlandırılabilir.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid mb-16">
              <div
                className={`form-ac-wizard-option-box ${formData.tumDugumlereIzinVer !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <ShieldCheck size={16} />
                    <span>
                      {t('script_tum_dugumlere_izin_ver_baslik', 'Tüm Akış Düğümlerine Erişim İzni (Havuz Açık)')}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'script_tum_dugumlere_izin_ver_aciklama',
                      'Aktif olduğunda script, aşağıdaki kara listede yer almayan tüm düğümlerin verisine getNode(...) ile erişebilir.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="scriptTumDugumlereIzinVerSwitch"
                  checked={formData.tumDugumlereIzinVer !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({
                      ...prev,
                      tumDugumlereIzinVer: Boolean(checked)
                    }));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {formData.tumDugumlereIzinVer !== false
                        ? t('aktif', 'Aktif')
                        : t('kisitli', 'Kısıtlı')}
                    </span>
                  }
                />
              </div>
            </div>

            <div className="ai-islem-attached-tools-list">
              {otherWorkflowNodes.length === 0 ? (
                <div className="ai-islem-attached-tools-empty">
                  <Info size={18} className="ai-islem-attached-tools-empty-icon" />
                  <div className="ai-islem-attached-tools-empty-texts">
                    <span className="ai-islem-attached-tools-empty-title">
                      {t('akista_baska_dugum_yok', 'Bu akışta henüz başka bir düğüm tanımlanmamış.')}
                    </span>
                    <span className="ai-islem-attached-tools-empty-desc">
                      {t(
                        'akista_baska_dugum_yok_desc',
                        'Akışa ekleyeceğiniz form, AI işlemi veya hafıza düğümleri burada listelenecek ve getNode() ile erişilebilecektir.'
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                otherWorkflowNodes.map((n: any) => {
                  const isBlocked =
                    formData.tumDugumlereIzinVer === false ||
                    (Array.isArray(formData.kisitlananDugumIdleri) &&
                      formData.kisitlananDugumIdleri.includes(n.id));
                  const isAllowed = !isBlocked;

                  return (
                    <div
                      key={n.id}
                      className={`ai-islem-attached-tool-row ${isAllowed ? 'is-active' : 'is-disabled'}`}
                    >
                      <div className="ai-islem-attached-tool-main">
                        <div className="ai-islem-attached-tool-icon">
                          {renderWorkflowNodeSmallIcon(n.tip)}
                        </div>
                        <div className="ai-islem-attached-tool-info">
                          <div className="ai-islem-attached-tool-title-row">
                            <span className="ai-islem-attached-tool-title">
                              {n.baslik || n.tip}
                            </span>
                            <span className="ai-ajan-identity-badge">{n.tip}</span>
                            <span className="rag-arac-summary-pill">{n.id}</span>
                          </div>
                          <p className="ai-islem-attached-tool-desc">
                            <code>{`getNode("${n.id}", null)`}</code>
                          </p>
                        </div>
                      </div>

                      <div className="ai-islem-attached-tool-controls">
                        <BaseSwitch
                          id={`nodeAccessSwitch_${n.id}`}
                          disabled={formData.tumDugumlereIzinVer === false}
                          checked={isAllowed}
                          onChange={(e: any) => {
                            const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                            handleToggleNodeRestriction(n.id, Boolean(checked));
                          }}
                          label={
                            <span className="text-xs font-semibold">
                              {isAllowed ? t('erisim_acik', 'İzinli') : t('engellendi', 'Engellendi')}
                            </span>
                          }
                        />
                        <BaseButton
                          variant="outline"
                          className="btn-sm"
                          icon={<Copy size={13} />}
                          onClick={() => handleCopySnippet(n.id)}
                          text={t('kodu_kopyala', 'getNode() Kopyala')}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <CheckCircle2 size={13} />
                <span>
                  {t(
                    'script_calismayan_dal_ipucu',
                    'Güvenli Yürütme: Karar veya IF düğümlerinden sonra atlanan/çalışmayan dallar için getNode(nodeId, defaultValue) çağrısı hata vermez, güvenle tanımladığınız varsayılan değeri (null vb.) döndürür.'
                  )}
                </span>
              </span>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default ScriptIslemFlowchartOgeAyarPage;
