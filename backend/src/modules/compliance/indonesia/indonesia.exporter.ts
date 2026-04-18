import {
  IComplianceExporter,
  ComplianceCalculationResult,
} from '../compliance.interface';

/**
 * Indonesia Compliance Exporter
 * Handles CSV, XML, Excel (stub), and PDF (stub) export
 * for BPJS Kesehatan, BPJS Ketenagakerjaan, and PPh21 reports.
 */
export class IndonesiaComplianceExporter implements IComplianceExporter {
  exportCSV(data: ComplianceCalculationResult): string {
    const lines: string[] = [];

    // Header row
    lines.push([
      'No',
      'Employee ID',
      'Employee Name',
      'Gross Salary (IDR)',
      'Employee Contribution (IDR)',
      'Employer Contribution (IDR)',
      'Tax Amount (IDR)',
      'Net Salary (IDR)',
      'Notes',
    ].join(','));

    // Data rows
    data.lineItems.forEach((item, idx) => {
      lines.push([
        idx + 1,
        item.employee_id,
        `"${item.employeeName}"`,
        item.grossSalary,
        item.employeeContribution,
        item.employerContribution,
        item.tax_amount,
        item.netSalary,
        `"${item.notes || ''}"`,
      ].join(','));
    });

    // Summary footer
    lines.push('');
    lines.push(`"Total Employees",${data.totalEmployees}`);
    lines.push(`"Total Deductions (Employee)",${data.totalDeductions}`);
    lines.push(`"Total Contributions (Employer)",${data.totalContributions}`);
    lines.push(`"Total Tax",${data.totalTax}`);
    lines.push(`"Module",${data.module}`);
    lines.push(`"Period",${data.period}`);
    lines.push(`"Rule Version",${data.ruleVersion}`);
    lines.push(`"Generated At",${data.generatedAt.toISOString()}`);

    return lines.join('\n');
  }

  exportXML(data: ComplianceCalculationResult): string {
    const employees = data.lineItems
      .map(
        (item, idx) => `
    <Employee seq="${idx + 1}">
      <Id>${item.employee_id}</Id>
      <Name>${item.employeeName}</Name>
      <GrossSalary>${item.grossSalary}</GrossSalary>
      <EmployeeContribution>${item.employeeContribution}</EmployeeContribution>
      <EmployerContribution>${item.employerContribution}</EmployerContribution>
      <TaxAmount>${item.tax_amount}</TaxAmount>
      <NetSalary>${item.netSalary}</NetSalary>
    </Employee>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<ComplianceReport>
  <Header>
    <Country>${data.country}</Country>
    <Module>${data.module}</Module>
    <Period>${data.period}</Period>
    <RuleVersion>${data.ruleVersion}</RuleVersion>
    <TenantId>${data.tenant_id}</TenantId>
    <GeneratedAt>${data.generatedAt.toISOString()}</GeneratedAt>
  </Header>
  <Summary>
    <TotalEmployees>${data.totalEmployees}</TotalEmployees>
    <TotalDeductions>${data.totalDeductions}</TotalDeductions>
    <TotalContributions>${data.totalContributions}</TotalContributions>
    <TotalTax>${data.totalTax}</TotalTax>
  </Summary>
  <Employees>${employees}
  </Employees>
</ComplianceReport>`;
  }

  exportExcel(data: ComplianceCalculationResult): Buffer {
    // Stub: returns CSV content as buffer (real Excel via exceljs in Phase 4+)
    return Buffer.from(this.exportCSV(data), 'utf-8');
  }

  exportPDF(data: ComplianceCalculationResult): Buffer {
    // Stub: returns formatted text as buffer (real PDF via pdfkit in Phase 4+)
    const content = [
      `COMPLIANCE REPORT — ${data.module}`,
      `Period: ${data.period}  |  Country: ${data.country}  |  Rule v${data.ruleVersion}`,
      `Tenant: ${data.tenant_id}  |  Generated: ${data.generatedAt.toISOString()}`,
      '',
      `Total Employees:    ${data.totalEmployees}`,
      `Employee Deductions:IDR ${data.totalDeductions.toLocaleString()}`,
      `Employer Contributions: IDR ${data.totalContributions.toLocaleString()}`,
      `Total Tax:          IDR ${data.totalTax.toLocaleString()}`,
      '',
      '--- LINE ITEMS ---',
      ...data.lineItems.map(
        (i, idx) =>
          `${idx + 1}. ${i.employeeName} | Gross: ${i.grossSalary} | EmpContrib: ${i.employeeContribution} | EmprContrib: ${i.employerContribution} | Tax: ${i.tax_amount} | Net: ${i.netSalary}`,
      ),
    ].join('\n');

    return Buffer.from(content, 'utf-8');
  }
}
