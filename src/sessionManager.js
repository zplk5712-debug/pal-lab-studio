import { supabase } from "./supabaseClient";

const TABLE = "active_sessions";
const MAX_USERS = 10;
const HEARTBEAT_INTERVAL_MS = 20_000;
const STALE_AFTER_MS = 60_000; // 60초간 하트비트 없으면 이탈로 간주

let currentSessionId = null;
let heartbeatTimer = null;

function staleThresholdIso() {
  return new Date(Date.now() - STALE_AFTER_MS).toISOString();
}

async function countActiveSessions() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .gte("last_seen", staleThresholdIso());

  if (error) {
    throw error;
  }
  return data?.length ?? 0;
}

export async function initSession() {
  if (!supabase) {
    return { sessionId: null, activeCount: 0, canAccess: true };
  }

  try {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nowIso = new Date().toISOString();

    const activeCount = await countActiveSessions();
    if (activeCount >= MAX_USERS) {
      return { sessionId: null, activeCount, canAccess: false };
    }

    const { error: insertError } = await supabase
      .from(TABLE)
      .insert({ id: sessionId, created_at: nowIso, last_seen: nowIso });

    if (insertError) {
      console.warn("Failed to create session:", insertError);
      return { sessionId: null, activeCount, canAccess: true };
    }

    currentSessionId = sessionId;
    startHeartbeat();

    return { sessionId, activeCount: activeCount + 1, canAccess: true };
  } catch (err) {
    console.warn("Session init error:", err);
    return { sessionId: null, activeCount: 0, canAccess: true };
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(async () => {
    if (!supabase || !currentSessionId) return;
    try {
      await supabase
        .from(TABLE)
        .update({ last_seen: new Date().toISOString() })
        .eq("id", currentSessionId);
    } catch (err) {
      console.warn("Heartbeat failed:", err);
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export async function getActiveUserCount() {
  if (!supabase) return { activeCount: 0, canAccess: true };

  try {
    const activeCount = await countActiveSessions();
    return { activeCount, canAccess: activeCount < MAX_USERS };
  } catch (err) {
    console.warn("Error getting active user count:", err);
    return { activeCount: 0, canAccess: true };
  }
}

export async function deleteSession() {
  stopHeartbeat();
  if (!supabase || !currentSessionId) return;

  try {
    await supabase.from(TABLE).delete().eq("id", currentSessionId);
  } catch (err) {
    console.warn("Failed to delete session:", err);
  } finally {
    currentSessionId = null;
  }
}

export function getCurrentSessionId() {
  return currentSessionId;
}

export const MAX_USERS_LIMIT = MAX_USERS;
