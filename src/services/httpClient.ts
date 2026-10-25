/**
 * @akalin/ai_management_module - HTTP İstemcisi Yapılandırması
 */

import axios, { AxiosInstance } from 'axios';

let customClient: AxiosInstance | null = null;

export const setHttpClient = (client: AxiosInstance) => {
  customClient = client;
};

export const getHttpClient = (): AxiosInstance => {
  return customClient || axios;
};

export default getHttpClient;
