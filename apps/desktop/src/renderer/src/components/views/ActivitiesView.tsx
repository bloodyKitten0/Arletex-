import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  User,
  Bot,
  Trash2,
  X,
} from 'lucide-react';
import {
  Activity,
  ActivityOrigin,
  ActivityStatus,
} from '@arletex/contracts';

const STATUS_FILTERS: { id: ActivityStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All Statuses' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'planned', label: 'Planned' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const ActivitiesView: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [originFilter, setOriginFilter] = useState<ActivityOrigin | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formOrigin, setFormOrigin] = useState<ActivityOrigin>('arle_initiated');
  const [formStatus, setFormStatus] = useState<ActivityStatus>('planned');
  const [formProgress, setFormProgress] = useState(0);

  const api = window.arletexApi;

  const loadActivities = useCallback(async () => {
    if (!api) return;
    try {
      const s = statusFilter === 'all' ? undefined : statusFilter;
      const o = originFilter === 'all' ? undefined : originFilter;
      const res = await api.listActivities(s, o);
      if (res.success) {
        setActivities(res.data);
      }
    } catch (err: any) {
      console.warn('Load activities error:', err);
    }
  }, [api, statusFilter, originFilter]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api || !formTitle.trim()) return;

    try {
      const res = await api.createActivity({
        title: formTitle.trim(),
        objective: formObjective.trim() || formTitle.trim(),
        origin: formOrigin,
        status: formStatus,
        progress: formProgress / 100,
      });

      if (res.success) {
        setShowCreateModal(false);
        setFormTitle('');
        setFormObjective('');
        setFormProgress(0);
        void loadActivities();
      }
    } catch (err: any) {
      console.error('Create activity error:', err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: ActivityStatus) => {
    if (!api) return;
    try {
      const res = await api.updateActivity({
        id,
        status: newStatus,
        progress: newStatus === 'completed' ? 1.0 : undefined,
      });
      if (res.success) {
        void loadActivities();
      }
    } catch (err: any) {
      console.error('Update activity error:', err);
    }
  };

  const handleUpdateProgress = async (id: string, progressFraction: number) => {
    if (!api) return;
    try {
      const clamped = Math.max(0, Math.min(1.0, progressFraction));
      const res = await api.updateActivity({
        id,
        progress: clamped,
        status: clamped >= 1.0 ? 'completed' : undefined,
      });
      if (res.success) {
        void loadActivities();
      }
    } catch (err: any) {
      console.error('Update progress error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!api || !confirm('Delete this activity pursuit?')) return;
    try {
      const res = await api.deleteActivity(id);
      if (res.success) {
        setActivities((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err: any) {
      console.error('Delete activity error:', err);
    }
  };

  const renderStatusBadge = (status: ActivityStatus) => {
    switch (status) {
      case 'in_progress':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '11px', fontWeight: 600 }}>
            <Play size={12} fill="currentColor" /> In Progress
          </span>
        );
      case 'planned':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>
            <Clock size={12} /> Planned
          </span>
        );
      case 'paused':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)', fontSize: '11px', fontWeight: 600 }}>
            <Pause size={12} /> Paused
          </span>
        );
      case 'completed':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '11px', fontWeight: 600 }}>
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '11px', fontWeight: 600 }}>
            <XCircle size={12} /> Cancelled
          </span>
        );
    }
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
              <Target size={20} color="var(--accent)" />
              <span>Pursuits & Activities</span>
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Projects, independent research, hobbies, and learning goals. Distinguishes Arle's pursuits from user tasks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormTitle('');
              setFormObjective('');
              setFormOrigin('arle_initiated');
              setFormStatus('planned');
              setFormProgress(0);
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
            <span>New Activity</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Origin Tabs */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setOriginFilter('all')}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: originFilter === 'all' ? 600 : 500,
                backgroundColor: originFilter === 'all' ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                color: originFilter === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              All Origins
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('arle_initiated')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: originFilter === 'arle_initiated' ? 600 : 500,
                backgroundColor: originFilter === 'arle_initiated' ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                color: originFilter === 'arle_initiated' ? 'var(--accent)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Bot size={13} />
              <span>Arle-Initiated</span>
            </button>
            <button
              type="button"
              onClick={() => setOriginFilter('user_assigned')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: originFilter === 'user_assigned' ? 600 : 500,
                backgroundColor: originFilter === 'user_assigned' ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                color: originFilter === 'user_assigned' ? 'var(--accent)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <User size={13} />
              <span>User-Assigned</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: statusFilter === f.id ? 600 : 500,
                  backgroundColor: statusFilter === f.id ? 'var(--bg-card)' : 'transparent',
                  color: statusFilter === f.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: statusFilter === f.id ? '1px solid var(--border-active)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Compass size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              No activities found
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Create an activity or let Arle pursue independent research and learning projects.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {activities.map((act) => {
              const isArle = act.origin === 'arle_initiated';
              const progressPct = Math.round(act.progress * 100);

              return (
                <div
                  key={act.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Top Origin & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isArle ? (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--accent)',
                            backgroundColor: 'var(--accent-muted)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          <Bot size={11} /> Arle Pursuit
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--bg-tertiary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}
                        >
                          <User size={11} /> User Assigned
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderStatusBadge(act.status)}
                      <button
                        type="button"
                        onClick={() => handleDelete(act.id)}
                        title="Delete Activity"
                        style={{ padding: '2px', color: 'var(--danger)', borderRadius: '4px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title and Objective */}
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {act.title}
                    </h3>
                    {act.objective && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                        {act.objective}
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Progress:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {progressPct}%
                      </span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressPct}%`,
                          height: '100%',
                          backgroundColor: progressPct === 100 ? 'var(--success)' : 'var(--accent)',
                          transition: 'width 0.2s',
                        }}
                      />
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {act.status !== 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(act.id, 'in_progress')}
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--accent)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          Start
                        </button>
                      )}
                      {act.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(act.id, 'paused')}
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--warning)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          Pause
                        </button>
                      )}
                      {act.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(act.id, 'completed')}
                          style={{
                            padding: '3px 8px',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--success)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          Complete
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateProgress(act.id, act.progress - 0.1)}
                        style={{ padding: '2px 6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px' }}
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateProgress(act.id, act.progress + 0.1)}
                        style={{ padding: '2px 6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px' }}
                      >
                        +10%
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
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
              maxWidth: '500px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>New Activity</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Activity Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Master the French Defense in Chess"
                  required
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

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Objective & Description
                </label>
                <textarea
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  placeholder="Explain why this pursuit matters and what constitutes success..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Origin
                  </label>
                  <select
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value as ActivityOrigin)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="arle_initiated">Arle Initiated</option>
                    <option value="user_assigned">User Assigned</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Initial Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ActivityStatus)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
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
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
