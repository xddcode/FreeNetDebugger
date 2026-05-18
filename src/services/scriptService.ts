import { invoke } from '../utils/tauri';

export async function runScript(sessionId: string, source: string): Promise<string[]> {
  return invoke('run_script', { sessionId, source });
}
