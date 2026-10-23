import React from 'react';
import { Send, Loader2 } from 'lucide-react';

export default function SendButton({ onClick, disabled, isLoading }) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={onClick}
      disabled={disabled || isLoading}
      style={{
        padding: '12px 20px',
        fontSize: '13.5px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}
    >
      {isLoading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Sending...</span>
        </>
      ) : (
        <>
          <Send size={16} />
          <span>Send</span>
        </>
      )}
    </button>
  );
}
