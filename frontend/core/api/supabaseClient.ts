/**
 * Supabase Client Configuration
 * Handles authentication via Supabase SDK
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check .env file.');
}

/**
 * The key under which the SDK persists its session. This is the SDK's own
 * default (`sb-<project-ref>-auth-token`), made explicit so the application can
 * invalidate the persisted provider session itself during logout without
 * depending on the SDK's network sign-out completing.
 */
export const SUPABASE_AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

const memoryStore = new Map<string, string>();
const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

/**
 * Storage handed to the SDK: the browser's localStorage on web (identical to
 * the SDK default) and process memory elsewhere (the SDK default when no
 * localStorage exists). Native persistence is handled by the application's
 * secure-store backed auth store, which re-seeds the SDK through setSession.
 */
export const supabaseAuthStorage = {
  getItem: (key: string): string | null => (hasLocalStorage() ? window.localStorage.getItem(key) : memoryStore.get(key) ?? null),
  setItem: (key: string, value: string): void => {
    if (hasLocalStorage()) window.localStorage.setItem(key, value);
    else memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    if (hasLocalStorage()) window.localStorage.removeItem(key);
    memoryStore.delete(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseAuthStorage,
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
