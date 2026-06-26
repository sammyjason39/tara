import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HermesWhatsAppBridgeAgent } from './hermes-whatsapp-bridge.agent';
import { HermesQueryExecutor } from './executors/query.executor';
import { WhatsAppAgent } from '../whatsapp/whatsapp.agent';

describe('HermesWhatsAppBridgeAgent', () => {
  let queryExecutor: { execute: ReturnType<typeof vi.fn> };
  let whatsAppAgent: { executeReply: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queryExecutor = { execute: vi.fn() };
    whatsAppAgent = { executeReply: vi.fn().mockResolvedValue({ success: true, wa_message_id: 'wamid.reply' }) };
  });

  afterEach(() => {
    delete process.env.HERMES_WA_LOCAL_MVP_ENABLED;
  });

  function createAgent() {
    return new HermesWhatsAppBridgeAgent(
      queryExecutor as unknown as HermesQueryExecutor,
      whatsAppAgent as unknown as WhatsAppAgent,
    );
  }

  it('does not reply when local MVP bridge is disabled', async () => {
    const agent = createAgent();

    await agent.handleInboundWhatsAppMessage({
      event_id: 'evt-1',
      event_type: 'whatsapp.message.inbound',
      payload: {
        employee_id: 'emp-1',
        content: 'Sisa cuti saya berapa?',
      },
    });

    expect(queryExecutor.execute).not.toHaveBeenCalled();
    expect(whatsAppAgent.executeReply).not.toHaveBeenCalled();
  });

  it('replies with leave balance when local MVP is enabled and inbound WhatsApp asks about cuti balance', async () => {
    process.env.HERMES_WA_LOCAL_MVP_ENABLED = 'true';
    const agent = createAgent();

    queryExecutor.execute.mockResolvedValue({
      employee_id: 'emp-1',
      balance: {
        year: 2026,
        total_entitlement: 12,
        used_days: 4,
        remaining_days: 8,
        carryover_days: 0,
      },
      upcoming_approved_leaves: [],
    });

    await agent.handleInboundWhatsAppMessage({
      event_id: 'evt-1',
      event_type: 'whatsapp.message.inbound',
      payload: {
        employee_id: 'emp-1',
        employee_name: 'Budi',
        content: 'Sisa cuti saya berapa?',
        session_id: 'session-1',
      },
    });

    expect(queryExecutor.execute).toHaveBeenCalledWith('leave_balance', { employee_id: 'emp-1' });
    expect(whatsAppAgent.executeReply).toHaveBeenCalledWith(
      expect.objectContaining({
        employee_id: 'emp-1',
        hermes_agent_id: 'tara-wa-local-mvp',
        hermes_action_log_id: 'evt-1',
        message: expect.stringContaining('Sisa cuti kamu 8 hari'),
      }),
    );
  });
});
