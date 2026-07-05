import { describe, expect, it, vi } from 'vitest';

vi.mock('@/ui/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { buildAcpMcpServers } from './AcpBackend';

describe('buildAcpMcpServers (MCP transport selection)', () => {
  it('returns an empty array when no servers are configured', () => {
    expect(buildAcpMcpServers(undefined, true)).toEqual([]);
    expect(buildAcpMcpServers({}, true)).toEqual([]);
  });

  it('uses the HTTP transport when the server has a url and the agent supports http', () => {
    const result = buildAcpMcpServers(
      {
        happy: {
          command: 'node',
          args: ['bridge.js'],
          url: 'http://127.0.0.1:4321/mcp',
          headers: { Authorization: 'Bearer secret' },
        },
      },
      true,
    );
    expect(result).toEqual([
      {
        type: 'http',
        name: 'happy',
        url: 'http://127.0.0.1:4321/mcp',
        headers: [{ name: 'Authorization', value: 'Bearer secret' }],
      },
    ]);
  });

  it('emits an empty headers array when the http server has no headers', () => {
    const result = buildAcpMcpServers(
      { happy: { command: 'node', url: 'http://h/mcp' } },
      true,
    );
    expect(result[0]).toEqual({
      type: 'http',
      name: 'happy',
      url: 'http://h/mcp',
      headers: [],
    });
  });

  it('falls back to stdio when the agent does not support http, even if a url is present', () => {
    const result = buildAcpMcpServers(
      {
        happy: {
          command: 'node',
          args: ['bridge.js'],
          url: 'http://h/mcp',
          env: { TOKEN: 'abc' },
        },
      },
      false,
    );
    expect(result).toEqual([
      {
        name: 'happy',
        command: 'node',
        args: ['bridge.js'],
        env: [{ name: 'TOKEN', value: 'abc' }],
      },
    ]);
  });

  it('uses stdio when the server has no url (regardless of http support)', () => {
    const result = buildAcpMcpServers(
      { happy: { command: 'node', args: ['x'] } },
      true,
    );
    expect(result).toEqual([
      { name: 'happy', command: 'node', args: ['x'], env: [] },
    ]);
  });

  it('skips a server that has neither a usable http endpoint nor a stdio command', () => {
    const result = buildAcpMcpServers(
      { broken: { url: 'http://h/mcp' } as unknown as { command: string; url: string } },
      false,
    );
    expect(result).toEqual([]);
  });

  it('selects a transport per server when mixing http and stdio servers', () => {
    const result = buildAcpMcpServers(
      {
        httpOne: { command: 'node', url: 'http://h/mcp' },
        stdioOne: { command: 'python3', args: ['server.py'] },
      },
      true,
    );
    expect(result).toEqual([
      { type: 'http', name: 'httpOne', url: 'http://h/mcp', headers: [] },
      { name: 'stdioOne', command: 'python3', args: ['server.py'], env: [] },
    ]);
  });
});
