import { useState, useEffect } from 'react'
import { STRIPE_SUB_CACHE } from '@/lib/stripe/sync'

/**
 * React hook to get user subscription data
 * Following Theo's recommendation for easy frontend access to subscription state
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<STRIPE_SUB_CACHE | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSubscriptionData() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/stripe/subscription-data', {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch subscription data: ${response.statusText}`)
        }

        const data = await response.json()
        setSubscription(data)
      } catch (err) {
        console.error('Error fetching subscription data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setSubscription({ status: 'none' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptionData()
  }, [])

  // Helper functions for common subscription checks
  const isActive = subscription?.status === 'active'
  const isTrialing = subscription?.status === 'trialing'
  const isCanceled = subscription?.status === 'canceled'
  const hasSubscription = subscription && subscription.status !== 'none'
  
  const currentPeriodEnd = subscription && 'currentPeriodEnd' in subscription && subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd * 1000)
    : null

  return {
    subscription,
    isLoading,
    error,
    // Helper booleans
    isActive,
    isTrialing,
    isCanceled,
    hasSubscription,
    currentPeriodEnd,
    // Refresh function for after payments
    refresh: () => {
      setIsLoading(true)
      setError(null)
      fetch('/api/stripe/subscription-data')
        .then(res => res.json())
        .then(setSubscription)
        .catch(err => {
          setError(err.message)
          setSubscription({ status: 'none' })
        })
        .finally(() => setIsLoading(false))
    }
  }
}

/**
 * Helper function to get plan name from price ID
 * You can customize this based on your pricing config
 */
export function getPlanFromPriceId(priceId: string | null): string {
  if (!priceId) return 'None'
  
  // Map your price IDs to plan names
  const planMap: Record<string, string> = {
    // Add your actual price IDs here
    'price_hobby': 'Hobby',
    'price_business': 'Business',
    // Add more as needed
  }
  
  return planMap[priceId] || 'Unknown'
} 