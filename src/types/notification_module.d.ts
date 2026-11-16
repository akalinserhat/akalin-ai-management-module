declare module '@akalin/notification_module' {
  export interface ErrorReportPayload {
    url?: string;
    apiEndpoint?: string;
    method?: string;
    statusCode?: number;
    hataMesaji: string;
    detay?: string;
    tarayici?: string;
  }
  export const reportErrorToAdmin: (payload: ErrorReportPayload) => Promise<void>;
  export default reportErrorToAdmin;
}
