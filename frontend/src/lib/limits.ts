// Mirrors the backend limits in backend/app/api/chat.py. Keep the two in sync.
export const MAX_MESSAGES = 40;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_TOTAL_CHARS = 16000;

// The backend waits up to 90s for the CLI; give it a margin before giving up.
export const REQUEST_TIMEOUT_MS = 120_000;
