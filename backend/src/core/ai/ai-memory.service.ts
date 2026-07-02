import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Memory } from 'mem0ai/oss';
import { AiConfigService } from './ai-config.service';
import { EmbeddingService } from './embedding.service';
import { TaraLocalEmbeddings } from './tara-local.embeddings';

const MEM0_DATA_DIR = process.env.MEM0_DATA_DIR || '/var/data/tara/mem0';

/**
 * Long-term memory for TARA AI agents via mem0 (https://github.com/mem0ai/mem0).
 * Stores per-employee facts/preferences extracted from WhatsApp conversations.
 */
@Injectable()
export class AiMemoryService implements OnModuleDestroy {
  private readonly logger = new Logger(AiMemoryService.name);
  private memory: Memory | null = null;
  private initPromise: Promise<Memory | null> | null = null;

  constructor(
    private readonly configService: AiConfigService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  onModuleDestroy() {
    this.memory = null;
    this.initPromise = null;
  }

  isEnabled(): boolean {
    return this.configService.isAiEnabled();
  }

  async searchMemories(employeeId: string, query: string, topK = 5): Promise<string[]> {
    const mem = await this.getMemory();
    if (!mem) return [];

    try {
      const result = await mem.search(query, {
        topK,
        filters: { user_id: employeeId },
      });
      return (result.results || [])
        .map((r) => r.memory)
        .filter((m): m is string => !!m && m.trim().length > 0);
    } catch (err) {
      this.logger.warn(`[MEM0] Search failed for ${employeeId}: ${err.message}`);
      return [];
    }
  }

  async rememberConversation(
    employeeId: string,
    userMessage: string,
    assistantMessage: string,
  ): Promise<void> {
    const mem = await this.getMemory();
    if (!mem) return;

    const trimmedUser = userMessage.trim();
    const trimmedAssistant = assistantMessage.trim();
    if (!trimmedUser || !trimmedAssistant) return;

    // Skip mem0 extraction when user is only challenging identity / claiming a different name
    if (/nama\s+saya|panggil\s+saya|saya\s+(ini\s+)?adalah|bukan\s+nama/i.test(trimmedUser)) {
      this.logger.debug(`[MEM0] Skipping identity-claim message for ${employeeId}`);
      return;
    }

    try {
      await mem.add(
        [
          { role: 'user', content: trimmedUser },
          { role: 'assistant', content: trimmedAssistant },
        ],
        {
          userId: employeeId,
          metadata: { source: 'tara_whatsapp', channel: 'whatsapp' },
        },
      );
    } catch (err) {
      this.logger.warn(`[MEM0] Add failed for ${employeeId}: ${err.message}`);
    }
  }

  private async getMemory(): Promise<Memory | null> {
    if (!this.isEnabled()) return null;
    if (this.memory) return this.memory;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initMemory();
    this.memory = await this.initPromise;
    return this.memory;
  }

  private async initMemory(): Promise<Memory | null> {
    const ai = this.configService.getAiConfig();
    if (!ai.apiKey) return null;

    try {
      const fs = await import('fs');
      fs.mkdirSync(MEM0_DATA_DIR, { recursive: true });

      fs.mkdirSync(MEM0_DATA_DIR, { recursive: true });

      const embeddings = new TaraLocalEmbeddings(this.embeddingService);

      const mem = new Memory({
        disableHistory: true,
        customInstructions:
          'Ekstrak fakta penting tentang karyawan HR: preferensi cuti, riwayat pertanyaan, ' +
          'kebiasaan kerja, dan konteks yang berguna untuk asisten HR di masa depan. ' +
          'JANGAN simpan atau mengubah nama, identitas, NIK, atau klaim "nama saya X" dari user. ' +
          'Identitas karyawan selalu diambil dari database TARA, bukan dari chat. ' +
          'Gunakan Bahasa Indonesia untuk teks memori.',
        embedder: {
          provider: 'langchain',
          config: {
            model: embeddings,
            embeddingDims: this.embeddingService.dimensions,
          },
        },
        vectorStore: {
          provider: 'memory',
          config: {
            collectionName: 'tara_ai_memories',
            dimension: this.embeddingService.dimensions,
            dbPath: `${MEM0_DATA_DIR}/vectors.db`,
          },
        },
        llm: {
          provider: 'openai',
          config: {
            apiKey: ai.apiKey,
            model: ai.model,
            baseURL: ai.baseUrl,
            temperature: 0.2,
            maxTokens: 512,
          },
        },
      });

      this.logger.log(`[MEM0] Memory layer initialized (data: ${MEM0_DATA_DIR})`);
      return mem;
    } catch (err) {
      this.logger.error(`[MEM0] Init failed: ${err.message}`, err.stack);
      return null;
    }
  }
}
