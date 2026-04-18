import { Injectable } from '@nestjs/common';

export interface ReportDefinition {
  type: string;
  name: string;
  version: string;
  supportedDimensions: string[];
  defaultGrouping: string;
}

@Injectable()
export class ReportDefinitionRegistry {
  private readonly definitions: Map<string, ReportDefinition> = new Map();

  constructor() {
    this.register({
      type: 'PROFIT_LOSS',
      name: 'Profit & Loss Statement',
      version: 'v1',
      supportedDimensions: ['departmentId', 'projectId', 'costCenterId'],
      defaultGrouping: 'category',
    });

    this.register({
      type: 'BALANCE_SHEET',
      name: 'Balance Sheet',
      version: 'v1',
      supportedDimensions: ['location_id'],
      defaultGrouping: 'category',
    });

    this.register({
      type: 'CASH_FLOW',
      name: 'Cash Flow Statement',
      version: 'v1',
      supportedDimensions: [],
      defaultGrouping: 'activity',
    });
  }

  register(definition: ReportDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  getDefinition(type: string): ReportDefinition | undefined {
    return this.definitions.get(type);
  }

  getAllDefinitions(): ReportDefinition[] {
    return Array.from(this.definitions.values());
  }
}
