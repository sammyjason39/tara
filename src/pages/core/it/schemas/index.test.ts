import { describe, it, expect } from "vitest";
import {
  createTicketSchema,
  slaConfigSchema,
  escalationSchema,
  resolutionSchema,
  createProvisioningSchema,
  editProvisioningSchema,
  registerDeviceSchema,
  hardwareRequestSchema,
  assignPriority,
  detectSLABreach,
  DEFAULT_SLA_CONFIG,
} from "./index";

describe("IT Module Zod Schemas", () => {
  describe("createTicketSchema", () => {
    it("accepts valid ticket data", () => {
      const result = createTicketSchema.safeParse({
        title: "Network connectivity issue in Building A",
        description: "Users unable to connect to VPN",
        category: "network",
        impact: "HIGH",
        assigneeId: "USR001",
        reporterId: "USR002",
      });
      expect(result.success).toBe(true);
    });

    it("rejects title shorter than 5 characters", () => {
      const result = createTicketSchema.safeParse({
        title: "Hi",
        description: "Some description",
        category: "software",
        impact: "LOW",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("title");
      }
    });

    it("rejects title longer than 200 characters", () => {
      const result = createTicketSchema.safeParse({
        title: "A".repeat(201),
        description: "Some description",
        category: "software",
        impact: "LOW",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty description", () => {
      const result = createTicketSchema.safeParse({
        title: "Valid title here",
        description: "",
        category: "hardware",
        impact: "MEDIUM",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid category", () => {
      const result = createTicketSchema.safeParse({
        title: "Valid title here",
        description: "Description",
        category: "unknown_category",
        impact: "LOW",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid impact level", () => {
      const result = createTicketSchema.safeParse({
        title: "Valid title here",
        description: "Description",
        category: "software",
        impact: "VERY_HIGH",
      });
      expect(result.success).toBe(false);
    });

    it("allows optional assigneeId and reporterId", () => {
      const result = createTicketSchema.safeParse({
        title: "Valid title for testing",
        description: "Description content",
        category: "access",
        impact: "LOW",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("slaConfigSchema", () => {
    it("accepts valid SLA config", () => {
      const result = slaConfigSchema.safeParse({
        priority: "Critical",
        responseTimeMinutes: 15,
        resolutionTimeMinutes: 60,
      });
      expect(result.success).toBe(true);
    });

    it("rejects responseTimeMinutes <= 0", () => {
      const result = slaConfigSchema.safeParse({
        priority: "High",
        responseTimeMinutes: 0,
        resolutionTimeMinutes: 240,
      });
      expect(result.success).toBe(false);
    });

    it("rejects resolutionTimeMinutes <= 0", () => {
      const result = slaConfigSchema.safeParse({
        priority: "Medium",
        responseTimeMinutes: 60,
        resolutionTimeMinutes: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("escalationSchema", () => {
    it("accepts valid escalation data", () => {
      const result = escalationSchema.safeParse({
        ticketId: "TKT-001",
        reason: "SLA breach detected",
        escalatedTo: "MGR-001",
        priority: "Critical",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty reason", () => {
      const result = escalationSchema.safeParse({
        ticketId: "TKT-001",
        reason: "",
        escalatedTo: "MGR-001",
        priority: "High",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason exceeding 500 chars", () => {
      const result = escalationSchema.safeParse({
        ticketId: "TKT-001",
        reason: "X".repeat(501),
        escalatedTo: "MGR-001",
        priority: "High",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resolutionSchema", () => {
    it("accepts valid resolution data", () => {
      const result = resolutionSchema.safeParse({
        ticketId: "TKT-001",
        resolutionNotes: "Replaced faulty network cable",
        category: "hardware",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty resolution notes", () => {
      const result = resolutionSchema.safeParse({
        ticketId: "TKT-001",
        resolutionNotes: "",
        category: "software",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createProvisioningSchema", () => {
    it("accepts valid provisioning data", () => {
      const result = createProvisioningSchema.safeParse({
        subjectId: "EMP001",
        reason: "New hire onboarding",
        scope: "full_portal",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty subjectId", () => {
      const result = createProvisioningSchema.safeParse({
        subjectId: "",
        reason: "Reason",
        scope: "quote",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registerDeviceSchema", () => {
    it("accepts valid device registration", () => {
      const result = registerDeviceSchema.safeParse({
        deviceName: "Workstation-01",
        deviceType: "laptop",
        locationId: "LOC-001",
        parentId: "ROOT",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty device name", () => {
      const result = registerDeviceSchema.safeParse({
        deviceName: "",
        deviceType: "iot",
        locationId: "LOC-001",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid device type", () => {
      const result = registerDeviceSchema.safeParse({
        deviceName: "Device",
        deviceType: "microwave",
        locationId: "LOC-001",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("hardwareRequestSchema", () => {
    it("accepts valid hardware request", () => {
      const result = hardwareRequestSchema.safeParse({
        catalogItemId: "CAT-001",
        notes: "Urgent need",
        locationId: "MAIN_WH",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty locationId", () => {
      const result = hardwareRequestSchema.safeParse({
        catalogItemId: "CAT-001",
        notes: "",
        locationId: "",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Priority Assignment Logic", () => {
  it("assigns Critical for CRITICAL impact", () => {
    expect(assignPriority("software", "CRITICAL")).toBe("Critical");
    expect(assignPriority("hardware", "CRITICAL")).toBe("Critical");
    expect(assignPriority("network", "CRITICAL")).toBe("Critical");
    expect(assignPriority("other", "CRITICAL")).toBe("Critical");
  });

  it("assigns Critical for HIGH impact + security category", () => {
    expect(assignPriority("security", "HIGH")).toBe("Critical");
  });

  it("assigns Critical for HIGH impact + network category", () => {
    expect(assignPriority("network", "HIGH")).toBe("Critical");
  });

  it("assigns High for HIGH impact + other categories", () => {
    expect(assignPriority("hardware", "HIGH")).toBe("High");
    expect(assignPriority("software", "HIGH")).toBe("High");
    expect(assignPriority("access", "HIGH")).toBe("High");
    expect(assignPriority("other", "HIGH")).toBe("High");
  });

  it("assigns Medium for MEDIUM impact", () => {
    expect(assignPriority("software", "MEDIUM")).toBe("Medium");
    expect(assignPriority("security", "MEDIUM")).toBe("Medium");
    expect(assignPriority("network", "MEDIUM")).toBe("Medium");
  });

  it("assigns Low for LOW impact", () => {
    expect(assignPriority("software", "LOW")).toBe("Low");
    expect(assignPriority("security", "LOW")).toBe("Low");
    expect(assignPriority("hardware", "LOW")).toBe("Low");
  });
});

describe("SLA Breach Detection", () => {
  const baseTime = new Date("2024-01-15T10:00:00Z").getTime();

  it("detects no breach when within SLA thresholds", () => {
    const createdAt = "2024-01-15T10:00:00Z";
    const firstResponseAt = "2024-01-15T10:05:00Z"; // 5min (Critical SLA is 15min)
    const resolvedAt = null;
    const now = new Date("2024-01-15T10:30:00Z").getTime(); // 30min (Critical SLA is 60min)

    const result = detectSLABreach(createdAt, firstResponseAt, resolvedAt, "Critical", DEFAULT_SLA_CONFIG, now);
    expect(result.breached).toBe(false);
    expect(result.responseBreached).toBe(false);
    expect(result.resolutionBreached).toBe(false);
  });

  it("detects response breach for Critical priority", () => {
    const createdAt = "2024-01-15T10:00:00Z";
    const firstResponseAt = null; // No response yet
    const resolvedAt = null;
    const now = new Date("2024-01-15T10:20:00Z").getTime(); // 20min > 15min threshold

    const result = detectSLABreach(createdAt, firstResponseAt, resolvedAt, "Critical", DEFAULT_SLA_CONFIG, now);
    expect(result.breached).toBe(true);
    expect(result.responseBreached).toBe(true);
    expect(result.responseElapsedMinutes).toBe(20);
  });

  it("detects resolution breach for Medium priority", () => {
    const createdAt = "2024-01-15T10:00:00Z";
    const firstResponseAt = "2024-01-15T10:30:00Z"; // Responded within 60min OK
    const resolvedAt = null;
    // Medium SLA is 480min resolution
    const now = new Date("2024-01-15T20:00:00Z").getTime(); // 600min > 480min threshold

    const result = detectSLABreach(createdAt, firstResponseAt, resolvedAt, "Medium", DEFAULT_SLA_CONFIG, now);
    expect(result.breached).toBe(true);
    expect(result.resolutionBreached).toBe(true);
    expect(result.responseBreached).toBe(false);
  });

  it("reports no breach when ticket is resolved within SLA", () => {
    const createdAt = "2024-01-15T10:00:00Z";
    const firstResponseAt = "2024-01-15T10:10:00Z";
    const resolvedAt = "2024-01-15T11:00:00Z"; // 60min within Low SLA of 1440min

    const result = detectSLABreach(createdAt, firstResponseAt, resolvedAt, "Low");
    expect(result.breached).toBe(false);
    expect(result.responseBreached).toBe(false);
    expect(result.resolutionBreached).toBe(false);
  });

  it("detects both response and resolution breach", () => {
    const createdAt = "2024-01-15T10:00:00Z";
    const firstResponseAt = null;
    const resolvedAt = null;
    // For High: response 30min, resolution 240min
    const now = new Date("2024-01-15T15:00:00Z").getTime(); // 300min

    const result = detectSLABreach(createdAt, firstResponseAt, resolvedAt, "High", DEFAULT_SLA_CONFIG, now);
    expect(result.breached).toBe(true);
    expect(result.responseBreached).toBe(true);
    expect(result.resolutionBreached).toBe(true);
  });
});
