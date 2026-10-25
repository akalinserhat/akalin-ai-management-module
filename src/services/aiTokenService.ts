/**
 * @akalin/ai_management_module - Yapay Zeka Token, Cüzdan ve Fiyatlandırma Servisi
 */

import { getHttpClient } from './httpClient';
import { 
  FirmaTokenCuzdan, 
  TokenKrediYukleDto, 
  AiTokenHarcamaGecmisi, 
  AiModelFiyatlandirma 
} from '../types';

export const aiTokenService = {
  async getTumCuzdanlar(): Promise<FirmaTokenCuzdan[]> {
    const client = getHttpClient();
    const res = await client.get<FirmaTokenCuzdan[]>('/api/AiToken/cuzdanlar');
    return res.data;
  },

  async getCuzdan(firmaId?: number): Promise<FirmaTokenCuzdan> {
    const client = getHttpClient();
    const res = await client.get<FirmaTokenCuzdan>('/api/AiToken/cuzdan', { params: { firmaId } });
    return res.data;
  },

  async krediYukle(dto: TokenKrediYukleDto): Promise<FirmaTokenCuzdan> {
    const client = getHttpClient();
    const res = await client.post<FirmaTokenCuzdan>('/api/AiToken/kredi-yukle', dto);
    return res.data;
  },

  async getHarcamalar(firmaId?: number, take: number = 100): Promise<AiTokenHarcamaGecmisi[]> {
    const client = getHttpClient();
    const res = await client.get<AiTokenHarcamaGecmisi[]>('/api/AiToken/harcamalar', { params: { firmaId, take } });
    return res.data;
  },

  async getTarifeler(): Promise<AiModelFiyatlandirma[]> {
    const client = getHttpClient();
    const res = await client.get<AiModelFiyatlandirma[]>('/api/AiToken/tarifeler');
    return res.data;
  },

  async saveTarife(dto: Partial<AiModelFiyatlandirma>): Promise<AiModelFiyatlandirma> {
    const client = getHttpClient();
    const res = await client.post<AiModelFiyatlandirma>('/api/AiToken/tarife', dto);
    return res.data;
  },

  async deleteTarife(id: number): Promise<void> {
    const client = getHttpClient();
    await client.delete(`/api/AiToken/tarife/${id}`);
  }
};

export default aiTokenService;
