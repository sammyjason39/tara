import { Injectable } from '@nestjs/common';

export interface BankStatementRow {
    date: Date;
    description: string;
    amount: number;
    reference?: string;
    raw_payload?: any;
}

export interface IBankProvider {
    getName(): string;
    fetchStatements(tenant_id: string, params?: any): Promise<BankStatementRow[]>;
}

@Injectable()
export class CsvBankProvider implements IBankProvider {
    getName(): string { return 'CSV_FILE_UPLOAD'; }

    async fetchStatements(tenant_id: string, params: { buffer: Buffer }): Promise<BankStatementRow[]> {
        // Logic to parse buffer would go here (using csv-parser or similar)
        // For DEV_MOCK_MODE/Draft, we return an empty array or throw if buffer missing
        if (!params.buffer) throw new Error('Missing CSV buffer');
        
        return []; // Actual parsing logic to be hooked in FinanceService via FileProcessingService
    }
}

@Injectable()
export class ModularApiBankProvider implements IBankProvider {
    getName(): string { return 'EXTERNAL_BANK_API'; }

    async fetchStatements(tenant_id: string, params?: any): Promise<BankStatementRow[]> {
        console.log(`[ModularApiBankProvider] Ready for Bank Side Approval for tenant ${tenant_id}`);
        // Sandbox Mock for non-blocking dev
        return [
            { date: new Date(), description: 'SBANK-API-REF-001 - MOCK SETTLEMENT', amount: 1500.00, reference: 'API-STUB' }
        ];
    }
}
