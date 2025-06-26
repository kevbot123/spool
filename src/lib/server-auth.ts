import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Export the server client function for backward compatibility
export const createServerSupabaseClient = createSupabaseServerClient

export async function getServerUser() {
  const supabase = await createSupabaseServerClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Auth error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Server auth error:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getServerUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  
  // Check if user is admin (you can customize this logic)
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) {
    throw new Error('Admin access required')
  }
  
  return user
}

export function getAuthFromRequest(request: NextRequest) {
  // Extract auth token from request headers
  const authHeader = request.headers.get('authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  
  // Check for token in cookies
  const token = request.cookies.get('sb-access-token')
  return token?.value || null
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false
  
  try {
    const supabase = await createSupabaseServerClient()
    
    // Check if the API key exists in the sites table
    const { data, error } = await supabase
      .from('sites')
      .select('id')
      .eq('api_key', apiKey)
      .single()
    
    return !error && !!data
  } catch (error) {
    console.error('API key verification error:', error)
    return false
  }
} 