import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runAcp: vi.fn(async () => {}),
  execSync: vi.fn(() => Buffer.from('copilot version 1.0.0')),
}));

vi.mock('@/ui/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/agent/acp/runAcp', () => ({ runAcp: mocks.runAcp }));

vi.mock('node:child_process', () => ({ execSync: mocks.execSync }));

// `@/persistence` only contributes the `Credentials` type here; stub it so the
// test does not load real persistence side effects.
vi.mock('@/persistence', () => ({}));

import { assertCopilotInstalled, runCopilot } from './runCopilot';

describe('assertCopilotInstalled', () => {
  beforeEach(() => {
    mocks.execSync.mockReset();
    mocks.runAcp.mockReset();
  });

  it('passes silently when `copilot --version` succeeds', () => {
    mocks.execSync.mockReturnValue(Buffer.from('1.0.69'));
    expect(() => assertCopilotInstalled()).not.toThrow();
    expect(mocks.execSync).toHaveBeenCalledWith(
      'copilot --version',
      expect.objectContaining({ stdio: 'pipe' }),
    );
  });

  it('exits the process with code 1 when the copilot binary is missing', () => {
    mocks.execSync.mockImplementation(() => {
      throw new Error('command not found: copilot');
    });
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code}`);
      }) as never);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => assertCopilotInstalled()).toThrow('process.exit:1');

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});

describe('runCopilot', () => {
  beforeEach(() => {
    mocks.execSync.mockReset().mockReturnValue(Buffer.from('1.0.69'));
    mocks.runAcp.mockReset().mockResolvedValue(undefined);
  });

  it('launches Copilot through the shared ACP runner with `copilot --acp`', async () => {
    const credentials = { token: 'secret' } as never;

    await runCopilot({ credentials, startedBy: 'daemon' });

    expect(mocks.runAcp).toHaveBeenCalledTimes(1);
    expect(mocks.runAcp).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials,
        agentName: 'copilot',
        command: 'copilot',
        args: ['--acp'],
        startedBy: 'daemon',
      }),
    );
  });

  it('verifies the binary is installed before launching', async () => {
    await runCopilot({ credentials: {} as never });

    expect(mocks.execSync).toHaveBeenCalledWith(
      'copilot --version',
      expect.anything(),
    );
    expect(mocks.runAcp).toHaveBeenCalledTimes(1);
  });

  it('does not launch when the binary check fails', async () => {
    mocks.execSync.mockImplementation(() => {
      throw new Error('not installed');
    });
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code}`);
      }) as never);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runCopilot({ credentials: {} as never })).rejects.toThrow(
      'process.exit:1',
    );
    expect(mocks.runAcp).not.toHaveBeenCalled();

    exitSpy.mockRestore();
    errSpy.mockRestore();
  });
});
