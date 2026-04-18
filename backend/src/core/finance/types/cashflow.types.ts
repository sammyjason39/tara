export type DriverType = 'INVOICE' | 'BILL';

export interface Driver {
  id: string;
  accountId: string;
  account_name: string;
  documentType: DriverType;
  documentNumber: string;
  amount: number;
  dueDate: string;
}

export interface RiskMarker {
  type: 'DEFICIT' | 'SAFETY_BUFFER';
  start_date: string;
  end_date: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ProjectionDetail {
  date: string;
  openingBalance: number;
  inflow: number;
  outflow: number;
  net: number;
  closingBalance: number;
  drivers: {
    inflow: Driver[];
    outflow: Driver[];
  };
}

export interface CashflowOutput {
  projection: number[];
  projectionDetails: ProjectionDetail[];
  runwayDays: number;
  deficitRisk: boolean;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskMarkers: RiskMarker[];
  cashflowDrivers: {
    inflow: Driver[];
    outflow: Driver[];
  };
  snapshotSequence: number;
  snapshotHash: string;
  projectionHash: string;
  currentCash: number;
  scenarioApplied: boolean;
  simulationHash?: string;
  minimumSafeCash: number;
  isBelowSafeBuffer: boolean;
  snapshotTimestamp: string;
  currentBalance: number;
  openingBalance: number;
}
