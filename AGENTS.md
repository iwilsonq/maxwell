# Maxwell - Personal AI Assistant

This project uses **bd** (beads) for issue tracking. Run `bd prime` for full workflow context.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>         # View issue details
bd update <id> --claim  # Claim work atomically
bd close <id>        # Complete work
```

## Non-Interactive Shell Commands

**ALWAYS use non-interactive flags** with file operations to avoid hanging on confirmation prompts.

Shell commands like `cp`, `mv`, and `rm` may be aliased to include `-i` (interactive) mode on some systems, causing the agent to hang indefinitely waiting for y/n input.

**Use these forms instead:**
```bash
# Force overwrite without prompting
cp -f source dest           # NOT: cp source dest
mv -f source dest           # NOT: mv source dest
rm -f file                  # NOT: rm file

# For recursive operations
rm -rf directory            # NOT: rm -r directory
cp -rf source dest          # NOT: cp -r source dest
```

## Environment Variables

Sensitive values should be set via environment variables, not in config files.

```bash
# Required
export ANTHROPIC_API_KEY="sk-ant-..."

# Optional
export TELEGRAM_BOT_TOKEN="your_telegram_bot_token"   # Enables Telegram
export MAXWELL_MODEL="claude-sonnet-4-20250514"       # Override model
```

## Build & Run

```bash
# Install dependencies
bun install

# Run (set env vars first)
export ANTHROPIC_API_KEY="sk-ant-..."
export TELEGRAM_BOT_TOKEN="..."
bun run src/index.ts
```

## Architecture

```
src/
├── index.ts           # Entry point
├── config.ts         # Configuration management
├── agent/
│   ├── engine.ts     # AI orchestration
│   ├── prompts.ts    # System prompts/persona
│   ├── tools.ts      # Tool definitions
│   └── execute.ts    # Tool execution
├── providers/
│   └── anthropic.ts  # Claude API client
├── channels/
│   └── telegram/     # Telegram bot adapter
└── memory/
    └── conversation.ts  # Chat history storage

storage/
├── config.json       # User configuration
└── memory/           # Conversation history (JSON by date)
```

## Dependencies

- **bun** - Runtime (v1.3+)
- **grammy** - Telegram bot framework
- **@beads/bd** - Task tracking (install separately: `bun add -g @beads/bd`)
