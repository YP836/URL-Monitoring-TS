import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return createPortal(
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        backgroundColor: 'white',
        border: '1px solid #E24B4A',
        borderRadius: 12,
        padding: 16,
        maxWidth: 360,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        animation: 'fadeIn 200ms ease-in-out forwards',
        zIndex: 9999,
      }}
    >
      <span style={{ color: '#333' }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          color: '#999',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
        }}
      >
        x
      </button>
    </div>,
    document.body
  );
}
