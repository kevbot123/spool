import { createSupabaseServerClient } from '@/lib/supabase/server'

export interface ContentUsageData {
  user_id: string
  action_type: string // 'content_generation', 'content_edit', 'ai_assist', etc.
  credits_used?: number
  data_size_kb?: number // For content data size tracking
  url_count?: number // For external resource usage
}

export async function trackContentUsage(usage: ContentUsageData) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { error } = await supabase
      .from('usage_logs')
      .insert(usage)
    
    if (error) {
      console.error('Error tracking content usage:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Content usage tracking error:', error)
    return false
  }
}

export async function getUserContentLimits(userId: string) {
  try {
    const supabase = await createSupabaseServerClient()
    
    const { data, error } = await supabase
      .from('user_limits')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      console.error('Error fetching user content limits:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching user content limits:', error)
    return null
  }
}

export async function checkContentCreditLimit(userId: string, creditsRequired: number = 1): Promise<boolean> {
  try {
    const limits = await getUserContentLimits(userId)
    
    if (!limits) {
      return false
    }
    
    const remaining = limits.message_credits - limits.message_credits_used
    return remaining >= creditsRequired
  } catch (error) {
    console.error('Error checking content credit limit:', error)
    return false
  }
}

export async function checkContentDataLimit(userId: string, dataSizeKb: number): Promise<boolean> {
  try {
    const limits = await getUserContentLimits(userId)
    
    if (!limits) {
      return false
    }
    
    const remaining = limits.ai_content_data_size_kb - limits.ai_content_data_used_kb
    return remaining >= dataSizeKb
  } catch (error) {
    console.error('Error checking content data limit:', error)
    return false
  }
} 