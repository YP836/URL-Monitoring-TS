import { useEffect, useMemo, useState } from 'react';
import { URLItem, PingResult } from '../types';

interface LiveStatusState {
  liveUrls: URLItem[];
  lastPingMap: Record<number, PingResult>;
}

export function useLiveStatus(urls: URLItem[], lastMessage: PingResult | null): LiveStatusState {
  const [lastPingMap, setLastPingMap] = useState<Record<number, PingResult>>({});

  useEffect(() => {
    if (!lastMessage) return;

    setLastPingMap(previous => {
      const prevPing = previous[lastMessage.url_id];
      if (lastMessage.check_type !== 'HTTP' && prevPing && prevPing.latency_ms !== null) {
        return {
          ...previous,
          [lastMessage.url_id]: {
            ...lastMessage,
            latency_ms: prevPing.latency_ms,
          },
        };
      }
      return {
        ...previous,
        [lastMessage.url_id]: lastMessage,
      };
    });
  }, [lastMessage]);

  const liveUrls = useMemo(() => {
    return urls.map(url => {
      const lastPing = lastPingMap[url.id];
      if (lastPing) {
        return {
          ...url,
          status: lastPing.status as 'UP' | 'DOWN' | 'PENDING',
        };
      }
      return url;
    });
  }, [lastPingMap, urls]);

  return { liveUrls, lastPingMap };
}
