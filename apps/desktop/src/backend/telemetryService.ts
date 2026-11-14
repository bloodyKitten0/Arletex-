import fs from 'node:fs';
import os from 'node:os';
import { DeviceTelemetry } from '@arletex/contracts';
import { ILogger, rootLogger } from '@arletex/core';

export class TelemetryService {
  private readonly logger: ILogger;
  private lastCpuSample: { idle: number; total: number } | null = null;
  private lastTelemetry: DeviceTelemetry | null = null;
  private lastFetchTime = 0;
  private cacheTtlMs = 1500; // cache for 1.5s to prevent excessive polling

  private specialistStatus = {
    embeddingGemma: false,
    whisper: false,
    kokoro: false,
  };
  private lastSpecialistProbe = 0;

  constructor(logger: ILogger = rootLogger) {
    this.logger = logger.child('TelemetryService');
    void this.probeSpecialistServices();
  }

  private async probeSpecialistServices(): Promise<void> {
    const now = Date.now();
    if (now - this.lastSpecialistProbe < 5000) return;
    this.lastSpecialistProbe = now;
    try {
      const res = await fetch('http://127.0.0.1:39282/health');
      if (res.ok) {
        const data = (await res.json()) as any;
        this.specialistStatus = {
          embeddingGemma: Boolean(data.embeddingGemma),
          whisper: Boolean(data.whisper),
          kokoro: Boolean(data.kokoro),
        };
      }
    } catch (err: any) {
      this.logger.debug(`Specialist services offline: ${err.message}`);
      this.specialistStatus = { embeddingGemma: false, whisper: false, kokoro: false };
    }
  }

  public getTelemetry(inferenceStats?: {
    activeModel?: string | null;
    provider?: string | null;
    lastTtftMs?: number | null;
    lastTps?: number | null;
    isGenerating?: boolean;
  }): DeviceTelemetry {
    const now = Date.now();
    if (this.lastTelemetry && now - this.lastFetchTime < this.cacheTtlMs) {
      if (inferenceStats) {
        return {
          ...this.lastTelemetry,
          inference: {
            activeModel: inferenceStats.activeModel ?? this.lastTelemetry.inference.activeModel,
            provider: inferenceStats.provider ?? this.lastTelemetry.inference.provider,
            lastTtftMs: inferenceStats.lastTtftMs ?? this.lastTelemetry.inference.lastTtftMs,
            lastTps: inferenceStats.lastTps ?? this.lastTelemetry.inference.lastTps,
            isGenerating: inferenceStats.isGenerating ?? this.lastTelemetry.inference.isGenerating,
          },
        };
      }
      return this.lastTelemetry;
    }

    const cpu = this.getCpuMetrics();
    const memory = this.getMemoryMetrics();
    const gpu = this.getGpuMetrics();
    const storage = this.getStorageMetrics();
    const battery = this.getBatteryMetrics();

    const telemetry: DeviceTelemetry = {
      timestamp: new Date().toISOString(),
      cpu,
      memory,
      gpu,
      storage,
      battery,
      inference: {
        activeModel: inferenceStats?.activeModel ?? 'Qwen3.5-9B-Heretic-Q4_K_M',
        provider: inferenceStats?.provider ?? 'llama.cpp',
        lastTtftMs: inferenceStats?.lastTtftMs ?? null,
        lastTps: inferenceStats?.lastTps ?? null,
        isGenerating: inferenceStats?.isGenerating ?? false,
      },
      services: {
        backend: true,
        database: true,
        llamaServer: true,
        embeddingGemma: this.specialistStatus.embeddingGemma,
        whisper: this.specialistStatus.whisper,
        kokoro: this.specialistStatus.kokoro,
      },
    };

    void this.probeSpecialistServices();

    this.lastTelemetry = telemetry;
    this.lastFetchTime = now;
    return telemetry;
  }

  private getCpuMetrics() {
    let usagePercent: number | null = null;
    let frequencyMhz: number | null = null;
    let temperatureC: number | null = null;
    const cpus = os.cpus();
    const model = cpus[0]?.model || 'AMD Ryzen Z1 Extreme';

    // Calculate usage from /proc/stat
    try {
      if (fs.existsSync('/proc/stat')) {
        const stat = fs.readFileSync('/proc/stat', 'utf8');
        const firstLine = stat.split('\n')[0];
        if (firstLine && firstLine.startsWith('cpu ')) {
          const parts = firstLine.trim().split(/\s+/).slice(1).map(Number);
          const idle = (parts[3] || 0) + (parts[4] || 0); // idle + iowait
          const total = parts.reduce((acc, val) => acc + val, 0);

          if (this.lastCpuSample) {
            const idleDelta = idle - this.lastCpuSample.idle;
            const totalDelta = total - this.lastCpuSample.total;
            if (totalDelta > 0) {
              const usage = 100 * (1 - idleDelta / totalDelta);
              usagePercent = parseFloat(Math.max(0, Math.min(100, usage)).toFixed(1));
            }
          }
          this.lastCpuSample = { idle, total };
        }
      }
    } catch {
      // Fallback: unavailable
    }

    // CPU Frequency
    try {
      if (fs.existsSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq')) {
        const freqKhz = parseInt(
          fs.readFileSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq', 'utf8').trim(),
          10,
        );
        frequencyMhz = Math.round(freqKhz / 1000);
      } else if (cpus[0]?.speed) {
        frequencyMhz = cpus[0].speed;
      }
    } catch {}

    // CPU Temperature (search hwmon)
    try {
      const candidates = [
        '/sys/class/hwmon/hwmon8/temp1_input',
        '/sys/class/hwmon/hwmon2/temp1_input',
        '/sys/class/hwmon/hwmon1/temp1_input',
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const tempMilli = parseInt(fs.readFileSync(p, 'utf8').trim(), 10);
          temperatureC = parseFloat((tempMilli / 1000).toFixed(1));
          break;
        }
      }
    } catch {}

