export type ReportIntegrityHash = {
  reportType: 'PROFIT_LOSS' | 'BALANCE_SHEET' | 'TRIAL_BALANCE' | 'CASH_FLOW_STATEMENT';
  hash: string;
  generatedAt: Date;
};

export type IntelligenceIntegrityHash = {
  category: 'INSIGHTS' | 'FORECASTS' | 'RECOMMENDATIONS';
  hash: string;
  sourceCount: number;
};

export type FinancialCertificationPack = {
  certificationId: string; // sha256(snapshotSequence + ledgerHash + rootHash)
  tenant_id: string;
  company_id: string;
  snapshotSequence: number;
  
  // Ledger Anchor
  ledgerHash: string; // Merkle root or combined account balance hash
  
  // Reporting Layer
  reportHashes: ReportIntegrityHash[];
  
  // Intelligence Layer
  intelligenceHashes: IntelligenceIntegrityHash[];
  
  totalRootHash: string; // SHA-256 of all child hashes
  
  certifiedAt: Date;
  certifiedBy: string;
  
  status: 'SEALED' | 'VERIFIED' | 'FAILED';
  metadata: {
    fiscalPeriodId: string;
    correlation_id: string;
  };
};
