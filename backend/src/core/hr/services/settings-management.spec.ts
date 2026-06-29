import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { AgentConfigService } from './agent-config.service';
import {
  ConfigChangeHistoryService,
  CONFIG_CHANGE_ACTION_TYPE,
  CONFIG_ENTITY_SYSTEM_SETTING,
  CONFIG_ENTITY_AGENT_CONFIG,
  AGENT_CONFIG_CATEGORY,
} from './config-change-history.service';
import { ConfigurationValidationService } from './configuration-validation.service';
import { SettingsController } from '../controllers/settings.controller';
import { TaraAuthPayload } from '../../auth/tara-auth.service';

/**
 * Comprehensive unit tests for Settings Management (Task 20.6)
 *
 * Covers:
 * - Configuration validation rules (Requirement 15.7, 15.8, 8.8, 25.16, 25.17)
 * - Agent enable/disable functionality (Requirement 25.3, 25.4, 25.5)
 * - Change history tracking (Requirement 14.4, 25.21)
 * - HR_Team-only access restriction (Requirement 25.1, 25.2)
 */

// =============================================================================
// 1. Configuration Validation Rules
// =============================================================================

describe('Configuration Validation Rules (Task 20.6)', () => {
  let validationService: ConfigurationValidationService;
  let systemSettingsService: SystemSettingsService;
  let prisma: any;
  let eventBus: any;

  beforeEach(() => {
    validationService = new ConfigurationValidationService();

    prisma = {
      systemSettings: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation(async (args) => ({
          id: 'setting-1',
          ...args.create,
        })),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    eventBus = {
      emit: vi.fn().mockResolvedValue(undefined),
    };

    systemSettingsService = new SystemSettingsService(prisma, eventBus);
  });

  describe('validation is applied before persistence on upsert', () => {
    it('rejects a geo-fence radius outside valid range before writing', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: 'geofence_radius',
          setting_value: 2000,
          setting_category: 'geo-fence',
          last_modified_by: 'hr-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.systemSettings.upsert).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('rejects an invalid working hours time format before writing', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: 'work_start',
          setting_value: '25:00',
          setting_category: 'attendance',
          last_modified_by: 'hr-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.systemSettings.upsert).not.toHaveBeenCalled();
    });

    it('rejects an invalid public holiday date before writing', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: 'holiday_2025',
          setting_value: '2025-13-01',
          setting_category: 'public_holidays',
          last_modified_by: 'hr-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.systemSettings.upsert).not.toHaveBeenCalled();
    });

    it('accepts and persists a valid geo-fence radius', async () => {
      await systemSettingsService.upsert({
        setting_key: 'geofence_radius',
        setting_value: 500,
        setting_category: 'geo-fence',
        last_modified_by: 'hr-1',
      });

      expect(prisma.systemSettings.upsert).toHaveBeenCalledTimes(1);
      expect(eventBus.emit).toHaveBeenCalledTimes(1);
    });

    it('accepts and persists valid working hours', async () => {
      await systemSettingsService.upsert({
        setting_key: 'working_hours',
        setting_value: {
          start_time: '08:00',
          end_time: '17:00',
          break_start: '12:00',
          break_end: '13:00',
        },
        setting_category: 'attendance',
        last_modified_by: 'hr-1',
      });

      expect(prisma.systemSettings.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('validation is applied before persistence on update', () => {
    it('rejects invalid value on update', async () => {
      prisma.systemSettings.findUnique.mockResolvedValue({
        setting_key: 'work_start',
        setting_category: 'attendance',
        setting_value: '09:00',
      });

      await expect(
        systemSettingsService.update('work_start', {
          setting_value: 'not-a-time',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.systemSettings.update).not.toHaveBeenCalled();
    });
  });

  describe('category validation', () => {
    it('rejects an unsupported category on upsert', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: 'key',
          setting_value: 'val',
          setting_category: 'finance',
          last_modified_by: 'hr-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unsupported category on getByCategory', async () => {
      await expect(
        systemSettingsService.getByCategory('marketing'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unsupported category on get with filter', async () => {
      await expect(
        systemSettingsService.get('unsupported'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts all supported categories', async () => {
      const categories = [
        'attendance',
        'geo-fence',
        'leave_policy',
        'public_holidays',
        'notifications',
        'aws_integration',
      ];
      for (const cat of categories) {
        await expect(
          systemSettingsService.getByCategory(cat),
        ).resolves.not.toThrow();
      }
    });
  });

  describe('value validation', () => {
    it('rejects null setting_value', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: 'key',
          setting_value: null as any,
          setting_category: 'attendance',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects undefined setting_value', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: 'key',
          setting_value: undefined as any,
          setting_category: 'attendance',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty setting_key', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: '',
          setting_value: 'v',
          setting_category: 'attendance',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects whitespace-only setting_key', async () => {
      await expect(
        systemSettingsService.upsert({
          setting_key: '   ',
          setting_value: 'v',
          setting_category: 'attendance',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty update input', async () => {
      prisma.systemSettings.findUnique.mockResolvedValue({
        setting_key: 'work_start',
        setting_category: 'attendance',
        setting_value: '09:00',
      });
      await expect(
        systemSettingsService.update('work_start', {}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('descriptive error messages (Requirement 15.8)', () => {
    it('includes the invalid value in the geo-fence error message', () => {
      try {
        validationService.validate('geo-fence', 'geofence_radius', 5);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('5');
        expect(e.message).toContain('50');
        expect(e.message).toContain('1000');
      }
    });

    it('includes "HH:MM" in the time format error message', () => {
      try {
        validationService.validate('attendance', 'work_start', 'invalid');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('HH:MM');
      }
    });

    it('includes "YYYY-MM-DD" in the date format error message', () => {
      try {
        validationService.validate('public_holidays', 'h', 'bad-date');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('YYYY-MM-DD');
      }
    });

    it('includes supported categories in category error message', async () => {
      try {
        await systemSettingsService.getByCategory('unknown_cat');
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('attendance');
        expect(e.message).toContain('geo-fence');
        expect(e.message).toContain('leave_policy');
      }
    });
  });
});


// =============================================================================
// 2. Agent Enable/Disable Functionality
// =============================================================================

describe('Agent Enable/Disable Functionality (Task 20.6)', () => {
  let service: AgentConfigService;
  let prisma: any;
  let eventBus: any;

  beforeEach(() => {
    prisma = {
      agentConfig: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockImplementation(async (args) => ({
          id: 'ac-1',
          ...args.create,
          ...(args.update ?? {}),
        })),
      },
    };

    eventBus = {
      emit: vi.fn().mockResolvedValue(undefined),
    };

    service = new AgentConfigService(prisma, eventBus);
  });

  describe('enable/disable all 7 agents', () => {
    const agents = AgentConfigService.KNOWN_AGENTS;

    it('recognizes exactly 7 known agents', () => {
      expect(agents).toHaveLength(7);
    });

    it('includes all expected agent names', () => {
      const expected = [
        'leave_request',
        'absensi',
        'clock_confirmation',
        'weekly_checkin',
        'late_report',
        'onboarding',
        'saldo_cuti',
      ];
      for (const name of expected) {
        expect(agents).toContain(name);
      }
    });

    it('can enable each known agent individually', async () => {
      for (const name of agents) {
        prisma.agentConfig.upsert.mockResolvedValueOnce({
          id: `ac-${name}`,
          agent_name: name,
          is_enabled: true,
          configuration: {},
          health_status: 'unknown',
        });

        const result = await service.setAgentEnabled(name, true, 'hr-admin');
        expect(result.is_enabled).toBe(true);
      }
      expect(prisma.agentConfig.upsert).toHaveBeenCalledTimes(agents.length);
    });

    it('can disable each known agent individually', async () => {
      for (const name of agents) {
        prisma.agentConfig.upsert.mockResolvedValueOnce({
          id: `ac-${name}`,
          agent_name: name,
          is_enabled: false,
          configuration: {},
          health_status: 'unknown',
        });

        const result = await service.setAgentEnabled(name, false, 'hr-admin');
        expect(result.is_enabled).toBe(false);
      }
    });
  });

  describe('event emission on enable/disable', () => {
    it('emits agent.config.changed event with is_enabled=true on enable', async () => {
      prisma.agentConfig.upsert.mockResolvedValue({
        id: 'ac-1',
        agent_name: 'absensi',
        is_enabled: true,
      });

      await service.setAgentEnabled('absensi', true, 'hr-1');

      expect(eventBus.emit).toHaveBeenCalledTimes(1);
      const event = eventBus.emit.mock.calls[0][0];
      expect(event.event_type).toBe('agent.config.changed');
      expect(event.payload.agent_name).toBe('absensi');
      expect(event.payload.is_enabled).toBe(true);
      expect(event.payload.change).toBe('enabled');
    });

    it('emits agent.config.changed event with is_enabled=false on disable', async () => {
      prisma.agentConfig.upsert.mockResolvedValue({
        id: 'ac-1',
        agent_name: 'late_report',
        is_enabled: false,
      });

      await service.setAgentEnabled('late_report', false, 'hr-2');

      const event = eventBus.emit.mock.calls[0][0];
      expect(event.payload.change).toBe('disabled');
      expect(event.payload.is_enabled).toBe(false);
    });

    it('includes the actor id in the event', async () => {
      prisma.agentConfig.upsert.mockResolvedValue({
        id: 'ac-1',
        agent_name: 'weekly_checkin',
        is_enabled: true,
      });

      await service.setAgentEnabled('weekly_checkin', true, 'hr-manager-5');

      const event = eventBus.emit.mock.calls[0][0];
      expect(event.actor.id).toBe('hr-manager-5');
    });
  });

  describe('agent name validation', () => {
    it('rejects unknown agent names', async () => {
      await expect(
        service.setAgentEnabled('not_a_real_agent', true),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects empty agent name', async () => {
      await expect(
        service.setAgentEnabled('', true),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('normalizes agent names to lowercase', async () => {
      prisma.agentConfig.upsert.mockResolvedValue({
        id: 'ac-1',
        agent_name: 'absensi',
        is_enabled: true,
      });

      await service.setAgentEnabled('Absensi', true);
      const call = prisma.agentConfig.upsert.mock.calls[0][0];
      expect(call.where.agent_name).toBe('absensi');
    });
  });

  describe('agent health status', () => {
    it('accepts all valid health statuses', async () => {
      for (const status of AgentConfigService.VALID_HEALTH_STATUSES) {
        prisma.agentConfig.upsert.mockResolvedValueOnce({
          id: 'ac-1',
          agent_name: 'absensi',
          health_status: status,
        });
        await expect(
          service.setHealthStatus('absensi', status),
        ).resolves.toBeDefined();
      }
    });

    it('rejects invalid health status values', async () => {
      await expect(
        service.setHealthStatus('absensi', 'exploding'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores error_message with health status update', async () => {
      prisma.agentConfig.upsert.mockResolvedValue({
        id: 'ac-1',
        agent_name: 'onboarding',
        health_status: 'down',
        error_message: 'Connection timeout',
      });

      await service.setHealthStatus('onboarding', 'down', 'Connection timeout');

      const call = prisma.agentConfig.upsert.mock.calls[0][0];
      expect(call.update.error_message).toBe('Connection timeout');
    });
  });

  describe('agent configuration update', () => {
    it('rejects non-object configuration (array)', async () => {
      await expect(
        service.updateAgentConfiguration('absensi', [] as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects null configuration', async () => {
      await expect(
        service.updateAgentConfiguration('absensi', null as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts a valid JSON object configuration', async () => {
      prisma.agentConfig.upsert.mockResolvedValue({
        id: 'ac-1',
        agent_name: 'weekly_checkin',
        configuration: { schedule: '09:00', day: 'Monday' },
      });

      const result = await service.updateAgentConfiguration('weekly_checkin', {
        schedule: '09:00',
        day: 'Monday',
      });

      expect(result.configuration).toEqual({ schedule: '09:00', day: 'Monday' });
    });
  });
});


// =============================================================================
// 3. Change History Tracking
// =============================================================================

describe('Change History Tracking (Task 20.6)', () => {
  let service: ConfigChangeHistoryService;
  let auditService: any;
  let prisma: any;

  const sampleAuditRecord = (overrides: any = {}) => ({
    id: 'audit-1',
    action_type: CONFIG_CHANGE_ACTION_TYPE,
    actor_id: 'hr-user-1',
    target_entity_type: CONFIG_ENTITY_SYSTEM_SETTING,
    target_entity_id: 'tardiness_threshold',
    created_at: new Date('2026-03-15T10:30:00Z'),
    changes: {
      category: 'attendance',
      operation: 'updated',
      old_value: { time: '09:00' },
      new_value: { time: '08:30' },
    },
    ...overrides,
  });

  beforeEach(() => {
    auditService = { log: vi.fn().mockResolvedValue({ id: 'audit-new' }) };
    prisma = {
      auditLog: { findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new ConfigChangeHistoryService(prisma as any, auditService);
  });

  describe('records what was changed, who changed it, and when', () => {
    it('captures the setting key as entity_id', async () => {
      await service.recordSettingChange({
        setting_key: 'geofence_radius',
        setting_category: 'geo-fence',
        operation: 'created',
        new_value: 500,
        changed_by: 'hr-admin-1',
      });

      const arg = auditService.log.mock.calls[0][0];
      expect(arg.entity_id).toBe('geofence_radius');
    });

    it('captures the actor (who made the change)', async () => {
      await service.recordSettingChange({
        setting_key: 'work_start',
        operation: 'updated',
        changed_by: 'hr-manager-7',
      });

      expect(auditService.log.mock.calls[0][0].user_id).toBe('hr-manager-7');
    });

    it('captures old_value and new_value in the changes payload', async () => {
      await service.recordSettingChange({
        setting_key: 'tardiness_threshold',
        setting_category: 'attendance',
        operation: 'updated',
        old_value: { time: '09:00' },
        new_value: { time: '08:30' },
        changed_by: 'hr-1',
      });

      const changes = auditService.log.mock.calls[0][0].changes;
      expect(changes.old_value).toEqual({ time: '09:00' });
      expect(changes.new_value).toEqual({ time: '08:30' });
    });

    it('captures the operation type (created/updated/deleted)', async () => {
      await service.recordSettingChange({
        setting_key: 'holiday_new_year',
        setting_category: 'public_holidays',
        operation: 'deleted',
        old_value: '2025-01-01',
        changed_by: 'hr-1',
      });

      expect(auditService.log.mock.calls[0][0].changes.operation).toBe('deleted');
    });

    it('captures agent config changes with agent category', async () => {
      await service.recordAgentConfigChange({
        agent_name: 'saldo_cuti',
        operation: 'enabled',
        new_value: { is_enabled: true },
        changed_by: 'hr-admin-2',
      });

      const arg = auditService.log.mock.calls[0][0];
      expect(arg.entity_type).toBe(CONFIG_ENTITY_AGENT_CONFIG);
      expect(arg.entity_id).toBe('saldo_cuti');
      expect(arg.changes.category).toBe(AGENT_CONFIG_CATEGORY);
    });
  });

  describe('retrieval returns normalized history entries', () => {
    it('returns entity_id, operation, old_value, new_value, changed_by, changed_at', async () => {
      prisma.auditLog.findMany.mockResolvedValue([sampleAuditRecord()]);

      const history = await service.getHistory();

      expect(history).toHaveLength(1);
      const entry = history[0];
      expect(entry.entity_id).toBe('tardiness_threshold');
      expect(entry.category).toBe('attendance');
      expect(entry.operation).toBe('updated');
      expect(entry.old_value).toEqual({ time: '09:00' });
      expect(entry.new_value).toEqual({ time: '08:30' });
      expect(entry.changed_by).toBe('hr-user-1');
      expect(entry.changed_at).toEqual(new Date('2026-03-15T10:30:00Z'));
    });

    it('handles missing changes gracefully', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'audit-2',
          action_type: CONFIG_CHANGE_ACTION_TYPE,
          actor_id: null,
          target_entity_type: CONFIG_ENTITY_SYSTEM_SETTING,
          target_entity_id: 'some_key',
          created_at: new Date(),
          changes: null,
        },
      ]);

      const history = await service.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].old_value).toBeNull();
      expect(history[0].new_value).toBeNull();
    });
  });

  describe('filtering and pagination', () => {
    it('applies limit and offset to the query', async () => {
      await service.getHistory({ limit: 10, offset: 5 });

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.take).toBe(10);
      expect(call.skip).toBe(5);
    });

    it('defaults to limit=100 and offset=0', async () => {
      await service.getHistory();

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.take).toBe(100);
      expect(call.skip).toBe(0);
    });

    it('filters by setting key via getHistoryForSettingKey', async () => {
      await service.getHistoryForSettingKey('geofence_radius', { limit: 5 });

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.target_entity_type).toBe(CONFIG_ENTITY_SYSTEM_SETTING);
      expect(where.target_entity_id).toBe('geofence_radius');
    });

    it('filters by agent name via getHistoryForAgent', async () => {
      await service.getHistoryForAgent('absensi', { limit: 20, offset: 10 });

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.target_entity_type).toBe(CONFIG_ENTITY_AGENT_CONFIG);
      expect(call.where.target_entity_id).toBe('absensi');
      expect(call.take).toBe(20);
      expect(call.skip).toBe(10);
    });

    it('filters by category via getHistoryForCategory', async () => {
      await service.getHistoryForCategory('geo-fence');

      const where = prisma.auditLog.findMany.mock.calls[0][0].where;
      expect(where.changes).toEqual({
        path: ['category'],
        equals: 'geo-fence',
      });
    });

    it('orders results most recent first', async () => {
      await service.getHistory();

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual({ created_at: 'desc' });
    });
  });

  describe('event-driven recording', () => {
    it('records from system setting event with actor preserved', async () => {
      await service.handleSystemSettingChanged({
        event_type: 'config.geofence_updated',
        actor: { id: 'hr-admin-3', type: 'employee' },
        entity: { id: 'geofence_radius', type: 'system_setting' },
        payload: {
          operation: 'updated',
          setting_key: 'geofence_radius',
          setting_category: 'geo-fence',
          setting_value: 300,
          previous_value: 200,
        },
      });

      const arg = auditService.log.mock.calls[0][0];
      expect(arg.user_id).toBe('hr-admin-3');
      expect(arg.entity_id).toBe('geofence_radius');
      expect(arg.changes.old_value).toBe(200);
      expect(arg.changes.new_value).toBe(300);
    });

    it('records from agent config event', async () => {
      await service.handleAgentConfigChanged({
        event_type: 'agent.config.changed',
        actor: { id: 'hr-admin-4', type: 'system' },
        entity: { id: 'ac-id-1', type: 'agent_config' },
        payload: {
          agent_name: 'clock_confirmation',
          change: 'disabled',
          is_enabled: false,
        },
      });

      const arg = auditService.log.mock.calls[0][0];
      expect(arg.entity_type).toBe(CONFIG_ENTITY_AGENT_CONFIG);
      expect(arg.entity_id).toBe('clock_confirmation');
      expect(arg.changes.operation).toBe('disabled');
    });

    it('does not throw if event handling fails (resilient)', async () => {
      auditService.log.mockRejectedValueOnce(new Error('DB failure'));

      await expect(
        service.handleAgentConfigChanged({
          event_type: 'agent.config.changed',
          payload: { agent_name: 'absensi', change: 'enabled' },
        }),
      ).resolves.toBeUndefined();
    });

    it('handles event with missing payload gracefully', async () => {
      await expect(
        service.handleSystemSettingChanged({ event_type: 'config.updated' }),
      ).resolves.toBeUndefined();
    });
  });
});


// =============================================================================
// 4. HR_Team-Only Access Restriction
// =============================================================================

describe('HR_Team-Only Access Restriction (Task 20.6)', () => {
  let controller: SettingsController;
  let systemSettingsService: any;
  let agentConfigService: any;

  const hrUser: TaraAuthPayload = {
    sub: 'hr-001',
    email: 'hr@example.com',
    role: 'HR_Team',
    context: 'Administrative',
    interface: 'Web',
    tenant_id: 'tenant-1',
    session_id: 'session-1',
  };

  const employeeUser: TaraAuthPayload = {
    sub: 'emp-001',
    email: 'emp@example.com',
    role: 'Employee',
    context: 'Personal_Employee',
    interface: 'Mobile',
    tenant_id: 'tenant-1',
    session_id: 'session-2',
  };

  const supervisorUser: TaraAuthPayload = {
    sub: 'sup-001',
    email: 'sup@example.com',
    role: 'Supervisor',
    context: 'Personal_Employee',
    interface: 'Web',
    tenant_id: 'tenant-1',
    session_id: 'session-3',
  };

  beforeEach(() => {
    systemSettingsService = {
      getByCategory: vi.fn().mockResolvedValue([]),
      getByKey: vi.fn().mockResolvedValue({
        setting_key: 'k',
        setting_category: 'attendance',
      }),
      upsert: vi.fn().mockImplementation(async (input) => ({ id: 's1', ...input })),
    };
    agentConfigService = {
      listAgentConfigs: vi.fn().mockResolvedValue([]),
      getAgentConfig: vi.fn().mockResolvedValue({ agent_name: 'absensi' }),
      getAgentHealth: vi.fn().mockResolvedValue({ health_status: 'healthy' }),
      setAgentEnabled: vi.fn().mockResolvedValue({ is_enabled: true }),
      updateAgentConfiguration: vi.fn().mockResolvedValue({}),
      setHealthStatus: vi.fn().mockResolvedValue({}),
    };
    controller = new SettingsController(systemSettingsService, agentConfigService);
  });

  describe('controller @Roles("HR_Team") decorator enforcement', () => {
    it('SettingsController has @Roles("HR_Team") metadata at class level', () => {
      // The Roles decorator uses SetMetadata with key 'roles'
      const metadata = Reflect.getMetadata('roles', SettingsController);
      expect(metadata).toEqual(['HR_Team']);
    });

    it('controller passes actor id from authenticated HR user to service', async () => {
      await controller.upsertCategorySetting(
        'attendance',
        { setting_key: 'work_start', setting_value: '08:00' },
        hrUser,
      );

      expect(systemSettingsService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ last_modified_by: 'hr-001' }),
      );
    });

    it('controller passes HR user actor to agent enable/disable', async () => {
      await controller.updateAgent(
        'absensi',
        { is_enabled: false },
        hrUser,
      );

      expect(agentConfigService.setAgentEnabled).toHaveBeenCalledWith(
        'absensi',
        false,
        'hr-001',
      );
    });

    it('controller passes HR user actor to health status update', async () => {
      await controller.setAgentHealth(
        'absensi',
        { health_status: 'degraded' },
        hrUser,
      );

      expect(agentConfigService.setHealthStatus).toHaveBeenCalledWith(
        'absensi',
        'degraded',
        undefined,
        'hr-001',
      );
    });

    it('defaults actor to "system" when user is undefined', async () => {
      await controller.upsertCategorySetting(
        'attendance',
        { setting_key: 'work_end', setting_value: '17:00' },
        undefined as any,
      );

      expect(systemSettingsService.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ last_modified_by: 'system' }),
      );
    });
  });

  describe('category slug resolution (only HR_Team uses these routes)', () => {
    it('supports all expected category slugs', async () => {
      const slugs = [
        'attendance',
        'geofence',
        'leaves',
        'public-holidays',
        'notifications',
        'aws-devices',
      ];

      for (const slug of slugs) {
        await expect(
          controller.getCategorySettings(slug),
        ).resolves.toBeDefined();
      }
    });

    it('rejects unknown category slugs with descriptive error', async () => {
      await expect(
        controller.getCategorySettings('employee_data'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an attempt to access settings for the "agents" slug via category route', async () => {
      // "agents" is handled by its own sub-route, not the category route
      await expect(
        controller.getCategorySettings('agents'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('endpoint input validation', () => {
    it('rejects updateAgent with empty body (no is_enabled or configuration)', async () => {
      await expect(
        controller.updateAgent('absensi', {}, hrUser),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts updateAgent with only is_enabled', async () => {
      await expect(
        controller.updateAgent('absensi', { is_enabled: true }, hrUser),
      ).resolves.toBeDefined();
    });

    it('accepts updateAgent with only configuration', async () => {
      await expect(
        controller.updateAgent('absensi', { configuration: { k: 'v' } }, hrUser),
      ).resolves.toBeDefined();
    });
  });
});
