/**
 * Jest Setup File
 * Runs before all tests
 */

// Mock environment variables
process.env.ANTHROPIC_API_KEY = 'test-api-key';
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true,
});

// Mock Next.js Response
global.Response = class Response {
  constructor(public body: any, public init?: ResponseInit) {}

  // Instance method - called on response instances
  json() {
    return Promise.resolve(
      typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    );
  }

  // Static method - called by NextResponse.json() internally
  static json(data: any, init?: ResponseInit) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  }

  get status() {
    return this.init?.status || 200;
  }
} as any;

// Mock Headers
global.Headers = class Headers {
  private headers: Record<string, string> = {};
  
  get(name: string) {
    return this.headers[name.toLowerCase()];
  }
  
  set(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
} as any;

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
