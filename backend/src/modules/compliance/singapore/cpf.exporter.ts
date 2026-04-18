import {
  IComplianceExporter,
  ComplianceCalculationResult,
} from '../compliance.interface';

/**
 * Singapore CPF Exporter
 * Generates CSV and XML for CPF filings.
 * MyCPF employer portal requires the CPF91 format (simplified here as XML).
 */
export class CpfExporter implements IComplianceExporter {
  exportCSV(data: ComplianceCalculationResult): string {
    const lines: string[] = [];

    lines.push([
      'No', 'NRIC/FIN', 'Employee Name',
      'Ordinary Wages (SGD)', 'Employee CPF (SGD)',
      'Employer CPF (SGD)', 'Total CPF (SGD)',
      'Net Salary (SGD)',
    ].join(','));

    data.lineItems.forEach((item, idx) => {
      lines.push([
        idx + 1,
        item.employee_id,
        `"${item.employeeName}"`,
        item.grossSalary,
        item.employeeContribution,
        item.employerContribution,
        item.employeeContribution + item.employerContribution,
        item.netSalary,
      ].join(','));
    });

    lines.push('');
    lines.push(`"Total",${data.totalEmployees},,,,${data.totalDeductions + data.totalContributions}`);

    return lines.join('\n');
  }

  exportXML(data: ComplianceCalculationResult): string {
    const employees = data.lineItems
      .map(
        (item, idx) => `
    <Employee seq="${idx + 1}">
      <Id>${item.employee_id}</Id>
      <Name>${item.employeeName}</Name>
      <OrdinaryWages>${item.grossSalary}</OrdinaryWages>
      <EmployeeCPF>${item.employeeContribution}</EmployeeCPF>
      <EmployerCPF>${item.employerContribution}</EmployerCPF>
      <TotalCPF>${item.employeeContribution + item.employerContribution}</TotalCPF>
    </Employee>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<CPFReport>
  <Header>
    <Period>${data.period}</Period>
    <RuleVersion>${data.ruleVersion}</RuleVersion>
    <GeneratedAt>${data.generatedAt.toISOString()}</GeneratedAt>
  </Header>
  <Employees>${employees}
  </Employees>
  <Summary>
    <TotalEmployees>${data.totalEmployees}</TotalEmployees>
    <TotalEmployeeContributions>${data.totalDeductions}</TotalEmployeeContributions>
    <TotalEmployerContributions>${data.totalContributions}</TotalEmployerContributions>
  </Summary>
</CPFReport>`;
  }

  exportExcel(data: ComplianceCalculationResult): Buffer {
    return Buffer.from(this.exportCSV(data), 'utf-8');
  }

  exportPDF(data: ComplianceCalculationResult): Buffer {
    const content = [
      `CPF CONTRIBUTION REPORT`,
      `Period: ${data.period}  |  Generated: ${data.generatedAt.toISOString()}`,
      `Total Employees: ${data.totalEmployees}`,
      `Employee CPF: SGD ${data.totalDeductions.toLocaleString()}`,
      `Employer CPF: SGD ${data.totalContributions.toLocaleString()}`,
      `Total CPF: SGD ${(data.totalDeductions + data.totalContributions).toLocaleString()}`,
    ].join('\n');
    return Buffer.from(content, 'utf-8');
  }
}
