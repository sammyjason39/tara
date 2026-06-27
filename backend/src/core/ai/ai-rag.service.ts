import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { EmbeddingService } from './embedding.service';

export interface RagSearchResult {
  content: string;
  documentTitle: string;
  documentId: string;
  score: number;
}

@Injectable()
export class AiRagService {
  private readonly logger = new Logger(AiRagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async search(query: string, topK = 5): Promise<RagSearchResult[]> {
    const chunks = await this.prisma.sopChunk.findMany({
      where: { document: { is_active: true } },
      include: { document: { select: { title: true } } },
      take: 500,
    });

    if (chunks.length === 0) return [];

    const embeddedChunks = chunks.filter(
      (c) => Array.isArray(c.embedding) && (c.embedding as number[]).length > 0,
    );

    if (embeddedChunks.length > 0) {
      try {
        const queryEmbedding = await this.embeddingService.embed(query);

        // Try pgvector first
        try {
          const vecStr = `[${queryEmbedding.join(',')}]`;
          const rows: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT sc.content, sc.sop_document_id, sd.title as document_title,
                    1 - (sc.embedding_vec <=> $1::vector) as score
             FROM sop_chunks sc
             JOIN sop_documents sd ON sd.id = sc.sop_document_id
             WHERE sc.embedding_vec IS NOT NULL AND sd.is_active = true
             ORDER BY sc.embedding_vec <=> $1::vector
             LIMIT $2`,
            vecStr,
            topK,
          );

          if (rows.length > 0) {
            return rows.map((r) => ({
              content: r.content,
              documentTitle: r.document_title,
              documentId: r.sop_document_id,
              score: Number(r.score),
            }));
          }
        } catch (err) {
          this.logger.debug(`pgvector search unavailable, using JSONB fallback: ${err.message}`);
        }

        return embeddedChunks
          .map((c) => ({
            content: c.content,
            documentTitle: c.document.title,
            documentId: c.sop_document_id,
            score: this.embeddingService.cosineSimilarity(
              queryEmbedding,
              c.embedding as number[],
            ),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);
      } catch (err) {
        this.logger.warn(`Semantic search failed (${err.message}) — using keyword fallback`);
      }
    }

    return this.keywordSearch(query, chunks, topK);
  }

  private keywordSearch(
    query: string,
    chunks: Array<{ content: string; sop_document_id: string; document: { title: string } }>,
    topK: number,
  ): RagSearchResult[] {
    const terms = query
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    return chunks
      .map((c) => {
        const text = c.content.toLowerCase();
        let score = 0;
        for (const term of terms) {
          if (text.includes(term)) score += 1;
        }
        if (text.includes('3 hari') && (query.includes('3') || query.includes('minimal'))) {
          score += 2;
        }
        return {
          content: c.content,
          documentTitle: c.document.title,
          documentId: c.sop_document_id,
          score: terms.length > 0 ? score / (terms.length + 2) : score,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  formatContextForPrompt(results: RagSearchResult[]): string {
    if (results.length === 0) {
      return 'Tidak ada dokumen SOP yang relevan ditemukan.';
    }

    return results
      .map(
        (r, i) =>
          `[SOP ${i + 1}: ${r.documentTitle}] (relevansi: ${(r.score * 100).toFixed(0)}%)\n${r.content}`,
      )
      .join('\n\n---\n\n');
  }
}
