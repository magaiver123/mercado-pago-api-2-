#!/usr/bin/env node

/**
 * Mock wrapper for the production print agent.
 * Keeps one code path and avoids maintenance duplication.
 */

if (!process.env.DRY_RUN) {
  process.env.DRY_RUN = "true"
}
if (!process.env.AGENT_ID) {
  process.env.AGENT_ID = "mock-agent-local"
}
if (!process.env.AGENT_VERSION) {
  process.env.AGENT_VERSION = "mock-2.0.0"
}
if (!process.env.MOCK_PRINT_DELAY_MS) {
  process.env.MOCK_PRINT_DELAY_MS = "800"
}

await import("./print-agent-notebook.mjs")
