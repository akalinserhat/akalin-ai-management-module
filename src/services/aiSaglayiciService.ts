/**
 * @akalin/ai_management_module - Yapay Zeka (AI) Sağlayıcı Servisi
 */

import { getHttpClient } from './httpClient';
import { AiSaglayici } from '../types';

export const aiSaglayiciService = {
  async getAll(): Promise<AiSaglayici[]> {
    const client = getHttpClient();
    const res = await client.get<AiSaglayici[]>('/api/AiSaglayicilar');
    return res.data;
  },

  async getById(id: number): Promise<AiSaglayici> {
    const client = getHttpClient();
    const res = await client.get<AiSaglayici>(`/api/AiSaglayicilar/${id}`);
    return res.data;
  },

  async create(data: Partial<AiSaglayici>): Promise<AiSaglayici> {
    const client = getHttpClient();
    const res = await client.post<AiSaglayici>('/api/AiSaglayicilar', data);
    return res.data;
  },

  async update(id: number, data: Partial<AiSaglayici>): Promise<AiSaglayici> {
    const client = getHttpClient();
    const res = await client.put<AiSaglayici>(`/api/AiSaglayicilar/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    const client = getHttpClient();
    await client.delete(`/api/AiSaglayicilar/${id}`);
  },

  async testConnection(id: number): Promise<{ success: boolean; message: string }> {
    const client = getHttpClient();
    const res = await client.post<{ success: boolean; message: string }>(`/api/AiSaglayicilar/${id}/test-connection`);
    return res.data;
  },

  async testStandalone(data: any): Promise<{ success: boolean; message: string }> {
    const client = getHttpClient();
    const res = await client.post<{ success: boolean; message: string }>('/api/AiSaglayicilar/test-connection', data);
    return res.data;
  },

  async reset(id: number): Promise<void> {
    const client = getHttpClient();
    await client.post(`/api/AiSaglayicilar/${id}/reset`);
  },

  async fetchModels(id: number): Promise<string[]> {
    const client = getHttpClient();
    const res = await client.post<string[]>(`/api/AiSaglayicilar/${id}/fetch-models`);
    return res.data;
  }
};

export default aiSaglayiciService;
