import type { TrackedSession } from './types';
import { logger } from '@/ui/logger';

type KillPid = (pid: number, signal: NodeJS.Signals) => void;

export interface StopTrackedSessionOptions {
  killPid?: KillPid;
  debug?: (message: string, detail?: unknown) => void;
}

function parsePidAlias(sessionId: string): number | null {
  const match = /^PID-(\d+)$/.exec(sessionId);
  if (!match) return null;
  const pid = Number(match[1]);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : null;
}

/**
 * Stops a session only when the current daemon still owns a live tracking
 * entry for it. Persisted PIDs are deliberately excluded: after a daemon or
 * host restart the OS may reuse a PID for an unrelated process.
 */
export function stopTrackedSession(
  sessionId: string,
  trackedSessions: Map<number, TrackedSession>,
  options: StopTrackedSessionOptions = {},
): boolean {
  const killPid = options.killPid ?? ((pid, signal) => process.kill(pid, signal));
  const debug = options.debug ?? ((message: string, detail?: unknown) => logger.debug(message, detail));
  const requestedPid = parsePidAlias(sessionId);

  debug(`[DAEMON RUN] Attempting to stop tracked session ${sessionId}`);

  for (const [pid, session] of trackedSessions.entries()) {
    if (session.happySessionId !== sessionId && requestedPid !== pid) {
      continue;
    }

    let stopped = false;
    try {
      if (session.startedBy === 'daemon' && session.childProcess) {
        stopped = session.childProcess.kill('SIGTERM');
        debug(`[DAEMON RUN] SIGTERM ${stopped ? 'sent to' : 'rejected by'} daemon-spawned session ${sessionId} PID ${pid}`);
      } else {
        killPid(pid, 'SIGTERM');
        stopped = true;
        debug(`[DAEMON RUN] Sent SIGTERM to tracked external session ${sessionId} PID ${pid}`);
      }
    } catch (error) {
      debug(`[DAEMON RUN] Failed to stop tracked session ${sessionId} PID ${pid}:`, error);
      return false;
    }

    if (!stopped) {
      return false;
    }

    trackedSessions.delete(pid);
    debug(`[DAEMON RUN] Removed stopped session ${sessionId} from tracking`);
    return true;
  }

  debug(`[DAEMON RUN] Tracked session ${sessionId} not found`);
  return false;
}
