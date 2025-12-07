/**
 * Mock for js-tiktoken module
 * Used in tests to avoid loading the actual tokenizer
 */

export class Tiktoken {
  encode(text: string): number[] {
    // Simple mock: return array with length based on rough word count
    return text.split(/\s+/).map((_, i) => i);
  }

  decode(tokens: number[]): string {
    return tokens.join(' ');
  }

  free(): void {
    // No-op
  }
}

export function getEncoding(_encoding: string): Tiktoken {
  return new Tiktoken();
}

export function encodingForModel(_model: string): Tiktoken {
  return new Tiktoken();
}
