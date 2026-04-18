import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './persistence/prisma.service';
import { OutboxWorkerService } from './shared/maintenance/outbox-worker.service';
import { v4 as uuidv4 } from 'uuid';

async function simulate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const worker = app.get(OutboxWorkerService);

  console.log('--- STARTING RESILIENCE SIMULATION ---');

  // 0. Ensure valid tenant
  let company = await prisma.companies.findFirst();
  if (!company) {
    company = await prisma.companies.create({
      data: {
        id: uuidv4(),
        name: 'Simulation Corp',
        code: 'SIM-' + Date.now(),
        status: 'active',
        updated_at: new Date(),
      }
    });
    console.log(`Created new simulation tenant: ${company.id}`);
  }
  const tenant_id = company.id;
  console.log(`Using tenant_id: ${tenant_id}`);

  // 1. Cleanup old events
  await prisma.sys_outbox_events.deleteMany({ where: { tenant_id: tenant_id } });

  console.log('Step 1: Simulating Event Storm (100 Mixed Priority Events)...');
  const events = [];
  
  // 50 LOW priority (Insights)
  for (let i = 0; i < 50; i++) {
    events.push({
      id: uuidv4(),
      tenant_id: tenant_id,
      type: 'hr.insight.anomaly.v1',
      payload: { detail: `Insight ${i}` },
      status: 'PENDING',
      updated_at: new Date(),
    });
  }

  // 10 HIGH priority (Payroll)
  for (let i = 0; i < 10; i++) {
    events.push({
      id: uuidv4(),
      tenant_id: tenant_id,
      type: 'hr.payroll.executed.v1',
      payload: { 
        payrollRunId: uuidv4(),
        period: '2026-03',
        totalGross: 50000,
        totalNet: 42000,
        processedCount: 10
      },
      status: 'PENDING',
      updated_at: new Date(),
    });
  }

  await prisma.sys_outbox_events.createMany({ data: events });

  console.log('Step 2: Running Worker (Priority & Backpressure Check)...');
  await worker.handleOutbox();

  const processed = await prisma.sys_outbox_events.findMany({
    where: { tenant_id: tenant_id, status: 'PROCESSED' },
    orderBy: { updated_at: 'asc' },
  });

  console.log(`Processed: ${processed.length} events.`);
  const highPriorityProcessed = processed.filter((e: any) => e.type.includes('payroll'));
  console.log(`High Priority Processed: ${highPriorityProcessed.length}`);

  // 3. Trigger Degradation
  console.log('Step 3: Simulating High Error Rate (Degradation Mode)...');
  const failedEvents = [];
  for (let i = 0; i < 20; i++) {
    failedEvents.push({
      id: uuidv4(),
      tenant_id: tenant_id,
      type: 'hr.insight.test.v1',
      payload: { error: true },
      status: 'FAILED',
      attempts: 1,
      updated_at: new Date(),
    });
  }
  // 10 HIGH priority (Payroll)
  for (let i = 0; i < 10; i++) {
    events.push({
      id: uuidv4(),
      tenant_id: tenant_id,
      type: 'hr.payroll.executed.v1',
      payload: { 
        payrollRunId: uuidv4(),
        period: '2026-03',
        totalGross: 50000,
        totalNet: 42000,
        processedCount: 10
      },
      status: 'PENDING',
      updated_at: new Date(),
    });
  }

  console.log('Step 4: Waiting for Event Sweep (30s interval)...');
  await new Promise(resolve => setTimeout(resolve, 35000));

  console.log('--- SIMULATION COMPLETE ---');
  await app.close();
}

simulate().catch(err => {
  console.error(err);
  process.exit(1);
});
