import path from 'node:path';
import os from 'node:os';
import { AppConfig, AppConfigSchema, InferenceConfig } from '@arletex/contracts';

export function getDefaultDataDirectory(): string {
  const custom = process.env['ARLETEX_DATA_DIR'];
  if (custom) return custom;

  // On Linux/Bazzite, follow XDG or default to ~/.arletex
  const home = os.homedir();
  return path.join(home, '.arletex');
}

export interface AppConfigOverrides {
  dataDirectory?: string;
  databasePath?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  inference?: Partial<InferenceConfig>;
}

export function createDefaultConfig(overrides?: AppConfigOverrides): AppConfig {
  const dataDir = overrides?.dataDirectory ?? getDefaultDataDirectory();
  const dbPath = overrides?.databasePath ?? path.join(dataDir, 'arletex.sqlite');

  const activeProvider =
    overrides?.inference?.provider ??
    (process.env['ARLETEX_INFERENCE_PROVIDER'] as any) ??
    'colibri';

  // Primary URL & model resolution based on provider
  const defaultServerUrl =
    activeProvider === 'colibri'
      ? process.env['COLIBRI_SERVER_URL'] ?? 'http://127.0.0.1:8000'
      : process.env['LLAMA_SERVER_URL'] ?? 'http://127.0.0.1:8080';

  const defaultModelId =
    activeProvider === 'colibri'
      ? process.env['COLIBRI_MODEL_ID'] ?? 'qwen3.6-colibri'
      : process.env['LLAMA_MODEL_ID'] ?? 'Qwen3.5-9B-Heretic-Q4_K_M';

  const fallbackEnabled =
    overrides?.inference?.fallbackEnabled ??
    (process.env['ARLETEX_INFERENCE_FALLBACK'] ? process.env['ARLETEX_INFERENCE_FALLBACK'] !== 'false' : true);

  const rawConfig = {
    dataDirectory: dataDir,
    databasePath: dbPath,
    logLevel: overrides?.logLevel ?? (process.env['ARLETEX_LOG_LEVEL'] as any) ?? 'info',
    inference: {
      provider: activeProvider,
      serverUrl: overrides?.inference?.serverUrl ?? defaultServerUrl,
      defaultModelId: overrides?.inference?.defaultModelId ?? defaultModelId,
      temperature: overrides?.inference?.temperature ?? 0.7,
      topP: overrides?.inference?.topP ?? 0.9,
      maxTokens: overrides?.inference?.maxTokens ?? 2048,
      contextSize: overrides?.inference?.contextSize ?? 8192,
      stopSequences: overrides?.inference?.stopSequences ?? [],
      fallbackEnabled,
      fallbackProvider: overrides?.inference?.fallbackProvider ?? 'llama.cpp',
      fallbackServerUrl:
        overrides?.inference?.fallbackServerUrl ??
        process.env['LLAMA_SERVER_URL'] ??
        'http://127.0.0.1:8080',
      fallbackModelId:
        overrides?.inference?.fallbackModelId ??
        process.env['LLAMA_MODEL_ID'] ??
        'Qwen3.5-9B-Heretic-Q4_K_M',
    },
  };

  return AppConfigSchema.parse(rawConfig);
}
