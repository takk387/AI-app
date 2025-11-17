import { createClient as createBrowserClient } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Real-time utility for subscribing to database changes and presence
 * Supports live updates, presence tracking, and broadcast messages
 */

/**
 * Subscribe to database table changes
 * @example
 * const channel = subscribeToTable('generated_apps', '*', (payload) => {
 *   console.log('Change received!', payload);
 * });
 */
export function subscribeToTable(
  table: string,
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE',
  callback: (payload: any) => void,
  filter?: string
) {
  const supabase = createBrowserClient();
  
  let subscription = supabase
    .channel(`table-${table}`)
    .on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        filter,
      },
      callback
    );

  subscription.subscribe();

  return subscription;
}

/**
 * Subscribe to a specific row by ID
 */
export function subscribeToRow(
  table: string,
  id: string,
  callback: (payload: any) => void
) {
  return subscribeToTable(table, '*', callback, `id=eq.${id}`);
}

/**
 * Track user presence in a channel
 * @example
 * const channel = trackPresence('room-1', {
 *   user_id: '123',
 *   online_at: new Date().toISOString(),
 * }, (state) => {
 *   console.log('Presence state:', state);
 * });
 */
export function trackPresence(
  channelName: string,
  userState: Record<string, any>,
  onPresenceSync?: (state: any) => void
) {
  const supabase = createBrowserClient();
  
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: userState.user_id || 'anonymous',
      },
    },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    if (onPresenceSync) {
      onPresenceSync(state);
    }
  });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(userState);
    }
  });

  return channel;
}

/**
 * Broadcast messages to other clients
 * @example
 * const channel = createBroadcastChannel('game-room', (payload) => {
 *   console.log('Message received:', payload);
 * });
 * 
 * // Send a message
 * broadcastMessage(channel, { type: 'move', data: { x: 10, y: 20 } });
 */
export function createBroadcastChannel(
  channelName: string,
  onReceive: (payload: any) => void
) {
  const supabase = createBrowserClient();
  
  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      onReceive(payload);
    })
    .subscribe();

  return channel;
}

/**
 * Send a broadcast message
 */
export async function broadcastMessage(
  channel: RealtimeChannel,
  message: any
) {
  await channel.send({
    type: 'broadcast',
    event: 'message',
    payload: message,
  });
}

/**
 * Subscribe to app generation status updates
 */
export function subscribeToAppGeneration(
  userId: string,
  callback: (payload: any) => void
) {
  const supabase = createBrowserClient();
  
  const channel = supabase
    .channel(`app-generation-${userId}`)
    .on('broadcast', { event: 'status-update' }, ({ payload }) => {
      callback(payload);
    })
    .subscribe();

  return channel;
}

/**
 * Broadcast app generation status update
 */
export async function broadcastGenerationStatus(
  userId: string,
  status: {
    stage: string;
    progress: number;
    message?: string;
  }
) {
  const supabase = createBrowserClient();
  
  const channel = supabase.channel(`app-generation-${userId}`);
  
  await channel.send({
    type: 'broadcast',
    event: 'status-update',
    payload: status,
  });
  
  // Clean up
  await supabase.removeChannel(channel);
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: RealtimeChannel) {
  const supabase = createBrowserClient();
  await supabase.removeChannel(channel);
}

/**
 * Get current presence state
 */
export function getPresenceState(channel: RealtimeChannel) {
  return channel.presenceState();
}

/**
 * Subscribe to chat messages in real-time
 */
export function subscribeToChatSession(
  sessionId: string,
  callback: (payload: any) => void
) {
  return subscribeToTable(
    'chat_history',
    'INSERT',
    callback,
    `session_id=eq.${sessionId}`
  );
}

/**
 * Subscribe to analytics events
 */
export function subscribeToAnalytics(
  callback: (payload: any) => void,
  userId?: string
) {
  const filter = userId ? `user_id=eq.${userId}` : undefined;
  return subscribeToTable('analytics_events', 'INSERT', callback, filter);
}
