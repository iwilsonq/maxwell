import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";

export interface TelegramConfig {
  enabled: boolean;
  bot_token?: string;
  chat_ids?: number[];
}

export interface SchedulerConfig {
  morning_brief?: string;
  enabled?: boolean;
}

export interface MemoryConfig {
  conversation_window: number;
}

export interface MaxwellConfig {
  provider: "anthropic";
  model: string;
  max_tokens: number;
  temperature: number;
  telegram: TelegramConfig;
  scheduler?: SchedulerConfig;
  memory?: MemoryConfig;
}

const DEFAULT_CONFIG: MaxwellConfig = {
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  temperature: 0.7,
  telegram: {
    enabled: false,
  },
  scheduler: {
    enabled: false,
  },
  memory: {
    conversation_window: 50,
  },
};

function getConfigPath(): string {
  return resolve(process.cwd(), "storage", "config.json");
}

function applyEnvOverrides(config: MaxwellConfig): MaxwellConfig {
  if (Bun.env.ANTHROPIC_API_KEY) {
    console.log("[Config] Using ANTHROPIC_API_KEY from environment");
  }

  if (Bun.env.TELEGRAM_BOT_TOKEN) {
    config.telegram.bot_token = Bun.env.TELEGRAM_BOT_TOKEN;
    config.telegram.enabled = true;
    console.log("[Config] Using TELEGRAM_BOT_TOKEN from environment");
  }

  if (Bun.env.MAXWELL_MODEL) {
    config.model = Bun.env.MAXWELL_MODEL;
    console.log(`[Config] Using model from MAXWELL_MODEL: ${config.model}`);
  }

  return config;
}

export function loadConfig(): MaxwellConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      Bun.mkdir(dir, { recursive: true });
    }
    const config = applyEnvOverrides(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
    return config;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const loaded = JSON.parse(content);
    const config = { ...DEFAULT_CONFIG, ...loaded };
    return applyEnvOverrides(config);
  } catch (error) {
    console.error("Failed to load config:", error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: MaxwellConfig): void {
  const configPath = getConfigPath();
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function getApiKey(): string | undefined {
  return Bun.env.ANTHROPIC_API_KEY;
}
