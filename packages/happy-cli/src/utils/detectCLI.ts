import { execSync } from 'child_process';
import os from 'os';
import { existsSync } from 'fs';
import { join } from 'path';

export interface CLIAvailability {
  claude: boolean;
  codex: boolean;
  gemini: boolean;
  openclaw: boolean;
  copilot: boolean;
  detectedAt: number;
}

/**
 * Cross-platform check for whether a command is resolvable on PATH.
 * Uses `command -v` on POSIX and `Get-Command` on Windows.
 *
 * This is the single source of truth for "is <tool> installed", shared by
 * CLI availability detection and the per-agent install guards (e.g. the
 * Copilot entry point) so the two never disagree.
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

  // OpenClaw: present if the command exists, its config file exists, or the
  // gateway env var is set.
  const openclawConfig = join(process.env.USERPROFILE || os.homedir(), '.openclaw', 'openclaw.json');
  const openclaw = isCommandAvailable('openclaw') || existsSync(openclawConfig) || !!process.env.OPENCLAW_GATEWAY_URL;

  // Copilot: standalone `copilot` CLI must be installed.
  const copilot = isCommandAvailable('copilot');

  return { claude, codex, gemini, openclaw, copilot, detectedAt: Date.now() };
}
