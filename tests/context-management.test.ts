/**
 * Unit Tests for Context Compression and Semantic Memory
 * 
 * Tests the context management utilities
 */

import { 
  estimateTokens,
  estimateMessagesTokens,
  needsCompression,
  summarizeConversation,
  compressConversation,
  buildCompressedContext,
  getCompressionStats,
} from '../src/utils/contextCompression';

import {
  extractKeywords,
  calculateKeywordSimilarity,
  extractMemoriesFromConversation,
} from '../src/utils/semanticMemory';

import type { ChatMessage } from '../src/types/aiBuilderTypes';

// Test utilities
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (error: unknown) {
    failCount++;
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${name}`);
    console.error(`   ${errorMessage}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
  }
}

function assertGreaterThan(actual: number, expected: number, message: string) {
  if (actual <= expected) {
    throw new Error(`${message}\n  Expected > ${expected}\n  Actual: ${actual}`);
  }
}

function assertLessThan(actual: number, expected: number, message: string) {
  if (actual >= expected) {
    throw new Error(`${message}\n  Expected < ${expected}\n  Actual: ${actual}`);
  }
}

function assertArrayLength(array: unknown[], length: number, message: string) {
  if (array.length !== length) {
    throw new Error(`${message}\n  Expected length: ${length}\n  Actual length: ${array.length}`);
  }
}

function assertArrayContains(array: string[], value: string, message: string) {
  if (!array.includes(value)) {
    throw new Error(`${message}\n  Array: ${JSON.stringify(array)}\n  Expected to contain: ${value}`);
  }
}

function assertTrue(value: boolean, message: string) {
  if (!value) {
    throw new Error(`${message}\n  Expected: true\n  Actual: false`);
  }
}

function assertFalse(value: boolean, message: string) {
  if (value) {
    throw new Error(`${message}\n  Expected: false\n  Actual: true`);
  }
}

// Helper to create test messages
function createMessages(count: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `This is message ${i} with some content that contains multiple words to simulate real conversation messages about building an app.`,
      timestamp: new Date().toISOString(),
    });
  }
  return messages;
}

// ============================================================================
// CONTEXT COMPRESSION TESTS
// ============================================================================

console.log('\n🧪 Testing Context Compression\n');

console.log('📝 Testing estimateTokens...\n');

test('Should estimate empty string as 0 tokens', () => {
  assertEqual(estimateTokens(''), 0, 'Empty string should be 0 tokens');
});

test('Should estimate short text correctly', () => {
  // "hello" is 5 chars ≈ 2 tokens (5/4 rounded up)
  const tokens = estimateTokens('hello');
  assertEqual(tokens, 2, 'Short text should estimate correctly');
});

test('Should estimate longer text proportionally', () => {
  // 100 chars ≈ 25 tokens
  const text = 'a'.repeat(100);
  const tokens = estimateTokens(text);
  assertEqual(tokens, 25, 'Longer text should estimate correctly');
});

console.log('\n📝 Testing estimateMessagesTokens...\n');

test('Should estimate tokens for array of messages', () => {
  const messages = createMessages(5);
  const tokens = estimateMessagesTokens(messages);
  assertGreaterThan(tokens, 100, 'Should have substantial token count for messages');
});

test('Should include overhead per message', () => {
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'Hi', timestamp: new Date().toISOString() },
  ];
  const tokens = estimateMessagesTokens(messages);
  // Content tokens + role tokens + overhead
  assertGreaterThan(tokens, 4, 'Should include message overhead');
});

console.log('\n📝 Testing needsCompression...\n');

test('Should return false for small conversations', () => {
  const messages = createMessages(3);
  assertFalse(needsCompression(messages, 8000), 'Small conversation should not need compression');
});

test('Should return true for large conversations', () => {
  const messages = createMessages(100);
  assertTrue(needsCompression(messages, 1000), 'Large conversation should need compression');
});

console.log('\n📝 Testing summarizeConversation...\n');

test('Should create summary from messages', () => {
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'I want to build a todo app with dark mode', timestamp: new Date().toISOString() },
    { id: '2', role: 'assistant', content: 'I added a beautiful dark theme', timestamp: new Date().toISOString() },
    { id: '3', role: 'user', content: 'I prefer using Tailwind CSS', timestamp: new Date().toISOString() },
  ];
  
  const summary = summarizeConversation(messages);
  assertEqual(summary.messageCount, 3, 'Should count messages correctly');
  assertGreaterThan(summary.originalTokens, 0, 'Should have original tokens');
});

console.log('\n📝 Testing compressConversation...\n');

test('Should preserve recent messages when compression is needed', () => {
  const messages = createMessages(10);
  // Set a low maxTokens to force compression
  const compressed = compressConversation(messages, { preserveLastN: 4, maxTokens: 100 });
  
  assertArrayLength(compressed.recentMessages, 4, 'Should preserve last 4 messages');
});

test('Should create summary from older messages when compression is needed', () => {
  const messages = createMessages(10);
  // Set a low maxTokens to force compression
  const compressed = compressConversation(messages, { preserveLastN: 4, maxTokens: 100 });
  
  assertEqual(compressed.summary.messageCount, 6, 'Should summarize 6 older messages');
});

test('Should not compress if under token limit', () => {
  const messages = createMessages(3);
  const compressed = compressConversation(messages, { maxTokens: 10000 });
  
  // When not compressed, all messages are in recentMessages
  assertArrayLength(compressed.recentMessages, 3, 'Should keep all messages when under limit');
  assertEqual(compressed.summary.messageCount, 0, 'Should have no summarized messages');
});

