import { beforeEach, describe, expect, it, vi } from 'vitest';

function machineClient() {
    return {
        id: 'machine-1',
        encryptionKey: new Uint8Array(32),
        encryptionVariant: 'legacy',
    } as any;
}

function handlersFrom(client: any): Map<string, (params: any) => Promise<any>> {
    return client.rpcHandlerManager.handlers;
}

describe('ApiMachineClient stop-session RPC', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the encrypted RPC response shape expected by the app', async () => {
        const stopSession = vi.fn(() => true);
        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession,
            requestShutdown: vi.fn(),
        });

        const result = await handlersFrom(client).get('machine-1:stop-session')?.({
            sessionId: 'happy-1',
        });

        expect(stopSession).toHaveBeenCalledWith('happy-1');
        expect(result).toEqual({ message: 'Session stopped' });
    });

    it('rejects when the daemon does not currently track the session', async () => {
        const stopSession = vi.fn(() => false);
        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession,
            requestShutdown: vi.fn(),
        });

        expect(() =>
            handlersFrom(client).get('machine-1:stop-session')?.({ sessionId: 'stale-session' }),
        ).toThrow('Session not found or failed to stop');
    });

    it('rejects a missing session id before invoking the daemon', async () => {
        const stopSession = vi.fn(() => true);
        const { ApiMachineClient } = await import('./apiMachine');
        const client = new ApiMachineClient('token', machineClient());
        client.setRPCHandlers({
            spawnSession: vi.fn(),
            stopSession,
            requestShutdown: vi.fn(),
        });

        expect(() =>
            handlersFrom(client).get('machine-1:stop-session')?.({}),
        ).toThrow('Session ID is required');
        expect(stopSession).not.toHaveBeenCalled();
    });
});
