import { useState, useEffect } from 'react';
import { PingResult } from '../types';

// PHASE 3: Simulated WebSocket for UI development.
// Replace the mock interval with a real WebSocket connection in Phase 4.
// The message shape matches the real backend payload exactly.
export function useWebSocket(_url: string): { lastMessage: PingResult | null; isConnected: boolean } {
  const [lastMessage, setLastMessage] = useState<PingResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(true);
    
    const interval = setInterval(() => {
      const isUp = Math.random() > 0.25; // 3 UP for every 1 DOWN
      
      const fakeMsg: PingResult = {
        url_id: Math.floor(Math.random() * 3) + 1,
        status: isUp ? 'UP' : 'DOWN',
        latency_ms: isUp ? Math.floor(Math.random() * 520) + 80 : null,
        checked_at: new Date().toISOString()
      };
      
      setLastMessage(fakeMsg);
    }, 8000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, []);

  return { lastMessage, isConnected };
}
