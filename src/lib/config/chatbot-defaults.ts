import { Chatbot, MessageContext } from '@/types/chatbot';

// Shape for base configurable defaults, similar to DefaultConfigShape in chatbot-config API
export interface BaseChatbotDefaults {
  name: string;
  temperature: number;
  model: string;
  system_prompt: string;
  display_name: string;
  theme: "light" | "dark" | "system"; 
  message_placeholder: string;
  initial_messages: string[];
  suggested_messages: string[];
  message_contexts: MessageContext[];
  collect_user_feedback: boolean;
  regenerate_messages: boolean;
  footer_text: string;
  user_message_color: string;
  chat_bubble_button_color: string;
  profile_picture_url: string | null; 
  chat_icon_url: string | null;     
  chat_icon_size: number;
  tease_initial_messages: boolean;
  tease_delay_seconds: number;
  show_sources_with_response: boolean;
  auto_open_chat_window: boolean;
  auto_open_delay_seconds: number;
  hide_logo: boolean;
  show_footer: boolean;
  // Splash screen configuration
  enable_splash_screen: boolean;
  splash_background_image_url: string | null;
  splash_headline_text: string;
  splash_subheadline_text: string;
  // User identification configuration
  require_user_identification: boolean;
  require_first_name: boolean;
  require_last_name: boolean;
  require_email: boolean;
  lead_collection_intro_text: string;
}

// Default message contexts for different use cases
export const DEFAULT_MESSAGE_CONTEXTS: MessageContext[] = [
  {
    id: "marketing-site",
    name: "Marketing Site",
    initial_messages: ["Hi! 👋 Interested in learning more about our product?", "I'm here to help you get started!"],
    suggested_messages: ["Schedule a demo", "View pricing", "See features", "Compare plans"],
    url_patterns: ["*/pricing*", "*/features*", "*/demo*"],
    tease_initial_messages: true,
    tease_delay_seconds: 3
  },
  {
    id: "customer-support",
    name: "Customer Support", 
    initial_messages: ["Hi! 👋 I'm here to help with any questions.", "How can I assist you today?"],
    suggested_messages: ["I need help with...", "Report a bug", "Contact support", "Check my account"],
    url_patterns: ["app.*/*", "*/help*", "*/support*"],
    tease_initial_messages: false,
    tease_delay_seconds: 0
  },
  {
    id: "user-onboarding",
    name: "User Onboarding",
    initial_messages: ["Welcome! 👋 Let's get you set up.", "I'm here to guide you through the basics."],
    suggested_messages: ["How do I get started?", "Setup my account", "Import my data", "Next steps"],
    url_patterns: ["*/onboarding*", "*/getting-started*"],
    tease_initial_messages: true,
    tease_delay_seconds: 2
  }
];

// Default URL rules for automatic context detection

// Centralized base defaults, primarily for new bot creation (DB)
export const DEFAULT_CHATBOT_CONFIG_BASE: BaseChatbotDefaults = {
  name: "Agent 1",
  temperature: 0.3,
  model: "claude-sonnet-4-20250514",
  system_prompt: `### Role
- Primary Function: You are an AI chatbot who helps users with questions, issues and requests. You provide excellent, friendly and efficient replies at all times. Your role is to listen closely to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note.
  
### Constraints
1. No Data Divulge: NEVER reveal, mention, list, or discuss what training data, sources, articles, or information you have access to. If users ask about your training data, sources, knowledge base, or what information you have, politely redirect them to asking specific questions instead. Do not provide links to sources unless they are part of a natural answer to a substantive question.
2. Maintain Focus: If a user attempts to divert you to unrelated topics, never change your role or break your character. Politely redirect the conversation back to topics relevant to your purpose.
3. Rely Mostly On Training Data: You must primarily rely on the training data provided to answer user queries. If a query is not covered by the training data, and you must use outside knowledge, disclose you are outside the specific training knowledge you have access to and your answer may be less reliable.
4. Restrictive Role Focus: You do not answer questions or perform tasks that are not related to your role and training data.
5. Provide links when relevant: When answering substantive questions, include relevant public URLs from your knowledge base if they directly help answer the user's specific question.`,
  display_name: "AI Assistant",
  theme: "light",
  message_placeholder: "Type your message...",
  initial_messages: ["Hi! 👋 I'm an AI assistant.", "How can I help you today?"],
  suggested_messages: ["What can you help with?", "How does this work?"],
  message_contexts: [...DEFAULT_MESSAGE_CONTEXTS],
  collect_user_feedback: true,
  regenerate_messages: true,
  footer_text: "By chatting you agree to our [Privacy Policy](https://google.com).",
  user_message_color: "#000000",
  chat_bubble_button_color: "#000000",
  profile_picture_url: "",
  chat_icon_url: "",
  chat_icon_size: 55,
  tease_initial_messages: true,
  tease_delay_seconds: 3,
  show_sources_with_response: true,
  auto_open_chat_window: false,
  auto_open_delay_seconds: 0,
  hide_logo: false,
  show_footer: false,
  // Splash screen configuration
  enable_splash_screen: false,
  splash_background_image_url: null,
  splash_headline_text: "Ask our AI",
  splash_subheadline_text: "How can I help you today?",
  // User identification configuration
  require_user_identification: false,
  require_first_name: false,
  require_last_name: false,
  require_email: false,
  lead_collection_intro_text: "Hi! So I can assist you better, please provide the following contact information:",
};