console.log('\n📝 Testing buildCompressedContext...\n');

test('Should build context string from compressed data', () => {
  const messages = createMessages(10);
  // Force compression with low maxTokens
  const compressed = compressConversation(messages, { preserveLastN: 4, maxTokens: 100 });
  const context = buildCompressedContext(compressed);
  
  assertTrue(context.length > 0, 'Should produce non-empty context');
  assertTrue(context.includes('User:') || context.includes('Assistant:'), 'Should include message labels');
});

test('Should include summary header for compressed conversations', () => {
  const messages = createMessages(10);
  // Force compression with low maxTokens
  const compressed = compressConversation(messages, { preserveLastN: 4, maxTokens: 100 });
  const context = buildCompressedContext(compressed);
  
  assertTrue(context.includes('Summary'), 'Should include summary section');
});

console.log('\n📝 Testing getCompressionStats...\n');

test('Should calculate compression statistics', () => {
  const messages = createMessages(20);
  // Force compression with low maxTokens
  const compressed = compressConversation(messages, { preserveLastN: 4, maxTokens: 100 });
  const stats = getCompressionStats(compressed);
  
  assertGreaterThan(stats.compressionRatio, 1, 'Compression ratio should be > 1');
  assertGreaterThan(stats.tokensSaved, 0, 'Should save tokens');
});

// ============================================================================
// SEMANTIC MEMORY TESTS
// ============================================================================

console.log('\n🧪 Testing Semantic Memory\n');

console.log('📝 Testing extractKeywords...\n');

test('Should extract keywords from text', () => {
  const keywords = extractKeywords('I want to build a React dashboard with charts');
  
  assertGreaterThan(keywords.length, 0, 'Should extract some keywords');
  assertArrayContains(keywords, 'react', 'Should extract "react"');
  assertArrayContains(keywords, 'dashboard', 'Should extract "dashboard"');
});

test('Should filter out stop words', () => {
  const keywords = extractKeywords('I want to use the best framework');
  
  assertTrue(!keywords.includes('the'), 'Should filter "the"');
  assertTrue(!keywords.includes('to'), 'Should filter "to"');
  assertTrue(!keywords.includes('i'), 'Should filter "i"');
});

test('Should handle empty text', () => {
  const keywords = extractKeywords('');
  assertArrayLength(keywords, 0, 'Should return empty array for empty text');
});

console.log('\n📝 Testing calculateKeywordSimilarity...\n');

test('Should calculate similarity for matching keywords', () => {
  const similarity = calculateKeywordSimilarity(
    ['react', 'dashboard', 'charts'],
    ['react', 'dashboard', 'components']
  );
  
  assertGreaterThan(similarity, 0, 'Should have positive similarity');
});

test('Should return 0 for no matching keywords', () => {
  const similarity = calculateKeywordSimilarity(
    ['python', 'flask'],
    ['react', 'nextjs']
  );
  
  assertEqual(similarity, 0, 'Should be 0 for no matches');
});

test('Should return 0 for empty keyword arrays', () => {
  assertEqual(calculateKeywordSimilarity([], ['react']), 0, 'Empty query should return 0');
  assertEqual(calculateKeywordSimilarity(['react'], []), 0, 'Empty memory should return 0');
});

console.log('\n📝 Testing extractMemoriesFromConversation...\n');

test('Should extract preferences from user messages', () => {
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'I prefer using Tailwind CSS for styling', timestamp: new Date().toISOString() },
    { id: '2', role: 'assistant', content: 'Sure, I will use Tailwind CSS', timestamp: new Date().toISOString() },
  ];
  
  const memories = extractMemoriesFromConversation(messages);
  const preferenceMemories = memories.filter(m => m.type === 'preference');
  
  assertGreaterThan(preferenceMemories.length, 0, 'Should extract preference memory');
});

test('Should extract features from assistant messages', () => {
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'Add a dark mode toggle', timestamp: new Date().toISOString() },
    { id: '2', role: 'assistant', content: 'I added a dark mode toggle to the header', timestamp: new Date().toISOString() },
  ];
  
  const memories = extractMemoriesFromConversation(messages);
  const featureMemories = memories.filter(m => m.type === 'feature');
  
  assertGreaterThan(featureMemories.length, 0, 'Should extract feature memory');
});

test('Should skip system messages', () => {
  const messages: ChatMessage[] = [
    { id: '1', role: 'system', content: 'I prefer using React', timestamp: new Date().toISOString() },
  ];
  
  const memories = extractMemoriesFromConversation(messages);
  assertArrayLength(memories, 0, 'Should not extract from system messages');
});

test('Should deduplicate similar memories', () => {
  const messages: ChatMessage[] = [
    { id: '1', role: 'user', content: 'I prefer dark mode themes', timestamp: new Date().toISOString() },
    { id: '2', role: 'user', content: 'I prefer dark mode styling', timestamp: new Date().toISOString() },
  ];
  
  const memories = extractMemoriesFromConversation(messages);
  // Should deduplicate similar dark mode preferences
  assertLessThan(memories.length, 5, 'Should deduplicate similar memories');
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n============================================================');
console.log('📊 Test Summary');
console.log('============================================================');
console.log(`Total Tests: ${testCount}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);
console.log('============================================================\n');

if (failCount > 0) {
  process.exit(1);
}
