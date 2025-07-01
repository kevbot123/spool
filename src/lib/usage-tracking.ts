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

export async function updateUserLimits(supabase: any, userId: string, planId: string) {
  // Simple implementation: update user_limits table rows based on plan
  try {
    const limitsByPlan: Record<string, { message_credits: number; ai_content_data_size_kb: number }> = {
      FREE: { message_credits: 1000, ai_content_data_size_kb: 1000 },
      HOBBY: { message_credits: 10000, ai_content_data_size_kb: 10000 },
      BUSINESS: { message_credits: 100000, ai_content_data_size_kb: 100000 },
      POST_TRIAL: { message_credits: 0, ai_content_data_size_kb: 0 }
    }

    const newLimits = limitsByPlan[planId] || limitsByPlan['FREE']

    await supabase
      .from('user_limits')
      .upsert({
        user_id: userId,
        plan_id: planId,
        message_credits: newLimits.message_credits,
        message_credits_used: 0,
        ai_content_data_size_kb: newLimits.ai_content_data_size_kb,
        ai_content_data_used_kb: 0,
        updated_at: new Date().toISOString()
      })
    return true
  } catch (error) {
    console.error('updateUserLimits error:', error)
    return false
  }
} 