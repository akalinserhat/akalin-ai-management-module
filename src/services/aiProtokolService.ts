/**
 * @akalin/ai_management_module - Dinamik Yapay Zeka (AI) API Protokol Servisi
 */

import { getHttpClient } from './httpClient';
import { AiProtokol, AiProtokolTestDto, AiScriptResponseOutput } from '../types';

export const aiProtokolService = {
  async getAll(): Promise<AiProtokol[]> {
    const client = getHttpClient();
    const res = await client.get<AiProtokol[]>('/api/AiProtokoller');
    return res.data;
  },

  async getById(id: number): Promise<AiProtokol> {
    const client = getHttpClient();
    const res = await client.get<AiProtokol>(`/api/AiProtokoller/${id}`);
    return res.data;
  },

  async create(data: Partial<AiProtokol>): Promise<AiProtokol> {
    const client = getHttpClient();
    const res = await client.post<AiProtokol>('/api/AiProtokoller', data);
    return res.data;
  },

  async update(id: number, data: Partial<AiProtokol>): Promise<AiProtokol> {
    const client = getHttpClient();
    const res = await client.put<AiProtokol>(`/api/AiProtokoller/${id}`, data);
    return res.data;
  },

  async delete(id: number): Promise<void> {
    const client = getHttpClient();
    await client.delete(`/api/AiProtokoller/${id}`);
  },

  async testProtocol(dto: AiProtokolTestDto): Promise<AiScriptResponseOutput> {
    const client = getHttpClient();
    const res = await client.post<AiScriptResponseOutput>('/api/AiProtokoller/test', dto);
    return res.data;
  }
};

export default aiProtokolService;
