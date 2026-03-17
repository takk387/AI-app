/**
 * Message sanitization utilities for Anthropic API compliance.
 * Ensures strict user/assistant alternation required by the API.
 */

/**
 * Sanitize messages for Anthropic API — merge consecutive same-role messages
 * and ensure strict user/assistant alternation.
 */
export function sanitizeMessagesForAPI(
  messages: Array<{ role: string; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (messages.length === 0) return [];

  // Filter to only user/assistant roles (drop system messages)
  const filtered = messages.filter((m) => m.role === 'user' || m.role === 'assistant') as Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;

  const sanitized: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of filtered) {
    const last = sanitized[sanitized.length - 1];
    if (last && last.role === msg.role) {
      // Merge consecutive same-role messages
      last.content = `${last.content}\n\n${msg.content}`;
    } else {
      sanitized.push({ ...msg });
    }
  }

  // Ensure first message is from user (API requirement)
  if (sanitized.length > 0 && sanitized[0].role === 'assistant') {
    sanitized.shift();
  }

  return sanitized;
}
