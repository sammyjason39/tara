import { Embeddings } from '@langchain/core/embeddings';
import { EmbeddingService } from './embedding.service';

/** LangChain adapter for TARA's local Xenova embedding model (384 dims). */
export class TaraLocalEmbeddings extends Embeddings {
  constructor(private readonly embeddingService: EmbeddingService) {
    super({});
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embeddingService.embedBatch(texts);
  }

  embedQuery(text: string): Promise<number[]> {
    return this.embeddingService.embed(text);
  }
}
