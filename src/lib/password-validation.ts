export interface PasswordRequirements {
  minLength?: number
  requireUppercase?: boolean
  requireLowercase?: boolean
  requireNumber?: boolean
  requireSpecialChar?: boolean
}

export interface PasswordValidation {
  isValid: boolean
  score: number
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
  feedback: string[]
  errors: string[]
  requirements: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecialChar: boolean
  }
}

export function validatePassword(password: string, customRequirements: PasswordRequirements = {}): PasswordValidation {
  const minLength = customRequirements.minLength || 8
  
  const requirements = {
    minLength: password.length >= minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  const feedback: string[] = []
  const errors: string[] = []
  let score = 0

  // Check each requirement
  if (!requirements.minLength) {
    const message = `Password must be at least ${minLength} characters long`
    feedback.push(message)
    errors.push(message)
  } else {
    score += 1
  }

  if (!requirements.hasUppercase) {
    const message = "Include at least one uppercase letter"
    feedback.push(message)
    errors.push(message)
  } else {
    score += 1
  }

  if (!requirements.hasLowercase) {
    const message = "Include at least one lowercase letter"
    feedback.push(message)
    errors.push(message)
  } else {
    score += 1
  }

  if (!requirements.hasNumber) {
    const message = "Include at least one number"
    feedback.push(message)
    errors.push(message)
  } else {
    score += 1
  }

  if (!requirements.hasSpecialChar) {
    const message = "Include at least one special character"
    feedback.push(message)
    errors.push(message)
  } else {
    score += 1
  }

  // Bonus points for length
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1

  const isValid = Object.values(requirements).every(Boolean)
  
  // Determine strength
  let strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'
  if (score <= 1) strength = 'very-weak'
  else if (score <= 2) strength = 'weak'
  else if (score <= 3) strength = 'fair'
  else if (score <= 4) strength = 'good'
  else strength = 'strong'

  return {
    isValid,
    score: Math.min(score, 5), // Cap at 5
    strength,
    feedback,
    errors,
    requirements,
  }
}

export function getPasswordStrength(score: number): {
  label: string
  color: string
} {
  if (score <= 1) return { label: "Very Weak", color: "text-red-500" }
  if (score <= 2) return { label: "Weak", color: "text-orange-500" }
  if (score <= 3) return { label: "Fair", color: "text-yellow-500" }
  if (score <= 4) return { label: "Strong", color: "text-green-500" }
  return { label: "Very Strong", color: "text-green-600" }
}

export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'very-weak': return 'text-red-500'
    case 'weak': return 'text-orange-500'
    case 'fair': return 'text-yellow-500'
    case 'good': return 'text-green-500'
    case 'strong': return 'text-green-600'
    default: return 'text-gray-500'
  }
}

export function getPasswordStrengthProgress(score: number): number {
  return Math.min(score * 20, 100) // Convert 0-5 score to 0-100 percentage
}

export function isPassphrase(password: string): boolean {
  // Simple check for passphrase (multiple words)
  return password.includes(' ') && password.split(' ').length >= 3
} 