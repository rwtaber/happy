import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runAcp: vi.fn(async () => {}),
  isCommandAvailable: vi.fn(() => true),
}));

vi.mock('@/ui/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/agent/acp/runAcp', () => ({ runAcp: mocks.runAcp }));

vi.mock('@/utils/detectCLI', () => ({ isCommandAvailable: mocks.isCommandAvailable }));

// `@/persistence` only contributes the `Credentials` type here; stub it so the
// test does not load real persistence side effects.
vi.mock('@/persistence', () => ({}));

import { assertCopilotInstalled, runCopilot } from './runCopilot';

describe('assertCopilotInstalled', () => {
  beforeEach(() => {
    mocks.isCommandAvailable.mockReset().mockReturnValue(true);
    mocks.runAcp.mockReset();
  });

  it('passes silently when the copilot binary is on PATH', () => {
    mocks.isCommandAvailable.mockReturnValue(true);
    expect(() => assertCopilotInstalled()).not.toThrow();
    expect(mocks.isCommandAvailable).toHaveBeenCalledWith('copilot');
  });

  it('exits the process with code 1 when the copilot binary is missing', () => {
    mocks.isCommandAvailable.mockReturnValue(false);
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
    mocks.isCommandAvailable.mockReset().mockReturnValue(true);
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

    expect(mocks.isCommandAvailable).toHaveBeenCalledWith('copilot');
    expect(mocks.runAcp).toHaveBeenCalledTimes(1);
  });

  it('does not launch when the binary check fails', async () => {
    mocks.isCommandAvailable.mockReturnValue(false);
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
