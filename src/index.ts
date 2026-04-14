import { loadConfig, getApiKey } from "./config.js";
import { createAgent } from "./agent/engine.js";
import { createTelegramBot } from "./channels/telegram/bot.js";

const config = loadConfig();
const apiKey = getApiKey();

if (!apiKey) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
  console.log("\nTo set your API key, run:");
  console.log('  export ANTHROPIC_API_KEY="sk-ant-..."');
  process.exit(1);
}

console.log("Maxwell starting...");
console.log(`Model: ${config.model}`);
console.log(`Memory window: ${config.memory?.conversation_window || 50} messages`);

const agent = createAgent(config, apiKey);

const telegramEnabled = config.telegram?.enabled && config.telegram?.bot_token;

if (telegramEnabled) {
  console.log("Telegram: enabled");
} else {
  console.log("Telegram: disabled");
  console.log("  To enable: add bot_token to storage/config.json");
}

console.log("");

let telegramBot = null;

if (telegramEnabled) {
  console.log("Creating Telegram bot...");
  telegramBot = await createTelegramBot(config, agent);
  
  if (telegramBot) {
    console.log("Starting Telegram bot...");
    await telegramBot.start();
  }
}

console.log("\nMaxwell is running. Press Ctrl+C to stop.");

await new Promise(() => {});

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  if (telegramBot) {
    await telegramBot.stop();
  }
  process.exit(0);
});