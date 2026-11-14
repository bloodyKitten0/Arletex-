import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Pin,
  PinOff,
  Edit3,
  Trash2,
  ExternalLink,
  MessageSquare,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { Conversation } from '@arletex/contracts';

interface HistoryViewProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectAndOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, title?: string, isPinned?: boolean) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  conversations,
  activeId,
  onSelectAndOpen,
  onCreate,
  onDelete,
  onUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Group conversations by time category
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const { pinned, today, yesterday, earlier } = useMemo(() => {
    const pinnedList: Conversation[] = [];
    const todayList: Conversation[] = [];
    const yesterdayList: Conversation[] = [];
    const earlierList: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;

    for (const conv of filteredConversations) {
      if (conv.isPinned) {
        pinnedList.push(conv);
        continue;
      }
      const time = new Date(conv.updatedAt || conv.createdAt).getTime();
      if (time >= startOfToday) {
        todayList.push(conv);
      } else if (time >= startOfYesterday) {
        yesterdayList.push(conv);
      } else {
        earlierList.push(conv);
      }
    }

    return {
      pinned: pinnedList,
      today: todayList,
      yesterday: yesterdayList,
      earlier: earlierList,
    };
  }, [filteredConversations]);

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const saveRename = (id: string) => {
    if (editingTitle.trim()) {
      onUpdate(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const renderConversationItem = (conv: Conversation) => {
    const isEditing = editingId === conv.id;
    const isActive = activeId === conv.id;

    return (
      <div
        key={conv.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: isActive ? 'var(--accent-muted)' : 'var(--bg-card)',
          borderRadius: '8px',
          border: `1px solid ${isActive ? 'var(--border-active)' : 'var(--border-subtle)'}`,
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <MessageSquare size={16} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />

          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(conv.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--accent)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              />
              <button type="button" onClick={() => saveRename(conv.id)} style={{ color: 'var(--success)' }}>
                <Check size={16} />
              </button>
              <button type="button" onClick={() => setEditingId(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {conv.title}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(conv.updatedAt || conv.createdAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
            <button
              type="button"
              onClick={() => onUpdate(conv.id, undefined, !conv.isPinned)}
              title={conv.isPinned ? 'Unpin' : 'Pin to top'}
              style={{ padding: '6px', color: conv.isPinned ? 'var(--accent)' : 'var(--text-muted)', borderRadius: '4px' }}
            >
              {conv.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
            </button>

            <button
              type="button"
              onClick={() => startRename(conv)}
              title="Rename Session"
              style={{ padding: '6px', color: 'var(--text-muted)', borderRadius: '4px' }}
            >
              <Edit3 size={15} />
            </button>

            <button
              type="button"
              onClick={() => onDelete(conv.id)}
              title="Delete Session"
              style={{ padding: '6px', color: 'var(--danger)', borderRadius: '4px' }}
            >
              <Trash2 size={15} />
            </button>

            <button
              type="button"
              onClick={() => onSelectAndOpen(conv.id)}
              title="Open Conversation in Main"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span>Open</span>
              <ExternalLink size={13} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0 }}>
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} color="var(--accent)" />
              <span>Conversation History Archive</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Chronological records of dialogues with Arle. Distinct from autobiographical memories.
            </p>
          </div>

          <button
            type="button"
            onClick={onCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--accent)',
              color: '#000',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '6px',
            }}
          >
            <Plus size={16} />
            <span>New Session</span>
          </button>
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            padding: '6px 12px',
          }}
        >
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search conversation titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredConversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Clock size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No conversations found
            </div>
          </div>
        ) : (
          <>
            {/* Pinned Section */}
            {pinned.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  <Pin size={13} />
                  <span>Pinned Sessions</span>
                </div>
                {pinned.map(renderConversationItem)}
              </div>
            )}

            {/* Today */}
            {today.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Today
                </div>
                {today.map(renderConversationItem)}
              </div>
            )}

            {/* Yesterday */}
            {yesterday.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Yesterday
                </div>
                {yesterday.map(renderConversationItem)}
              </div>
            )}

            {/* Earlier */}
            {earlier.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Earlier Sessions
                </div>
                {earlier.map(renderConversationItem)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
