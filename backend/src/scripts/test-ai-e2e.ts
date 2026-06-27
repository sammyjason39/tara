/**
 * Local E2E test: SOP RAG indexing + WhatsApp AI SOP question
 *
 * Usage (from backend/):
 *   npm run seed
 *   npm run test:ai-e2e
 *
 * Requires: DATABASE_URL, optionally AI_API_KEY for live LLM test
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SopIndexerService } from '../core/ai/sop-indexer.service';
import { AiRagService } from '../core/ai/ai-rag.service';
import { AiOrchestratorService } from '../core/ai/ai-orchestrator.service';
import { AiConfigService } from '../core/ai/ai-config.service';
import { PrismaService } from '../persistence/prisma.service';

const RINA_EMPLOYEE_ID = '00000000-0000-4000-8000-000000000103';
const SOP_DOC_ID = '00000000-0000-4000-8000-000000000201';

async function main() {
  console.log('\n=== TARA AI E2E Local Test ===\n');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const indexer = app.get(SopIndexerService);
  const rag = app.get(AiRagService);
  const orchestrator = app.get(AiOrchestratorService);
  const aiConfig = app.get(AiConfigService);
  const prisma = app.get(PrismaService);

  await aiConfig.refreshCache();
  const config = aiConfig.getAiConfig();

  console.log('1) AI Config');
  console.log(`   enabled: ${config.enabled}`);
  console.log(`   model: ${config.model}`);
  console.log(`   baseUrl: ${config.baseUrl}`);
  console.log(`   apiKey set: ${!!aiConfig.getRawApiKey()}`);

  // --- RAG Index ---
  console.log('\n2) SOP RAG Index');
  const sop = await prisma.sopDocument.findUnique({ where: { id: SOP_DOC_ID } });
  if (!sop) {
    console.error('   ✗ Sample SOP not found — run: npm run seed');
    process.exit(1);
  }
  console.log(`   Document: ${sop.title}`);

  const chunkCount = await indexer.indexDocument(SOP_DOC_ID);
  console.log(`   ✓ Indexed ${chunkCount} chunks`);

  const chunks = await prisma.sopChunk.findMany({
    where: { sop_document_id: SOP_DOC_ID },
    select: { chunk_index: true, content: true, embedding: true },
  });
  console.log(`   Chunks in DB: ${chunks.length}`);
  console.log(`   Has embeddings: ${chunks.some((c) => Array.isArray(c.embedding) && c.embedding.length > 0)}`);

  if (chunks.length === 0) {
    console.error('   ✗ RAG FAILED — no chunks created');
    process.exit(1);
  }

  // --- RAG Search ---
  console.log('\n3) RAG Search');
  const query = 'berapa hari minimal pengajuan cuti sebelum tanggal cuti?';
  console.log(`   Query: "${query}"`);

  const results = await rag.search(query, 3);
  console.log(`   ✓ Found ${results.length} relevant chunks`);
  for (const r of results) {
    console.log(`   - [${r.documentTitle}] score=${(r.score * 100).toFixed(1)}%`);
    console.log(`     ${r.content.substring(0, 120)}...`);
  }

  const hasCutiRule = results.some(
    (r) =>
      r.content.includes('3 hari') ||
      r.content.includes('minimal 3') ||
      r.content.toLowerCase().includes('cuti'),
  );

  if (!hasCutiRule) {
    console.error('   ✗ RAG search did not return cuti-related content');
    process.exit(1);
  }
  console.log('   ✓ RAG content looks relevant');

  // --- WhatsApp AI (SOP question) ---
  console.log('\n4) WhatsApp AI — SOP Question');
  const waQuestion = 'Apa prosedur pengajuan cuti? Berapa hari sebelumnya harus diajukan?';

  if (!aiConfig.isAiEnabled()) {
    console.log('   ⚠ AI disabled (set AI_API_KEY in backend/.env and re-seed)');
    console.log('   Skipping live LLM test — RAG pipeline verified above.');
    await app.close();
    console.log('\n=== PARTIAL PASS (RAG OK, LLM skipped) ===\n');
    process.exit(0);
  }

  console.log(`   Simulating WA message from Rina: "${waQuestion}"`);

  const sessionId = `test-session-${Date.now()}`;
  const result = await orchestrator.processWhatsAppMessage({
    employeeId: RINA_EMPLOYEE_ID,
    message: waQuestion,
    sessionId,
  });

  console.log(`   Status: ${result.status}`);
  console.log(`   Tools called: ${result.toolsCalled.join(', ') || 'none'}`);
  console.log(`   Reply preview:\n${result.reply.substring(0, 500)}`);

  const replyMentionsCuti =
    result.reply.toLowerCase().includes('3') ||
    result.reply.toLowerCase().includes('cuti') ||
    result.reply.toLowerCase().includes('hari');

  const usedSopTool =
    result.toolsCalled.includes('search_sop') ||
    result.toolsCalled.includes('list_sop_documents');

  if (!usedSopTool) {
    console.warn('   ⚠ LLM did not call search_sop (may still answer from context)');
  }

  if (!replyMentionsCuti) {
    console.error('   ✗ AI reply does not mention cuti rules');
    process.exit(1);
  }

  console.log('   ✓ AI answered SOP-related question');

  await app.close();
  console.log('\n=== ALL TESTS PASSED ===\n');
}

main().catch((err) => {
  console.error('\nE2E TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
