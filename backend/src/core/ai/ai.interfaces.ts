export interface TaraAiConfig {
  enabled: boolean;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  responseLanguage: string;
  confirmationTimeoutMinutes: number;
  systemPromptOverride?: string;
}

export interface TaraWhatsAppConfig {
  enabled: boolean;
  kapsoApiKey: string;
  phoneNumberId: string;
  businessNumber: string;
  webhookVerifyToken: string;
}

export const DEFAULT_AI_CONFIG: TaraAiConfig = {
  enabled: false,
  provider: 'tokease',
  apiKey: '',
  baseUrl: 'https://tokease.com/v1',
  model: 'deepseek-v4-flash',
  maxTokens: 1024,
  temperature: 0.3,
  responseLanguage: 'id',
  confirmationTimeoutMinutes: 60,
};

export const DEFAULT_WHATSAPP_CONFIG: TaraWhatsAppConfig = {
  enabled: false,
  kapsoApiKey: '',
  phoneNumberId: '',
  businessNumber: '',
  webhookVerifyToken: '',
};

export type AiPendingActionType =
  | 'submit_leave'
  | 'approve_leave'
  | 'reject_leave'
  | 'submit_loan'
  | 'clock_in'
  | 'clock_out';

export interface EmployeeAiContext {
  id: string;
  full_name: string;
  email: string;
  role_name: string;
  department_name?: string;
  supervisor_id?: string;
  is_supervisor: boolean;
  is_hr_admin: boolean;
}

export interface AiProcessResult {
  reply: string;
  useButtons?: boolean;
  buttons?: { id: string; title: string }[];
  toolsCalled: string[];
  inputTokens: number;
  outputTokens: number;
  status: 'success' | 'error' | 'pending_confirmation';
}
