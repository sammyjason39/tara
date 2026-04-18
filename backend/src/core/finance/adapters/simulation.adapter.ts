import { Injectable } from '@nestjs/common';
import { ForecastService } from '../services/forecast.service';
import { ForecastOutput } from '../types/forecast.types';

@Injectable()
export class SimulationAdapter {
  constructor(private readonly forecastService: ForecastService) {}

  /**
   * Run a controlled simulation based on scenario inputs
   */
  async runSimulation(params: {
    tenant_id: string;
    company_id: string;
    snapshotId?: string;
    scenario: {
      revenueMultiplier?: number;
      expenseMultiplier?: number;
      delayDays?: number; // Shifting AR/AP dates (Mock)
    };
  }): Promise<ForecastOutput> {
    return this.forecastService.getForecast({
      tenant_id: params.tenant_id,
      company_id: params.company_id,
      snapshotId: params.snapshotId,
      scenario: params.scenario
    });
  }

  /**
   * Calculate the difference between baseline and simulation
   */
  calculateDelta(baseline: ForecastOutput, simulation: ForecastOutput) {
    const lastBaselineDay = baseline.projection[baseline.projection.length - 1];
    const lastSimDay = simulation.projection[simulation.projection.length - 1];

    const cashDelta = lastSimDay.closingBalance - lastBaselineDay.closingBalance;
    
    // Estimate runway delta (simplified for mock phase)
    let runwayDeltaDays = 0;
    if (cashDelta > 0) {
        const avgBurn = baseline.projection.reduce((sum, d) => sum + d.outflow, 0) / baseline.projection.length;
        runwayDeltaDays = Math.round(cashDelta / (avgBurn || 1));
    }

    return {
      cashDelta: Number(cashDelta.toFixed(2)),
      runwayDeltaDays,
      riskReduction: cashDelta > 0 ? Math.min(1.0, cashDelta / (Math.abs(lastBaselineDay.closingBalance) || 1)) : 0
    };
  }
}
