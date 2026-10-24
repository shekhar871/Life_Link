/**
 * ============================================================================
 * LIFELINK — DESKTOP NAVBAR & APPLICATION CONTROLS (Navbar.jsx)
 * ============================================================================
 * [LECTURE REQUIREMENTS IMPLEMENTED]:
 * 1. Desktop Tab Navigation: Facilities, Local Inventory, Urgent Requests, Donors, Dispatch, AI
 * 2. Role Switcher & Access Guard: Opens RoleGuardModal
 * 3. Theme Toggle: Cycles Dark / Light / System theme and calls IPC theme:set
 * 4. Secondary Window Action: Triggers window.lifelinkAPI.openAboutWindow()
 * 5. Native Exit Action: Triggers native exit confirmation dialog
 * ============================================================================
 */

import React from 'react';
import {
  HeartPulse,
  Building2,
  Package,
  AlertTriangle,
  Users,
  ShieldAlert,
  Bot,
  Info,
  LogOut,
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  Lock
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  userRole,
  onOpenRoleModal,
  theme,
  onToggleTheme,
  onOpenAbout,
  onExitApp,
  expiryCount
}) {
  const tabs = [
    { id: 'facilities', label: 'Facilities & Supply', icon: Building2 },
    { id: 'inventory', label: 'Local Inventory', icon: Package, badge: expiryCount > 0 ? expiryCount : null },
    { id: 'requests', label: 'Urgent Requests', icon: AlertTriangle },
    { id: 'donors', label: 'Donor Network', icon: Users },
    { id: 'dispatch', label: 'Emergency Dispatch', icon: ShieldAlert, highlight: true },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot }
  ];

  return (
    <header
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--brand-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(225, 29, 72, 0.35)'
          }}
        >
          <HeartPulse size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
              LifeLink
            </span>
            <span className="badge badge-red" style={{ fontSize: '10px', padding: '2px 6px' }}>
              DESKTOP
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Blood & Medicine Availability Network
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                background: isActive
                  ? tab.highlight
                    ? 'var(--brand-red)'
                    : 'var(--bg-hover)'
                  : 'transparent',
                color: isActive
                  ? tab.highlight
                    ? '#ffffff'
                    : 'var(--brand-red)'
                  : 'var(--text-secondary)',
                border: isActive && !tab.highlight ? '1px solid var(--border-color)' : '1px solid transparent',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                position: 'relative'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  style={{
                    marginLeft: '4px',
                    background: 'var(--brand-red)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 700
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Actions: Role Guard, Theme, About, Exit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Role Switcher Button */}
        <button
          onClick={onOpenRoleModal}
          className="btn btn-secondary"
          style={{
            fontSize: '12px',
            padding: '6px 12px',
            borderColor: userRole !== 'User' ? 'var(--brand-emerald)' : 'var(--border-color)'
          }}
          title="Switch role and authenticate security permissions"
        >
          {userRole !== 'User' ? (
            <ShieldCheck size={14} color="var(--brand-emerald)" />
          ) : (
            <Lock size={14} color="var(--text-muted)" />
          )}
          <span style={{ fontWeight: 600 }}>{userRole}</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="btn btn-secondary"
          style={{ padding: '6px 10px' }}
          title={`Current Theme: ${theme}. Click to cycle.`}
        >
          {theme === 'dark' ? <Moon size={15} /> : theme === 'light' ? <Sun size={15} /> : <Laptop size={15} />}
        </button>

        {/* About Window Button */}
        <button
          onClick={onOpenAbout}
          className="btn btn-secondary"
          style={{ padding: '6px 10px' }}
          title="About LifeLink & Emergency Contacts"
        >
          <Info size={15} />
        </button>

        {/* Native Exit Application Button */}
        <button
          onClick={onExitApp}
          className="btn btn-secondary"
          style={{ padding: '6px 10px', color: 'var(--brand-red)' }}
          title="Exit LifeLink"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
