/**
 * @akalin/ai_management_module - "Hafıza" Düğümü Ayar Sayfası (HafizaFlowchartOgeAyarPage.tsx)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage temel sınıfından türeyerek "Hafıza" (HAFIZA - Veri & Dosya Depolama) düğümünün ayarlarını yönetmek
 * - Önceki düğümden (özellikle "AI İşlemi" düğümünden) gelen her türlü LLM çıktısını belirlenen "Dosya Adı + Uzantısı" (.csv, .json, .txt, .md, .xml) ile akış hafızasında depolamak
 * - Depolanan veriyi kendisinden sonra gelen "Script İşlemi" veya diğer düğümlere sabit JSON Schema sözleşmesiyle aktarmak
 * - Sabit Düğüm Başlığı ("Hafıza"), Zero Bottom Button, Zero Inline CSS, Sıfır Native HTML Input ve %100 i18n kurallarına uygun çalışmak
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Database,
  FileSpreadsheet,
  HardDrive,
  Info,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  BasitInput,
  BaseDropdownSecici,
  BaseSwitch,
  type DropdownOption
} from '@akalin/ui';
import {
  BaseAiAjanFlowchartOgeAyarPage,
  FlowchartPromptMentionInput,
  type BaseAiAjanFlowchartOgeAyarPageProps
} from './BaseAiAjanFlowchartOgeAyarPage';

export interface HafizaFlowchartOgeAyarPageProps extends Partial<BaseAiAjanFlowchartOgeAyarPageProps> {
  onSuccess?: () => void;
}

export const HafizaFlowchartOgeAyarPage: React.FC<HafizaFlowchartOgeAyarPageProps> = ({
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

  const defaultNodeTitle = t('hafiza', 'Hafıza');

  const [formData, setFormData] = useState<any>(() => {
    const baseNode = incomingNodeFromState || {};
    const cleanFileName = (baseNode.dosyaAdi || 'fiyat_farki_tablosu')
      .replace(/\.(csv|json|txt|md|xml)$/i, '')
      .trim() || 'fiyat_farki_tablosu';
    const cleanExt = (baseNode.dosyaUzantisi || 'csv').replace(/^\./, '').toLowerCase().trim() || 'csv';

    return {
      id: baseNode.id || effectiveOgeId || `HAFIZA_${Date.now()}`,
      tip: 'HAFIZA',
      baslik: defaultNodeTitle,
      dosyaAdi: cleanFileName,
      dosyaUzantisi: cleanExt,
      veriKaynagi: baseNode.veriKaynagi || 'ONCEKI_AI_CIKTISI',
      yazmaModu: baseNode.yazmaModu || 'UZERINE_YAZ',
      prompt: baseNode.prompt || '',
      aracKodu: '',
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
      kayitSonrasiTeyitEt: baseNode.kayitSonrasiTeyitEt ?? false
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
                    const cleanFileName = (foundNode.dosyaAdi || 'fiyat_farki_tablosu')
                      .replace(/\.(csv|json|txt|md|xml)$/i, '')
                      .trim() || 'fiyat_farki_tablosu';
                    const cleanExt = (foundNode.dosyaUzantisi || 'csv').replace(/^\./, '').toLowerCase().trim() || 'csv';
                    setFormData({
                      id: foundNode.id,
                      tip: 'HAFIZA',
                      baslik: defaultNodeTitle,
                      dosyaAdi: cleanFileName,
                      dosyaUzantisi: cleanExt,
                      veriKaynagi: foundNode.veriKaynagi || 'ONCEKI_AI_CIKTISI',
                      yazmaModu: foundNode.yazmaModu || 'UZERINE_YAZ',
                      prompt: foundNode.prompt || '',
                      aracKodu: '',
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
                      kayitSonrasiTeyitEt: foundNode.kayitSonrasiTeyitEt ?? false
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

  const extensionOptions = useMemo<DropdownOption[]>(() => [
    { id: 'csv', label: t('hafiza_ext_csv', '.csv — Noktalı Virgül / Tablo Verisi (Excel Uyumlu)') },
    { id: 'json', label: t('hafiza_ext_json', '.json — Yapısal JSON Veri Nesnesi') },
    { id: 'txt', label: t('hafiza_ext_txt', '.txt — Düz Metin Dosyası') },
    { id: 'md', label: t('hafiza_ext_md', '.md — Markdown Belgesi') },
    { id: 'xml', label: t('hafiza_ext_xml', '.xml — XML Veri Yapısı') }
  ], [t]);

  const dataSourceOptions = useMemo<DropdownOption[]>(() => [
    { id: 'ONCEKI_AI_CIKTISI', label: t('hafiza_kaynak_ai_ciktisi', 'Önceki AI İşlemi Tam Yanıtı ($onceki.aiYaniti)') },
    { id: 'ONCEKI_CIKARILAN_VERI', label: t('hafiza_kaynak_cikarilan_veri', 'Önceki Düğüm Yapısal Verisi ($onceki.cikarilanVeri)') },
    { id: 'BELGE_METIN_ICERIGI', label: t('hafiza_kaynak_belge_metni', 'İçeri Aktarılan Belge Metni ($onceki.belgeMetinIcerigi)') },
    { id: 'OZEL_SABLON', label: t('hafiza_kaynak_ozel_sablon', 'Aşağıdaki Özel İçerik Şablonunu Kullan') }
  ], [t]);

  const writeModeOptions = useMemo<DropdownOption[]>(() => [
    { id: 'UZERINE_YAZ', label: t('hafiza_mod_uzerine_yaz', 'Üzerine Yaz (Yeni Hafıza Dosyası Oluştur)') },
    { id: 'SONUNA_EKLE', label: t('hafiza_mod_sonuna_ekle', 'Mevcut Hafıza Dosyasının Sonuna Ekle (Append)') }
  ], [t]);

  const resolvedFullFileName = useMemo(() => {
    const cleanName = (formData.dosyaAdi || 'fiyat_farki_tablosu')
      .replace(/\.(csv|json|txt|md|xml)$/i, '')
      .trim() || 'fiyat_farki_tablosu';
    const cleanExt = (formData.dosyaUzantisi || 'csv').replace(/^\./, '').toLowerCase().trim() || 'csv';
    return `${cleanName}.${cleanExt}`;
  }, [formData.dosyaAdi, formData.dosyaUzantisi]);

  const buildUpdatedNodePayload = (overrideData?: any) => {
    const mergedSource = {
      ...formData,
      ...(overrideData || {})
    };
    const cleanName = (mergedSource.dosyaAdi || 'fiyat_farki_tablosu')
      .replace(/\.(csv|json|txt|md|xml)$/i, '')
      .trim() || 'fiyat_farki_tablosu';
    const cleanExt = (mergedSource.dosyaUzantisi || 'csv').replace(/^\./, '').toLowerCase().trim() || 'csv';

    return {
      ...mergedSource,
      id: mergedSource.id || effectiveOgeId || `HAFIZA_${Date.now()}`,
      tip: 'HAFIZA',
      baslik: defaultNodeTitle,
      dosyaAdi: cleanName,
      dosyaUzantisi: cleanExt,
      veriKaynagi: mergedSource.veriKaynagi || 'ONCEKI_AI_CIKTISI',
      yazmaModu: mergedSource.yazmaModu || 'UZERINE_YAZ',
      uiAksiyonu: 'YOK'
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

  const handleSave = async (dataToSave: any) => {
    try {
      setIsSaving(true);
      const payloadNode = buildUpdatedNodePayload(dataToSave);

      let agentToUpdate = agentData || incomingAgentData;
      if (!agentToUpdate && effectiveAgentId) {
        const res = await axios.get(`/api/AiAjanlar/${effectiveAgentId}`);
        agentToUpdate = res.data;
      }

      const currentRequests = Array.isArray(agentToUpdate?.hizliIstekler)
        ? [...agentToUpdate.hizliIstekler]
        : [];
      const activeIstekRef = istekData || incomingIstekData;
      const reqIdx = currentRequests.findIndex(
        (x: any) =>
          x.id === effectiveIstekId ||
          (activeIstekRef?.id && x.id === activeIstekRef.id)
      );

      const baseSourceReq =
        (reqIdx !== -1 || activeIstekRef
          ? {
            ...(reqIdx !== -1 ? currentRequests[reqIdx] : {}),
            ...(activeIstekRef || {})
          }
          : null) || {
          id:
            activeIstekRef?.id ||
            (effectiveIstekId && effectiveIstekId !== 'yeni'
              ? effectiveIstekId
              : `req_${Date.now()}`),
          baslik: '',
          prompt: '',
          ikon: 'Sparkles',
          uiAksiyonu: 'YOK',
          aktifMi: true,
          akisDugumleri: []
        };

      const currentReq: any = { ...baseSourceReq };
      const currentNodes = Array.isArray(currentReq.akisDugumleri)
        ? [...currentReq.akisDugumleri]
        : [];
      const nodeIdx = currentNodes.findIndex((x: any) => x.id === payloadNode.id);

      if (nodeIdx !== -1) {
        currentNodes[nodeIdx] = { ...currentNodes[nodeIdx], ...payloadNode };
      } else {
        currentNodes.push(payloadNode);
      }

      currentReq.akisDugumleri = currentNodes;
      setIstekData(currentReq);

      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' && effectiveAgentId && currentReq?.id) {
        try {
          sessionStorage.setItem(`webakus_flow_draft_${effectiveAgentId}_${currentReq.id}`, JSON.stringify(currentReq));
        } catch {
          // ignore
        }
      }

      if (effectiveAgentId && agentToUpdate) {
        if (reqIdx !== -1) {
          currentRequests[reqIdx] = currentReq;
        } else {
          currentRequests.push(currentReq);
        }

        const payload = {
          ...agentToUpdate,
          kapsam: parseInt(agentToUpdate.kapsam, 10) || 1,
          aiSaglayiciId: agentToUpdate.aiSaglayiciId
            ? parseInt(agentToUpdate.aiSaglayiciId, 10)
            : null,
          sicaklik: parseFloat(agentToUpdate.sicaklik) || 0.7,
          maxTokens: parseInt(agentToUpdate.maxTokens, 10) || 2048,
          yanitSenteziModu: parseInt(agentToUpdate.yanitSenteziModu as any, 10) || 0,
          hizliIstekler: currentRequests
        };

        await axios.put(`/api/AiAjanlar/${effectiveAgentId}`, payload);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(`webakus_flow_draft_${effectiveAgentId}_${currentReq.id}`);
          } catch {
            // ignore
          }
          window.dispatchEvent(new CustomEvent('ai-agents-updated'));
        }
      }

      toast.success(
        t('hafiza_ayarlari_kaydedildi', 'Hafıza düğümü ayarları başarıyla kaydedildi.')
      );

      if (onSuccess) {
        onSuccess();
      } else if (typeof effectiveBackRoute === 'string') {
        navigate(effectiveBackRoute, {
          state: {
            agentData: agentToUpdate,
            hizliIstekItem: currentReq || istekData || incomingIstekData
          }
        });
      } else {
        navigate(-1);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.mesaj ||
        err.message ||
        t('kayit_sirasi_hata', 'Kayıt sırasında hata oluştu.')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const ajanlarListRoute = baseAgentRoute;
  const ajanlarListLabel = t('ai_ajanlar_baslik', 'Ajanlar');
  const agentTitle =
    agentData?.ad ||
    incomingAgentData?.ad ||
    (effectiveAgentId ? `#${effectiveAgentId}` : t('ai_ajani', 'AI Ajanı'));
  const istekTitle =
    istekData?.baslik ||
    incomingIstekData?.baslik ||
    t('gorev_akisi', 'Görev Akışı');
  const nodeTitle = defaultNodeTitle;

  const agentRoute = `${baseAgentRoute}/${effectiveAgentId}`;
  const istekRoute = `${baseAgentRoute}/${effectiveAgentId}/hizli-istek/${effectiveIstekId}`;

  const subTrail = useMemo(
    () => [
      {
        label: ajanlarListLabel,
        onClick: () => navigate(ajanlarListRoute)
      },
      {
        label: agentTitle,
        onClick: () => navigate(agentRoute, { state: { activeTabId: 'hizliIstekler' } })
      },
      {
        label: istekTitle,
        onClick: () =>
          navigate(istekRoute, {
            state: {
              agentData: agentData || incomingAgentData,
              hizliIstekItem: istekData || incomingIstekData
            }
          })
      },
      {
        label: nodeTitle,
        active: true
      }
    ],
    [
      ajanlarListLabel,
      ajanlarListRoute,
      agentTitle,
      agentRoute,
      istekTitle,
      istekRoute,
      nodeTitle,
      agentData,
      incomingAgentData,
      istekData,
      incomingIstekData,
      navigate
    ]
  );

  return (
    <BaseAiAjanFlowchartOgeAyarPage
      id="hafizaFlowchartOgeAyarPage"
      agentId={effectiveAgentId}
      istekId={effectiveIstekId}
      nodeId={formData.id}
      nodeType="HAFIZA"
      agentData={agentData || incomingAgentData}
      istekData={istekData || incomingIstekData}
      title={t('hafiza_oge_ayarlari', 'Hafıza Düğümü Ayarları')}
      pageTitle={t('hafiza_oge_ayarlari', 'Hafıza Düğümü Ayarları')}
      recordTitle={nodeTitle}
      subTrail={subTrail}
      icon={<Database size={24} color="var(--accent-primary)" />}
      subtitleLeft={t(
        'hafiza_oge_aciklama',
        'LLM veya önceki düğümden gelen çıktıyı dosya adı ve uzantısıyla akış hafızasında depolama yapılandırması'
      )}
      formData={formData}
      onFormDataChange={setFormData}
      onSave={handleSave}
      isSaving={isSaving}
      onClose={handleBackOrClose}
      onBack={handleBackOrClose}
    >
      <div className="basla-ayar-page-container">
        {/* 1. BÖLÜM: HAFIZA DOSYA TANIMI (DOSYA ADI + UZANTISI) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box warning">
                <FileSpreadsheet size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('hafiza_dosya_adi_ve_uzantisi_baslik', 'Hafıza Dosyası Adı ve Format Uzantısı')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'hafiza_dosya_adi_ve_uzantisi_aciklama',
                    'LLM tarafından üretilen verinin akış hafızasında hangi dosya adı ve uzantıyla saklanacağını belirleyin.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="hafizaDosyaAdiInput">
                  {t('hafiza_dosya_adi_label', 'Dosya Adı')}
                </label>
                <BasitInput
                  id="hafizaDosyaAdiInput"
                  required
                  value={formData.dosyaAdi || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: any) => ({ ...prev, dosyaAdi: e.target.value }))
                  }
                  placeholder={t('hafiza_dosya_adi_placeholder', 'Örn: fiyat_farki_tablosu')}
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="hafizaDosyaUzantisiSelect">
                  {t('hafiza_dosya_uzantisi_label', 'Dosya Uzantısı / Veri Formatı')}
                </label>
                <BaseDropdownSecici
                  id="hafizaDosyaUzantisiSelect"
                  options={extensionOptions}
                  value={formData.dosyaUzantisi || 'csv'}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      dosyaUzantisi: String(val || 'csv')
                    }))
                  }
                  clearable={false}
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="hafizaVeriKaynagiSelect">
                  {t('hafiza_veri_kaynagi_label', 'Depolanacak Veri Kaynağı')}
                </label>
                <BaseDropdownSecici
                  id="hafizaVeriKaynagiSelect"
                  options={dataSourceOptions}
                  value={formData.veriKaynagi || 'ONCEKI_AI_CIKTISI'}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      veriKaynagi: String(val || 'ONCEKI_AI_CIKTISI')
                    }))
                  }
                  clearable={false}
                />
              </div>

              <div className="form-group">
                <label className="basla-ayar-field-label" htmlFor="hafizaYazmaModuSelect">
                  {t('hafiza_yazma_modu_label', 'Hafıza Yazma Modu')}
                </label>
                <BaseDropdownSecici
                  id="hafizaYazmaModuSelect"
                  options={writeModeOptions}
                  value={formData.yazmaModu || 'UZERINE_YAZ'}
                  onChange={(val: string | number | (string | number)[]) =>
                    setFormData((prev: any) => ({
                      ...prev,
                      yazmaModu: String(val || 'UZERINE_YAZ')
                    }))
                  }
                  clearable={false}
                />
              </div>
            </div>

            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <CheckCircle2 size={14} />
                <span>
                  {t('hafiza_tam_dosya_adi_onizleme', 'Oluşturulacak Hafıza Dosyası')}:{' '}
                  <strong>{resolvedFullFileName}</strong>
                </span>
              </span>
              <span className="basla-ayar-char-count">
                <code>{`memory["${resolvedFullFileName}"]`}</code>
              </span>
            </div>
          </div>
        </section>

        {/* 2. BÖLÜM: ÖZEL VERİ ŞABLONU / FİLTRELEME YÖNERGESİ (OPSİYONEL) */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-header">
            <div className="basla-ayar-card-header-left">
              <div className="basla-ayar-icon-box cyan">
                <HardDrive size={18} />
              </div>
              <div className="basla-ayar-header-text">
                <h3 className="basla-ayar-card-title">
                  {t('hafiza_icerik_sablonu_baslik', 'Hafıza İçerik Şablonu ve Açıklama (İsteğe Bağlı)')}
                </h3>
                <p className="basla-ayar-card-subtitle">
                  {t(
                    'hafiza_icerik_sablonu_aciklama',
                    'Boş bırakılırsa seçili veri kaynağı (Örn: önceki AI İşlemi çıktısı) doğrudan dosyaya kaydedilir. Özel bir şablon oluşturmak için @ ile önceki düğüm alanlarını ekleyebilirsiniz.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="basla-ayar-card-body">
            <FlowchartPromptMentionInput
              rows={4}
              value={formData.prompt || ''}
              onChange={(e) =>
                setFormData((prev: any) => ({ ...prev, prompt: e.target.value }))
              }
              placeholder={t(
                'hafiza_prompt_placeholder',
                'Boş bırakıldığında önceki AI İşlemi düğümünden gelen tüm tablo/metin verisi doğrudan {{dosyaTamAdi}} olarak depolanır.'
              )}
            />
            <div className="basla-ayar-card-footer">
              <span className="basla-ayar-footer-hint">
                <Info size={13} />
                <span>
                  {t(
                    'hafiza_prompt_ipucu',
                    'İpucu: Sonraki "Script İşlemi" düğümünde bu dosyaya input.content veya memory["' + resolvedFullFileName + '"] ile doğrudan erişebilirsiniz.'
                  )}
                </span>
              </span>
              <span className="basla-ayar-char-count">
                <Sparkles size={12} /> {resolvedFullFileName}
              </span>
            </div>
          </div>
        </section>

        {/* 3. BÖLÜM: İŞLEM DAVRANIŞI */}
        <section className="basla-ayar-card">
          <div className="basla-ayar-card-body">
            <div className="form-ac-wizard-options-grid">
              <div
                className={`form-ac-wizard-option-box ${formData.kayitBekle !== false ? 'is-active' : ''}`}
              >
                <div className="form-ac-wizard-option-texts">
                  <div className="form-ac-wizard-option-title">
                    <Database size={16} />
                    <span>
                      {t(
                        'hafiza_sonraki_dugume_otomatik_aktar',
                        'Depolanan Dosyayı Sonraki Düğüme Otomatik Aktar'
                      )}
                    </span>
                  </div>
                  <p className="form-ac-wizard-option-desc">
                    {t(
                      'hafiza_sonraki_dugume_otomatik_aktar_aciklama',
                      'Veri hafızaya kaydedilir kaydedilmez kullanıcı onayı beklemeden sıradaki Script İşlemi veya AI adımını tetikler.'
                    )}
                  </p>
                </div>
                <BaseSwitch
                  id="hafizaOtomatikAktarSwitch"
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
            </div>
          </div>
        </section>
      </div>
    </BaseAiAjanFlowchartOgeAyarPage>
  );
};

export default HafizaFlowchartOgeAyarPage;
