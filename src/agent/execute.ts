import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";
import { spawn } from "child_process";
import type { ContentBlock } from "../providers/anthropic.js";

interface ToolInput {
  command?: string;
  path?: string;
  content?: string;
  pattern?: string;
  url?: string;
}

export async function executeTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case "shell":
      return await executeShell(input.command || "");
    case "read_file":
      return executeReadFile(input.path || "");
    case "write_file":
      return executeWriteFile(input.path || "", input.content || "");
    case "list_directory":
      return executeListDirectory(input.path || ".");
    case "glob":
      return await executeGlob(input.pattern || "", input.path || ".");
    case "grep":
      return await executeGrep(input.pattern || "", input.path || ".");
    case "web_fetch":
      return await executeWebFetch(input.url || "");
    default:
      return `Unknown tool: ${name}`;
  }
}

async function executeShell(command: string): Promise<string> {
  return new Promise((resolve) => {
    const parts = command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);

    const proc = spawn(cmd, args, {
      shell: true,
      cwd: process.cwd(),
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      let result = "";
      if (stdout) result += stdout;
      if (stderr) result += "\n[stderr]\n" + stderr;
      if (code !== 0) result += `\n[exit code: ${code}]`;
      resolve(result || "[no output]");
    });

    proc.on("error", (err) => {
      resolve(`Error: ${err.message}`);
    });

    setTimeout(() => {
      proc.kill();
      resolve("Timed out after 60 seconds");
    }, 60000);
  });
}

function executeReadFile(filePath: string): string {
  try {
    const resolved = resolve(filePath);
    if (!existsSync(resolved)) {
      return `Error: File not found: ${filePath}`;
    }
    return readFileSync(resolved, "utf-8");
  } catch (error) {
    return `Error reading file: ${error}`;
  }
}

function executeWriteFile(filePath: string, content: string): string {
  try {
    const resolved = resolve(filePath);
    const dir = resolved.substring(0, resolved.lastIndexOf("/"));
    if (!existsSync(dir)) {
      const { mkdirSync } = require("fs");
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(resolved, content);
    return `File written: ${filePath}`;
  } catch (error) {
    return `Error writing file: ${error}`;
  }
}

function executeListDirectory(dirPath: string): string {
  try {
    const resolved = resolve(dirPath);
    if (!existsSync(resolved)) {
      return `Error: Directory not found: ${dirPath}`;
    }
    const entries = readdirSync(resolved);
    const items = entries.map((name) => {
      const fullPath = join(resolved, name);
      const stats = statSync(fullPath);
      const type = stats.isDirectory() ? "[DIR]" : "[FILE]";
      const size = stats.isFile() ? stats.size : 0;
      return `${type} ${name}${size ? ` (${size} bytes)` : ""}`;
    });
    return items.join("\n") || "[empty directory]";
  } catch (error) {
    return `Error listing directory: ${error}`;
  }
}

async function executeGlob(pattern: string, basePath: string): Promise<string> {
  const { glob: globFn } = await import("glob");
  const resolved = resolve(basePath);
  const files = await globFn(pattern, { cwd: resolved });
  return files.length > 0 ? files.join("\n") : "No files matched";
}

async function executeGrep(pattern: string, searchPath: string): Promise<string> {
  const resolved = resolve(searchPath);
  const results: string[] = [];

  async function searchDir(dir: string) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory() && !entry.startsWith(".")) {
        await searchDir(fullPath);
      } else if (stats.isFile()) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          lines.forEach((line, i) => {
            if (line.toLowerCase().includes(pattern.toLowerCase())) {
              results.push(`${relative(process.cwd(), fullPath)}:${i + 1}: ${line}`);
            }
          });
        } catch {}
      }
    }
  }

  await searchDir(resolved);
  return results.length > 0 ? results.join("\n") : "No matches found";
}

async function executeWebFetch(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const truncated = text.length > 10000 ? text.substring(0, 10000) + "\n... [truncated]" : text;
    return truncated;
  } catch (error) {
    return `Error fetching URL: ${error}`;
  }
}

export function processToolResults(blocks: ContentBlock[]): Array<{ id: string; name: string; result: string }> {
  const results: Array<{ id: string; name: string; result: string }> = [];

  for (const block of blocks) {
    if (block.type === "tool_result") {
      results.push({
        id: block.tool_use_id || "",
        name: "",
        result: block.content || "",
      });
    }
  }

  return results;
}