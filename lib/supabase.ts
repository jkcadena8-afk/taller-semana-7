import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente unico de Supabase.
 *
 * Las variables viven en `.env.local` (ver `.env.example`). Solo se usa la
 * publishable/anon key: nunca poner aqui la service_role ni la clave de la BD.
 * `expo-sqlite/localStorage/install` aporta el `localStorage` global que
 * Supabase usa para la sesion (guia oficial de Expo + Supabase).
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const PHOTOS_BUCKET = 'photos';
