import { Injectable, Logger } from "@nestjs/common";
import { IHRRepository } from "./repositories/hr.repository.interface";

@Injectable()
export class PerformancePredictorService {
  private readonly logger = new Logger(PerformancePredictorService.name);

  constructor(private readonly repository: IHRRepository) {}

  async forecastPerformance(tenant_id: string, employee_id: string) {
    this.logger.log(`Forecasting performance for employee ${employee_id}`);
    
    // 1. Get historical ratings
    const history = await this.repository.getEmployeePerformanceHistory(tenant_id, employee_id);
    if (history.length === 0) {
      return {
        employee_id,
        forecastedRating: 3.0, // Baseline
        confidence: 0.5,
        trend: 'STABLE',
        reason: 'No historical performance data available. Using baseline.'
      };
    }

    // 2. Calculate trend (simplistic linear projection)
    const ratings = history.map(h => h.rating || 3).reverse();
    const lastRating = ratings[ratings.length - 1];
    
    let trend = 'STABLE';
    let forecastedRating = lastRating;

    if (ratings.length >= 2) {
      const diff = ratings[ratings.length - 1] - ratings[ratings.length - 2];
      if (diff > 0) trend = 'UPWARD';
      if (diff < 0) trend = 'DOWNWARD';
      forecastedRating = Math.min(5, Math.max(1, lastRating + (diff * 0.5)));
    }

    return {
      employee_id,
      forecastedRating: parseFloat(forecastedRating.toFixed(1)),
      confidence: Math.min(0.9, 0.4 + (history.length * 0.1)),
      trend,
      historicalAverage: ratings.reduce((a, b) => a + b, 0) / ratings.length,
      reason: trend === 'UPWARD' ? 'Recent improvements in performance reviews.' : 
             trend === 'DOWNWARD' ? 'Slight decline in recent cycle ratings.' : 'Consistent performance history.'
    };
  }

  async calculateGoalProbability(tenant_id: string, goalId: string) {
    this.logger.log(`Calculating probability for goal ${goalId}`);
    
    const goal = await this.repository.getGoalById(tenant_id, goalId);
    if (!goal) throw new Error("Goal not found");

    if (goal.status === 'COMPLETED') return { probability: 100, status: 'DONE' };
    
    // 1. Calculate time remaining vs progress
    const now = new Date();
    const totalDuration = goal.targetDate.getTime() - goal.created_at.getTime();
    const timeElapsed = now.getTime() - goal.created_at.getTime();
    const timeRemaining = goal.targetDate.getTime() - now.getTime();
    
    if (timeRemaining <= 0 && goal.progress < 100) {
      return { probability: 0, status: 'OVERDUE', reason: 'Target date has passed.' };
    }

    const timeWeight = timeElapsed / totalDuration; // % of time gone
    const progressNeeded = 100 - goal.progress;
    
    // Simple probability: if progress > timeWeight, high probability
    // If progress < timeWeight, lower probability
    let probability = 50;
    
    const progressRate = goal.progress / (timeWeight || 0.01);
    probability = Math.min(99, Math.max(1, progressRate));

    return {
      goalId,
      title: goal.title,
      currentProgress: goal.progress,
      probability: Math.round(probability),
      daysRemaining: Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)),
      isAtRisk: probability < 40,
      reason: probability < 40 ? 'Progress is significantly behind schedule.' : 'On track for completion.'
    };
  }

  async recommendInterventions(tenant_id: string, employee_id: string) {
    this.logger.log(`Generating performance interventions for ${employee_id}`);
    
    const forecast = await this.forecastPerformance(tenant_id, employee_id);
    const goals = await this.repository.getEmployeeGoals(tenant_id, employee_id);
    const atRiskGoals = await Promise.all(
      goals.filter(g => g.status === 'IN_PROGRESS')
           .map(async g => this.calculateGoalProbability(tenant_id, g.id))
    ).then(res => res.filter(r => r.isAtRisk));

    const interventions = [];

    if (forecast.trend === 'DOWNWARD') {
      interventions.push({
        type: 'COACHING',
        priority: 'HIGH',
        description: 'Performance trend is downward. Schedule a 1-on-1 coaching session to identify blockers.',
      });
    }

    if (atRiskGoals.length > 0) {
      interventions.push({
        type: 'TRAINING',
        priority: 'MEDIUM',
        description: `Employee has ${atRiskGoals.length} goals at risk. Suggest specialized training or workload rebalancing.`,
      });
    }

    if (interventions.length === 0) {
      interventions.push({
        type: 'RECOGNITION',
        priority: 'LOW',
        description: 'Performance is stable or upward. Consider recognizing achievements in the next team meeting.',
      });
    }

    return interventions;
  }
}
