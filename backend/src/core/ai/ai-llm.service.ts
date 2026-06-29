import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { AiConfigService } from './ai-config.service';
import { TARA_CLOCK_URL, TARA_PUBLIC_BASE_URL } from './ai.interfaces';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export interface LlmChatResult {
  content: string;
  toolsCalled: string[];
  toolOutputs: string[];
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class AiLlmService {
  private readonly logger = new Logger(AiLlmService.name);

  constructor(private readonly configService: AiConfigService) {}

  createClient() {
    const config = this.configService.getAiConfig();
    const apiKey = this.configService.getRawApiKey();
    const isOpenRouter = config.baseUrl.includes('openrouter.ai');

    return new ChatOpenAI({
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      apiKey,
      timeout: 90_000,
      maxRetries: 1,
      configuration: {
        baseURL: config.baseUrl,
        ...(isOpenRouter && {
          defaultHeaders: {
            'HTTP-Referer': TARA_PUBLIC_BASE_URL,
            'X-Title': 'TARA HR Assistant',
          },
        }),
      },
    });
  }

  async chatWithTools(params: {
    systemPrompt: string;
    history: { role: 'user' | 'assistant'; content: string }[];
    userMessage: string;
    tools: DynamicStructuredTool[];
  }): Promise<LlmChatResult> {
    const llm = this.createClient();
    const llmWithTools = params.tools.length > 0 ? llm.bindTools(params.tools) : llm;

    const messages: (SystemMessage | HumanMessage | AIMessage | ToolMessage)[] = [
      new SystemMessage(params.systemPrompt),
    ];

    for (const h of params.history) {
      messages.push(
        h.role === 'user' ? new HumanMessage(h.content) : new AIMessage(h.content),
      );
    }
    messages.push(new HumanMessage(params.userMessage));

    const toolsCalled: string[] = [];
    const toolOutputs: string[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let iterations = 0;
    const maxIterations = 4;

    while (iterations < maxIterations) {
      iterations++;
      const iterStart = Date.now();
      const response = await llmWithTools.invoke(messages);
      this.logger.log(`LLM iteration ${iterations} completed in ${Date.now() - iterStart}ms`);

      const usage = response.usage_metadata as { input_tokens?: number; output_tokens?: number } | undefined;
      inputTokens += usage?.input_tokens || 0;
      outputTokens += usage?.output_tokens || 0;

      messages.push(response);

      const toolCalls = response.tool_calls || [];
      if (toolCalls.length === 0) {
        const content =
          typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
        return { content, toolsCalled, toolOutputs, inputTokens, outputTokens };
      }

      for (const call of toolCalls) {
        toolsCalled.push(call.name);
        const tool = params.tools.find((t) => t.name === call.name);
        let result: string;

        try {
          if (!tool) {
            result = JSON.stringify({ error: `Tool tidak ditemukan: ${call.name}` });
          } else {
            const output = await tool.invoke(call.args);
            result = typeof output === 'string' ? output : JSON.stringify(output);
          }
        } catch (err) {
          result = JSON.stringify({ error: err.message || 'Tool execution failed' });
        }

        toolOutputs.push(result);

        messages.push(
          new ToolMessage({
            content: result,
            tool_call_id: call.id || call.name,
          }),
        );
      }
    }

    return {
      content: 'Maaf, permintaan terlalu kompleks. Silakan coba pertanyaan yang lebih spesifik.',
      toolsCalled,
      toolOutputs,
      inputTokens,
      outputTokens,
    };
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; model: string; message?: string }> {
    const start = Date.now();
    try {
      const llm = this.createClient();
      const config = this.configService.getAiConfig();
      const response = await llm.invoke([
        new SystemMessage('Balas dengan satu kata: OK'),
        new HumanMessage('test'),
      ]);
      return {
        success: true,
        latencyMs: Date.now() - start,
        model: config.model,
        message: typeof response.content === 'string' ? response.content : 'OK',
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        model: this.configService.getAiConfig().model,
        message: err.message,
      };
    }
  }
}
