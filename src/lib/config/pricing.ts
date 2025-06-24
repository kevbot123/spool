// Pricing configuration for the chatapp
// This file contains all the pricing-related configuration that can be adjusted on the fly

// Additional credits pricing
export const ADDITIONAL_CREDITS = {
  PRICE_PER_1000: 8, // $8 per 1,000 additional credits
  CURRENCY: 'USD',
  FORMATTED_PRICE: '$16 per 2,000', // Formatted string for display
};

export const PLANS = {
  FREE: 'free', // Represents the active 7-day trial period
  HOBBY: 'hobby',
  BUSINESS: 'business',
  POST_TRIAL: 'post_trial', // Represents the state after trial ends/cancels without upgrade
};

// Training data constants for common usage
export const TRAINING_DATA = {
  DEFAULT_LIMIT_MB: 35, // Default training data limit in MB
  WARNING_THRESHOLD_PERCENT: 71, // Warn when over this percentage (25MB of 35MB)
  WARNING_THRESHOLD_MB: 25, // Warning threshold in MB
  getFormattedLimit: (limitMB?: number) => `${limitMB || TRAINING_DATA.DEFAULT_LIMIT_MB}.0 MB`,
  getWarningMessage: (currentUsage: string, limit?: string) => 
    `Training data limit exceeded! You're using ${currentUsage} of your ${limit || TRAINING_DATA.getFormattedLimit()} limit.`,
};

// Centralized plan descriptions for consistent messaging
export const PLAN_DESCRIPTIONS = {
  [PLANS.FREE]: 'Try all Hobby plan features for 7 days',
  [PLANS.HOBBY]: 'For side projects and early startups',
  [PLANS.BUSINESS]: 'For established or growing entities',
  [PLANS.POST_TRIAL]: 'Limited access after trial'
} as const;

// Centralized insight analysis limits by plan
export const INSIGHT_LIMITS = {
  [PLANS.FREE]: 1000, // logs at a time during trial
  [PLANS.HOBBY]: 1000, // logs at a time
  [PLANS.BUSINESS]: 2000, // logs at a time
  [PLANS.POST_TRIAL]: 0, // no insights
} as const;

// Model cost multipliers (relative to base message credit cost)
// These determine how many message credits are consumed when using different models
export const MODEL_COST_MULTIPLIERS: Record<string, number> = {
  // Fast models (lower cost)
  'haiku': 1,
  // Flagship models (higher cost)
  'sonnet': 2,
  'claude-3-opus': 5,
  'gpt-4': 3,
  'gpt-4-turbo': 2.5,
  // Add more models and their multipliers as needed
};

// Message length thresholds and their additional cost multipliers
export const MESSAGE_LENGTH_MULTIPLIERS: Array<{
  threshold: number; // in characters
  multiplier: number;
}> = [
  { threshold: 500, multiplier: 1 }, // Base cost for messages up to 500 chars
  { threshold: 1000, multiplier: 1.5 }, // 1.5x cost for messages between 501-1000 chars
  { threshold: 2000, multiplier: 2 }, // 2x cost for messages between 1001-2000 chars
  { threshold: Infinity, multiplier: 3 }, // 3x cost for messages over 2000 chars
];

// Interface for plan limits
interface PlanLimits {
  messageCredits: number;
  trainingDataSizeKB?: number; // Optional for MB-defined plans
  trainingDataSizeMB?: number; // Optional for KB-defined plans
  trainingUrls: number;
  allowedModels: string[]; // Explicitly type as string array
  removeBranding: boolean;
}

