/**
 * @akalin/ai_management_module - Yapay Zeka (AI) Ajan ve Araç Servisi
 */

import { getHttpClient } from './httpClient';
import { AiAjan, AiAracKatalogItem, AiAracSablonItem } from '../types';

export const aiAjanService = {
  async getAll(): Promise<AiAjan[]> {
    const client = getHttpClient();
    const res = await client.get<AiAjan[]>('/api/AiAjanlar');
    return res.data;
  },

  async getById(id: number): Promise<AiAjan> {
    const client = getHttpClient();
    const res = await client.get<AiAjan>(`/api/AiAjanlar/${id}`);
    return res.data;
  },

  async create(data: Partial<AiAjan>): Promise<AiAjan> {
    const client = getHttpClient();
    const res = await client.post<AiAjan>('/api/AiAjanlar', data);
    return res.data;
  },

  async update(id: number, data: Partial<AiAjan>): Promise<AiAjan> {
    const client = getHttpClient();
    const res = await client.put<AiAjan>(`/api/AiAjanlar/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    const client = getHttpClient();
    await client.delete(`/api/AiAjanlar/${id}`);
  },

  async getKatalog(): Promise<AiAracKatalogItem[]> {
    const client = getHttpClient();
    const res = await client.get<AiAracKatalogItem[]>('/api/AiAraclar/katalog');
    return res.data;
  },

  async getSablonlar(): Promise<AiAracSablonItem[]> {
    const client = getHttpClient();
    const res = await client.get<AiAracSablonItem[]>('/api/AiAraclar/sablonlar');
    return res.data;
  },

  async setAjanAraclari(agentId: number, aracKodlari: string[]): Promise<void> {
    const client = getHttpClient();
    await client.post(`/api/AiAraclar/ajan/${agentId}/araclar`, aracKodlari);
  }
};

export default aiAjanService;
