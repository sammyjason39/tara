import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { SopService } from '../sop/sop.service';
import { EmbeddingService } from './embedding.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PDFParse } = require('pdf-parse');

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse(new Uint8Array(buffer));
  const result = await parser.getText();
  return result.text || '';
}

@Injectable()
export class SopIndexerService {
  private readonly logger = new Logger(SopIndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sopService: SopService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async indexDocument(sopDocumentId: string): Promise<number> {
    const doc = await this.sopService.findById(sopDocumentId);
    const filePath = await this.sopService.getFilePath(sopDocumentId);

    const buffer = await import('fs').then((fs) => fs.promises.readFile(filePath));
    const text = this.cleanText(await extractPdfText(buffer));

    if (!text.trim()) {
      this.logger.warn(`No text extracted from SOP ${doc.title}`);
      return 0;
    }

    await this.prisma.sopChunk.deleteMany({ where: { sop_document_id: sopDocumentId } });

    const chunks = this.splitIntoChunks(text);
    let indexed = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = `[${doc.title}] ${chunks[i]}`;
      let embedding: number[] = [];

      try {
        embedding = await this.embeddingService.embed(chunkText);
      } catch (err) {
        this.logger.warn(
          `Embedding failed for chunk ${i} (${err.message}) — storing text-only chunk for keyword RAG`,
        );
      }

      await this.prisma.sopChunk.create({
        data: {
          sop_document_id: sopDocumentId,
          chunk_index: i,
          content: chunkText,
          embedding,
          token_count: chunks[i].split(/\s+/).length,
        },
      });

      if (embedding.length > 0) {
        // Also store in pgvector column if available
        try {
          const vecStr = `[${embedding.join(',')}]`;
          await this.prisma.$executeRawUnsafe(
            `UPDATE sop_chunks SET embedding_vec = $1::vector WHERE sop_document_id = $2::uuid AND chunk_index = $3`,
            vecStr,
            sopDocumentId,
            i,
          );
        } catch {
          // pgvector column may not exist — JSONB embedding is sufficient
        }
      }

      indexed++;
    }

    this.logger.log(`Indexed ${indexed} chunks for SOP "${doc.title}"`);
    return indexed;
  }

  async removeDocumentIndex(sopDocumentId: string): Promise<void> {
    await this.prisma.sopChunk.deleteMany({ where: { sop_document_id: sopDocumentId } });
  }

  async reindexAll(): Promise<{ documents: number; chunks: number }> {
    const docs = await this.sopService.findAll(false);
    let totalChunks = 0;
    for (const doc of docs) {
      totalChunks += await this.indexDocument(doc.id);
    }
    return { documents: docs.length, chunks: totalChunks };
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);

      if (end < text.length) {
        const breakAt = text.lastIndexOf('. ', end);
        if (breakAt > start + CHUNK_SIZE / 2) end = breakAt + 1;
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 20) {
        chunks.push(chunk);
      }

      if (end >= text.length) break;
      start = end - CHUNK_OVERLAP;
    }

    return chunks;
  }
}
