import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || "https://placeholder-url.supabase.co";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "placeholder-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase credentials are missing from environment variables. Running with placeholder credentials.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sign up helper
export async function signUp(email: string, password: string) {
  return await supabase.auth.signUp({ email, password });
}

// Sign in helper
export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

// Sign out helper
export async function signOut() {
  return await supabase.auth.signOut();
}
