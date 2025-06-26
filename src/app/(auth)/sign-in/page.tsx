"use client"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Logo } from "@/components/ui/logo"

// Component that uses useSearchParams wrapped in its own component
function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectedFrom') || '/admin'
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    console.log('Sign in attempt with:', { email })
    
    if (!email || !password) {
      toast.error("Please enter both email and password")
      setIsLoading(false)
      return
    }
    
    try {
      // Create a Supabase client using our wrapper
      const supabase = createClient()
      console.log('Supabase client created')
      
      // Show loading toast
      const toastId = toast.loading("Signing in...")
      
      // Sign in with email and password - no need to sign out first
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('Sign in response:', { 
        hasData: !!data, 
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        hasError: !!error,
        errorMessage: error?.message,
        sessionExpiry: data?.session?.expires_at
      })
      
      if (error) {
        toast.dismiss(toastId)
        toast.error(error.message || "Invalid credentials")
        setIsLoading(false)
        return
      }
      
      // Check if we have a session
      if (!data.session) {
        toast.dismiss(toastId)
        toast.error("Failed to create session. Please try again.")
        setIsLoading(false)
        return
      }
      
      // Verify the session was created
      const sessionCheck = await supabase.auth.getSession()
      console.log('Session after login:', sessionCheck)
      
      // Success! Redirect to the intended destination
      toast.dismiss(toastId)
      toast.success("Signed in successfully")
      console.log('Redirecting to:', redirectTo)
      
      // Use a longer delay to ensure cookies are properly set
      setTimeout(() => {
        // Force a full page refresh to ensure cookies are properly set
        window.location.href = redirectTo
      }, 1000)
    } catch (error: any) {
      toast.dismiss()
      toast.error("An unexpected error occurred")
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4 login-grid">
      <Card className="w-full max-w-md py-7 px-1 shadow-2xl">
        <CardHeader className="space-y-1">
          <Link href="/">
            <Logo size={60} className="mb-8" />
          </Link>
          <CardTitle className="text-2xl font-bold">Login to your account</CardTitle>
          {/* <CardDescription>Enter your email and password to sign in</CardDescription> */}
        </CardHeader>
        <form onSubmit={handleSignIn}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-right" style={{ marginTop: -10}}>
              <Link
                href="/reset-password"
                className="text-xs underline underline-offset-4 hover:text-primary"
              >
                Forgot Password?
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-6 pt-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center text-sm">
              Don't have an account?{" "}
              <Link href="/sign-up" className="underline underline-offset-4 hover:text-primary">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// Main component that wraps the form in a Suspense boundary
export default function SignIn() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SignInForm />
    </Suspense>
  )
}
