import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000;
export const DEFAULT_ONLINE_THRESHOLD_MS = 15000;

interface PresenceSettings {
  heartbeatIntervalMs: number;
  onlineThresholdMs: number;
}

let cached: PresenceSettings = {
  heartbeatIntervalMs: DEFAULT_HEARTBEAT_INTERVAL_MS,
  onlineThresholdMs: DEFAULT_ONLINE_THRESHOLD_MS,
};
const listeners = new Set<(s: PresenceSettings) => void>();

async function fetchSettings() {
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["heartbeat_interval_ms", "online_threshold_ms"]);
  if (!data) return;
  const map = new Map(data.map((r: any) => [r.key, r.value]));
  cached = {
    heartbeatIntervalMs: parseInt(map.get("heartbeat_interval_ms") || "") || DEFAULT_HEARTBEAT_INTERVAL_MS,
    onlineThresholdMs: parseInt(map.get("online_threshold_ms") || "") || DEFAULT_ONLINE_THRESHOLD_MS,
  };
  listeners.forEach((l) => l(cached));
}

let initialized = false;
function ensureInit() {
  if (initialized) return;
  initialized = true;
  fetchSettings();
  supabase
    .channel("app-settings-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_settings" },
      () => fetchSettings()
    )
    .subscribe();
}

export function usePresenceSettings(): PresenceSettings {
  const [settings, setSettings] = useState<PresenceSettings>(cached);
  useEffect(() => {
    ensureInit();
    listeners.add(setSettings);
    setSettings(cached);
    return () => {
      listeners.delete(setSettings);
    };
  }, []);
  return settings;
}

export async function updatePresenceSetting(key: "heartbeat_interval_ms" | "online_threshold_ms", value: number) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key, value: String(value) }, { onConflict: "key" });
  if (!error) await fetchSettings();
  return error;
}

export async function loadPresenceSettingsOnce(): Promise<PresenceSettings> {
  await fetchSettings();
  return cached;
}
