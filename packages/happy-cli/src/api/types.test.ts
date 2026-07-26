import { describe, it, expect } from 'vitest';
import { UserMessageSchema, MessageMetaSchema } from './types';

describe('UserMessageSchema meta forward-compatibility', () => {
  it('accepts known permissionMode enum values', () => {
    const r = UserMessageSchema.safeParse({
      role: 'user',
      content: { type: 'text', text: 'hi' },
      meta: { permissionMode: 'bypassPermissions' },
    });
    expect(r.success).toBe(true);
  });

  it('accepts unknown permissionMode strings (ACP operating-mode ids) rather than dropping the message', () => {
    const acpMode = 'https://agentclientprotocol.com/protocol/session-modes#autopilot';
    const r = UserMessageSchema.safeParse({
      role: 'user',
      content: { type: 'text', text: 'hi' },
      meta: { permissionMode: acpMode },
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.meta?.permissionMode).toBe(acpMode);
  });

  it('preserves meta.effort (reasoning/thinking level)', () => {
    const r = MessageMetaSchema.safeParse({ effort: 'high' });
    expect(r.success).toBe(true);
    expect(r.success && r.data.effort).toBe('high');
  });

  it('still requires role=user and text content', () => {
    expect(UserMessageSchema.safeParse({ role: 'agent', content: { type: 'text', text: 'x' } }).success).toBe(false);
  });
});
