import {
  IComplianceExporter,
  ComplianceCalculationResult,
} from '../compliance.interface';

/**
 * UAE WPS (Wage Protection System) Exporter
 *
 * Generates the Salary Information File (SIF) required for WPS submissions.
 *
 * SIF Specification (CBUAE/MOHRE format):
 *  - File type: comma-separated text
 *  - Encoding: UTF-8
 *  - Columns: EmployerCode, RoutingCode, EmployeeRef, Salary, Currency, PersonType, EmployeePayslip
 *
 * Government portal: https://wps.mohre.gov.ae
 */
export class WpsExporter implements IComplianceExporter {
  private readonly EMPLOYER_CODE = 'ZENVIX'; // Replaced by actual MOL code per tenant
  private readonly ROUTING_CODE = '302000';  // Default routing (mock)

  exportCSV(data: ComplianceCalculationResult): string {
    const lines: string[] = [];

    // WPS SIF standard header
    lines.push([
      'EmployerCode',
      'RoutingCode',
      'EmployeeRef',
      'EmployeeName',
      'Salary',
      'Currency',
      'PersonType',
      'WPSDeadlineNote',
    ].join(','));

    data.lineItems.forEach((item) => {
      lines.push([
        this.EMPLOYER_CODE,
        this.ROUTING_CODE,
        item.employee_id,
        `"${item.employeeName}"`,
        item.grossSalary.toFixed(2),
        'AED',
        'EMP', // Employee type
        `"${item.notes || ''}"`,
      ].join(','));
    });

    lines.push('');
    lines.push(`"Total Salary to Disburse",${data.totalContributions.toFixed(2)} AED`);
    lines.push(`"Total Employees",${data.totalEmployees}`);
    lines.push(`"Period",${data.period}`);
    lines.push(`"Generated",${data.generatedAt.toISOString()}`);

    return lines.join('\n');
  }

  exportXML(data: ComplianceCalculationResult): string {
    const employees = data.lineItems
      .map(
        (item, idx) => `
    <SalaryRecord seq="${idx + 1}">
      <EmployerCode>${this.EMPLOYER_CODE}</EmployerCode>
      <EmployeeRef>${item.employee_id}</EmployeeRef>
      <EmployeeName>${item.employeeName}</EmployeeName>
      <Salary currency="AED">${item.grossSalary.toFixed(2)}</Salary>
      <PersonType>EMP</PersonType>
    </SalaryRecord>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<WPSSalaryInformationFile>
  <Header>
    <EmployerCode>${this.EMPLOYER_CODE}</EmployerCode>
    <Period>${data.period}</Period>
    <GeneratedAt>${data.generatedAt.toISOString()}</GeneratedAt>
    <TotalRecords>${data.totalEmployees}</TotalRecords>
    <TotalAmount currency="AED">${data.totalContributions.toFixed(2)}</TotalAmount>
  </Header>
  <Records>${employees}
  </Records>
</WPSSalaryInformationFile>`;
  }

  exportExcel(data: ComplianceCalculationResult): Buffer {
    return Buffer.from(this.exportCSV(data), 'utf-8');
  }

  exportPDF(data: ComplianceCalculationResult): Buffer {
    const content = [
      `UAE WPS SALARY INFORMATION FILE`,
      `Period: ${data.period}  |  Generated: ${data.generatedAt.toISOString()}`,
      `Total Employees: ${data.totalEmployees}`,
      `Total Salary to Disburse: AED ${data.totalContributions.toLocaleString()}`,
      '',
      '--- SALARY RECORDS ---',
      ...data.lineItems.map(
        (i, idx) => `${idx + 1}. ${i.employeeName} | AED ${i.grossSalary.toFixed(2)} | ${i.notes || ''}`,
      ),
    ].join('\n');
    return Buffer.from(content, 'utf-8');
  }
}
