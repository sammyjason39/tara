/**
 * Zod schemas for all IT Service Management domain entities.
 *
 * Provides client-side validation for:
 * - Support Tickets (create/update)
 * - SLA Configuration
 * - Escalation
 * - Resolution
 * - Account Provisioning (create/edit)
 * - Device Registration
 * - Hardware Request
 *
 * Includes business logic:
 * - Priority assignment based on category + impact
 * - SLA breach detection
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const TICKET_CATEGORIES = [
  "hardware",
  "software",
  "network",
  "security",
  "access",
  "other",
] as const;

export const IMPACT_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const PRIORITY_LEVELS = ["Low", "Medium", "High", "Critical"] as const;

export const TICKET_STATUSES = [
  "open",
  "assigned",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

// ---------------------------------------------------------------------------
// Priority Assignment Logic
// ---------------------------------------------------------------------------

/**
 * Assigns priority level based on category and impact assessment.
 *
 * Rules:
 * - CRITICAL impact → Critical priority
 * - HIGH impact + security/network category → Critical priority
 * - HIGH impact → High priority
 * - MEDIUM impact → Medium priority
 * - LOW impact → Low priority
 */
export function assignPriority(
  category: TicketCategory,
  impact: ImpactLevel
): PriorityLevel {
  if (impact === "CRITICAL") return "Critical";
  if (impact === "HIGH" && (category === "security" || category === "network")) {
    return "Critical";
  }
  if (impact === "HIGH") return "High";
  if (impact === "MEDIUM") return "Medium";
  return "Low";
}

// ---------------------------------------------------------------------------
// SLA Configuration
// ---------------------------------------------------------------------------

export interface SLAConfig {
  priority: PriorityLevel;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
}

/** Default SLA thresholds per priority level */
export const DEFAULT_SLA_CONFIG: Record<PriorityLevel, SLAConfig> = {
  Critical: {
    priority: "Critical",
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 60,
  },
  High: {
    priority: "High",
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
  },
  Medium: {
    priority: "Medium",
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 480,
  },
  Low: {
    priority: "Low",
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
  },
};

// ---------------------------------------------------------------------------
// SLA Breach Detection
// ---------------------------------------------------------------------------

export interface SLABreachResult {
  breached: boolean;
  responseBreached: boolean;
  resolutionBreached: boolean;
  responseElapsedMinutes: number;
  resolutionElapsedMinutes: number;
}

/**
 * Detects whether a ticket has breached its SLA thresholds.
 *
 * Triggers escalation notification when response/resolution time exceeds threshold.
 *
 * @param createdAt - Ticket creation timestamp (ISO string)
 * @param firstResponseAt - First response timestamp (ISO string or null if not yet responded)
 * @param resolvedAt - Resolution timestamp (ISO string or null if not yet resolved)
 * @param priority - Ticket priority level
 * @param slaConfig - Optional custom SLA configuration (defaults to DEFAULT_SLA_CONFIG)
 * @param now - Current time for comparison (defaults to Date.now())
 */
export function detectSLABreach(
  createdAt: string,
  firstResponseAt: string | null,
  resolvedAt: string | null,
  priority: PriorityLevel,
  slaConfig: Record<PriorityLevel, SLAConfig> = DEFAULT_SLA_CONFIG,
  now: number = Date.now()
): SLABreachResult {
  const config = slaConfig[priority];
  const createdTime = new Date(createdAt).getTime();

  // Calculate elapsed time for response
  const responseEnd = firstResponseAt
    ? new Date(firstResponseAt).getTime()
    : now;
  const responseElapsedMinutes = Math.floor(
    (responseEnd - createdTime) / (1000 * 60)
  );

  // Calculate elapsed time for resolution
  const resolutionEnd = resolvedAt ? new Date(resolvedAt).getTime() : now;
  const resolutionElapsedMinutes = Math.floor(
    (resolutionEnd - createdTime) / (1000 * 60)
  );

  const responseBreached = responseElapsedMinutes > config.responseTimeMinutes;
  const resolutionBreached =
    resolutionElapsedMinutes > config.resolutionTimeMinutes;

  return {
    breached: responseBreached || resolutionBreached,
    responseBreached,
    resolutionBreached,
    responseElapsedMinutes,
    resolutionElapsedMinutes,
  };
}

// ---------------------------------------------------------------------------
// Support Ticket Schemas
// ---------------------------------------------------------------------------

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must not exceed 200 characters"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(TICKET_CATEGORIES, {
    required_error: "Category is required",
  }),
  impact: z.enum(IMPACT_LEVELS, {
    required_error: "Impact level is required",
  }),
  assigneeId: z.string().optional().default(""),
  reporterId: z.string().optional().default(""),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// ---------------------------------------------------------------------------
// SLA Configuration Schema
// ---------------------------------------------------------------------------

export const slaConfigSchema = z.object({
  priority: z.enum(PRIORITY_LEVELS, {
    required_error: "Priority level is required",
  }),
  responseTimeMinutes: z.coerce
    .number()
    .min(1, "Response time must be greater than 0"),
  resolutionTimeMinutes: z.coerce
    .number()
    .min(1, "Resolution time must be greater than 0"),
});

export type SLAConfigInput = z.infer<typeof slaConfigSchema>;

// ---------------------------------------------------------------------------
// Escalation Schema
// ---------------------------------------------------------------------------

export const escalationSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  reason: z.string().min(1, "Escalation reason is required").max(500),
  escalatedTo: z.string().min(1, "Escalation target is required"),
  priority: z.enum(PRIORITY_LEVELS, {
    required_error: "Priority is required",
  }),
});

export type EscalationInput = z.infer<typeof escalationSchema>;

// ---------------------------------------------------------------------------
// Resolution Schema
// ---------------------------------------------------------------------------

export const resolutionSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  resolutionNotes: z
    .string()
    .min(1, "Resolution notes are required")
    .max(2000),
  category: z.enum(TICKET_CATEGORIES, {
    required_error: "Resolution category is required",
  }),
});

export type ResolutionInput = z.infer<typeof resolutionSchema>;

// ---------------------------------------------------------------------------
// Account Provisioning Schema
// ---------------------------------------------------------------------------

export const createProvisioningSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  reason: z.string().min(1, "Reason is required").max(500),
  scope: z.enum(["full_portal", "quote", "invoice"], {
    required_error: "Scope is required",
  }),
});

export type CreateProvisioningInput = z.infer<typeof createProvisioningSchema>;

export const editProvisioningSchema = z.object({
  subjectId: z.string().min(1, "Subject ID is required"),
  reason: z.string().min(1, "Reason is required").max(500),
  scope: z.enum(["full_portal", "quote", "invoice"], {
    required_error: "Scope is required",
  }),
});

export type EditProvisioningInput = z.infer<typeof editProvisioningSchema>;

// ---------------------------------------------------------------------------
// Device Registration Schema
// ---------------------------------------------------------------------------

export const registerDeviceSchema = z.object({
  deviceName: z.string().min(1, "Device name is required").max(100),
  deviceType: z.enum(["laptop", "mobile", "iot", "server", "database"], {
    required_error: "Device type is required",
  }),
  locationId: z.string().min(1, "Location is required"),
  parentId: z.string().optional().default(""),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

// ---------------------------------------------------------------------------
// Hardware Request Schema (TechShop)
// ---------------------------------------------------------------------------

export const hardwareRequestSchema = z.object({
  catalogItemId: z.string().min(1, "Item is required"),
  notes: z.string().max(500).optional().default(""),
  locationId: z.string().min(1, "Location is required"),
});

export type HardwareRequestInput = z.infer<typeof hardwareRequestSchema>;
