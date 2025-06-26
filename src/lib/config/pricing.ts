// Pricing configuration for the chatapp
// This file contains all the pricing-related configuration that can be adjusted on the fly

// Additional credits pricing
export const ADDITIONAL_CREDITS = {
  PRICE_PER_1000: 5, // $5 for 1000 credits
  CURRENCY: 'USD',
  FORMATTED_PRICE: '$5 per 1,000 credits'
};

export const PLANS = {
  FREE: 'free',
  POST_TRIAL: 'post_trial',
  HOBBY: 'hobby',
  BUSINESS: 'business',
} as const;

export type PlanType = typeof PLANS[keyof typeof PLANS];

// AI content creation constants
export const AI_CONTENT_DATA = {
  DEFAULT_LIMIT_MB: 35, // Default AI content data limit in MB
  WARNING_THRESHOLD_PERCENT: 71, // Warn when over this percentage (25MB of 35MB)
  WARNING_THRESHOLD_MB: 25, // Warning threshold in MB
  getFormattedLimit: (limitMB?: number) => `${limitMB || AI_CONTENT_DATA.DEFAULT_LIMIT_MB}.0 MB`,
  getWarningMessage: (currentUsage: string, limit?: string) => 
    `AI content data limit exceeded! You're using ${currentUsage} of your ${limit || AI_CONTENT_DATA.getFormattedLimit()} limit.`,
};

// Legacy alias for backward compatibility
export const TRAINING_DATA = AI_CONTENT_DATA;

// Model cost multipliers for AI features
// These determine how many AI credits are consumed when using different models
export const MODEL_COSTS = {
  'haiku': 1,           // 1 credit per operation
  'sonnet': 3,          // 3 credits per operation  
  'opus': 5,            // 5 credits per operation
  'gpt-4': 4,           // 4 credits per operation
  'gpt-4-turbo': 3,     // 3 credits per operation
  'gpt-3.5-turbo': 1,   // 1 credit per operation
};

// Analytics/insights cost multipliers
export const INSIGHT_LIMITS = {
  [PLANS.FREE]: 100,        // Free tier: analyze 100 content items at a time
  [PLANS.HOBBY]: 1000,      // Hobby: analyze 1,000 content items at a time  
  [PLANS.BUSINESS]: 10000,  // Business: analyze 10,000 content items at a time
};

// Plan limits interface
export interface PlanLimits {
  aiCredits: number; // Credits for AI content operations
  contentDataSizeMB?: number; // Optional for MB-defined plans
  contentDataSizeKB?: number; // Optional for KB-defined plans
  aiUrls: number; // URLs for AI content processing
  allowedModels: string[];
  removeBranding: boolean;
}

// Plan details - these can be adjusted as needed
export const PLAN_DETAILS: Record<string, {
  name: string;
  price: number;
  trialDays?: number;
  convertsToPlanId?: string;
  features: string[];
  limits: PlanLimits;
  priceId: string;
}> = {
  [PLANS.FREE]: {
    name: '7-Day Trial',
    price: 0,
    trialDays: 7,
    convertsToPlanId: PLANS.HOBBY,
    features: [
      'Try all Hobby plan features for 7 days',
      'Fast AI models for content generation',
      '300 AI credits during trial',
      `${AI_CONTENT_DATA.DEFAULT_LIMIT_MB}MB AI content data during trial`,
      'Unlimited URLs for content processing during trial',
    ],
    limits: {
      aiCredits: 300,
      contentDataSizeMB: 35,
      aiUrls: Infinity,
      allowedModels: ['haiku'],
      removeBranding: false,
    },
    priceId: '',
  },
  [PLANS.POST_TRIAL]: {
    name: 'Free Tier',
    price: 0,
    features: [
      'Basic content management',
      'Limited AI features',
      'Upgrade required for full AI capabilities',
    ],
    limits: {
      aiCredits: 0, // No AI credits
      contentDataSizeKB: 0, // No AI content data allowance
      aiUrls: 0, // No URLs for AI processing
      allowedModels: [],
      removeBranding: false,
    },
    priceId: '',
  },
  [PLANS.HOBBY]: {
    name: 'Hobby',
    price: 49,
    features: [
      'Advanced AI models for content generation',
      '3,000 AI credits per month',
      `${AI_CONTENT_DATA.DEFAULT_LIMIT_MB}MB AI content data`,
      'Unlimited URLs for content processing',
      'AI-powered content suggestions',
    ],
    limits: {
      aiCredits: 3000,
      contentDataSizeMB: 35,
      aiUrls: Infinity,
      allowedModels: ['haiku', 'sonnet', 'gpt-4', 'gpt-4-turbo'],
      removeBranding: false,
    },
    priceId: process.env.STRIPE_HOBBY_PRICE_ID || 'price_1RdevPGhpkjzD9gMxmQjXjxL',
  },
  [PLANS.BUSINESS]: {
    name: 'Business',
    price: 199,
    features: [
      'Premium AI models for content generation',
      '10,000 AI credits per month',
      `${AI_CONTENT_DATA.DEFAULT_LIMIT_MB}MB AI content data`,
      'Unlimited URLs for content processing',
      'AI-powered content optimization',
      'Advanced content analytics',
      'Remove Spool branding',
      'Custom domain support',
      `Additional credits ${ADDITIONAL_CREDITS.FORMATTED_PRICE}`,
    ],
    limits: {
      aiCredits: 10000,
      contentDataSizeMB: 35,
      aiUrls: Infinity,
      allowedModels: ['haiku', 'sonnet', 'gpt-4', 'gpt-4-turbo', 'opus'],
      removeBranding: true,
    },
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || 'price_1RdevQGhpkjzD9gMP6sqosEA',
  },
};

// Centralized value propositions for landing page display
export const PLAN_VALUE_PROPS = {
  [PLANS.HOBBY]: [
    'All AI models from OpenAI, Anthropic and Google',
    `${PLAN_DETAILS[PLANS.HOBBY]?.limits.aiCredits.toLocaleString() || '3,000'} monthly AI credits`,
    `Analyze ${INSIGHT_LIMITS[PLANS.HOBBY].toLocaleString()} content items at a time`,
    `${AI_CONTENT_DATA.DEFAULT_LIMIT_MB}MB AI Content Data`,
    'Unlimited content processing URLs',
    'AI-powered content suggestions'
  ],
  [PLANS.BUSINESS]: [
    'All AI models from OpenAI, Anthropic and Google',
    `${PLAN_DETAILS[PLANS.BUSINESS]?.limits.aiCredits.toLocaleString() || '10,000'} monthly AI credits`,
    `Analyze ${INSIGHT_LIMITS[PLANS.BUSINESS].toLocaleString()} content items at a time`,
    `${AI_CONTENT_DATA.DEFAULT_LIMIT_MB}MB AI Content Data`,
    'Unlimited content processing URLs',
    'AI-powered content optimization',
    'Remove Spool branding',
    'Custom domain support',
    `Additional credits at ${ADDITIONAL_CREDITS.FORMATTED_PRICE}`
  ]
} as const;

export function calculateAICredits(
  modelUsed: string,
  baseCredits: number = 1
): number {
  const multiplier = MODEL_COSTS[modelUsed as keyof typeof MODEL_COSTS] || 1;
  return baseCredits * multiplier;
}