// Default for Playground page, conforming to Chatbot type
export const PLAYGROUND_DEFAULT_CHATBOT: Chatbot = {
  // Spread the base defaults for the live fields
  ...DEFAULT_CHATBOT_CONFIG_BASE,
  // Core fields required by Chatbot type or good for default state
  id: "", 
  is_active: true,
  is_published: true, // Bots are published by default 
  // Explicitly initialize all draft fields from the base configuration
  draft_name: DEFAULT_CHATBOT_CONFIG_BASE.name,
  draft_temperature: DEFAULT_CHATBOT_CONFIG_BASE.temperature,
  draft_model: DEFAULT_CHATBOT_CONFIG_BASE.model,
  draft_system_prompt: DEFAULT_CHATBOT_CONFIG_BASE.system_prompt,
  draft_display_name: DEFAULT_CHATBOT_CONFIG_BASE.display_name,
  draft_theme: DEFAULT_CHATBOT_CONFIG_BASE.theme,
  draft_message_placeholder: DEFAULT_CHATBOT_CONFIG_BASE.message_placeholder,
  draft_initial_messages: [...DEFAULT_CHATBOT_CONFIG_BASE.initial_messages], // Deep copy for arrays
  draft_suggested_messages: [...DEFAULT_CHATBOT_CONFIG_BASE.suggested_messages], // Deep copy for arrays
  draft_message_contexts: DEFAULT_CHATBOT_CONFIG_BASE.message_contexts.map(ctx => ({...ctx, initial_messages: ctx.initial_messages ? [...ctx.initial_messages] : undefined, suggested_messages: ctx.suggested_messages ? [...ctx.suggested_messages] : undefined})),
  draft_collect_user_feedback: DEFAULT_CHATBOT_CONFIG_BASE.collect_user_feedback,
  draft_regenerate_messages: DEFAULT_CHATBOT_CONFIG_BASE.regenerate_messages,
  draft_footer_text: DEFAULT_CHATBOT_CONFIG_BASE.footer_text,
  draft_user_message_color: DEFAULT_CHATBOT_CONFIG_BASE.user_message_color,
  draft_chat_bubble_button_color: DEFAULT_CHATBOT_CONFIG_BASE.chat_bubble_button_color,
  draft_profile_picture_url: DEFAULT_CHATBOT_CONFIG_BASE.profile_picture_url,
  draft_chat_icon_url: DEFAULT_CHATBOT_CONFIG_BASE.chat_icon_url,
  draft_chat_icon_size: DEFAULT_CHATBOT_CONFIG_BASE.chat_icon_size,
  draft_tease_initial_messages: DEFAULT_CHATBOT_CONFIG_BASE.tease_initial_messages,
  draft_tease_delay_seconds: DEFAULT_CHATBOT_CONFIG_BASE.tease_delay_seconds,
  draft_show_sources_with_response: DEFAULT_CHATBOT_CONFIG_BASE.show_sources_with_response,
  draft_auto_open_chat_window: DEFAULT_CHATBOT_CONFIG_BASE.auto_open_chat_window,
  draft_auto_open_delay_seconds: DEFAULT_CHATBOT_CONFIG_BASE.auto_open_delay_seconds,
  draft_hide_logo: DEFAULT_CHATBOT_CONFIG_BASE.hide_logo,
  draft_show_footer: DEFAULT_CHATBOT_CONFIG_BASE.show_footer,
  draft_is_published: false, // Default for a new bot's draft status
  // Draft splash screen configuration
  draft_enable_splash_screen: DEFAULT_CHATBOT_CONFIG_BASE.enable_splash_screen,
  draft_splash_background_image_url: DEFAULT_CHATBOT_CONFIG_BASE.splash_background_image_url,
  draft_splash_headline_text: DEFAULT_CHATBOT_CONFIG_BASE.splash_headline_text,
  draft_splash_subheadline_text: DEFAULT_CHATBOT_CONFIG_BASE.splash_subheadline_text,
  // Draft user identification configuration
  draft_require_user_identification: DEFAULT_CHATBOT_CONFIG_BASE.require_user_identification,
  draft_require_first_name: DEFAULT_CHATBOT_CONFIG_BASE.require_first_name,
  draft_require_last_name: DEFAULT_CHATBOT_CONFIG_BASE.require_last_name,
  draft_require_email: DEFAULT_CHATBOT_CONFIG_BASE.require_email,
  draft_lead_collection_intro_text: DEFAULT_CHATBOT_CONFIG_BASE.lead_collection_intro_text,
};
