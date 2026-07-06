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
  systemPrompt?: string;
  skills?: AiSkillDefinition[];
}

export interface AiSkillDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tools: string[];
  promptAddon?: string;
  toolDescriptions?: Record<string, string>;
  requiresElevatedAccess?: boolean;
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
  provider: 'openrouter',
  apiKey: '',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'deepseek-v4-flash',
  maxTokens: 1024,
  temperature: 0.3,
  responseLanguage: 'id',
  confirmationTimeoutMinutes: 60,
};

/** Public TARA app URLs — sole allowed links in AI replies */
export const TARA_PUBLIC_BASE_URL =
  process.env.TARA_PUBLIC_URL || 'https://tara.ralali.io';
export const TARA_CLOCK_URL = `${TARA_PUBLIC_BASE_URL}/m/clock`;
export const TARA_LOGIN_URL = `${TARA_PUBLIC_BASE_URL}/login`;
export const TARA_DOCS_MEMULAI_URL = `${TARA_PUBLIC_BASE_URL}/docs/memulai`;

/** HR contact for AI escalations (Pak Ahmad Yani) */
export const HR_ESCALATION_CONTACT_EMAIL =
  process.env.AI_HR_ESCALATION_EMAIL || 'ahmad.yani@ralali.com';

/** Fixed reply to user when escalating to HR */
export const TARA_ESCALATION_USER_MESSAGE =
  'Mohon maaf untuk hal tersebut diluar kapasitas TARA untuk menjawab, staff HR akan bergabung dalam percakapan ini untuk membantu, mohon menunggu ya';

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
  employee_code?: string;
  full_name: string;
  email: string;
  role_name: string;
  department_name?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  office_name?: string;
  phone?: string;
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
  status: 'success' | 'error' | 'pending_confirmation' | 'escalated';
}
