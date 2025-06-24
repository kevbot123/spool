"use server"

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from "next/headers"
import { Database } from "./database.types"
import { NextRequest } from "next/server"

// Server-side Supabase client for route handlers and API routes
export const createAPIClient = (req: NextRequest) => {
  const cookieHeader = req.headers.get('cookie') || ''
  const authHeader = req.headers.get('authorization') || ''
  
  // Extract token from Authorization header if present
  let token = ''
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }
  
  const options: any = {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
  
  // If we have cookies, add them to the request
  if (cookieHeader) {
    options.global = {
      headers: {
        cookie: cookieHeader
      }
    }
  }
  
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    options
  )
}

// Service role client for server operations (bypasses RLS)
export const createServiceClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Server component client
export const createServerClient = () => {
  return createServerComponentClient<Database>({ cookies })
}
