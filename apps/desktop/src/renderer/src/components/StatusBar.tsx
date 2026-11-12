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
  onToggleProvider,
}) => {
  const isConnected = health?.status === 'connected';
  const providerName = health?.provider === 'llama.cpp' ? 'LLAMA-SERVER' : 'COLIBRI';
  const statusLabel = isConnected
    ? `${providerName}${health?.isFallback ? ' (FALLBACK)' : ''} ONLINE`
    : `${providerName} OFFLINE`;

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
          {health?.isFallback && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 5px',
                borderRadius: '3px',
                backgroundColor: 'rgba(255, 170, 0, 0.15)',
                color: '#ffaa00',
                border: '1px solid rgba(255, 170, 0, 0.3)',
              }}
            >
              FAILOVER ACTIVE
            </span>
          )}
        </div>

        {/* Server URL */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Server size={13} style={{ color: 'var(--text-muted)' }} />
          <span>{health?.url || (health?.provider === 'llama.cpp' ? 'http://127.0.0.1:8080' : 'http://127.0.0.1:8000')}</span>
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

        {/* Coding Specialist Status */}
        {health?.specialistCoding && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderLeft: '1px solid var(--border-subtle)',
              paddingLeft: '12px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor:
                  health.specialistCoding.status === 'connected' ? 'var(--success)' : 'var(--text-muted)',
                boxShadow:
                  health.specialistCoding.status === 'connected' ? '0 0 6px var(--success)' : 'none',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                color:
                  health.specialistCoding.status === 'connected' ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: health.specialistCoding.status === 'connected' ? 500 : 400,
              }}
            >
              Coder 30B: {health.specialistCoding.status === 'connected' ? 'Ready' : 'Offline'}
            </span>
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
        {onToggleProvider && (
          health?.provider === 'colibri' ? (
            <button
              onClick={() => onToggleProvider('llama.cpp')}
              disabled={checking || isGenerating}
              title="Switch to Fast Mode: Qwen3.5-9B on Vulkan GPU (~17 t/s)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 255, 170, 0.08)',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: checking || isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Zap size={12} />
              <span>⚡ Fast Mode (9B Vulkan)</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleProvider('colibri')}
              disabled={checking || isGenerating}
              title="Switch to Dual Core: Qwen 35B Central + 30B Coder on Colibri"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 9px',
                borderRadius: '4px',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                color: '#60a5fa',
                border: '1px solid #60a5fa',
                fontSize: '11px',
                fontWeight: 600,
                cursor: checking || isGenerating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Cpu size={12} />
              <span>🧠 Dual Core (35B+30B)</span>
            </button>
          )
        )}

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
