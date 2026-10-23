import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export default function AppTitle() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--brand-red), #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: 'var(--shadow-sm)' }}>
          <Bot size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            LifeLink AI Clinical Assistant
            <span className="badge badge-red" style={{ fontSize: '10px' }}>Groq Accelerated</span>
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
            Instant blood compatibility verification, dosage reference, & expiry triage
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <Sparkles size={16} color="var(--brand-amber)" />
        <span>LLaMA-3.3-70B Medical Engine</span>
      </div>
    </div>
  );
}
