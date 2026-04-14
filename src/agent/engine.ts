import {
  AnthropicProvider,
  Message,
  ContentBlock,
  createProvider,
} from "../providers/anthropic.js";
import { buildSystemPrompt } from "./prompts.js";
import { getTools } from "./tools.js";
import { executeTool } from "./execute.js";
import { ConversationStore, type StoredMessage } from "../memory/conversation.js";
import type { MaxwellConfig } from "../config.js";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export class AgentEngine {
  private provider: AnthropicProvider;
  private systemPrompt: string;
  private conversationHistory: ConversationMessage[] = [];
  private maxHistory: number;
  private store: ConversationStore;

  constructor(config: MaxwellConfig, apiKey: string) {
    this.provider = createProvider(
      apiKey,
      config.model,
      config.max_tokens,
      config.temperature,
    );
    this.systemPrompt = buildSystemPrompt();
    this.maxHistory = config.memory?.conversation_window || 50;
    this.store = new ConversationStore("storage/memory");
    
    this.loadHistory();
  }

  private loadHistory(): void {
    const stored = this.store.loadRecentMessages(7, this.maxHistory);
    this.conversationHistory = stored.map((m: StoredMessage) => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    }));
    if (this.conversationHistory.length > 0) {
      console.log(`[Memory] Loaded ${this.conversationHistory.length} messages from storage`);
    }
  }

  private saveMessage(role: "user" | "assistant", content: string): void {
    this.store.saveMessage(role, content);
  }

  async chat(userMessage: string): Promise<string> {
    const conversationStartMsg: Message = { role: "user", content: userMessage };
    
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    const initialMessages = this.buildMessages();
    initialMessages.push(conversationStartMsg);

    const response = await this.provider.chat(initialMessages, getTools());

    const textParts: string[] = [];
    const toolCalls: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }> = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textParts.push(block.text || "");
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id || "",
          name: block.name || "",
          input: block.input || {},
        });
      }
    }

    const fullResponse = textParts.join("");

    if (toolCalls.length > 0) {
      const toolResults = await this.executeTools(toolCalls);

      const assistantMsgWithTools: Message = {
        role: "assistant",
        content: fullResponse,
      };

      const toolResultMsg: Message = {
        role: "user",
        content: "",
        tool_results: toolCalls.map((tc, i) => ({
          tool_use_id: tc.id,
          content: toolResults[i],
          type: "tool_result",
        })),
      };

      const followUp = await this.provider.chat(
        [assistantMsgWithTools, toolResultMsg],
        getTools(),
      );

      const followUpText = followUp.content
        .filter((b) => b.type === "text")
        .map((b) => b.text || "")
        .join("");

      const finalResponse = fullResponse + (followUpText ? "\n\n" + followUpText : "");

      this.conversationHistory.push({
        role: "assistant",
        content: finalResponse,
        timestamp: Date.now(),
      });

      this.saveMessage("assistant", finalResponse);

      return finalResponse;
    }

    this.conversationHistory.push({
      role: "assistant",
      content: fullResponse,
      timestamp: Date.now(),
    });

    this.saveMessage("assistant", fullResponse);

    return fullResponse;
  }

  private buildMessages(): Message[] {
    const messages: Message[] = [
      { role: "system", content: this.systemPrompt },
    ];

    if (this.conversationHistory.length > this.maxHistory) {
      const recent = this.conversationHistory.slice(-this.maxHistory);
      messages.push({
        role: "user",
        content: `Recent conversation context:\n${recent
          .map(
            (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
          )
          .join("\n")}`,
      });
    } else if (this.conversationHistory.length > 0) {
      for (const msg of this.conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    return messages;
  }

  private async executeTools(
    toolCalls: Array<{
      id: string;
      name: string;
      input: Record<string, unknown>;
    }>,
  ): Promise<string[]> {
    const results: string[] = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await executeTool(
          toolCall.name,
          toolCall.input as Record<string, unknown>,
        );
        results.push(result);
      } catch (error) {
        results.push(`Error executing ${toolCall.name}: ${error}`);
      }
    }

    return results;
  }

  getHistory(): ConversationMessage[] {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}

export function createAgent(
  config: MaxwellConfig,
  apiKey: string,
): AgentEngine {
  return new AgentEngine(config, apiKey);
}
