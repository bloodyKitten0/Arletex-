import React from 'react';
import {
  Shield,
  ShieldCheck,
  Globe,
  Terminal,
  Lock,
  Mail,
  Folder,
} from 'lucide-react';

export const EnvironmentView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, overflowY: 'auto' }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent)" />
            <span>Digital Environment & Security Boundary</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Operational sandbox, file system permissions, network access, and execution boundary.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: 'var(--success-muted)',
            border: '1px solid var(--success)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--success)',
          }}
        >
          <ShieldCheck size={14} />
          <span>Security Sandbox Active</span>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Security Policy Summary */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Autonomy and Permission Architecture
          </h2>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            Arletex enforces strict boundaries between cognitive model proposals and authorized system actions. The language model (Qwen 3.5-9B Heretic) may propose executions, file operations, or web requests, but executions require programmatic security validation and user consent gates.
          </p>
        </div>

        {/* Digital Environment Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {/* Filesystem Sandbox */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Folder size={16} color="var(--accent)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Filesystem Boundary
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Sandbox Root: <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>~/.arletex/</code>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Restricted to local project and user-designated directories. System files and atomic OS roots are strictly protected.
            </div>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Permission:</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Scoped Sandboxed</span>
            </div>
          </div>

          {/* Network & Browser Activity */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={16} color="#79c0ff" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Network & Browser Access
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Localhost Loopback: <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>127.0.0.1</code>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              All cognitive inference and specialist ML services run offline on device. Web search or external requests require user confirmation.
            </div>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>External Egress:</span>
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>Gated on Approval</span>
            </div>
          </div>

          {/* Terminal & Subprocesses */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={16} color="var(--warning)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Terminal & Subprocesses
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Host Shell: <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>/bin/bash (non-root)</code>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Direct command execution by the model is blocked. Proposed commands must pass the Autonomy Controller with explicit confirmation.
            </div>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Execution Policy:</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Supervised</span>
            </div>
          </div>

          {/* Digital Accounts & Identity */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={16} color="#a371f7" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Digital Accounts & Email
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Configured Mail: <span style={{ color: 'var(--text-muted)' }}>None (Unlinked)</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Arle can be provisioned with an autonomous email inbox to read and send messages independently when authorized.
            </div>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ color: 'var(--text-muted)' }}>Awaiting Provisioning</span>
            </div>
          </div>
        </div>

        {/* Security Controls Table */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Security Enforcement Layers
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Loopback IPC Authentication</span>
              <span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>x-arletex-auth token enforced</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Host Filesystem Mutation</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Non-root, Sandboxed to app data</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Model Autonomous Decision Power</span>
              <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>Proposals Only (Untrusted)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Memory Soft Deletion Eligibility</span>
              <span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>Immediate retrieval exclusion</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
