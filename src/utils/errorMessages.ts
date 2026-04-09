export type ErrorAction = 'retry' | 'simplify' | 'wait' | 'none';

export interface FriendlyError {
  message: string;
  action: ErrorAction;
}

interface ErrorPattern {
  test: (code: string | undefined, raw: string) => boolean;
  message: string;
  action: ErrorAction;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    test: (code) => code === 'NO_API_KEY',
    message: 'AI service is not configured. Contact the administrator.',
    action: 'none',
  },
  {
    test: (code) => code === 'PARSE_ERROR',
    message: 'The AI response was malformed. This happens occasionally — try again.',
    action: 'retry',
  },
  {
    test: (code) => code === 'NO_FILES',
    message: "The AI didn't produce any code. Try rephrasing your request or simplifying the app.",
    action: 'retry',
  },
  {
    test: (code) => code === 'REQUEST_TOO_LARGE',
    message:
      'Your request is too large. Try reducing the number of images or shortening the conversation.',
    action: 'simplify',
  },
  {
    test: (_code, raw) => /rate.?limit|429/i.test(raw),
    message: 'AI service is busy. Please wait a moment and try again.',
    action: 'wait',
  },
  {
    test: (_code, raw) => /timed?\s*out|timeout/i.test(raw),
    message: 'Generation took too long. Try a simpler app or fewer features.',
    action: 'retry',
  },
  {
    test: (_code, raw) => /abort/i.test(raw),
    message: 'Generation was cancelled.',
    action: 'none',
  },
  {
    test: (_code, raw) => /network|failed to fetch|fetch failed|ECONNREFUSED/i.test(raw),
    message: 'Connection lost. Check your internet and try again.',
    action: 'retry',
  },
  {
    test: (_code, raw) => /5\d{2}|server error|internal error/i.test(raw),
    message: 'Something went wrong on our end. Please try again.',
    action: 'retry',
  },
  {
    test: (_code, raw) => /4\d{2}|unauthorized|forbidden/i.test(raw),
    message: 'Request was rejected. Please try signing in again.',
    action: 'none',
  },
];

export function friendlyErrorMessage(code: string | undefined, rawMessage: string): FriendlyError {
  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(code, rawMessage)) {
      return { message: pattern.message, action: pattern.action };
    }
  }

  return {
    message: 'Something unexpected happened. Please try again.',
    action: 'retry',
  };
}
