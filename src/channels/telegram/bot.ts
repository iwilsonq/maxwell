import { Bot, Context } from "grammy";
import type { MaxellConfig } from "../../config.js";
import { AgentEngine } from "../../agent/engine.js";

export interface TelegramHandlerConfig {
  bot: Bot;
  agent: AgentEngine;
}

export class TelegramHandler {
  private bot: Bot;
  private agent: AgentEngine;
  private isRunning: boolean = false;

  constructor(bot: Bot, agent: AgentEngine) {
    this.bot = bot;
    this.agent = agent;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    console.log("[Telegram] Setting up handlers...");

    this.bot.use(async (ctx, next) => {
      console.log("[Telegram] DEBUG: Received update type:", ctx.update.update_id, "message:", ctx.message?.text);
      await next();
    });

    this.bot.on("message", async (ctx: Context) => {
      console.log("[Telegram] DEBUG: Caught message:", ctx.message);
      if (!ctx.message?.text) {
        await ctx.reply("I can only process text messages for now.");
        return;
      }

      const text = ctx.message.text;
      const chatId = ctx.chat.id;

      console.log(`[Telegram] DEBUG: Text message: "${text}" from ${chatId}`);

      if (text.startsWith("/")) {
        console.log("[Telegram] DEBUG: Handling command...");
        await this.handleCommand(ctx, text);
        return;
      }

      console.log(`[Telegram] Processing message from ${chatId}: ${text.substring(0, 50)}...`);

      await ctx.api.sendChatAction(chatId, "typing");

      try {
        const response = await this.agent.chat(text);
        
        const chunks = this.splitResponse(response, 4000);
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      } catch (error) {
        console.error("[Telegram] Error:", error);
        await ctx.reply(`Error: ${error}`);
      }
    });
  }

  private async handleCommand(ctx: Context, text: string): Promise<void> {
    const command = text.split(" ")[0].toLowerCase();
    const args = text.split(" ").slice(1).join(" ");

    switch (command) {
      case "/start":
        await ctx.reply("Hi! I'm Maxwell, your AI assistant. Send me a message and I'll help you out!");
        break;

      case "/help":
        await ctx.reply(`Available commands:
/start - Start a conversation
/help - Show this help
/history - Show conversation history
/clear - Clear conversation history
/status - Show agent status`);
        break;

      case "/history":
        const history = this.agent.getHistory();
        if (history.length === 0) {
          await ctx.reply("No conversation history yet.");
        } else {
          const summary = history.slice(-5).map(m => 
            `${m.role === "user" ? "You" : "Me"}: ${m.content.substring(0, 100)}...`
          ).join("\n\n");
          await ctx.reply(summary);
        }
        break;

      case "/clear":
        this.agent.clearHistory();
        await ctx.reply("Conversation history cleared!");
        break;

      case "/status":
        const historyCount = this.agent.getHistory().length;
        await ctx.reply(`Status: Running\nMessages in memory: ${historyCount}`);
        break;

      default:
        await ctx.reply(`Unknown command: ${command}. Try /help for available commands.`);
    }
  }

  private splitResponse(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    if (text.length <= maxLength) {
      return [text];
    }

    const lines = text.split("\n");
    let current = "";

    for (const line of lines) {
      if ((current + "\n" + line).length > maxLength) {
        if (current) chunks.push(current);
        current = line;
      } else {
        current += (current ? "\n" : "") + line;
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("[Telegram] Bot already running");
      return;
    }

    console.log("[Telegram] Starting bot with long polling...");

    try {
      this.bot.start({
        onStart: (info) => {
          console.log(`[Telegram] Bot started successfully: @${info.username}`);
          this.isRunning = true;
        },
      });
    } catch (error: any) {
      console.log("[Telegram] Caught start error:", error.message || error);
      console.log("[Telegram] Attempting to continue anyway...");
      this.isRunning = true;
    }

    console.log("[Telegram] Bot start() completed, should be polling...");
  }

  async stop(): Promise<void> {
    this.bot.stop();
    this.isRunning = false;
    console.log("[Telegram] Bot stopped");
  }
}

export async function createTelegramBot(config: MaxellConfig, agent: AgentEngine): Promise<TelegramHandler | null> {
  const token = config.telegram?.bot_token;

  if (!token) {
    console.log("[Telegram] No bot token configured");
    return null;
  }

  if (!config.telegram?.enabled) {
    console.log("[Telegram] Telegram is disabled in config");
    return null;
  }

  console.log("[Telegram] Creating bot with token:", token.substring(0, 10) + "...");

  const bot = new Bot(token);

  console.log("[Telegram] Creating handler...");

  const handler = new TelegramHandler(bot, agent);

  console.log("[Telegram] Bot enabled, chat_ids:", config.telegram.chat_ids);

  return handler;
}