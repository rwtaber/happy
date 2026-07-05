import { describe, expect, it } from 'vitest';

import { CopilotTransport } from './CopilotTransport';
import { GeminiTransport } from './GeminiTransport';
import { DefaultTransport } from '../DefaultTransport';
import type { TransportHandler } from '../TransportHandler';

describe('CopilotTransport', () => {
  const transport = new CopilotTransport();

  it('identifies as the copilot agent', () => {
    expect(transport.agentName).toBe('copilot');
  });

  it('uses a longer idle gap to tolerate Copilot\'s coarse streaming', () => {
    expect(transport.getIdleTimeout()).toBe(2_000);
  });

  it('allows extra time for Copilot startup/auth', () => {
    expect(transport.getInitTimeout()).toBe(120_000);
  });

  it('opts in to ending the turn on ACP prompt() resolution', () => {
    expect(transport.endsTurnOnPromptResolution()).toBe(true);
  });
});

describe('deterministic turn-end opt-in is Copilot-only', () => {
  it('DefaultTransport does not opt in (keeps the idle heuristic)', () => {
    const transport: TransportHandler = new DefaultTransport('opencode');
    // Optional method is undefined for transports that keep the heuristic.
    expect(transport.endsTurnOnPromptResolution?.()).toBeUndefined();
  });

  it('GeminiTransport does not opt in (keeps the idle heuristic)', () => {
    const transport: TransportHandler = new GeminiTransport();
    expect(transport.endsTurnOnPromptResolution?.()).toBeUndefined();
  });
});
