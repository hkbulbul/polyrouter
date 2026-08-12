// ChatGPT Web DOM selectors
// Ported and adapted from codex-chatgpt-web/src/chatgpt-session.ts

export const CHATGPT_TEMPORARY_CHAT_URL = "https://chatgpt.com/?temporary-chat=true";

// Composer — the main prompt input area (Lexical editor)
export const CHATGPT_COMPOSER_SELECTOR = [
  "#prompt-textarea",
  '[data-testid="prompt-textarea"]',
  '[contenteditable="true"][data-lexical-editor="true"]',
].join(", ");

// Send button
export const CHATGPT_SEND_BUTTON_SELECTOR = [
  '[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
].join(", ");

// Effort / model intelligence picker
export const CHATGPT_EFFORT_CONTROL_SELECTOR =
  'button[aria-haspopup="menu"][data-tone="neutral"]';
export const CHATGPT_EFFORT_MENU_SELECTOR = [
  '[data-testid="composer-intelligence-picker-content"]:has([role="menuitemradio"])',
  '[role="menu"]:has([role="menuitemradio"])',
  '[role="group"]:has([role="menuitemradio"])',
].join(", ");
export const CHATGPT_EFFORT_ITEM_SELECTOR = '[role="menuitemradio"]';

// Stop button — visible while ChatGPT is still generating
export const CHATGPT_STOP_BUTTON_SELECTOR = '[data-testid="stop-button"]';

// Copy button — appears when ChatGPT has finished responding
export const CHATGPT_COMPLETION_ACTION_SELECTOR =
  'button[data-testid="copy-turn-action-button"]';

// Assistant response turn in the conversation
export const CHATGPT_ASSISTANT_TURN_SELECTOR = [
  '[data-testid^="conversation-turn-"][data-message-author-role="assistant"]',
  '[data-testid^="conversation-turn-"]:has([data-message-author-role="assistant"])',
].join(", ");

// Model-to-effort-index mapping for the ChatGPT UI dropdown (0-based)
// Free accounts typically get indices 0-2; Pro accounts get 0-4
export const MODEL_EFFORT_MAP = {
  "gpt-5.6-sol":        { index: 0, label: "Instant" },
  "gpt-5.6-sol-medium": { index: 1, label: "Medium" },
  "gpt-5.6-sol-high":   { index: 2, label: "High" },
  "gpt-5.6-sol-xhigh":  { index: 3, label: "Extra High" },
  "gpt-5.6-sol-pro":    { index: 4, label: "Pro" },
};

export const DEFAULT_EFFORT = { index: 2, label: "High" };
