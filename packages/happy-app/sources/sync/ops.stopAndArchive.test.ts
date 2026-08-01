import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    sessionRPC: vi.fn(),
    machineRPC: vi.fn(),
    request: vi.fn(),
    emitWithAck: vi.fn(),
    encryptRaw: vi.fn(),
    decryptRaw: vi.fn(),
    getSessionEncryption: vi.fn(),
    getState: vi.fn(),
}));

vi.mock('./apiSocket', () => ({
    apiSocket: {
        sessionRPC: mocks.sessionRPC,
        machineRPC: mocks.machineRPC,
        request: mocks.request,
        emitWithAck: mocks.emitWithAck,
    },
}));

vi.mock('./sync', () => ({
    sync: {
        encryption: { getSessionEncryption: mocks.getSessionEncryption },
    },
}));

vi.mock('./storage', () => ({
    storage: { getState: mocks.getState },
}));

describe('sessionStopAndArchive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.encryptRaw.mockResolvedValue('encrypted-metadata');
        mocks.decryptRaw.mockResolvedValue({ name: 'latest' });
        mocks.getSessionEncryption.mockReturnValue({
            encryptRaw: mocks.encryptRaw,
            decryptRaw: mocks.decryptRaw,
        });
        mocks.getState.mockReturnValue({
            sessions: {
                'session-1': {
                    metadata: { name: 'Session 1', lifecycleState: 'running' },
                    metadataVersion: 4,
                },
            },
        });
        mocks.sessionRPC.mockRejectedValue(new Error('session RPC unavailable'));
        mocks.machineRPC.mockResolvedValue({ message: 'Session stopped' });
        mocks.emitWithAck.mockResolvedValue({ result: 'success', version: 5 });
        mocks.request.mockResolvedValue({ ok: true, status: 200 });
    });

    it('uses the normal session kill without fallback work when it succeeds', async () => {
        mocks.sessionRPC.mockResolvedValue({ success: true, message: 'Killing process' });
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1', 'machine-1')).resolves.toEqual({
            success: true,
            message: 'Killing process',
        });
        expect(mocks.machineRPC).not.toHaveBeenCalled();
        expect(mocks.emitWithAck).not.toHaveBeenCalled();
        expect(mocks.request).not.toHaveBeenCalled();
    });

    it('stops a daemon-tracked process, stamps archive metadata, and deactivates the row', async () => {
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1', 'machine-1')).resolves.toEqual({
            success: true,
            message: 'Session stopped',
        });
        expect(mocks.machineRPC).toHaveBeenCalledWith(
            'machine-1',
            'stop-session',
            { sessionId: 'session-1' },
        );
        expect(mocks.encryptRaw).toHaveBeenCalledWith(expect.objectContaining({
            lifecycleState: 'archived',
            archivedBy: 'app',
            archiveReason: 'User terminated',
        }));
        expect(mocks.request).toHaveBeenCalledWith('/v1/sessions/session-1/archive', { method: 'POST' });
    });

    it('still archives when no owning machine is available', async () => {
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1')).resolves.toEqual({ success: true });
        expect(mocks.machineRPC).not.toHaveBeenCalled();
        expect(mocks.emitWithAck).toHaveBeenCalledOnce();
        expect(mocks.request).toHaveBeenCalledOnce();
    });

    it('still archives when the daemon no longer tracks the process', async () => {
        mocks.machineRPC.mockRejectedValue(new Error('Session not found or failed to stop'));
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1', 'machine-1')).resolves.toEqual({ success: true });
        expect(mocks.emitWithAck).toHaveBeenCalledOnce();
        expect(mocks.request).toHaveBeenCalledOnce();
    });

    it('reports metadata archival failure even when server deactivation succeeds', async () => {
        mocks.emitWithAck.mockResolvedValue({ result: 'error', message: 'metadata denied' });
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1', 'machine-1')).resolves.toEqual({
            success: false,
            message: 'Failed to mark session archived: metadata denied',
        });
        expect(mocks.request).toHaveBeenCalledOnce();
    });

    it('reports server deactivation failure even when metadata archival succeeds', async () => {
        mocks.request.mockResolvedValue({ ok: false, status: 503 });
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1', 'machine-1')).resolves.toEqual({
            success: false,
            message: 'Failed to deactivate session: Server error: 503',
        });
    });

    it('retries a metadata version conflict against the latest decrypted value', async () => {
        mocks.emitWithAck
            .mockResolvedValueOnce({ result: 'version-mismatch', version: 5, metadata: 'remote-metadata' })
            .mockResolvedValueOnce({ result: 'success', version: 6 });
        mocks.decryptRaw.mockResolvedValue({ name: 'Remote name', remoteOnly: true });
        const { sessionStopAndArchive } = await import('./ops');

        await expect(sessionStopAndArchive('session-1')).resolves.toEqual({ success: true });
        expect(mocks.decryptRaw).toHaveBeenCalledWith('remote-metadata');
        expect(mocks.encryptRaw).toHaveBeenNthCalledWith(2, expect.objectContaining({
            name: 'Remote name',
            remoteOnly: true,
            lifecycleState: 'archived',
        }));
    });
});
