export interface LocationData {
  country?: string
  region?: string
  city?: string
  timezone?: string
  latitude?: number
  longitude?: number
}

export async function getLocationFromIP(ip: string): Promise<LocationData | null> {
  // Skip location lookup for localhost/private IPs
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return {
      country: "Unknown",
      region: "Unknown", 
      city: "Unknown",
      timezone: "UTC"
    }
  }

  try {
    // Using a free IP geolocation API (you can replace with your preferred service)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,timezone,lat,lon`)
    
    if (!response.ok) {
      return null
    }

    const data = await response.json()
    
    if (data.status === "fail") {
      return null
    }

    return {
      country: data.country || "Unknown",
      region: data.regionName || "Unknown",
      city: data.city || "Unknown", 
      timezone: data.timezone || "UTC",
      latitude: data.lat || 0,
      longitude: data.lon || 0
    }
  } catch (error) {
    console.error("Error fetching location data:", error)
    return null
  }
}

export function getClientIP(request: Request): string | null {
  // Try to get IP from various headers
  const headers = request.headers
  
  const xForwardedFor = headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }
  
  const xRealIP = headers.get('x-real-ip')
  if (xRealIP) {
    return xRealIP
  }
  
  const cfConnectingIP = headers.get('cf-connecting-ip')
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to a default for development
  return "127.0.0.1"
} 