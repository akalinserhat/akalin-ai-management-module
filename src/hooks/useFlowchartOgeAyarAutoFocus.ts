/**
 * @akalin/ai_management_module - Flowchart Öğe Ayar Sayfaları Otomatik Odaklanma Kancası (useFlowchartOgeAyarAutoFocus.ts)
 *
 * Başlıca Sorumlulukları:
 * - BaseAiAjanFlowchartOgeAyarPage'den türeyen sayfalar (Başla, Form Aç, AI İşlemi vb.) ilk açıldığında
 *   veya "Ayarlar" sekmesine geçildiğinde sekme içerisindeki ilk etkileşimli form alanına otomatik odaklanmak
 * - Form Auto-Focus & Field Focus Architecture kurallarına uygun olarak modül seviyesinde odaklanma davranışını yönetmek
 * - @akalin/ui kütüphanesinin generic odaklanma araçlarını (useFormAutoFocus, autoFocusFirstInput) kullanmak
 */

import { useEffect, type RefObject } from 'react';
import { autoFocusFirstInput, useFormAutoFocus } from '@akalin/ui';
import { DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB } from '../defaults/flowchartOgeAyarDefaultValue';

/**
 * BaseAiAjanFlowchartOgeAyarPage ve türeyen sayfalarda "Ayarlar" sekmesi aktif olduğunda
 * sekme içindeki ilk etkin input/seçici/textarea alanına otomatik odaklanmayı sağlar.
 *
 * @param ayarlarContainerRef "Ayarlar" sekmesi içeriğini saran DOM referansı
 * @param activeTabId Aktif sekme kimliği (varsayılan: 'ayarlar')
 */
export const useFlowchartOgeAyarAutoFocus = (
  ayarlarContainerRef: RefObject<HTMLElement>,
  activeTabId: string | number = DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB
): void => {
  const isAyarlarTabActive = String(activeTabId) === DEFAULT_FLOWCHART_OGE_AYAR_ACTIVE_TAB;

  // @akalin/ui generic form auto-focus kancasını tetikle
  useFormAutoFocus(ayarlarContainerRef, [activeTabId]);

  // McpVarlikSeciciInput (.form-input readOnly) dahil tüm etkileşimli alanlar için autoFocusFirstInput desteği
  useEffect(() => {
    if (!isAyarlarTabActive) return;

    let interactionCancelled = false;
    const cancelOnInteraction = () => {
      interactionCancelled = true;
    };

    document.addEventListener('mousedown', cancelOnInteraction, { once: true, capture: true });
    document.addEventListener('keydown', cancelOnInteraction, { once: true, capture: true });
    document.addEventListener('touchstart', cancelOnInteraction, { once: true, capture: true });

    const timer = window.setTimeout(() => {
      if (interactionCancelled) return;
      if (ayarlarContainerRef.current) {
        autoFocusFirstInput(ayarlarContainerRef.current);
      }
    }, 60);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', cancelOnInteraction, { capture: true });
      document.removeEventListener('keydown', cancelOnInteraction, { capture: true });
      document.removeEventListener('touchstart', cancelOnInteraction, { capture: true });
    };
  }, [ayarlarContainerRef, isAyarlarTabActive]);
};

export default useFlowchartOgeAyarAutoFocus;
