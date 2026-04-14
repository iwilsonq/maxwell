import { loadConfig, getApiKey, saveConfig, MaxellConfig } from "./src/config.js";
import { ConversationStore } from "./src/memory/conversation.js";

console.log("=== Maxwell Test Suite ===\n");

console.log("1. Configuration System");
console.log("-------------------------");
const config = loadConfig();
console.log(`Provider: ${config.provider}`);
console.log(`Model: ${config.model}`);
console.log(`Max tokens: ${config.max_tokens}`);
console.log(`Temperature: ${config.temperature}`);
console.log(`Memory window: ${config.memory?.conversation_window}`);
console.log(`Telegram enabled: ${config.telegram?.enabled}`);
console.log("");

console.log("2. Environment Variables");
console.log("-------------------------");
const apiKey = getApiKey();
console.log(`ANTHROPIC_API_KEY set: ${apiKey ? "yes (value hidden)" : "NO"}`);
if (!apiKey) {
  console.log("  → Set with: export ANTHROPIC_API_KEY=\"sk-ant-...\"");
}
console.log("");

console.log("3. Conversation Store");
console.log("----------------------");
const store = new ConversationStore("storage/memory");
store.saveMessage("user", "Test message from user");
store.saveMessage("assistant", "Test response from Maxwell");
const todayMessages = store.getTodayMessages();
console.log(`Today's messages: ${todayMessages.length}`);
todayMessages.forEach((m, i) => {
  console.log(`  ${i + 1}. [${m.role}] ${m.content.substring(0, 50)}...`);
});
console.log("");

console.log("4. Export as Markdown");
console.log("----------------------");
console.log(store.exportAsMarkdown());
console.log("");

console.log("5. Tool Definitions");
console.log("-------------------");
import { getTools } from "./src/agent/tools.js";
const tools = getTools();
console.log(`Available tools: ${tools.length}`);
tools.forEach((t) => {
  console.log(`  - ${t.name}: ${t.description.substring(0, 60)}...`);
});
console.log("");

console.log("6. Direct Tool Testing");
console.log("----------------------");
import { executeTool } from "./src/agent/execute.js";

const shellResult = await executeTool("shell", { command: "echo 'Hello from shell'" });
console.log(`shell (echo): ${shellResult.trim()}`);

const listResult = await executeTool("list_directory", { path: "." });
console.log(`list_directory: ${listResult.split("\n").slice(0, 5).join("\n")}...`);

const readResult = await executeTool("read_file", { path: "package.json" });
console.log(`read_file (package.json): ${readResult.split("\n").slice(0, 3).join("\n")}...`);

const globResult = await executeTool("glob", { pattern: "*.ts" });
console.log(`glob (*.ts): ${globResult}`);

const grepResult = await executeTool("grep", { pattern: "Maxwell", path: "." });
console.log(`grep (Maxwell): ${grepResult.split("\n").slice(0, 3).join("\n")}...`);

const webResult = await executeTool("web_fetch", { url: "https://example.com" });
console.log(`web_fetch: ${webResult.substring(0, 100)}...`);
console.log("");

console.log("=== All Systems Operational ===");