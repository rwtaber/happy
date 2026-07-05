import { describe, expect, it, vi } from 'vitest';

vi.mock('@/ui/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
  handleAgentMessageChunk,
  shouldSuppressHeuristicIdle,
  type HandlerContext,
} from './sessionUpdateHandlers';
import type { TransportHandler } from '../transport';

function makeCtx(transport: Partial<TransportHandler>): HandlerContext {
  return {
    transport: transport as TransportHandler,
    activeToolCalls: new Set<string>(),
    toolCallStartTimes: new Map(),
    toolCallTimeouts: new Map(),
    toolCallIdToNameMap: new Map(),
    idleTimeout: null,
    toolCallCountSincePrompt: 0,
    emit: vi.fn(),
    emitIdleStatus: vi.fn(),
    clearIdleTimeout: vi.fn(),
    setIdleTimeout: vi.fn(),
  } as unknown as HandlerContext;
}

const deterministicTransport: Partial<TransportHandler> = {
  agentName: 'copilot',
  getIdleTimeout: () => 2_000,
  endsTurnOnPromptResolution: () => true,
};

const heuristicTransport: Partial<TransportHandler> = {
  agentName: 'gemini',
  getIdleTimeout: () => 500,
  // no endsTurnOnPromptResolution
};

describe('shouldSuppressHeuristicIdle', () => {
  it('is true when the transport ends the turn on prompt() resolution', () => {
    expect(shouldSuppressHeuristicIdle(makeCtx(deterministicTransport))).toBe(true);
  });

  it('is false when the transport does not opt in', () => {
    expect(shouldSuppressHeuristicIdle(makeCtx(heuristicTransport))).toBe(false);
  });
});

describe('handleAgentMessageChunk idle suppression', () => {
  const update = { content: { text: 'hello world' } } as never;

  it('still forwards the text delta regardless of transport', () => {
    const ctx = makeCtx(deterministicTransport);
    handleAgentMessageChunk(update, ctx);
    expect(ctx.emit).toHaveBeenCalledWith({ type: 'model-output', textDelta: 'hello world' });
  });

  it('does NOT arm the chunk-gap idle timer for deterministic transports (Copilot)', () => {
    const ctx = makeCtx(deterministicTransport);
    handleAgentMessageChunk(update, ctx);
    expect(ctx.setIdleTimeout).not.toHaveBeenCalled();
  });

  it('arms the chunk-gap idle timer for heuristic transports (Gemini)', () => {
    const ctx = makeCtx(heuristicTransport);
    handleAgentMessageChunk(update, ctx);
    expect(ctx.setIdleTimeout).toHaveBeenCalledTimes(1);
    expect(ctx.setIdleTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
  });

  it('the heuristic timer callback emits idle when no tool calls are active (Gemini)', () => {
    const ctx = makeCtx(heuristicTransport);
    handleAgentMessageChunk(update, ctx);
    const cb = (ctx.setIdleTimeout as unknown as { mock: { calls: Array<[() => void, number]> } })
      .mock.calls[0][0];
    cb();
    expect(ctx.emitIdleStatus).toHaveBeenCalledTimes(1);
  });
});
