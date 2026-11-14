import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Activity,
  HardDrive,
  Battery,
  Server,
  Zap,
  ChevronRight,
  ChevronLeft,
  Gauge,
  Thermometer,
} from 'lucide-react';
import { DeviceTelemetry } from '@arletex/contracts';

interface TelemetryRailProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  speedTps?: number;
}

export const TelemetryRail: React.FC<TelemetryRailProps> = ({
  collapsed,
  onToggleCollapse,
  speedTps = 0,
}) => {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTelemetry = async () => {
      if (!window.arletexApi?.getTelemetry) return;
      try {
        const res = await window.arletexApi.getTelemetry();
        if (isMounted && res.success) {
          setTelemetry(res.data);
        }
      } catch (err) {
        console.warn('Telemetry fetch error:', err);
      }
    };

    void fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (collapsed) {
    return (
      <aside
        style={{
          width: '40px',
          backgroundColor: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          gap: '12px',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand Device Telemetry"
          style={{
            padding: '6px',
            color: 'var(--text-secondary)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ChevronLeft size={16} />
        </button>

        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '11px',
            letterSpacing: '1px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: '8px',
          }}
        >
          TELEMETRY
        </div>

        {/* Live TPS mini indicator */}
        {speedTps > 0 && (
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent)',
              fontWeight: 700,
              marginTop: 'auto',
              marginBottom: '8px',
              textAlign: 'center',
            }}
          >
            {speedTps.toFixed(0)}t/s
          </div>
        )}
      </aside>
    );
  }

  // Helper for progress meters
  const renderMeter = (percent: number | null, color = 'var(--accent)') => {
    if (percent === null) {
      return (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          N/A
        </span>
      );
    }
    const clamped = Math.min(100, Math.max(0, percent));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div
          style={{
            flex: 1,
            height: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${clamped}%`,
              height: '100%',
              backgroundColor: clamped > 85 ? 'var(--danger)' : color,
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            minWidth: '34px',
            textAlign: 'right',
          }}
        >
          {clamped.toFixed(0)}%
        </span>
      </div>
    );
  };

  const renderServicePill = (label: string, isHealthy: boolean) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 0',
        fontSize: '11px',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: isHealthy ? 'var(--success)' : 'var(--danger)',
            boxShadow: isHealthy ? '0 0 4px var(--success)' : '0 0 4px var(--danger)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: isHealthy ? 'var(--success)' : 'var(--danger)',
          }}
        >
          {isHealthy ? 'OK' : 'OFF'}
        </span>
      </div>
    </div>
  );

  return (
    <aside
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
        overflowY: 'auto',
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '56px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Gauge size={16} color="var(--accent)" />
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>
            DEVICE TELEMETRY
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Collapse Telemetry"
          style={{
            padding: '4px',
            color: 'var(--text-secondary)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Hardware Architecture Badge */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
            ASUS ROG Ally X
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Ryzen Z1 Extreme • Radeon 780M • 24GB Unified
          </div>
        </div>

        {/* CPU Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <Cpu size={14} color="var(--accent)" />
              <span>CPU (Z1 Extreme)</span>
            </div>
            {telemetry?.cpu.temperatureC !== null && telemetry?.cpu.temperatureC !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                <Thermometer size={12} />
                <span>{telemetry.cpu.temperatureC}°C</span>
              </div>
            )}
          </div>
          {renderMeter(telemetry?.cpu.usagePercent ?? null)}
          {telemetry?.cpu.frequencyMhz && (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Clock: {(telemetry.cpu.frequencyMhz / 1000).toFixed(2)} GHz
            </div>
          )}
        </div>

        {/* Unified Memory Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <Activity size={14} color="#a371f7" />
              <span>Unified Memory</span>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {telemetry ? `${(telemetry.memory.usedBytes / (1024 ** 3)).toFixed(1)} / ${(telemetry.memory.totalBytes / (1024 ** 3)).toFixed(1)} GB` : '--'}
            </span>
          </div>
          {renderMeter(telemetry?.memory.usagePercent ?? null, '#a371f7')}
        </div>

        {/* GPU Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <Zap size={14} color="var(--warning)" />
              <span>Radeon 780M (Vulkan)</span>
            </div>
            {telemetry?.gpu.temperatureC !== null && telemetry?.gpu.temperatureC !== undefined && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {telemetry.gpu.temperatureC}°C
              </span>
            )}
          </div>
          {renderMeter(telemetry?.gpu.usagePercent ?? null, 'var(--warning)')}
        </div>

        {/* Battery & Power */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <Battery size={14} color="var(--success)" />
              <span>Battery</span>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {telemetry?.battery.isCharging ? 'AC Powered' : 'Discharging'}
            </span>
          </div>
          {renderMeter(telemetry?.battery.percent ?? null, 'var(--success)')}
        </div>

        {/* Storage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
              <HardDrive size={14} color="#79c0ff" />
              <span>Storage (NVMe)</span>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {telemetry ? `${(telemetry.storage.usedBytes / (1024 ** 3)).toFixed(0)} / ${(telemetry.storage.totalBytes / (1024 ** 3)).toFixed(0)} GB` : '--'}
            </span>
          </div>
          {renderMeter(telemetry?.storage.usagePercent ?? null, '#79c0ff')}
        </div>

        {/* Inference Telemetry */}
        <div
          style={{
            padding: '10px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Cognitive Inference
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
            {telemetry?.inference.activeModel || 'Qwen3.5-9B-Heretic-Q4_K_M'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Throughput:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
              {speedTps > 0 ? `${speedTps.toFixed(1)} tok/s` : (telemetry?.inference.lastTps ? `${telemetry.inference.lastTps.toFixed(1)} tok/s` : 'Idle')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>First Token (TTFT):</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
              {telemetry?.inference.lastTtftMs ? `${telemetry.inference.lastTtftMs} ms` : '--'}
            </span>
          </div>
        </div>

        {/* Services Status */}
        <div
          style={{
            padding: '10px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <Server size={12} />
            <span>Infrastructure Health</span>
          </div>
          {renderServicePill('Host Backend (39281)', telemetry?.services.backend ?? false)}
          {renderServicePill('SQLite / WAL Engine', telemetry?.services.database ?? false)}
          {renderServicePill('llama-server Vulkan (8080)', telemetry?.services.llamaServer ?? false)}
          {renderServicePill('EmbeddingGemma 300M (39282)', telemetry?.services.embeddingGemma ?? false)}
          {renderServicePill('Whisper Small STT (39282)', telemetry?.services.whisper ?? false)}
          {renderServicePill('Kokoro 82M TTS (39282)', telemetry?.services.kokoro ?? false)}
        </div>
      </div>
    </aside>
  );
};
