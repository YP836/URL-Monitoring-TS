import { useMemo } from 'react';
import { URLItem, PingResult } from '../types';

export function useLiveStatus(urls: URLItem[], lastMessage: PingResult | null): URLItem[] {
  return useMemo(() => {
    if (!lastMessage) return urls;
    
    return urls.map(url => {
      if (url.id === lastMessage.url_id) {
        return {
          ...url,
          status: lastMessage.status as 'UP' | 'DOWN' | 'PENDING'
        };
      }
      return url;
    });
  }, [urls, lastMessage]);
}
