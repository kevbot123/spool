"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface PricingPlan {
  id: string
  name: string
  price: number
  interval: string
  description: string
  features: string[]
  popular?: boolean
  stripePriceId?: string
}

interface PricingTableProps {
  plans: PricingPlan[]
  onSelectPlan?: (plan: PricingPlan) => void
  currentPlan?: string
}

export function PricingTable({ plans, onSelectPlan, currentPlan }: PricingTableProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={cn(
            "relative",
            plan.popular && "border-primary shadow-lg scale-105"
          )}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                Popular
              </span>
            </div>
          )}
          
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
            <div className="mt-4">
              <span className="text-4xl font-bold">${plan.price}</span>
              <span className="text-muted-foreground">/{plan.interval}</span>
            </div>
            <CardDescription className="mt-2">
              {plan.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          
          <CardFooter>
            <Button
              className="w-full"
              variant={plan.popular ? "default" : "outline"}
              onClick={() => onSelectPlan?.(plan)}
              disabled={currentPlan === plan.id}
            >
              {currentPlan === plan.id ? "Current Plan" : "Choose Plan"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

// Default plans for the CMS
export const defaultPlans: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    description: "Perfect for getting started",
    features: [
      "1 site",
      "5 collections",
      "100 content items",
      "1GB storage",
      "Community support"
    ]
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    interval: "month",
    description: "Best for growing teams",
    features: [
      "5 sites",
      "Unlimited collections",
      "10,000 content items",
      "50GB storage",
      "Priority support",
      "Advanced analytics",
      "Custom domains"
    ],
    popular: true,
    stripePriceId: "price_pro_monthly"
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 99,
    interval: "month",
    description: "For large organizations",
    features: [
      "Unlimited sites",
      "Unlimited collections",
      "Unlimited content items",
      "500GB storage",
      "24/7 support",
      "Advanced security",
      "Custom integrations",
      "SLA guarantee"
    ],
    stripePriceId: "price_enterprise_monthly"
  }
] 