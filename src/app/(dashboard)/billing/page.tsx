"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function BillingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to account page with billing tab selected
    router.replace("/account?tab=billing")
  }, [router])

  return (
    <div className="container mx-auto p-4 md:p-6 text-center">
      Redirecting to billing...
    </div>
  )
}
