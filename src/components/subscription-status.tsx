import { useSubscription, getPlanFromPriceId } from '@/lib/stripe/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Example component showing how to use subscription data with the KV pattern
 * Following Theo's recommendations for clean subscription state handling
 */
export function SubscriptionStatus() {
  const { 
    subscription, 
    isLoading, 
    error, 
    isActive, 
    isTrialing, 
    isCanceled, 
    hasSubscription,
    currentPeriodEnd,
    refresh 
  } = useSubscription()

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-red-600">
            Error loading subscription: {error}
            <Button onClick={refresh} variant="outline" className="ml-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const planName = subscription && 'priceId' in subscription 
    ? getPlanFromPriceId(subscription.priceId) 
    : 'None'

  const getStatusBadge = () => {
    if (!hasSubscription) {
      return <Badge variant="secondary">No Subscription</Badge>
    }
    
    if (isActive) {
      return <Badge variant="default">Active</Badge>
    }
    
    if (isTrialing) {
      return <Badge variant="outline">Trial</Badge>
    }
    
    if (isCanceled) {
      return <Badge variant="destructive">Canceled</Badge>
    }
    
    return <Badge variant="secondary">{subscription?.status}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Subscription Status
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Your current subscription details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Plan:</span>
            <div className="text-muted-foreground">{planName}</div>
          </div>
          
          {currentPeriodEnd && (
            <div>
              <span className="font-medium">
                {subscription && 'cancelAtPeriodEnd' in subscription && subscription.cancelAtPeriodEnd 
                  ? 'Ends:' 
                  : 'Renews:'
                }
              </span>
              <div className="text-muted-foreground">
                {currentPeriodEnd.toLocaleDateString()}
              </div>
            </div>
          )}
          
          {subscription && 'paymentMethod' in subscription && subscription.paymentMethod && (
            <div>
              <span className="font-medium">Payment Method:</span>
              <div className="text-muted-foreground">
                •••• •••• •••• {subscription.paymentMethod.last4}
                {subscription.paymentMethod.brand && (
                  <span className="ml-1 capitalize">
                    ({subscription.paymentMethod.brand})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action buttons based on subscription state */}
        <div className="flex gap-2 pt-4">
          {!hasSubscription && (
            <Button className="w-full">
              Start Subscription
            </Button>
          )}
          
          {isActive && (
            <>
              <Button variant="outline">
                Manage Subscription
              </Button>
              <Button variant="outline">
                View Billing
              </Button>
            </>
          )}
          
          {isTrialing && (
            <Button>
              Upgrade Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 