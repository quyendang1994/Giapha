#!/usr/bin/env node

/**
 * PreToolUse hook: Block Claude from reading .env files.
 * Matchers this runs on: Read, Grep
 */

async function main() {
  // 1. Đọc toàn bộ stdin (JSON do Claude Code push)
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString());
  } catch (err) {
    console.error("[read_hook] Invalid JSON from stdin:", err.message);
    process.exit(1); // hook error, không block
  }
  
  // 2. Extract file path (defensive)
  const path = 
    input.tool_input?.file_path ||
    input.tool_input?.path ||
    '';
  
  // 3. Match .env pattern
  // Match: .env, .env.local, .env.production, .env.test, etc.
  // Không match: environment.ts, env-config.ts
  const ENV_PATTERN = /(^|\/)\.env(\.[a-zA-Z0-9_-]+)?$/;
  
  if (ENV_PATTERN.test(path)) {
    console.error(
      `[read_hook] Blocked access to env file: ${path}\n` +
      `Use process.env at runtime instead.`
    );
    process.exit(2); // BLOCK
  }
  
  // 4. Allow
  process.exit(0);
}

main().catch(err => {
  console.error("[read_hook] Unexpected error:", err);
  process.exit(1);
});
