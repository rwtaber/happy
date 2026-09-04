/**
 * Copilot Transport Handler
 *
 * Transport handler for GitHub Copilot CLI ACP mode.
 * Copilot's ACP server can have gaps >500ms between streaming chunks,
 * so we use a longer idle timeout to avoid premature turn completion.
 *
 * @module CopilotTransport
 */

import { DefaultTransport } from '../DefaultTransport';

const COPILOT_TIMEOUTS = {
  /** Copilot CLI startup can take time for auth/init */
  init: 120_000,
  /** Idle detection — Copilot streams in coarse chunks with >500ms gaps, so tolerate a longer gap before ending the turn */
  idle: 2_000,
} as const;

/**
 * Transport handler for GitHub Copilot CLI.
 *
 * Extends DefaultTransport with Copilot-specific timeout tuning.
 */
export class CopilotTransport extends DefaultTransport {
  constructor() {
    super('copilot');
  }

  getInitTimeout(): number {
    return COPILOT_TIMEOUTS.init;
  }

  getIdleTimeout(): number {
    return COPILOT_TIMEOUTS.idle;
  }

  /**
   * Copilot's ACP server resolves `session/prompt` only after the turn's
   * updates have been sent, so the turn can end deterministically on
   * resolution rather than waiting for the idle chunk-gap heuristic.
   */
  endsTurnOnPromptResolution(): boolean {
    return true;
  }
}

export const copilotTransport = new CopilotTransport();
