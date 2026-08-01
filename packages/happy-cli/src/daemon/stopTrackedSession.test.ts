import { describe, expect, it, vi } from 'vitest';
import type { TrackedSession } from './types';
import { stopTrackedSession } from './stopTrackedSession';

function tracked(overrides: Partial<TrackedSession> = {}): TrackedSession {
  return {
    startedBy: 'daemon',
    happySessionId: 'happy-1',
    pid: 101,
    ...overrides,
  };
}

describe('stopTrackedSession', () => {
  it('stops and removes a daemon-owned child by Happy session id', () => {
    const childKill = vi.fn(() => true);
    const sessions = new Map([[101, tracked({ childProcess: { kill: childKill } as any })]]);

    expect(stopTrackedSession('happy-1', sessions, { debug: vi.fn() })).toBe(true);
    expect(childKill).toHaveBeenCalledWith('SIGTERM');
    expect(sessions.has(101)).toBe(false);
  });

  it('stops an externally started process only while it is actively tracked', () => {
    const killPid = vi.fn();
    const sessions = new Map([[202, tracked({
      startedBy: 'terminal',
      happySessionId: 'happy-external',
      pid: 202,
      childProcess: undefined,
    })]]);

    expect(stopTrackedSession('happy-external', sessions, { killPid, debug: vi.fn() })).toBe(true);
    expect(killPid).toHaveBeenCalledWith(202, 'SIGTERM');
    expect(sessions.has(202)).toBe(false);
  });

  it('accepts an exact positive PID alias for a currently tracked process', () => {
    const killPid = vi.fn();
    const sessions = new Map([[303, tracked({ startedBy: 'terminal', pid: 303 })]]);

    expect(stopTrackedSession('PID-303', sessions, { killPid, debug: vi.fn() })).toBe(true);
    expect(killPid).toHaveBeenCalledWith(303, 'SIGTERM');
  });

  it.each(['PID-303junk', 'PID-0', 'PID--1', '303'])(
    'rejects malformed or unsafe PID alias %s',
    (sessionId) => {
      const killPid = vi.fn();
      const sessions = new Map([[303, tracked({ startedBy: 'terminal', pid: 303 })]]);

      expect(stopTrackedSession(sessionId, sessions, { killPid, debug: vi.fn() })).toBe(false);
      expect(killPid).not.toHaveBeenCalled();
      expect(sessions.has(303)).toBe(true);
    },
  );

  it('keeps the tracking entry when the child rejects the signal', () => {
    const childKill = vi.fn(() => false);
    const sessions = new Map([[404, tracked({ pid: 404, childProcess: { kill: childKill } as any })]]);

    expect(stopTrackedSession('happy-1', sessions, { debug: vi.fn() })).toBe(false);
    expect(sessions.has(404)).toBe(true);
  });

  it('keeps the tracking entry when process signaling throws', () => {
    const killPid = vi.fn(() => { throw new Error('no such process'); });
    const sessions = new Map([[505, tracked({ startedBy: 'terminal', pid: 505 })]]);

    expect(stopTrackedSession('happy-1', sessions, { killPid, debug: vi.fn() })).toBe(false);
    expect(sessions.has(505)).toBe(true);
  });

  it('never attempts a PID that is not in the current tracking map', () => {
    const killPid = vi.fn();

    expect(stopTrackedSession('happy-persisted', new Map(), { killPid, debug: vi.fn() })).toBe(false);
    expect(killPid).not.toHaveBeenCalled();
  });
});
