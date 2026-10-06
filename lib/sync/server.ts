import { EventEmitter } from 'events';

export type SyncEventType =
  | 'REPORT_SUBMITTED'
  | 'REPORT_UPDATED'
  | 'VAN_UPDATED'
  | 'USER_UPDATED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ';

export interface SyncPayload {
  type: SyncEventType;
  vanId?: string;
  reportId?: string;
  reportDate?: string;
  userId?: string;
  timestamp: number;
}

// Global singleton across serverless invocations / hot reloads in Node.js
declare global {
  var __pucc_sync_emitter: EventEmitter | undefined;
}

if (!globalThis.__pucc_sync_emitter) {
  globalThis.__pucc_sync_emitter = new EventEmitter();
  globalThis.__pucc_sync_emitter.setMaxListeners(200);
}

export const syncEventEmitter = globalThis.__pucc_sync_emitter;

export function broadcastServerSync(event: Omit<SyncPayload, 'timestamp'>) {
  const payload: SyncPayload = {
    ...event,
    timestamp: Date.now(),
  };
  try {
    syncEventEmitter.emit('sync', payload);
  } catch (err) {
    console.error('[SyncServer] Error broadcasting sync event:', err);
  }
}
