import React from 'react';
import { InferenceHealthResult } from '@arletex/contracts';
import { Activity, RefreshCw, Cpu, Server } from 'lucide-react';

interface StatusBarProps {
  health: InferenceHealthResult | null;
  checking: boolean;
  onRefresh: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ health, checking, onRefresh }) => {
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
