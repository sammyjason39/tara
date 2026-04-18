import { ForecastContext, ForecastDay, ForecastModel } from '../../types/forecast.types';

export class ExpenseModel implements ForecastModel {
  readonly name = 'EXPENSE_RECURRING_MODEL';

  predict(context: ForecastContext, days: number): ForecastDay[] {
    const { cashflowBaseline, historicalSnapshots, scenarioInputs } = context;
    const expenseMultiplier = scenarioInputs?.expenseMultiplier ?? 1.0;

    // 1. Identify Recurring Outflows (Simple pattern detection)
    // We look at the actual drivers in the 30-day projection to seed future cycles
    const activeOutflows = cashflowBaseline.cashflowDrivers.outflow;
    const recurringBaselines = activeOutflows.filter(d => 
        d.amount > 0 && 
        (d.account_name?.toLowerCase().includes('rent') || 
         d.account_name?.toLowerCase().includes('sub') ||
         d.account_name?.toLowerCase().includes('utility'))
    );

    // 2. Compute Non-Recurring Baseline (3-period average)
    const periodicOutflows = historicalSnapshots.map(s => s.totalOutflow || 0).filter(v => v > 0);
    const avgOutflow = periodicOutflows.slice(0, 3).reduce((a, b) => a + b, 0) / (periodicOutflows.length || 3);
    const dailyBaseOutflow = (avgOutflow / 30) * expenseMultiplier;

    // 3. Generate Forecasted Days
    const forecastDays: ForecastDay[] = [];
    const baseDate = new Date(context.cashflowBaseline.snapshotTimestamp);

    for (let i = 1; i <= days; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        const dayOfMonth = date.getDate();

        // Check if any recurring baseline matches this day-of-month (in 30/60/90 days)
        let dayOutflow = dailyBaseOutflow;
        
        for (const recurring of recurringBaselines) {
            const recurringDate = new Date(recurring.dueDate);
            if (recurringDate.getDate() === dayOfMonth) {
                dayOutflow += recurring.amount * expenseMultiplier;
            }
        }

        forecastDays.push({
            date: date.toISOString().split('T')[0],
            inflow: 0, // Inflow handled by RevenueModel
            outflow: Number(dayOutflow.toFixed(2)),
            closingBalance: 0, // Will be computed by aggregator
            isForecasted: true,
            confidence: Math.max(0.4, 1.0 - (i / 180))
        });
    }

    return forecastDays;
  }
}
