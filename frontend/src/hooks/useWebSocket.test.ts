import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildWsUrl, useWebSocket } from './useWebSocket';
import { PingResult } from '../types';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  send = vi.fn();

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code: 1000 } as CloseEvent);
  });

  open(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  message(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  closeWith(code = 1006): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code } as CloseEvent);
  }
}

describe('useWebSocket', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('connects on mount', () => {
    expect(buildWsUrl('http://localhost:8000')).toBe('ws://localhost:8000/ws');

    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
    const socket = MockWebSocket.instances[0];

    expect(socket.url).toBe('ws://localhost:8000/ws');

    act(() => {
      socket.open();
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('parses ping result message', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
    const socket = MockWebSocket.instances[0];
    const payload: PingResult = {
      url_id: 1,
      status: 'UP',
      latency_ms: 99,
      status_code: 200,
      checked_at: '2024-01-15T10:30:00Z',
    };

    act(() => {
      socket.open();
      socket.message(JSON.stringify(payload));
    });

    expect(result.current.lastMessage).toEqual(payload);
  });

  it('ignores heartbeat messages', () => {
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.open();
      socket.message(JSON.stringify({ type: 'heartbeat' }));
    });

    expect(result.current.lastMessage).toBeNull();
  });

  it('reconnects on close', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { result } = renderHook(() => useWebSocket('ws://localhost:8000/ws'));
    const socket = MockWebSocket.instances[0];

    act(() => {
      socket.open();
      socket.closeWith();
    });

    expect(result.current.isConnected).toBe(false);
    expect(setTimeoutSpy).toHaveBeenCalled();
  });
});
