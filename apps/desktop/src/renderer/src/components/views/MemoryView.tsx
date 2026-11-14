import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  Search,
  Plus,
  Edit3,
  Trash2,
  Combine,
  Tag,
  X,
  AlertCircle,
} from 'lucide-react';
import { Memory, MemoryType } from '@arletex/contracts';

const MEMORY_TYPES: { id: MemoryType | 'all'; label: string }[] = [
  { id: 'all', label: 'All Records' },
  { id: 'episodic', label: 'Episodic' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'procedural', label: 'Procedural' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'developmental', label: 'Developmental' },
];

export const MemoryView: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedType, setSelectedType] = useState<MemoryType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [mergingMemory, setMergingMemory] = useState<Memory | null>(null);
  const [targetMergeId, setTargetMergeId] = useState<string>('');

  // New Memory Form State
  const [formType, setFormType] = useState<MemoryType>('episodic');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formImportance, setFormImportance] = useState(0.8);
  const [formConfidence, setFormConfidence] = useState(1.0);
  const [formProvenance, setFormProvenance] = useState('user_interaction');

  const api = window.arletexApi;

  // Fetch memories
  const loadMemories = useCallback(async () => {
    if (!api) return;
    setLoading(true);
    try {
      const typeParam = selectedType === 'all' ? undefined : selectedType;
      const queryParam = searchQuery.trim() || undefined;
      const res = await api.listMemories({
        type: typeParam,
        query: queryParam,
        limit: 50,
      });

      if (res.success) {
        setMemories(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, selectedType, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadMemories();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadMemories]);

  // Create Memory
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !formContent.trim()) return;

    try {
      const tagsArray = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.createMemory({
        type: formType,
        content: formContent.trim(),
        tags: tagsArray,
        importance: formImportance,
        confidence: formConfidence,
        provenance: formProvenance.trim() || 'manual_entry',
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormContent('');
        setFormTags('');
        void loadMemories();
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Update Memory
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !editingMemory || !formContent.trim()) return;

    try {
      const tagsArray = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.updateMemory({
        id: editingMemory.id,
        content: formContent.trim(),
        tags: tagsArray,
        importance: formImportance,
        confidence: formConfidence,
        reason: 'Manual user edit from Memory Cockpit',
      });

      if (res.success) {
        setEditingMemory(null);
        setFormContent('');
        void loadMemories();
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Merge Memories
  const handleMergeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !mergingMemory || !targetMergeId) return;

    try {
      const res = await api.mergeMemories(mergingMemory.id, targetMergeId);
      if (res.success) {
        setMergingMemory(null);
        setTargetMergeId('');
        void loadMemories();
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Delete Memory
  const handleDelete = async (id: string) => {
    if (!api || !confirm('Permanently remove this memory? It will immediately become ineligible for retrieval.')) return;
    try {
      const res = await api.deleteMemory(id);
      if (res.success) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openEditModal = (mem: Memory) => {
    setEditingMemory(mem);
    setFormType(mem.type);
    setFormContent(mem.content);
    setFormTags((mem.tags || []).join(', '));
    setFormImportance(mem.importance);
    setFormConfidence(mem.confidence);
    setFormProvenance(mem.provenance || '');
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
              <Brain size={20} color="var(--accent)" />
              <span>Autobiographical & Persistent Memory</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Arle's retained knowledge, identity, and experiences. Decoupled from replaceable model weights.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormType('episodic');
              setFormContent('');
              setFormTags('');
              setFormImportance(0.8);
              setFormConfidence(1.0);
              setFormProvenance('user_interaction');
              setShowCreateModal(true);
            }}
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
            <span>New Memory</span>
          </button>
        </div>

        {/* Error notification if any */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '12px' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Search and Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              flex: 1,
              minWidth: '240px',
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
              placeholder="Search memories (hybrid vector & keyword)..."
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

          {/* Type Tabs */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {MEMORY_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedType(t.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: selectedType === t.id ? 600 : 500,
                  backgroundColor: selectedType === t.id ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                  color: selectedType === t.id ? 'var(--accent)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading && memories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading persistent memory records...
          </div>
        ) : memories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Brain size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No memories found
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {searchQuery ? 'Try a different search query or clear the filter.' : 'Record experiences or converse with Arle to build her knowledge.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {memories.map((mem) => (
              <div
                key={mem.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                }}
              >
                {/* Top Badge & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--accent)',
                      backgroundColor: 'var(--accent-muted)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {mem.type}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(mem)}
                      title="Edit Memory"
                      style={{ padding: '4px', color: 'var(--text-secondary)', borderRadius: '4px' }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMergingMemory(mem);
                        setTargetMergeId('');
                      }}
                      title="Merge into another memory"
                      style={{ padding: '4px', color: 'var(--text-secondary)', borderRadius: '4px' }}
                    >
                      <Combine size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(mem.id)}
                      title="Delete Memory"
                      style={{ padding: '4px', color: 'var(--danger)', borderRadius: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {mem.content}
                </div>

                {/* Tags */}
                {mem.tags && mem.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {mem.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          backgroundColor: 'var(--bg-tertiary)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '8px',
                    marginTop: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Imp: {(mem.importance * 100).toFixed(0)}%</span>
                    <span>•</span>
                    <span>Conf: {(mem.confidence * 100).toFixed(0)}%</span>
                  </div>
                  {mem.correctionHistory && mem.correctionHistory.length > 0 && (
                    <span style={{ color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                      Edited ({mem.correctionHistory.length})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Memory Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-active)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>New Memory Record</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Memory Type
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as MemoryType)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="episodic">Episodic (Autobiographical events)</option>
                  <option value="semantic">Semantic (Facts & Concepts)</option>
                  <option value="procedural">Procedural (How-to & Habits)</option>
                  <option value="relationship">Relationship (Interpersonal dynamics)</option>
                  <option value="emotional">Emotional (Feelings & Valences)</option>
                  <option value="developmental">Developmental (Growth Milestones)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Memory Content
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Record autobiographical knowledge, preferences, or observed facts..."
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. user_preference, chess, coding"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Importance: {(formImportance * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formImportance}
                    onChange={(e) => setFormImportance(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Confidence: {(formConfidence * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formConfidence}
                    onChange={(e) => setFormConfidence(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent)',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-active)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Edit Memory (Audit Tracked)
              </h2>
              <button type="button" onClick={() => setEditingMemory(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Content
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent)',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  Save Corrections
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Memory Modal */}
      {mergingMemory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-active)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Merge Memories</h2>
              <button type="button" onClick={() => setMergingMemory(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Combine content from this memory into another target memory. The secondary memory will be safely retired.
            </p>

            <form onSubmit={handleMergeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Select Target Memory to Merge With
                </label>
                <select
                  value={targetMergeId}
                  onChange={(e) => setTargetMergeId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="">-- Choose destination memory --</option>
                  {memories
                    .filter((m) => m.id !== mergingMemory.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        [{m.type}] {m.content.slice(0, 60)}...
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMergingMemory(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetMergeId}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent)',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  Execute Merge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
