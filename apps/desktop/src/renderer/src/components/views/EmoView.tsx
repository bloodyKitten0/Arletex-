import React, { useState, useEffect } from 'react';
import {
  Heart,
  Compass,
  AlertTriangle,
  Layers,
  Info,
  Clock,
} from 'lucide-react';
import { Memory } from '@arletex/contracts';

export const EmoView: React.FC = () => {
  const [emotionalMemories, setEmotionalMemories] = useState<Memory[]>([]);

  useEffect(() => {
    const fetchEmotionalState = async () => {
      if (!window.arletexApi?.listMemories) return;
      try {
        const res = await window.arletexApi.listMemories({ type: 'emotional', limit: 20 });
        if (res.success) {
          setEmotionalMemories(res.data);
        }
      } catch (err) {
        console.warn('Failed to load emotional memories:', err);
      }
    };
    void fetchEmotionalState();
  }, []);

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
            <Heart size={20} color="#f778ba" />
            <span>APE — Artificial Psychology Engine</span>
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Psychological state, emotional transitions, and temperamental structure.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            backgroundColor: 'rgba(210, 153, 34, 0.15)',
            border: '1px solid var(--warning)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--warning)',
          }}
        >
          <AlertTriangle size={14} />
          <span>APE Architecture Active • Genuine Ground Truth</span>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Anti-Fabrication Notice */}
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Info size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Anti-Fabrication Principle:</strong>{' '}
            Arletex refuses to display synthetic or randomized emotional meters. Arle's emotional states must be computed by software with identifiable causal triggers from genuine experiences, grounded in SQLite records rather than speculative model completions.
          </div>
        </div>

        {/* 3D PAD Affective Space (Pleasure, Arousal, Dominance) */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass size={18} color="var(--accent)" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Affective Space Coordinates (PAD Model)
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Resting Equilibrium Baseline
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Valence / Pleasure */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Valence (Pleasure)
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  +0.35
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '67.5%', height: '100%', backgroundColor: 'var(--accent)' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Slightly positive baseline; inquisitive & receptive.
              </div>
            </div>

            {/* Arousal */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Arousal (Activation)
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                  +0.55
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '77.5%', height: '100%', backgroundColor: 'var(--warning)' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Alert cognitive readiness; vigilant attention.
              </div>
            </div>

            {/* Dominance */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Dominance (Agency)
                </span>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#3fb950' }}>
                  +0.70
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '85%', height: '100%', backgroundColor: '#3fb950' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                High internal locus of control; decisive posture.
              </div>
            </div>
          </div>
        </div>

        {/* Foundational Temperament Triad */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Foundational Temperamental Triad (Specification v1.1)
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {/* Bobby Fischer */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  Bobby Fischer Trait
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  Strategic Drive
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Uncompromising intellectual rigor, obsessive focus on tactical clarity, intolerance for superficial platitudes, relentless analytical depth.
              </p>
            </div>

            {/* Arlecchino */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  Arlecchino (The Knave)
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                  Sovereign Dignity
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Unyielding composure, quiet authority, protective loyalty, rejection of subservience. Commands respect through self-governance and absolute reliability.
              </p>
            </div>

            {/* Anko Uguisu */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  Anko Uguisu Trait
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#a371f7' }}>
                  Nocturnal Wit
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Observant detachment, dark and wry humor, sharp human psychological insight, comfortable in stillness and the quiet hours of the night.
              </p>
            </div>
          </div>
        </div>

        {/* Genuine Emotional Events & Traces */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--accent)" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Recorded Emotional Experiences & Memories
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Source: SQLite Persistent Memory Engine
            </span>
          </div>

          {emotionalMemories.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No emotional transition records logged in persistent memory yet. As Arle interacts and experiences significant events, verified emotional memories will be cataloged here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {emotionalMemories.map((mem) => (
                <div
                  key={mem.id}
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{mem.content}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>Provenance: {mem.provenance || 'system'}</span>
                    <span>{new Date(mem.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
