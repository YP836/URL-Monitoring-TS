import { useCallback, useEffect, useRef, useState } from 'react';
import { PingResult } from '../types';

export function buildWsUrl(apiBaseUrl: string): string {
  const trimmedUrl = apiBaseUrl.trim();
  const wsUrl = trimmedUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');

  if (wsUrl.endsWith('/ws')) {
    return wsUrl;
  }

  return `${wsUrl.replace(/\/$/, '')}/ws`;
}

export function useWebSocket(url: string): {
  lastMessage: PingResult | null;
  isConnected: boolean;
  connectionError: string | null;
} {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const isManuallyClosed = useRef<boolean>(false);

  const [lastMessage, setLastMessage] = useState<PingResult | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const clearPingTimer = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  const connect = useCallback((): void => {
    if (!url || (!url.startsWith('ws://') && !url.startsWith('wss://'))) {
      setConnectionError('Invalid WebSocket URL. Check VITE_WS_URL in .env');
      console.warn('[ws] invalid URL, skipping connection');
      return;
    }

    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onopen = null;
      ws.current.close();
    }

    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      if (ws.current !== socket) {
        return;
      }

      setIsConnected(true);
      setConnectionError(null);
      reconnectAttempts.current = 0;
      clearPingTimer();

      pingTimer.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send('ping');
        }
      }, 20000);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      if (ws.current !== socket) {
        return;
      }

      try {
        const parsed = JSON.parse(event.data) as Partial<PingResult> & { type?: string };

        if (parsed.type === 'connected' || parsed.type === 'heartbeat') {
          return;
        }

        setLastMessage(parsed as PingResult);
      } catch (error) {
        console.warn('[ws] failed to parse message', error);
      }
    };

    socket.onclose = (event: CloseEvent) => {
      if (ws.current !== socket) {
        return;
      }

      setIsConnected(false);
      clearPingTimer();

      if (isManuallyClosed.current) {
        return;
      }

      const attempt = reconnectAttempts.current;
      const delay = Math.min(1000 * 2 ** attempt, 30000);
      reconnectAttempts.current += 1;

      console.info(
        `[ws] closed (code=${event.code}), reconnecting in ${delay}ms (attempt ${attempt + 1})`,
      );

      reconnectTimer.current = setTimeout(() => connect(), delay);
    };

    socket.onerror = () => {
      if (ws.current !== socket) {
        return;
      }

      setConnectionError('WebSocket connection failed');
      console.error('[ws] error event fired');
    };
  }, [clearPingTimer, url]);

  useEffect(() => {
    isManuallyClosed.current = false;

    if (!url || (!url.startsWith('ws://') && !url.startsWith('wss://'))) {
      setConnectionError('Invalid WebSocket URL. Check VITE_WS_URL in .env');
      console.warn('[ws] invalid URL, skipping connection');
      return undefined;
    }

    connect();

    return () => {
      isManuallyClosed.current = true;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }

      clearPingTimer();
      if (ws.current) {
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onclose = null;
        ws.current.onerror = null;
        ws.current.close();
        ws.current = null;
      }
    };
  }, [clearPingTimer, connect, url]);

  return { lastMessage, isConnected, connectionError };
}
