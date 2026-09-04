import { execSync } from 'child_process';
import os from 'os';
import { existsSync } from 'fs';
import { join } from 'path';
import { findAgyBin } from '@/agy/constants';

export interface CLIAvailability {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
  openclaw: boolean;
  copilot: boolean;
  agy: boolean;
  detectedAt: number;
}

/**
 * Cross-platform check for whether a command resolves on PATH.
 * Uses `command -v` on POSIX and `Get-Command` on Windows.
 *
 * This is the single source of truth for "is <tool> installed", shared by CLI
 * availability detection and the per-agent install guards (e.g. the Copilot
 * entry point) so the two can never disagree about whether a tool is present.
 */
export function isCommandAvailable(command: string): boolean {
  if (os.platform() === 'win32') {
    try {
      execSync(`powershell -NoProfile -Command "Get-Command ${command} -ErrorAction SilentlyContinue"`, { stdio: 'ignore', windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }
  try {
    execSync(`command -v ${command} >/dev/null 2>&1`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects which CLI tools are available on this machine.
 */
export function detectCLIAvailability(): CLIAvailability {
  const claude = isCommandAvailable('claude');
  const codex = isCommandAvailable('codex');
  const gemini = isCommandAvailable('gemini');

  // agy ships as a bundled binary that is not necessarily on PATH, so it is
  // located rather than probed.
  const agy = findAgyBin() !== undefined;

  // OpenClaw: present if the command exists, its config file exists, or the
  // gateway env var is set.
  const openclawConfig = join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
  const openclaw = isCommandAvailable('openclaw') || existsSync(openclawConfig) || !!process.env.OPENCLAW_GATEWAY_URL;

  // Copilot: the standalone `copilot` CLI must be installed. It manages its own
  // auth (`copilot login`), so PATH presence is the whole check.
  const copilot = isCommandAvailable('copilot');

  return { claude, codex, gemini, openclaw, copilot, agy, detectedAt: Date.now() };
}