// Plan details - these can be adjusted as needed
export const PLAN_DETAILS: Record<string, {
  name: string;
  price: number;
  trialDays?: number;
  convertsToPlanId?: string;
  features: string[];
  limits: PlanLimits; // Apply the interface here
  priceId: string;
}> = {
  [PLANS.FREE]: {
    name: '7-Day Trial',
    price: 0,
    trialDays: 7,
    convertsToPlanId: PLANS.HOBBY,
    features: [
      'Try all Hobby plan features for 7 days',
      'Fast LLM models (e.g., Haiku)',
              '300 message credits during trial',
      `${TRAINING_DATA.DEFAULT_LIMIT_MB}MB training data during trial`,
      'Unlimited URLs for training during trial',
    ],
    limits: {
      messageCredits: 300,
      trainingDataSizeMB: 35,
      trainingUrls: Infinity,
      allowedModels: ['haiku'],
      removeBranding: false,
    },
    priceId: '',
  },
  [PLANS.POST_TRIAL]: {
    name: 'Free Tier', // Name shown after trial
    price: 0,
    features: [
      'Limited chatbot interaction (if applicable)',
      'Upgrade required for full features',
    ],
    limits: {
      messageCredits: 0, // No message credits
      trainingDataSizeKB: 0, // No training data allowance
      trainingUrls: 0, // No URLs for training
      allowedModels: [], // Explicitly empty string array
      removeBranding: false,
    },
    priceId: '', // No associated Stripe price ID
  },
  [PLANS.HOBBY]: {
    name: 'Hobby',
    price: 35,
    features: [
      'Flagship LLM models',
      '3,000 message credits per month',
      `${TRAINING_DATA.DEFAULT_LIMIT_MB}MB training data`,
      'Unlimited URLs for training',
      'Unlimited answer revisions',
    ],
    limits: {
      messageCredits: 3000,
      trainingDataSizeMB: 35,
      trainingUrls: Infinity,
      allowedModels: ['haiku', 'sonnet', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus'],
      removeBranding: false,
    },
    priceId: process.env.STRIPE_HOBBY_PRICE_ID || '',
  },
  [PLANS.BUSINESS]: {
    name: 'Business',
    price: 95,
    features: [
      'Flagship LLM models',
      '10,000 message credits per month',
      `${TRAINING_DATA.DEFAULT_LIMIT_MB}MB training data`,
      'Unlimited URLs for training',
      'Unlimited answer revisions',
      'Insight analysis on entire chat database',
      'Ability to remove Wist logo',
      'Add custom footer and privacy policy',
      `Additional credits ${ADDITIONAL_CREDITS.FORMATTED_PRICE}`,
    ],
    limits: {
      messageCredits: 10000,
      trainingDataSizeMB: 35,
      trainingUrls: Infinity,
      allowedModels: ['haiku', 'sonnet', 'gpt-4', 'gpt-4-turbo', 'claude-3-opus'],
      removeBranding: true,
    },
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || '',
  },
};

// Centralized value propositions for landing page display
export const PLAN_VALUE_PROPS = {
  [PLANS.HOBBY]: [
    'All models from OpenAI, Anthropic and Google',
    `${PLAN_DETAILS[PLANS.HOBBY]?.limits.messageCredits.toLocaleString() || '3,000'} monthly message credits`,
    `Analyze ${INSIGHT_LIMITS[PLANS.HOBBY].toLocaleString()} logs at a time for insights`,
    `${TRAINING_DATA.DEFAULT_LIMIT_MB}MB Training Data`,
    'Unlimited crawled URLs',
    'Unlimited answer revisions'
  ],
  [PLANS.BUSINESS]: [
    'All models from OpenAI, Anthropic and Google',
    `${PLAN_DETAILS[PLANS.BUSINESS]?.limits.messageCredits.toLocaleString() || '10,000'} monthly message credits`,
    `Analyze ${INSIGHT_LIMITS[PLANS.BUSINESS].toLocaleString()} logs at a time for insights`,
    `${TRAINING_DATA.DEFAULT_LIMIT_MB}MB Training Data`,
    'Unlimited crawled URLs',
    'Unlimited answer revisions',
    'No Wist logo in chat window',
    'Custom footer & privacy policy link',
    `Additional credits at ${ADDITIONAL_CREDITS.FORMATTED_PRICE}`
  ]
} as const;

// Helper functions for checking limits
export function calculateMessageCredits(
  messageLength: number,
  model: string
): number {
  // Find the applicable length multiplier
  const lengthMultiplier = MESSAGE_LENGTH_MULTIPLIERS.find(
    (bracket) => messageLength <= bracket.threshold
  )?.multiplier || MESSAGE_LENGTH_MULTIPLIERS[MESSAGE_LENGTH_MULTIPLIERS.length - 1].multiplier;

  // Get the model multiplier (default to 1 if not found)
  const modelMultiplier = MODEL_COST_MULTIPLIERS[model] || 1;

  // Calculate total credits (base cost = 1)
  return Math.ceil(1 * lengthMultiplier * modelMultiplier);
}

// Helper to check if a user can use a specific model based on their plan
export function canUseModel(planId: string, modelName: string): boolean {
  const plan = PLAN_DETAILS[planId as keyof typeof PLAN_DETAILS];
  if (!plan) return false;
  
  return plan.limits.allowedModels.includes(modelName);
}

// Helper to check if a user can remove branding based on their plan
export function canRemoveBranding(planId: string): boolean {
  const plan = PLAN_DETAILS[planId as keyof typeof PLAN_DETAILS];
  if (!plan) return false;
  
  return plan.limits.removeBranding;
}
