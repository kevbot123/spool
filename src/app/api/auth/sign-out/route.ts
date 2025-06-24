import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create a direct Supabase client that doesn't use cookies at all
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    // Sign out the user - this will clear cookies on the client side
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Error in sign-out:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('User signed out successfully')
    
    // Return a response that clears the auth cookie
    const response = NextResponse.json({ success: true })
    
    // Clear all cookies that might be related to authentication
    const cookieNames = req.cookies.getAll().map(cookie => cookie.name)
    for (const name of cookieNames) {
      if (name.startsWith('sb-')) {
        response.cookies.delete(name)
      }
    }
    
    return response
  } catch (error) {
    console.error('Exception in sign-out:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
