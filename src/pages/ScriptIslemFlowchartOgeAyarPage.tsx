/**
 * @akalin/ai_management_module - "Script İşlemi" Düğümü Ayar Sayfası (ScriptIslemFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Script İşlemi" (SCRIPT_ISLEM - JavaScript Veri Dönüştürücü & MCP Besleyici) düğümünün ayarlarını yönetmek
 * - Önceki "Hafıza" düğümünde depolanan dosyayı (örn: fiyat_farki_tablosu.csv) veya akış bağlamını okuyup JavaScript (Jint Engine) ile işleyerek MCP fonksiyonunu (örn: erp_create_document) besleyecek JSON veri yapısını üretmek
 * - Sabit Düğüm Başlığı ("Script İşlemi"), Zero Bottom Button, Zero Inline CSS, Sıfır Native HTML Input ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Code2,
  Cpu,
  Database,
  Info,
  Sparkles,
  CheckCircle2,
  Wand2
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

export interface ScriptIslemFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const DEFAULT_CSV_TO_MCP_SCRIPT = `// Girdi Bağlamı: input.content (Hafıza dosyası metni), input.fileName, input.memory
const rawText = String(input.content || '').trim();
const lines = rawText.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);

let baslangicTarihi = '';
let bitisTarihi = '';
let aciklama = 'PDF Kampanya Bildiriminden Otomatik Aktarıldı';
const kalemler = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('#META')) {
    const parts = line.split(';');
    for (let p = 1; p < parts.length; p++) {
      const kv = parts[p].split('=');
      if (kv.length === 2) {
        const k = kv[0].trim();
        const v = kv[1].trim();
        if (k === 'BaslangicTarihi') baslangicTarihi = v;
        if (k === 'BitisTarihi') bitisTarihi = v;
        if (k === 'Aciklama') aciklama = v;
      }
    }
    continue;
  }

  // Başlık satırını veya markdown ayraçlarını atla
  if (/^(UrunKodu|ÜrünKodu|Kod|#|-)/i.test(line)) continue;

  const cols = line.split(';');
  if (cols.length >= 2) {
    const urunKodu = cols[0].trim();
    const rawFiyat = cols[1].trim().replace(/\\./g, '').replace(',', '.');
    const fiyat = parseFloat(rawFiyat);
    if (urunKodu && !isNaN(fiyat) && fiyat > 0) {
      kalemler.push({
        UrunKodu: urunKodu,
        Fiyat: fiyat
      });
    }
  }
}

return JSON.stringify({
  varlikKodu: input.varlikKodu || 'BshFiyatFarki',
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

  const [formData, setFormData] = useState<any>(() => {
    const baseNode = incomingNodeFromState || {};
    return {
      id: baseNode.id || effectiveOgeId || `SCRIPT_ISLEM_${Date.now()}`,
      tip: 'SCRIPT_ISLEM',
      baslik: defaultNodeTitle,
      kaynakDosyaAdi: baseNode.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv',
      aracKodu: baseNode.aracKodu || 'erp_create_document',
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
      kayitBekle: baseNode.kayitBekle !== false,
      kayitSonrasiTeyitEt: baseNode.kayitSonrasiTeyitEt !== false
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
                      kaynakDosyaAdi: foundNode.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv',
                      aracKodu: foundNode.aracKodu || 'erp_create_document',
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
                      kayitBekle: foundNode.kayitBekle !== false,
                      kayitSonrasiTeyitEt: foundNode.kayitSonrasiTeyitEt !== false
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

  const isUnderAyarlar = location.pathname.startsWith('/ayarlar');
  const isUnderSettingsAiAgents = location.pathname.startsWith('/settings/ai/agents');
  const isUnderSettingsAiAjanlar = location.pathname.startsWith('/settings/ai/AiAjanlar');
  const isUnderSettingsAgents = location.pathname.startsWith('/settings/agents');
  const baseAgentRoute = isUnderSettingsAiAgents
    ? '/settings/ai/agents'
    : isUnderSettingsAiAjanlar
      ? '/settings/ai/AiAjanlar'
      : isUnderSettingsAgents
        ? '/settings/agents'
        : isUnderAyarlar
          ? '/ayarlar/YapayZekaAyarlari/AiAjanlar'
          : '/ai-ajanlar';

  const effectiveBackRoute = useMemo(() => {
    if (backRoute) return backRoute;
    if (effectiveAgentId && effectiveIstekId) {
      return `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;
    }
    return -1 as any;
  }, [backRoute, effectiveAgentId, effectiveIstekId, baseAgentRoute]);

  const mcpFunctionOptions = useMemo<DropdownOption[]>(() => [
    { id: 'erp_create_document', label: t('mcp_fn_create_document', 'erp_create_document — Yeni ERP Belgesi ve Kalemlerini Oluştur') },
    { id: 'erp_update_document', label: t('mcp_fn_update_document', 'erp_update_document — Mevcut ERP Belgesini Güncelle') },
    { id: 'SADECE_JSON_URET', label: t('mcp_fn_only_json', 'Sadece JSON Veri Yapısı Üret (MCP Çağrısını Sonraki Düğüme Bırak)') }
  ], [t]);

  const entityCodeOptions = useMemo<DropdownOption[]>(() => [
    { id: 'BshFiyatFarki', label: t('varlik_bsh_fiyat_farki', 'BshFiyatFarki — BSH Fiyat Farkı Belgesi') },
    { id: 'SatisFaturasi', label: t('varlik_satis_faturasi', 'SatisFaturasi — Satış Faturası') },
    { id: 'AlisFaturasi', label: t('varlik_alis_faturasi', 'AlisFaturasi — Alış Faturası') }
  ], [t]);

  // Akıştaki HAFIZA düğümlerinden gelen dosya adlarını otomatik öner
  const memoryFileSuggestions = useMemo(() => {
    const currentIstek = istekData || incomingIstekData;
    const allNodes: any[] = Array.isArray(currentIstek?.akisDugumleri) ? currentIstek.akisDugumleri : [];
    const files: string[] = [];
    allNodes.forEach((n: any) => {
      if ((n.tip || '').toUpperCase() === 'HAFIZA') {
        const name = (n.dosyaAdi || 'fiyat_farki_tablosu').replace(/\.(csv|json|txt|md|xml)$/i, '').trim() || 'fiyat_farki_tablosu';
        const ext = (n.dosyaUzantisi || 'csv').replace(/^\./, '').toLowerCase().trim() || 'csv';
        files.push(`${name}.${ext}`);
      }
    });
    return files;
  }, [istekData, incomingIstekData]);

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
      kaynakDosyaAdi: (merged.kaynakDosyaAdi || 'fiyat_farki_tablosu.csv').trim(),
      aracKodu: merged.aracKodu || 'erp_create_document',
      varlikKodu: merged.varlikKodu || 'BshFiyatFarki',
      scriptKodu: merged.scriptKodu || DEFAULT_CSV_TO_MCP_SCRIPT,
      uiAksiyonu: 'YOK',
      kayitBekle: (merged.kayitBekle !== undefined ? merged.kayitBekle : true) !== false,
      kayitSonrasiTeyitEt: (merged.kayitSonrasiTeyitEt !== undefined ? merged.kayitSonrasiTeyitEt : true) !== false
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

  const subTrail = useMemo(() => {
    const items: any[] = [
      {
        label: t('ai_ajanlar_baslik', 'Ajanlar'),
        onClick: () => navigate(baseAgentRoute)
      }
    ];
    if (agentData?.ad) {
      items.push({
        label: agentData.ad,
        onClick: () => effectiveAgentId && navigate(`${baseAgentRoute}/${effectiveAgentId}`, { state: { activeTabId: 'hizliIstekler' } })
      });
    }
    if (istekData?.baslik) {
      items.push({
        label: istekData.baslik,
        onClick: handleBackOrClose
      });
    }
    items.push({
      label: defaultNodeTitle,
      active: true
    });
    return items;
  }, [t, navigate, baseAgentRoute, agentData, effectiveAgentId, istekData, defaultNodeTitle]);

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
        'Hafıza düğümünde depolanan tablo/metin verisini JavaScript ile işleyerek MCP fonksiyonunu besleyecek JSON veri yapısını oluşturma yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. BÖLÜM: KAYNAK HAFIZA DOSYASI VE HEDEF MCP FONKSİYONU */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <Database size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('script_islem_ve_mcp_baslik', 'JavaScript Veri Dönüştürücü & MCP Besleme Yapılandırması')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'script_islem_ve_mcp_aciklama',
                    'Hafıza düğümünde depolanan tablo/metin verisini JavaScript ile işleyerek MCP fonksiyonunun beklediği eksiksiz JSON veri yapısına dönüştürün.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
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
                <label className="basla-ayar-field-label" htmlFor="script-node-mcp-fn">
                  {t('script_hedef_mcp_fonksiyonu', 'Beslenecek Hedef MCP Fonksiyonu')}
                </label>
                <BaseDropdownSecici
                  id="script-node-mcp-fn"
                  value={formData.aracKodu || 'erp_create_document'}
                  options={mcpFunctionOptions}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      aracKodu: String(val || 'erp_create_document')
                    }))
                  }
                  clearable={false}
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="script-node-varlik-kodu">
                  {t('script_hedef_varlik_kodu', 'Hedef ERP Belge Türü (varlikKodu)')}
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
                  {t('script_js_kodu_etiket', 'Çalıştırılacak JavaScript Kodu (Jint Sandbox)')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'script_js_kodu_ipucu',
                    'Script içerisinde "input.content" (Hafıza dosyası içeriği), "input.fileName", "input.varlikKodu" ve "input.memory" nesnelerine doğrudan erişebilirsiniz. Dönüş değeri MCP fonksiyonuna gönderilecek JSON metni veya nesnesi olmalıdır.'
                  )}
                </p>
              </div>
            </div>
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
                    t('script_sablon_yuklendi', 'Varsayılan CSV → MCP JSON dönüştürücü script şablonu yüklendi.')
                  );
                }}
              >
                {t('script_varsayilan_sablonu_yukle', 'CSV → MCP JSON Şablonunu Yükle')}
              </BaseButton>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <FlowchartPromptMentionInput
              autoFocus
              rows={16}
              value={formData.scriptKodu || ''}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  scriptKodu: e.target.value
                }))
              }
              placeholder={t(
                'script_js_kodu_placeholder',
                '// input.content içerisindeki CSV veya metin verisini işleyip JSON.stringify({...}) döndürün...'
              )}
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'script_girdi_nesnesi_aciklama',
                    'Kullanılabilir Alanlar: input.content (Hafıza Dosyası Metni) • input.fileName • input.varlikKodu • input.memory'
                  )}
                </span>
              </span>
              <span className="basla-ayar-char-count">
                <Sparkles size={12} /> {formData.aracKodu || 'erp_create_document'} ({formData.varlikKodu || 'BshFiyatFarki'})
              </span>
            </div>
          </div>
        </section>

        {/* 3. BÖLÜM: SCRIPT & MCP YÜRÜTME DAVRANIŞI */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box primary">
                <Cpu size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('script_calistirma_davranisi_baslik', 'Script & MCP Yürütme Davranışı')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'script_calistirma_davranisi_aciklama',
                    'JavaScript tarafından üretilen JSON verisiyle MCP fonksiyonu çağrıldığında uygulanacak kayıt ve doğrulama kuralları.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid">
              <div
                className={`form-ac-wizard-option-box ${formData.kayitBekle !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <CheckCircle2 size={16} />
                    <span>
                      {t(
                        'script_mcp_kayit_bekle_label',
                        'Üretilen JSON ile MCP Fonksiyonunu Otomatik Çağır ve Kaydı Tamamla'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'script_mcp_kayit_bekle_hint',
                      'Aktif olduğunda script çıktısı olarak üretilen JSON doğrudan seçili MCP fonksiyonuna (örn: erp_create_document) parametre olarak verilir ve belge veritabanına kaydedilir.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="script-node-kayit-bekle"
                  checked={formData.kayitBekle !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({ ...prev, kayitBekle: checked }));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {formData.kayitBekle !== false
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  }
                />
              </div>

              <div
                className={`form-ac-wizard-option-box ${formData.kayitSonrasiTeyitEt !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Sparkles size={16} />
                    <span>
                      {t(
                        'script_kayit_sonrasi_teyit_label',
                        'MCP Kaydı Sonrası Oluşturulan Kalem Sayısını Teyit Et'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'script_kayit_sonrasi_teyit_hint',
                      'Aktif olduğunda script içinden çıkan kalem sayısı ile veritabanına kaydedilen belge kalem sayısı karşılaştırılarak işlem özeti raporlanır.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="script-node-kayit-sonrasi-teyit"
                  checked={formData.kayitSonrasiTeyitEt !== false}
                  onChange={(e: any) => {
                    const checked = typeof e === 'boolean' ? e : e?.target?.checked;
                    setFormData((prev: any) => ({ ...prev, kayitSonrasiTeyitEt: checked }));
                  }}
                  label={
                    <span className="text-sm font-semibold">
                      {formData.kayitSonrasiTeyitEt !== false
                        ? t('aktif', 'Aktif')
                        : t('pasif', 'Pasif')}
                    </span>
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default ScriptIslemFlowchartOgeAyarPage;
