import React from 'react';
import { InferenceHealthResult } from '@arletex/contracts';
import { Activity, RefreshCw, Cpu, Server, Zap } from 'lucide-react';

interface StatusBarProps {
  health: InferenceHealthResult | null;
  checking: boolean;
  onRefresh: () => void;
  speedTps?: number;
  isGenerating?: boolean;
  onToggleProvider?: (newProvider: 'colibri' | 'llama.cpp') => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  health,
  checking,
  onRefresh,
  speedTps = 0,
  isGenerating = false,
}) => {
  const isConnected = health?.status === 'connected';
  const statusLabel = isConnected ? 'VULKAN ENGINE ONLINE' : 'ENGINE OFFLINE';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-secondary)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? 'var(--success)' : 'var(--danger)',
              boxShadow: isConnected ? '0 0 8px var(--success)' : 'none',
              display: 'inline-block',
            }}
          />
          <span style={{ fontWeight: 500, color: isConnected ? 'var(--text-primary)' : 'var(--danger)' }}>
            {statusLabel}
          </span>
        </div>

        {/* Server URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Server size={13} style={{ color: 'var(--text-muted)' }} />
          <span>{health?.url || 'http://127.0.0.1:8080'}</span>
        </div>

        {/* Model loaded */}
        {isConnected && health?.modelLoaded && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={13} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-primary)' }}>{health.modelLoaded}</span>
          </div>
        )}

        {/* Latency */}
        {isConnected && health?.latencyMs !== null && health?.latencyMs !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{health.latencyMs}ms</span>
          </div>
        )}

        {/* Live Generation Speed / TPS Gauge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderLeft: '1px solid var(--border-subtle)',
            paddingLeft: '12px',
          }}
        >
          <Zap
            size={13}
            style={{
              color: isGenerating ? 'var(--accent)' : 'var(--text-muted)',
              filter: isGenerating ? 'drop-shadow(0 0 4px var(--accent))' : 'none',
            }}
          />
          <span
            style={{
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: isGenerating && speedTps > 0 ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {isGenerating
              ? speedTps > 0
                ? `${speedTps} t/s`
                : 'evaluating...'
              : '0.0 t/s'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(0, 255, 170, 0.08)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          <Zap size={11} />
          <span>Radeon 780M (Vulkan)</span>
        </div>

        {health?.error && (
          <span style={{ color: 'var(--danger)', fontSize: '11px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {health.error}
          </span>
        )}
        <button
          onClick={onRefresh}
          disabled={checking}
          title="Refresh server status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '11px',
            cursor: checking ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={11} className={checking ? 'spin' : ''} />
          <span>{checking ? 'Checking...' : 'Check'}</span>
        </button>
      </div>
    </div>
  );
};
