import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Local embedding service using @xenova/transformers.
 * Model: paraphrase-multilingual-MiniLM-L12-v2 (384 dims, ~120MB)
 *
 * Memory note: on 2 CPU / 4GB RAM, model loads lazily on first use.
 * Suitable for SOP RAG with moderate document count.
 */
@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private pipeline: any = null;
  private loading: Promise<void> | null = null;
  private readonly modelId = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
  readonly dimensions = 384;

  async onModuleInit() {
    // Lazy load — don't block startup on 4GB servers
    this.logger.log(`Embedding service ready (lazy load: ${this.modelId})`);
  }

  private async ensurePipeline(): Promise<void> {
    if (this.pipeline) return;
    if (this.loading) return this.loading;

    this.loading = (async () => {
      this.logger.log(`Loading embedding model ${this.modelId}...`);
      const { pipeline } = await import('@xenova/transformers');
      this.pipeline = await pipeline('feature-extraction', this.modelId, {
        quantized: true,
      });
      this.logger.log('Embedding model loaded');
    })();

    return this.loading;
  }

  async embed(text: string): Promise<number[]> {
    await this.ensurePipeline();
    const output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }
}
