"use client"

import { createBrowserClient } from "@supabase/ssr"
import { Database } from "./database.types"

// Create a Supabase client for client-side usage
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials');
    throw new Error('Missing required environment variables for Supabase client');
  }
  
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
}
