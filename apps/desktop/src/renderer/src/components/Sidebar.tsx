import React from 'react';
import { Conversation } from '@arletex/contracts';
import { Plus, MessageSquare, Trash2, Terminal } from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}) => {
  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
      }}
    >
      {/* App Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 700,
              fontSize: '13px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.5px' }}>ARLETEX</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              LOCAL DESKTOP HOST
            </div>
          </div>
        </div>
      </div>

      {/* Action: New Conversation */}
      <div style={{ padding: '12px' }}>
        <button
          type="button"
          onClick={onCreate}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border-subtle)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
        >
          <Plus size={16} />
          <span>New Session</span>
        </button>
      </div>

      {/* Conversations List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
        <div
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            padding: '8px 8px 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Sessions ({conversations.length})
        </div>

        {conversations.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            No sessions yet.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: isActive ? 'var(--border-subtle)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  fontSize: '13px',
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <MessageSquare size={14} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '160px',
                    }}
                  >
                    {conv.title}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this conversation?')) {
                      onDelete(conv.id);
                    }
                  }}
                  title="Delete conversation"
                  style={{
                    opacity: 0.5,
                    padding: '2px',
                    borderRadius: '4px',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer System Info */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Terminal size={12} />
        <span>ROG Ally X • Bazzite</span>
      </div>
    </aside>
  );
};
