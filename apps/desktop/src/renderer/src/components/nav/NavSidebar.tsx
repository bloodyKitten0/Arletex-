import React from 'react';
import {
  MessageSquare,
  Brain,
  Heart,
  Clock,
  Target,
  Shield,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';

export type NavSection = 'main' | 'memory' | 'emo' | 'history' | 'activities' | 'environment';

interface NavSidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isGenerating?: boolean;
}

interface NavItem {
  id: NavSection;
  label: string;
  icon: LucideIcon;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'main',
    label: 'Main',
    icon: MessageSquare,
    description: 'Presence & Conversation',
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: Brain,
    description: 'Autobiographical Knowledge',
  },
  {
    id: 'emo',
    label: 'Emo',
    icon: Heart,
    description: 'Psychological State (APE)',
  },
  {
    id: 'history',
    label: 'History',
    icon: Clock,
    description: 'Conversation Archives',
  },
  {
    id: 'activities',
    label: 'Activities',
    icon: Target,
    description: 'Pursuits & Active Tasks',
  },
  {
    id: 'environment',
    label: 'Environment',
    icon: Shield,
    description: 'Digital Access & Sandbox',
  },
];

export const NavSidebar: React.FC<NavSidebarProps> = ({
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapse,
  isGenerating = false,
}) => {
  return (
    <aside
      style={{
        width: collapsed ? '68px' : '220px',
        minWidth: collapsed ? '68px' : '220px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        zIndex: 20,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '56px',
          padding: collapsed ? '0 12px' : '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 800,
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              flexShrink: 0,
            }}
          >
            A
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.8px', color: 'var(--text-primary)' }}>
                ARLETEX
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                HOST OS v0.2
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Navigation"
            style={{
              padding: '6px',
              color: 'var(--text-secondary)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              title={collapsed ? `${item.label} — ${item.description}` : undefined}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                borderRadius: '8px',
                backgroundColor: isActive ? 'var(--accent-muted)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '13px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {/* Active Indicator Bar */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '6px',
                    bottom: '6px',
                    width: '3px',
                    backgroundColor: 'var(--accent)',
                    borderRadius: '0 3px 3px 0',
                  }}
                />
              )}

              <Icon size={18} />

              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                  <span style={{ lineHeight: 1.2 }}>{item.label}</span>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle when collapsed */}
      {collapsed && (
        <div style={{ padding: '8px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand Navigation"
            style={{
              padding: '8px',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Individual Status Footer */}
      <div
        style={{
          padding: collapsed ? '12px 6px' : '12px 14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isGenerating ? 'var(--warning)' : 'var(--success)',
                boxShadow: isGenerating
                  ? '0 0 8px var(--warning)'
                  : '0 0 8px var(--success)',
              }}
            />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Arle
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {isGenerating ? 'Active Cognition' : 'Online / Present'}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
