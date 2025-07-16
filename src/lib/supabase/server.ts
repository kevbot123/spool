"use server"

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from './database.types'

// Function specifically for Server Components and Server Actions
// Needs to be async to await cookies()
// Admin client – bypasses RLS, use ONLY in trusted server contexts
export async function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies() // Await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        async set(name: string, value: string, options: CookieOptions) {
          // Need to await set/remove calls as well
          await cookieStore.set({ name, value, ...options })
        },
        async remove(name: string, options: CookieOptions) {
          await cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// NEW Function specifically for Route Handlers
// Needs to be async to await cookies()
// User-scoped client for Route Handlers
export async function createSupabaseRouteHandlerClient() {
  const cookieStore = await cookies(); // Await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // NOTE: Route Handlers typically don't SET cookies, 
        // so the set/remove might be simpler or omitted depending on use case.
        // Keeping the full implementation for now.
        async set(name: string, value: string, options: CookieOptions) {
          // Need to await set/remove calls as well
          await cookieStore.set({ name, value, ...options });
        },
        async remove(name: string, options: CookieOptions) {
          await cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// If you still need the old async createClient function somewhere,
// keep it, but it shouldn't be used for Route Handlers or Server Components.
// For now, I'll comment it out to avoid confusion.
/*
"use server"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs" 

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  })
}
*/
