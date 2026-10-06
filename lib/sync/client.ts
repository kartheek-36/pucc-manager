'use client';

import { useEffect, useRef } from 'react';

export type SyncEventType =
  | 'REPORT_SUBMITTED'
  | 'REPORT_UPDATED'
  | 'VAN_UPDATED'
  | 'USER_UPDATED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  | 'FORCE_SYNC';

export interface ClientSyncPayload {
  type: SyncEventType;
  vanId?: string;
  reportId?: string;
  reportDate?: string;
  userId?: string;
  timestamp?: number;
}

const BROADCAST_CHANNEL_NAME = 'pucc_sync_channel';
const CUSTOM_EVENT_NAME = 'pucc:sync';

/**
 * Broadcasts a synchronization event to all tabs and local components immediately.
 */
export function broadcastClientSync(payload: ClientSyncPayload) {
  if (typeof window === 'undefined') return;

  const eventPayload: ClientSyncPayload = {
    ...payload,
    timestamp: payload.timestamp || Date.now(),
  };

  // 1. Same-tab component synchronization
  try {
    window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: eventPayload }));
  } catch (err) {
    // Ignore in non-standard environments
  }

  // 2. Cross-tab synchronization via native BroadcastChannel
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(eventPayload);
      channel.close();
    }
  } catch (err) {
    // Ignore BroadcastChannel errors
  }
}

interface UseSyncListenerOptions {
  intervalMs?: number;
  debounceMs?: number;
  enableSSE?: boolean;
}

/**
 * React hook that triggers a callback whenever authoritative data should be refreshed:
 * - Sub-millisecond cross-tab broadcast (BroadcastChannel)
 * - Same-tab immediate component event (CustomEvent)
 * - Server-Sent Events push (SSE EventSource)
 * - Window focus / Document visibility change
 * - Device online event
 * - Visibility-aware fallback polling interval
 *
 * Includes built-in burst debouncing / request coalescing to prevent redundant network calls.
 */
export function useSyncListener(
  onSync: () => void,
  options: UseSyncListenerOptions = {}
) {
  const {
    intervalMs = 6000,
    debounceMs = 60,
    enableSSE = true,
  } = options;

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Coalesced trigger
    const triggerSync = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onSyncRef.current();
      }, debounceMs);
    };

    // 1. Initial invocation on mount
    triggerSync();

    // 2. BroadcastChannel for cross-tab sync in same browser
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannel.onmessage = () => {
          triggerSync();
        };
      } catch (e) {
        // BroadcastChannel unavailable
      }
    }

    // 3. Same-window custom event listener
    const handleCustomSync = () => {
      triggerSync();
    };
    window.addEventListener(CUSTOM_EVENT_NAME, handleCustomSync);

    // 4. Focus, visibility, and online events
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        triggerSync();
      }
    };
    const handleOnline = () => {
      triggerSync();
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);

    // 5. Visibility-aware interval as a resilient fallback
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Don't poll in hidden tabs
      }
      triggerSync();
    }, intervalMs);

    // 6. Server-Sent Events (SSE) connection for instantaneous cross-browser server push
    let eventSource: EventSource | null = null;
    if (enableSSE && typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        eventSource = new EventSource('/api/sync/events');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type !== 'CONNECTED') {
              triggerSync();
            }
          } catch {
            // Ignore parse errors or heartbeat
          }
        };
        eventSource.onerror = () => {
          // EventSource will automatically retry connecting.
          // Fallback interval ensures data continues synchronizing seamlessly.
        };
      } catch (err) {
        // SSE not supported or blocked
      }
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
      window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomSync);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [intervalMs, debounceMs, enableSSE]);
}
