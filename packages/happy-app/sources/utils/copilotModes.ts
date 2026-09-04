/**
 * Copilot's operating modes, as ACP session-mode ids.
 *
 * Copilot is reached through the generic ACP runner, so its modes are session
 * modes negotiated over the protocol rather than CLI flags. A live session
 * reports these same ids in `metadata.operatingModes`, so using the full ids
 * here means the new-session composer (which has no live metadata yet) offers
 * exactly the values an active session will accept.
 *
 * They live in their own module because both the picker catalog
 * (modelModeOptions) and the agent defaults need them, and modelModeOptions
 * already imports agentDefaults — a shared constant there would be a cycle.
 */
const COPILOT_SESSION_MODE_BASE = 'https://agentclientprotocol.com/protocol/session-modes#';

export const COPILOT_MODE_AGENT = `${COPILOT_SESSION_MODE_BASE}agent`;
export const COPILOT_MODE_PLAN = `${COPILOT_SESSION_MODE_BASE}plan`;
export const COPILOT_MODE_AUTOPILOT = `${COPILOT_SESSION_MODE_BASE}autopilot`;
