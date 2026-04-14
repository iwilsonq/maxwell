import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { resolve, join } from "path";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export class ConversationStore {
  private storageDir: string;

  constructor(storageDir: string = "storage/memory") {
    this.storageDir = resolve(process.cwd(), storageDir);
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getDateKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  private getFilePath(dateKey?: string): string {
    const key = dateKey || this.getDateKey();
    return join(this.storageDir, `${key}.json`);
  }

  saveMessage(role: "user" | "assistant", content: string): void {
    const dateKey = this.getDateKey();
    const filePath = this.getFilePath(dateKey);
    const messages = this.loadMessagesForDate(dateKey);

    messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    writeFileSync(filePath, JSON.stringify(messages, null, 2));
  }

  loadMessagesForDate(dateKey: string): StoredMessage[] {
    const filePath = this.getFilePath(dateKey);

    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  loadRecentMessages(days: number = 7, limit: number = 100): StoredMessage[] {
    const messages: StoredMessage[] = [];
    const files = readdirSync(this.storageDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    for (const file of files.slice(0, days)) {
      const dateKey = file.replace(".json", "");
      const dateMessages = this.loadMessagesForDate(dateKey);
      messages.push(...dateMessages);

      if (messages.length >= limit) {
        break;
      }
    }

    return messages.slice(-limit);
  }

  getTodayMessages(): StoredMessage[] {
    return this.loadMessagesForDate(this.getDateKey());
  }

  clearOldMessages(daysToKeep: number = 30): number {
    const files = readdirSync(this.storageDir).filter((f) => f.endsWith(".json"));
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}-${String(cutoffDate.getDate()).padStart(2, "0")}`;

    let deleted = 0;
    for (const file of files) {
      const dateKey = file.replace(".json", "");
      if (dateKey < cutoffKey) {
        const filePath = join(this.storageDir, file);
        const { unlinkSync } = require("fs");
        unlinkSync(filePath);
        deleted++;
      }
    }

    return deleted;
  }

  exportAsMarkdown(): string {
    const messages = this.loadRecentMessages(7, 100);
    if (messages.length === 0) {
      return "# Conversation History\n\nNo messages yet.";
    }

    let md = "# Conversation History\n\n";

    for (const msg of messages) {
      const date = new Date(msg.timestamp).toLocaleString();
      const speaker = msg.role === "user" ? "**User**" : "**Maxwell**";
      md += `### ${date}\n\n${speaker}: ${msg.content}\n\n---\n\n`;
    }

    return md;
  }
}

export function createConversationStore(dir?: string): ConversationStore {
  return new ConversationStore(dir);
}