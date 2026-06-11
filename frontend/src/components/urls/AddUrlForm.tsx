import { useState, FormEvent } from 'react';
import { AddURLPayload } from '../../types';

interface AddUrlFormProps {
  onAdd: (payload: AddURLPayload) => void;
  isLoading: boolean;
}

export function AddUrlForm({ onAdd, isLoading }: AddUrlFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    onAdd({ name: name.trim(), web_address: url.trim() });
    setName('');
    setUrl('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'flex-end',
        padding: 24,
        backgroundColor: '#fafafa',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="site-name" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          Site name
        </label>
        <input
          id="site-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Website"
        />
      </div>

      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="site-url" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
          URL
        </label>
        <input
          id="site-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      <button type="submit" disabled={isLoading} className="primary">
        {isLoading ? 'Adding...' : 'Start monitoring'}
      </button>
    </form>
  );
}
