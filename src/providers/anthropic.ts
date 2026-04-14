export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  type: "tool_result";
  is_error?: boolean;
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
}

export interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: ContentBlock[];
  model: string;
  stop_reason: string;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export class AnthropicProvider {
  private apiKey: string;
  private baseUrl = "https://api.anthropic.com/v1";
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(
    apiKey: string,
    model: string = "claude-sonnet-4-20250514",
    maxTokens: number = 4096,
    temperature: number = 0.7
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.temperature = temperature;
  }

  async chat(
    messages: Message[],
    tools?: Tool[]
  ): Promise<{ content: ContentBlock[]; usage?: { input: number; output: number } }> {
    const anthropicVersion = "2023-06-01";

    const systemMessage = messages.find(m => m.role === "system")?.content || null;
    const nonSystemMessages = messages.filter(m => m.role !== "system");

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: this.formatMessages(nonSystemMessages),
    };

    if (systemMessage) {
      body.system = systemMessage;
    }

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data: ClaudeResponse = await response.json();

    return {
      content: data.content,
      usage: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
      },
    };
  }

  private formatMessages(messages: Message[]): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      const contentBlocks: Array<Record<string, unknown>> = [];

      if (msg.role === "system") {
        return { role: "system", content: msg.content };
      }

      if (msg.content && typeof msg.content === "string" && msg.content.trim()) {
        contentBlocks.push({ type: "text", text: msg.content });
      }

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          contentBlocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          });
        }
      }

      if (msg.tool_results && msg.tool_results.length > 0) {
        for (const tr of msg.tool_results) {
          contentBlocks.push({
            type: "tool_result",
            tool_use_id: tr.tool_use_id,
            content: tr.content,
            is_error: tr.is_error,
          });
        }
      }

      return {
        role: msg.role,
        content: contentBlocks,
      };
    });
  }
}

export function createProvider(apiKey: string, model: string, maxTokens: number, temperature: number): AnthropicProvider {
  return new AnthropicProvider(apiKey, model, maxTokens, temperature);
}