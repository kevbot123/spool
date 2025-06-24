"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Logo } from "@/components/ui/logo"
import { validatePassword } from "@/lib/password-validation"
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator"

export default function UpdatePassword() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      setIsLoading(false)
      return
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      toast.error("Please fix the password requirements below")
      setIsLoading(false)
      return
    }
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) {
        throw error
      }
      
      setIsSuccess(true)
      toast.success("Password updated successfully")
      
      // Redirect to sign in after a delay
      setTimeout(() => {
        router.push("/sign-in")
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if we have a valid session when the component mounts
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      
      if (!data.session) {
        toast.error("Invalid or expired password reset link")
        router.push("/sign-in")
      }
    }
    
    checkSession()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 login-grid">
      <Card className="w-full max-w-md py-7 px-1 shadow-2xl">
        <CardHeader className="space-y-1">
          <Link href="/">
            <Logo size={60} className="mb-8" />
          </Link>
          <CardTitle className="text-2xl font-bold">Update Password</CardTitle>
          <CardDescription>
            {isSuccess 
              ? "Your password has been updated successfully"
              : "Enter your new password below"}
          </CardDescription>
        </CardHeader>
        {!isSuccess ? (
          <form onSubmit={handleUpdatePassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">New Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrengthIndicator 
                  password={password} 
                  showErrors={false}
                  className="mt-2"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-6">
                          <Button type="submit" className="w-full" disabled={isLoading || (password ? !validatePassword(password).isValid : false)}>
              {isLoading ? "Updating..." : "Update Password"}
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
              Your password has been updated successfully. You will be redirected to the sign-in page.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
