"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
// Import the direct Supabase client instead of auth helpers
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Logo } from "@/components/ui/logo"

export default function ResetPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    if (!email) {
      toast.error("Please enter your email address")
      setIsLoading(false)
      return
    }
    
    try {
      console.log("Attempting to reset password for:", email)
      
      // Use direct Supabase client instead of auth helpers
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      console.log("Supabase URL:", supabaseUrl);
      
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false // Similar to the approach used in the publish-config API route
        }
      })
      
      // Construct the redirect URL with the full absolute path
      // This ensures Supabase gets the complete URL for the reset password flow
      const baseUrl = window.location.origin;
      const redirectUrl = `${baseUrl}/update-password`;
      
      console.log("Base URL:", baseUrl);
      console.log("Using redirect URL:", redirectUrl);
      
      // Log the protocol to ensure it's using http or https
      console.log("URL protocol:", window.location.protocol);
      
      // Make sure the redirectTo URL is properly encoded
      const encodedRedirectUrl = encodeURIComponent(redirectUrl);
      console.log("Encoded redirect URL:", encodedRedirectUrl);
      
      // Simplify the call to match the exact API signature
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })
      
      console.log("Reset password response:", { data, error })
      
      if (error) {
        throw error
      }
      
      // Log success explicitly
      console.log("Password reset email should be sent now")
      console.log("If you're not receiving it, check:")
      console.log("1. Spam folder")
      console.log("2. Email deliverability issues")
      console.log("3. Supabase email service configuration")
      
      setIsSubmitted(true)
      toast.success("Password reset link sent to your email")
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link")
      console.error("Password reset error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 login-grid">
      <Card className="w-full max-w-md py-6 px-1 shadow-2xl">
        <CardHeader className="space-y-1">
          <Link href="/">
            <Logo size={60} className="mb-8" />
          </Link>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "Check your email for a password reset link"
              : "Enter your email address and we'll send you a link to reset your password"}
          </CardDescription>
        </CardHeader>
        {!isSubmitted ? (
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
              <div className="text-center text-sm">
                Remember your password?{" "}
                <Link href="/sign-in" className="underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4">
            <p className="text-center">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your email and follow the instructions to reset your password.
            </p>
            <Button asChild className="w-full mt-4">
              <Link href="/sign-in">Back to Sign In</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