    return { usagePercent, frequencyMhz, temperatureC, model };
  }

  private getMemoryMetrics() {
    let totalBytes = os.totalmem();
    let freeBytes = os.freemem();
    let availableBytes = freeBytes;
    let swapTotalBytes = 0;
    let swapUsedBytes = 0;

    try {
      if (fs.existsSync('/proc/meminfo')) {
        const lines = fs.readFileSync('/proc/meminfo', 'utf8').split('\n');
        const map = new Map<string, number>();
        for (const line of lines) {
          const parts = line.split(':');
          if (parts[0] && parts[1]) {
            const key = parts[0].trim();
            const val = parseInt(parts[1].trim(), 10) * 1024; // KB to Bytes
            map.set(key, val);
          }
        }

        totalBytes = map.get('MemTotal') || totalBytes;
        freeBytes = map.get('MemFree') || freeBytes;
        availableBytes = map.get('MemAvailable') || freeBytes;
        swapTotalBytes = map.get('SwapTotal') || 0;
        const swapFree = map.get('SwapFree') || 0;
        swapUsedBytes = Math.max(0, swapTotalBytes - swapFree);
      }
    } catch {}

    const usedBytes = Math.max(0, totalBytes - availableBytes);
    const usagePercent = totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;

    return {
      totalBytes,
      usedBytes,
      freeBytes,
      availableBytes,
      usagePercent,
      swapTotalBytes,
      swapUsedBytes,
    };
  }

  private getGpuMetrics() {
    let available = false;
    let name: string | null = null;
    let usagePercent: number | null = null;
    let temperatureC: number | null = null;

    try {
      const gpuBusyPath = '/sys/class/drm/card1/device/gpu_busy_percent';
      if (fs.existsSync(gpuBusyPath)) {
        available = true;
        name = 'AMD Radeon 780M (Vulkan Unified)';
        usagePercent = parseInt(fs.readFileSync(gpuBusyPath, 'utf8').trim(), 10);

        // GPU Temperature
        const tempPath = '/sys/class/drm/card1/device/hwmon/hwmon7/temp1_input';
        if (fs.existsSync(tempPath)) {
          const milli = parseInt(fs.readFileSync(tempPath, 'utf8').trim(), 10);
          temperatureC = parseFloat((milli / 1000).toFixed(1));
        }
      }
    } catch {}

    // ROG Ally X uses unified memory architecture (no separate dedicated VRAM)
    return {
      available,
      name,
      usagePercent,
      temperatureC,
      vramTotalBytes: null, // APU uses unified system memory
      vramUsedBytes: null,
      vramFreeBytes: null,
    };
  }

  private getStorageMetrics() {
    let totalBytes = 0;
    let freeBytes = 0;
    let usedBytes = 0;
    let usagePercent = 0;

    try {
      const targetPath = fs.existsSync(os.homedir()) ? os.homedir() : '/';
      const stats = fs.statfsSync(targetPath);
      totalBytes = stats.blocks * stats.bsize;
      freeBytes = stats.bfree * stats.bsize;
      usedBytes = Math.max(0, totalBytes - freeBytes);
      usagePercent = totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;
    } catch {}

    return { totalBytes, usedBytes, freeBytes, usagePercent };
  }

  private getBatteryMetrics() {
    let available = false;
    let percent: number | null = null;
    let isCharging: boolean | null = null;
    let powerWatts: number | null = null;

    try {
      const capacityPath = '/sys/class/power_supply/BAT0/capacity';
      if (fs.existsSync(capacityPath)) {
        available = true;
        percent = parseInt(fs.readFileSync(capacityPath, 'utf8').trim(), 10);

        const statusPath = '/sys/class/power_supply/BAT0/status';
        if (fs.existsSync(statusPath)) {
          const status = fs.readFileSync(statusPath, 'utf8').trim();
          isCharging = status === 'Charging';
        }

        const powerPath = '/sys/class/power_supply/BAT0/power_now';
        if (fs.existsSync(powerPath)) {
          const microWatts = parseInt(fs.readFileSync(powerPath, 'utf8').trim(), 10);
          powerWatts = parseFloat((microWatts / 1000000).toFixed(2));
        }
      }
    } catch {}

    return { available, percent, isCharging, powerWatts };
  }
}
