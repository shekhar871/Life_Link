/**
 * ============================================================================
 * LIFELINK — MAIN REACT RENDERER COMPONENT (App.jsx)
 * ============================================================================
 * [LECTURE ARCHITECTURE: Renderer Process (React 18 + Vite)]
 * 
 * Runs in the sandboxed renderer context at http://localhost:5173.
 * Interacts with native OS and file system ONLY via window.lifelinkAPI exposed 
 * in preload.js, and queries Express backend on http://localhost:3000 via fetch.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import FacilityNavigator from './components/FacilityNavigator';
import InventoryManager from './components/InventoryManager';
import UrgentRequests from './components/UrgentRequests';
import DonorRoster from './components/DonorRoster';
import EmergencyDispatch from './components/EmergencyDispatch';
import AIAssistant from './components/AIAssistant/AIAssistant';
import RoleGuardModal from './components/RoleGuardModal';
import { HeartPulse, Loader2 } from 'lucide-react';

// [LECTURE CHALLENGE: DevTools Debugging Log]
// Confirms that the Renderer process has mounted in Chromium DevTools
console.log('Hello from Renderer');

export default function App() {
  /**
   * [LECTURE REQUIREMENT: Local Persistence isLoading State]
   * Initialized to true to prevent flashing an empty list and to guard against
   * the saving useEffect prematurely writing an empty array to disk on startup.
   */
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState([]);

  // Navigation & Role authorization states
  const [activeTab, setActiveTab] = useState('facilities');
  const [userRole, setUserRole] = useState('User');
  const [roleKey, setRoleKey] = useState('');
  const [rolePermissions, setRolePermissions] = useState(['SEARCH', 'DONATE', 'REQUEST']);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Active emergency dispatch session state
  const [activeDispatchRequest, setActiveDispatchRequest] = useState(null);

  /**
   * [LECTURE CONCEPT: Theme State & LocalStorage Persistence]
   * Reads initial user theme from localStorage, defaulting to OS system theme.
   */
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('lifelink_theme') || 'system';
  });

  /**
   * [LECTURE CONCEPT: Theme Synchronization with Main Process]
   * Syncs theme with document data-theme attribute and invokes Main IPC theme:set
   */
  useEffect(() => {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('lifelink_theme', theme);

    if (window.lifelinkAPI && window.lifelinkAPI.setTheme) {
      window.lifelinkAPI.setTheme(theme).catch(console.warn);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'system' ? 'light' : prev === 'light' ? 'dark' : 'system'));
  };

  /**
   * [LECTURE REQUIREMENT: Initial Data Loading Effect (Mounted Once)]
   * Calls window.lifelinkAPI.loadInventory() over IPC to read userData JSON.
   * Updates React state and finally sets isLoading(false).
   */
  useEffect(() => {
    async function loadInitialData() {
      try {
        if (window.lifelinkAPI && window.lifelinkAPI.loadInventory) {
          const savedData = await window.lifelinkAPI.loadInventory();
          setInventory(Array.isArray(savedData) ? savedData : []);
        } else {
          // Fallback if running outside Electron in a standard browser
          const localSaved = localStorage.getItem('lifelink_fallback_inventory');
          if (localSaved) {
            setInventory(JSON.parse(localSaved));
          } else {
            setInventory([
              {
                id: 'local-inv-001',
                medicineName: 'Epinephrine 1mg/mL Auto-Injectors',
                batchNumber: 'EPI-2026-440',
                category: 'Emergency Resuscitation',
                quantity: 35,
                unit: 'auto-injectors',
                expiryDate: '2026-11-05',
                status: 'Near Expiry',
                notes: 'Cold chain verified. Stationed at Trauma Bay 1.'
              },
              {
                id: 'local-inv-002',
                medicineName: 'Tranexamic Acid (TXA) 1000mg/10mL',
                batchNumber: 'TXA-2024-883',
                category: 'Hemostatics / Trauma',
                quantity: 12,
                unit: 'vials',
                expiryDate: '2026-10-18',
                status: 'Expired',
                notes: 'Quarantined for disposal review.'
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load local inventory via IPC:', err);
      } finally {
        // [LECTURE REQUIREMENT: Set isLoading(false) only after disk data returns]
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  /**
   * [LECTURE CRITICAL GUARD: Saving useEffect with Guard]
   * Dependency array: [inventory, isLoading]
   * Starts with: if (isLoading) return;
   * This guard prevents the initial empty React state [] from overwriting 
   * the persistent userData JSON file on application startup.
   */
  useEffect(() => {
    if (isLoading) return; // Prevent startup overwrite

    if (window.lifelinkAPI && window.lifelinkAPI.saveInventory) {
      window.lifelinkAPI.saveInventory(inventory).catch((err) => {
        console.error('Failed to save inventory to userData JSON:', err);
      });
    } else {
      localStorage.setItem('lifelink_fallback_inventory', JSON.stringify(inventory));
    }
  }, [inventory, isLoading]);

  // Open secondary about window via IPC bridge
  const handleOpenAbout = async () => {
    if (window.lifelinkAPI && window.lifelinkAPI.openAboutWindow) {
      await window.lifelinkAPI.openAboutWindow();
    }
  };

  // Exit application confirmation via IPC bridge
  const handleExitApp = async () => {
    if (window.lifelinkAPI && window.lifelinkAPI.exitApp) {
      await window.lifelinkAPI.exitApp();
    }
  };

  const handleRoleChanged = (role, key, permissions) => {
    setUserRole(role);
    setRoleKey(key || '');
    setRolePermissions(permissions || []);
  };

  const handleLaunchEmergencyDispatch = (requestItem) => {
    setActiveDispatchRequest(requestItem);
    setActiveTab('dispatch');
  };

  // Calculate expired/near-expiry count (< 30 days) for navbar badge
  const expiryCount = inventory.filter((item) => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    const now = new Date('2026-10-23T00:00:00Z');
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  }).length;

  /**
   * [LECTURE REQUIREMENT: Safe Intermediate Loading UI]
   * Rendered while isLoading is true so an empty list is never flashed before disk data returns.
   */
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'sans-serif'
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: 'var(--brand-red)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            marginBottom: '18px',
            boxShadow: '0 8px 20px rgba(225, 29, 72, 0.4)'
          }}
        >
          <HeartPulse size={34} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
          LifeLink Desktop
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
          <Loader2 size={16} className="animate-spin" />
          <span>Loading LifeLink records...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenAbout={handleOpenAbout}
        onExitApp={handleExitApp}
        expiryCount={expiryCount}
      />

      <main style={{ flex: 1, padding: '24px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'facilities' && (
          <FacilityNavigator
            userRole={userRole}
            roleKey={roleKey}
            onStockUpdated={() => {}}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager
            inventory={inventory}
            setInventory={setInventory}
            userRole={userRole}
          />
        )}

        {activeTab === 'requests' && (
          <UrgentRequests
            userRole={userRole}
            roleKey={roleKey}
            onEmergencySessionSelect={handleLaunchEmergencyDispatch}
          />
        )}

        {activeTab === 'donors' && <DonorRoster />}

        {activeTab === 'dispatch' && (
          <EmergencyDispatch
            activeRequest={activeDispatchRequest}
            userRole={userRole}
            roleKey={roleKey}
          />
        )}

        {activeTab === 'ai-assistant' && <AIAssistant />}
      </main>

      <RoleGuardModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentRole={userRole}
        onRoleChanged={handleRoleChanged}
      />
    </div>
  );
}
