// ============================================================================
// DyHuFu Petrol — Supabase Client
// ============================================================================
// Inicializa y exporta una instancia singleton del cliente de Supabase.
// Usa las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY del .env.local.
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validación en desarrollo: avisa si faltan las variables de entorno
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⛽ DyHuFu Petrol: Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.\n" +
      "Revisa tu archivo .env.local en la raíz del proyecto."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
