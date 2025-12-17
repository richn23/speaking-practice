import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const createSupabaseBrowserClient = () => createBrowserClient(supabaseUrl, supabaseAnonKey);

export const createSupabaseServerClient = () =>
  createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies,
  });
