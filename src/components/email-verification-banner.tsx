"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertBanner } from "@/components/alert-banner"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Mail } from "lucide-react"

export function EmailVerificationBanner() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      
      // Reset dismissed state when user changes
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsDismissed(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleResendVerification = async () => {
    if (!user?.email) return
    
    setIsLoading(true)
    const supabase = createClient()
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })
      
      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Verification email sent! Check your inbox.")
      }
    } catch (error: any) {
      toast.error("Failed to send verification email")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show banner if:
  // - User is not logged in
  // - User's email is already confirmed
  // - Banner has been dismissed
  if (!user || user.email_confirmed_at || isDismissed) {
    return null
  }

  return (
    <AlertBanner
      variant="warning"
      dismissible={true}
      onDismiss={() => setIsDismissed(true)}
      className="mx-4 mt-4"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <span>
            Please verify your email address <strong>{user.email}</strong> to ensure account security.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResendVerification}
          disabled={isLoading}
          className="ml-4 shrink-0"
        >
          {isLoading ? "Sending..." : "Resend Email"}
        </Button>
      </div>
    </AlertBanner>
  )
} 