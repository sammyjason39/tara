import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'reflect-metadata';
import { LateReportAgent } from './late-report.agent';
import { TardinessReportService } from '../services/tardiness-report.service';

describe('LateReportAgent', () => {
  let agent: LateReportAgent;
  let tardinessReportService: { generateAndEmit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    tardinessReportService = {
      generateAndEmit: vi.fn().mockResolvedValue({ tardy_count: 0 }),
    };

    agent = new LateReportAgent(
      tardinessReportService as unknown as TardinessReportService,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('delegates daily report generation to TardinessReportService', async () => {
    const referenceDate = new Date(2026, 0, 5);
    await agent.generateDailyTardinessReport(referenceDate);
    expect(tardinessReportService.generateAndEmit).toHaveBeenCalledWith(referenceDate);
  });

  it('logs tardy clock-in events without throwing', async () => {
    await expect(
      agent.handleAttendanceClockIn({
        payload: { employee_id: 'emp-1', is_tardy: true, tardiness_minutes: 12 },
      }),
    ).resolves.toBeUndefined();
  });

  it('ignores clock-in events without employee id', async () => {
    await expect(agent.handleAttendanceClockIn({ payload: {} })).resolves.toBeUndefined();
  });
});
