/**
 * @akalin/ai_management_module - Firma Yapay Zeka Sistem Ayarları Servisi
 */

import { getHttpClient } from './httpClient';

export const firmaAiSettingsService = {
  async getYanitSenteziAyar(): Promise<boolean> {
    try {
      const client = getHttpClient();
      const res = await client.get('/api/FirmaAyarlari/Ai');
      if (res.data && res.data.LlmYanitSenteziAktifMi !== undefined) {
        return res.data.LlmYanitSenteziAktifMi === 'true' || res.data.LlmYanitSenteziAktifMi === true;
      }
      return true;
    } catch {
      return true;
    }
  },

  async setYanitSenteziAyar(aktif: boolean): Promise<void> {
    const client = getHttpClient();
    await client.post('/api/FirmaAyarlari/Ai', {
      LlmYanitSenteziAktifMi: aktif.toString()
    });
  }
};

export default firmaAiSettingsService;
