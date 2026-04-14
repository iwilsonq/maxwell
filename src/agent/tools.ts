import type { Tool } from "../providers/anthropic.js";

export const SHELL_TOOL: Tool = {
  name: "shell",
  description: "Execute a shell command on the user's computer. Use this for running git commands, building/running programs, system operations, or any command-line tasks.",
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
    },
    required: ["command"],
  },
};

export const READ_FILE_TOOL: Tool = {
  name: "read_file",
  description: "Read the contents of a file. Returns the file content or error if file doesn't exist or can't be read.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path to the file to read",
      },
    },
    required: ["path"],
  },
};

export const WRITE_FILE_TOOL: Tool = {
  name: "write_file",
  description: "Create or overwrite a file with new content. Include appropriate formatting and imports.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path where to write the file",
      },
      content: {
        type: "string",
        description: "The content to write to the file",
      },
    },
    required: ["path", "content"],
  },
};

export const LIST_DIRECTORY_TOOL: Tool = {
  name: "list_directory",
  description: "List files and directories in a folder. Shows file names, sizes, and modification dates.",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The path to the directory to list",
      },
    },
    required: ["path"],
  },
};

export const GLOB_TOOL: Tool = {
  name: "glob",
  description: "Find files matching a pattern. Use glob patterns like '**/*.ts' or 'src/**/*.js'.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The glob pattern to match files",
      },
      path: {
        type: "string",
        description: "The base path to search from (default: current directory)",
      },
    },
    required: ["pattern"],
  },
};

export const GREP_TOOL: Tool = {
  name: "grep",
  description: "Search for text within files. Returns matching lines with file paths and line numbers.",
  input_schema: {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description: "The text pattern to search for",
      },
      path: {
        type: "string",
        description: "The path to search in (file or directory)",
      },
    },
    required: ["pattern", "path"],
  },
};

export const WEB_FETCH_TOOL: Tool = {
  name: "web_fetch",
  description: "Fetch content from a URL. Useful for getting documentation or web content.",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch",
      },
    },
    required: ["url"],
  },
};

export const AVAILABLE_TOOLS: Tool[] = [
  SHELL_TOOL,
  READ_FILE_TOOL,
  WRITE_FILE_TOOL,
  LIST_DIRECTORY_TOOL,
  GLOB_TOOL,
  GREP_TOOL,
  WEB_FETCH_TOOL,
];

export function getTools(): Tool[] {
  return AVAILABLE_TOOLS;
}