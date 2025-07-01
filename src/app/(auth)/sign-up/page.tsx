"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PLAN_DETAILS, PLANS } from '@/lib/config/pricing'; 
import { Logo } from "@/components/ui/logo"
import { validatePassword } from "@/lib/password-validation"
import { PasswordStrengthIndicator } from "@/components/ui/password-strength-indicator"
import { Suspense } from 'react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d", 
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4"
      }
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a"
    }
  }
};

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteId = searchParams.get('invite')
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCardComplete, setIsCardComplete] = useState(false); 
  const [invitationData, setInvitationData] = useState<any>(null)
  
  const stripe = useStripe();
  const elements = useElements();

  // Load invitation data if invite ID is present
  useEffect(() => {
    if (inviteId) {
      fetchInvitationData();
    }
  }, [inviteId]);

  const fetchInvitationData = async () => {
    try {
      const supabase = createClient()
      const { data: invitation, error } = await supabase
        .from('site_collaborators')
        .select(`
          id,
          role,
          site:sites!inner(name)
        `)
        .eq('id', inviteId!)
        .is('accepted_at', null)
        .single();

      if (!error && invitation) {
        setInvitationData(invitation);
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      toast.error('Payment system is not ready. Please wait a moment and try again.');
      return;
    }
    
    const cardElement = elements.getElement(CardElement);
    if (!cardElement || !isCardComplete) {
       toast.error('Please complete the card details.');
       return; // Don't set loading if basic validation fails
    }
    
    setIsLoading(true)
    toast.loading("Processing account and payment details...")
    
    if (!email || !password) {
      toast.dismiss()
      toast.error("Please enter both email and password")
      setIsLoading(false)
      return
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      toast.dismiss()
      toast.error("Please fix the password requirements below")
      setIsLoading(false)
      return
    }

    let paymentMethodId = '';
    
    try {
      // 1. Create Setup Intent on the backend
      const setupIntentResponse = await fetch('/api/stripe/create-setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Optionally pass email if needed for customer linking early
        // body: JSON.stringify({ email }), 
      });

      const setupIntentData = await setupIntentResponse.json();

      if (!setupIntentResponse.ok || !setupIntentData.clientSecret) {
        throw new Error(setupIntentData.error || 'Failed to create payment setup.');
      }

      const clientSecret = setupIntentData.clientSecret;

      // 2. Confirm Card Setup on the frontend
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: name || undefined, // Optional: pass name
            email: email,          // Optional: pass email
          },
        },
      });

      if (setupError) {
        throw setupError; // Throw Stripe error to be caught below
      }

      if (setupIntent?.status !== 'succeeded') {
        throw new Error('Card setup failed. Please check your card details and try again.');
      }
      
      if (!setupIntent.payment_method || typeof setupIntent.payment_method !== 'string') {
         throw new Error('Payment method ID not found after card setup.');
      }
      
      paymentMethodId = setupIntent.payment_method; // Store the real payment method ID
      console.log('Card setup succeeded. Payment Method ID:', paymentMethodId);

      // 3. Sign up with Supabase Auth
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
        },
      })
      
      if (authError) {
        // Check if it's a "user already exists" error
        if (authError.message?.includes('user_already_exists') || 
            (authError.name === 'AuthApiError' && authError.status === 422)) {
          toast.error('An account with this email already exists. Please sign in instead.')
          setTimeout(() => {
            window.location.href = '/sign-in'
          }, 2000)
          // No need to throw, just return
          return; 
        }
        // Throw other auth errors
        throw authError; 
      }
      
      // 4. Create Profile & Subscription on Backend
      if (authData.user) {
        try {
          const response = await fetch('/api/auth/create-profile-and-subscription', { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: authData.user.id,
              email: email,
              name: name || email.split('@')[0],
              paymentMethodId: paymentMethodId // Pass REAL payment method ID
            }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            console.error('Error creating user profile/subscription:', errorData)
            toast.error(errorData.error || 'Failed to set up subscription. Please contact support.');
            // Consider attempting to clean up Supabase user if profile/sub creation failed
            // await supabase.auth.admin.deleteUser(authData.user.id); // Requires admin client
            return; 
          }
        } catch (profileError) {
          console.error('Error calling create-profile/subscription API:', profileError)
          toast.error('An error occurred setting up your account. Please contact support.');
           // Consider cleanup
          return;
        }
      } else {
          // Should not happen if authError wasn't thrown, but good practice
          throw new Error('User not found after successful signup.');
      }
      
      // 5. Accept invitation if present
      if (inviteId && authData.user) {
        try {
          await supabase
            .from('site_collaborators')
            .update({
              user_id: authData.user.id,
              accepted_at: new Date().toISOString()
            })
            .eq('id', inviteId);
        } catch (inviteError) {
          console.error('Error accepting invitation:', inviteError);
          // Don't fail the whole signup for invite errors
        }
      }
      
      // 6. Success
      toast.dismiss() // Dismiss loading toast
      const successMessage = invitationData 
        ? `Account created! Welcome to ${invitationData.site.name}!`
        : "Account created & trial started! Welcome to Spool!";
      toast.success(successMessage) 
      
      // Redirect to dashboard - user is already authenticated
      setTimeout(() => {
        router.push(invitationData ? "/admin" : "/")
      }, 1500)
      
    } catch (error: any) {
      toast.dismiss() // Dismiss loading toast
      console.error("Sign up error:", error)
      // Handle Stripe errors specifically
      if (error.type && error.type.startsWith('Stripe')) {
         toast.error(error.message || 'Card processing error. Please check details.');
      } else {
         toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="w-full max-w-md py-7 px-1 shadow-2xl">
        <CardHeader className="space-y-1">
          <Link href="/">
            <Logo size={66} className="mb-8" />
          </Link>
          {invitationData ? (
            <>
              <CardTitle className="text-[26px] font-bold">Join {invitationData.site.name}</CardTitle>
              <CardDescription className="text-base text-gray-600">
                You've been invited to collaborate as a <strong>{invitationData.role}</strong>. Create your account to get started.
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-[26px] font-bold">Start a free 7 day trial</CardTitle>
              <CardDescription className="text-base text-gray-600">
                If your mind isn't blown, cancel easily within the next seven days at no charge.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <PasswordStrengthIndicator 
                password={password} 
                showErrors={false}
                className="mt-2"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="card-element" className="text-sm font-medium">
                Payment Details
              </label>
              <div id="card-element" className="p-3 border border-input rounded-md bg-background">
                 <CardElement 
                   options={CARD_ELEMENT_OPTIONS} 
                   onChange={(e) => setIsCardComplete(e.complete)} 
                 />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-5 pt-6">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !stripe || !elements || !isCardComplete || (password ? !validatePassword(password).isValid : false)}
            >
              {isLoading ? "Setting up trial..." : `Start 7-Day Free Trial`}
            </Button>
             <p className="text-xs text-muted-foreground text-center px-4">
                By clicking above, you agree to start a trial which shifts to the <Link href="/pricing" target="_blank" className="underline underline-offset-2 mx-1">{PLAN_DETAILS[PLANS.HOBBY].name} plan</Link>(${PLAN_DETAILS[PLANS.HOBBY].price}/month) unless cancelled before 7 days.
             </p>
            <div className="text-center text-xs">
              Already have an account?{" "}
              <Link href="/sign-in" className="underline underline-offset-4 hover:text-primary">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}

export default function SignUp() {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error("Stripe publishable key is not set.");
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 login-grid text-destructive">
        Payment system configuration error. Please contact support.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 login-grid">
      <Elements stripe={stripePromise} options={{ fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" }] }}>
        <Suspense fallback={null}>
          <SignUpForm />
        </Suspense>
      </Elements>
    </div>
  );
}
