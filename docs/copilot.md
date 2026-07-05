# GitHub Copilot support

Happy can drive the standalone **GitHub Copilot CLI** (`copilot`) as a coding
agent, alongside Claude Code, Codex, Gemini, and OpenCode.

- **Entry point:** `src/copilot/runCopilot.ts` (`happy copilot`).
- **Runner:** the generic ACP path — `src/agent/acp/runAcp.ts` + `src/agent/acp/AcpBackend.ts` — shared with `gemini` and `opencode`.
- **Transport handler:** `src/agent/transport/handlers/CopilotTransport.ts`.

## How it runs

Copilot speaks the [Agent Client Protocol](https://agentclientprotocol.com)
(ACP). Happy spawns the CLI as:

```
copilot --acp
```

The daemon launches it via `node dist/index.mjs copilot --started-by daemon`.
There is no provider-specific transport: once the ACP connection is up, the
session behaves like any other ACP agent, so most of the integration lives in
the shared `runAcp` / `AcpBackend` code rather than in `src/copilot`.

## Authentication

Copilot manages its own auth — Happy injects **no** tokens. Sign in once with:

```
copilot login
```

`assertCopilotInstalled()` (in `runCopilot.ts`) verifies the `copilot` binary is
on `PATH` and prints install/login guidance if it is missing.

## Operating modes and permissions

`session/new` advertises Copilot's operating modes up front:

| Mode      | ACP id (`.../session-modes#…`) | Behavior                          |
| --------- | ------------------------------ | --------------------------------- |
| Agent     | `#agent`                       | Prompts for permission per action |
| Plan      | `#plan`                        | Read-only planning                |
| Autopilot | `#autopilot`                   | Allow-all / auto-run (default)    |

Happy defaults new Copilot sessions to **Autopilot** so the first turn runs
without a permission round-trip (`DEFAULT_INITIAL_PERMISSION_MODE` in
`runAcp.ts`; `codeAgentDefaults.copilot` in the app's `agentDefaults.ts`).
Bypass/YOLO requests are auto-approved by the `runAcp` permission handler.

Copilot also advertises a 4th config option `allow_all`
(`category: "permissions"`). Happy intentionally does **not** surface it as a
per-message selector — it is redundant with the Autopilot operating mode and the
auto-approve path. See the `SUPPORTED_CATEGORIES` comment in
`sessionConfigMetadata.ts`.

## Model and effort selection

- **Model** — the list returned by `session/new` is shown in the app
  (`getCopilotModelModes` in `modelModeOptions.ts`); switching applies via the
  ACP `model` config category.
- **Effort** — Copilot exposes `reasoning_effort`
  (`category: "thought_level"`, values `low | medium | high | xhigh | max`),
  surfaced as effort levels in the app and applied by `switchEffortIfRequested`
  in `runAcp.ts`.

Both are selectable from the app *before* the first message, because the option
lists come back synchronously from `session/new`.

## MCP transport (chat rename)

Happy exposes a small MCP server with a `change_title` tool so the agent can
rename the chat. Copilot advertises **`mcpCapabilities: { http, sse }` only — no
stdio** — so `AcpBackend` passes the Happy MCP server as an **HTTP URL**
(`{ type: "http", url, headers }`) instead of spawning the stdio bridge used for
stdio-only agents. The transport is chosen from the capabilities returned at
`initialize` (`agentSupportsHttpMcp`).

`runAcp` also injects a one-time instruction telling the agent to call
`change_title` (Copilot namespaces it as `happy-change_title`); without the
nudge the agent never renames the chat on its own.

## Session resume

Copilot advertises the ACP `loadSession` capability and persists sessions
locally, so Happy can resume them. On the first `session/new`, `runAcp` stores
the agent's ACP session id in `metadata.acpSessionId`; `happy resume <id>`
relaunches `copilot --resume <acpSessionId>` and `AcpBackend` calls
`connection.loadSession(...)` instead of creating a new session. If resume is
unsupported or fails for any reason, it falls back to a fresh session, so it can
never leave you worse off. (Gemini/OpenCode inherit the same capability-gated
path.)

## Image attachments

Copilot's `promptCapabilities.image === true`, so image attachments sent from
the app are forwarded. `runAcp` downloads and decrypts each attachment (the same
`onFileEvent` / `drainAttachmentsForUserMessage` flow Claude and Codex use) and
`AcpBackend` appends them to the prompt as ACP `image` content blocks. Image
support is capability-gated: agents that do not advertise it receive text only.

## Startup on large workspaces

On big, agent-heavy repositories Copilot's `session/new` can take tens of
seconds while it loads workspace custom agents, skills, and MCP servers. To
avoid the session looking dead, `runAcp` marks the session busy during startup
and posts a one-time "starting up" notice
(`ACP_SLOW_STARTUP_NOTICE_MS`).

## Turn completion

Copilot ends turns deterministically: `AcpBackend.sendPrompt` treats the ACP
`session/prompt` response (and its `stopReason`) as the authoritative
end-of-turn, since a compliant agent sends it only after every `session/update`
for the turn. This is opt-in per transport via
`CopilotTransport.endsTurnOnPromptResolution()`, so turns end as soon as Copilot
finishes rather than after a fixed idle gap. The 2s idle chunk-gap heuristic
(`CopilotTransport.idle`) remains as a fallback for turns where `prompt()`
resolves late or not at all. Transports that do not opt in (Gemini/OpenCode)
keep the heuristic-only behavior.

## Known limitations

- **Stop button responsiveness.** Cancelling mid-turn relies on the agent
  acknowledging the ACP `cancel` and resolving the in-flight `prompt()`; the
  deterministic turn-end above ends the turn cleanly, but cancel latency still
  depends on the agent.

Remaining enhancements are tracked in the integration plan.
