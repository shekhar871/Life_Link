import React from 'react';
import { User, Bot } from 'lucide-react';

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '16px'
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '10px',
          maxWidth: '82%',
          flexDirection: isUser ? 'row-reverse' : 'row'
        }}
      >
        {/* Avatar icon */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: isUser ? 'var(--brand-blue)' : 'var(--brand-red)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>

        {/* Message bubble */}
        <div
          style={{
            background: isUser ? 'var(--brand-blue)' : 'var(--bg-card)',
            color: isUser ? '#ffffff' : 'var(--text-primary)',
            border: isUser ? 'none' : '1px solid var(--border-color)',
            padding: '12px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            fontSize: '13.5px',
            lineHeight: '1.5',
            boxShadow: 'var(--shadow-sm)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}
