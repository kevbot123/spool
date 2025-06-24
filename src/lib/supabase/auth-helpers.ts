"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Database } from "./database.types"

// Client-side Supabase client
export const createClient = () => {
  return createClientComponentClient<Database>()
}

// Get the current session token for use in API requests
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const supabase = createClient()
    // Attempt to refresh the session first to ensure it's up-to-date
    await supabase.auth.refreshSession();
    const { data, error: sessionError } = await supabase.auth.getSession()
    console.log('[getAuthToken] Raw getSession() result:', { data: !!data, session: !!data?.session, error: sessionError?.message || 'None' });
    
    // If we have a session, return the access token
    if (data.session?.access_token) {
      return data.session.access_token
    }
    
    return null
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}
