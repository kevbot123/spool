"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { X, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AlertBannerProps {
  variant?: "default" | "destructive" | "warning" | "success"
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function AlertBanner({
  variant = "default",
  title,
  children,
  dismissible = true,
  onDismiss,
  className
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.(
    )
  }

  const icons = {
    default: Info,
    destructive: AlertTriangle,
    warning: AlertTriangle,
    success: CheckCircle
  }

  const Icon = icons[variant]

  return (
    <Alert 
      variant={variant}
      className={cn(
        "relative border-l-4",
        variant === "default" && "border-l-blue-500",
        variant === "destructive" && "border-l-red-500", 
        variant === "warning" && "border-l-yellow-500",
        variant === "success" && "border-l-green-500",
        className
      )}
    >
      <Icon className="h-4 w-4" />
      
      <div className="flex-1">
        {title && (
          <div className="font-semibold mb-1">{title}</div>
        )}
        <AlertDescription>{children}</AlertDescription>
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </Alert>
  )
}

// Preset alert banners for common use cases
export function WarningBanner({ children, ...props }: Omit<AlertBannerProps, "variant">) {
  return (
    <AlertBanner variant="warning" {...props}>
      {children}
    </AlertBanner>
  )
}

export function ErrorBanner({ children, ...props }: Omit<AlertBannerProps, "variant">) {
  return (
    <AlertBanner variant="destructive" {...props}>
      {children}
    </AlertBanner>
  )
}

export function SuccessBanner({ children, ...props }: Omit<AlertBannerProps, "variant">) {
  return (
    <AlertBanner variant="success" {...props}>
      {children}
    </AlertBanner>
  )
}

export function InfoBanner({ children, ...props }: Omit<AlertBannerProps, "variant">) {
  return (
    <AlertBanner variant="default" {...props}>
      {children}
    </AlertBanner>
  )
} 