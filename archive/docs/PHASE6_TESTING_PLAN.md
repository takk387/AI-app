# Phase 6 Testing Plan

## Overview
Comprehensive testing strategy for validating all optimization work from Phases 1-5.

---

## ✅ Phase 6.1: Unit Testing (COMPLETE)

### Status: Complete
- **Test Coverage**: 52 tests, 100% pass rate
- **Code Validator Tests**: 25 tests (100%)
- **Retry Logic Tests**: 27 tests (100%)
- **Bugs Fixed**: 3 bugs discovered and fixed through TDD

### Results
```
Total Tests: 52
✅ Passed: 52 (100%)
❌ Failed: 0
Success Rate: 100.0%
```

---

## 🔄 Phase 6.2: Integration Testing (IN PROGRESS)

### Goal
Test complete request flows including retry logic, validation, and analytics integration.

### Test Scenarios Required

#### 1. Successful Modification Flow
**Description**: Test happy path with no errors

**Steps**:
1. Send valid modification request
2. AI generates valid diff response
3. Validation passes
4. Response returned successfully

**Expected**:
- ✅ Status 200
- ✅ Valid diff response
- ✅ Analytics tracks success
- ✅ No validation warnings

---

#### 2. Retry on Parsing Error
**Description**: Test retry with JSON parsing error

**Steps**:
1. First attempt: AI returns invalid JSON
2. Retry triggered with parsing correction prompt
3. Second attempt: AI returns valid JSON
4. Success

**Expected**:
- ✅ First attempt fails with parsing_error
- ✅ Retry includes JSON syntax guidance
- ✅ Second attempt succeeds
- ✅ Analytics tracks retry metrics
- ✅ Response indicates retry was successful

---

#### 3. Retry on Validation Error
**Description**: Test retry with code validation failure

**Steps**:
1. First attempt: AI generates code with nested functions
2. Validation detects error
3. Retry triggered with validation correction prompt
4. Second attempt: AI generates valid code
5. Success

**Expected**:
- ✅ Validation detects nested function
- ✅ Retry includes validation checklist
- ✅ Second attempt passes validation
- ✅ No remaining validation errors

---

#### 4. Max Retries Exhausted
**Description**: Test failure after all retries used

**Steps**:
1. First attempt: Parsing error
2. Retry #1: Parsing error
3. Max retries reached
4. Return error to user

**Expected**:
- ✅ Both retries attempted
- ✅ User-friendly error message
- ✅ Technical details included
- ✅ Analytics tracks failure with retry count

---

#### 5. Timeout Error Handling
**Description**: Test timeout detection and retry

**Steps**:
1. First attempt: AI response takes >45 seconds
2. Timeout triggered
3. Retry with simplification prompt
4. Second attempt: Faster response
5. Success

**Expected**:
- ✅ Timeout detected at 45 seconds
- ✅ Retry includes scope reduction guidance
- ✅ Second attempt completes faster
- ✅ Analytics tracks timeout recovery

---

#### 6. Pattern Matching Error Recovery
**Description**: Test pattern matching error detection

**Steps**:
1. AI generates diff with incorrect search pattern
2. Pattern matching error detected
3. Retry with actual file contents
4. Second attempt uses exact pattern
5. Success

**Expected**:
- ✅ Pattern matching error detected
- ✅ Enhanced prompt includes file contents
- ✅ Emphasizes exact character matching
- ✅ Second attempt succeeds

---

#### 7. Request Validation
**Description**: Test request validation errors

**Test Cases**:
- Missing API key → 500 error
- Missing currentAppState → 400 error
- Invalid request format → 400 error

**Expected**:
- ✅ Appropriate status codes
- ✅ Clear error messages
- ✅ No analytics tracking for invalid requests

---

#### 8. Analytics Integration
**Description**: Verify analytics tracking throughout flow

**Test Cases**:
- Request start logged
- Token usage tracked
- Success/failure logged
- Retry metrics recorded
- Performance checkpoints captured

**Expected**:
- ✅ All metrics captured correctly
- ✅ Request ID consistent throughout
- ✅ Error categorization accurate
- ✅ Metadata includes retry attempts

---

### Implementation Requirements

#### Testing Framework Setup
```bash
# Install Jest
npm install --save-dev jest @types/jest ts-jest

# Install testing utilities
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Install Next.js testing support
npm install --save-dev @testing-library/react-hooks
```

#### Jest Configuration
**File**: `jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  testMatch: [
    '**/tests/integration-*.test.ts',
  ],
};
```

#### Mocking Infrastructure Needed

1. **Anthropic SDK Mock**
   ```typescript
   // Mock streaming response
   const mockAnthropicStream = (response: string) => {
     // Return async generator that yields response
   };
   ```

2. **Analytics Mock**
   ```typescript
   // Mock analytics to spy on calls
   jest.mock('@/utils/analytics');
   ```

3. **Request/Response Mocks**
   ```typescript
   // Create mock Next.js Request/Response objects
   ```

---

### Estimated Effort
- **Framework Setup**: 1 hour
- **Mock Infrastructure**: 2 hours
- **Test Implementation**: 3-4 hours
- **Debugging & Refinement**: 1-2 hours
- **Total**: 7-9 hours

---

### Current Status
**Phase 6.2 Status**: Structured but not executable

**What's Done**:
- ✅ Test scenarios identified
- ✅ Test structure documented
- ✅ Helper functions outlined
- ✅ Requirements documented

**What's Needed**:
- ⏳ Jest installation
- ⏳ Anthropic SDK mocking
- ⏳ Analytics mocking
- ⏳ Test implementation
- ⏳ Test execution and verification

---

## ⏭️ Phase 6.3: Load Testing (PENDING)

### Goal
Verify system performance under load

### Test Scenarios

#### 1. Concurrent Request Handling
**Test**: 10 concurrent modification requests

**Metrics**:
- Average response time
- Peak memory usage
- Request failure rate
- Retry distribution

**Expected**:
- All requests complete successfully
- Response time < 10 seconds average
- No memory leaks
- Retries handled gracefully

---

#### 2. Sustained Load Test
**Test**: 100 requests over 10 minutes

**Metrics**:
- Throughput (requests/min)
- Error rate
- Memory usage trend
- Response time trend

**Expected**:
- Consistent performance
- No degradation over time
- Error rate < 5%
- Memory stays stable

---

#### 3. Retry Stress Test
**Test**: Requests designed to trigger retries

**Metrics**:
- Retry success rate
- Average retries per request
- Total time with retries
- Analytics tracking accuracy

**Expected**:
- >80% retry success rate
- Average 1.5 retries max
- Total time < 20 seconds
- All retries logged correctly

---

### Tools
- **Artillery** or **k6** for load testing
- **Clinic.js** for performance profiling
- **Memory profiler** for leak detection

### Estimated Effort: 4-5 hours

---

## ⏭️ Phase 6.4: User Acceptance Testing (PENDING)

### Goal
Manual validation of user-facing features

### Test Categories

#### 1. Common Modifications
**Scenarios**:
- Add a button
- Change colors
- Add state
- Add new component
- Modify existing component

**Validation**:
- Modifications apply correctly
- No errors in console
- Code is clean and readable
- Changes match request

---

#### 2. Error Recovery Experience
**Scenarios**:
- Trigger parsing error → verify retry message
- Trigger validation error → verify fix attempt
- Trigger timeout → verify simplification prompt
- Exhaust retries → verify error message

**Validation**:
- User sees helpful messages
- Errors are recoverable
- System provides guidance
- No confusing technical jargon

---

#### 3. Analytics Dashboard
**Scenarios**:
- Generate successful requests
- Generate failed requests
- Generate retries
- View analytics endpoint

**Validation**:
- Metrics are accurate
- Dashboard shows correct data
- Error breakdown is clear
- Performance data makes sense

---

#### 4. New AST Operations
**Scenarios**:
- Test RENAME_VARIABLE
- Test EXTRACT_COMPONENT
- Test WRAP_JSX

**Validation**:
- Operations work correctly
- Code transformations are accurate
- No unintended side effects

---

#### 5. End-to-End User Flows
**Scenarios**:
- Create new app
- Make multiple modifications
- Handle errors
- Export final app

**Validation**:
- Full workflow works smoothly
- State persists correctly
- No blocking errors
- Final export is valid

---

### Estimated Effort: 6-8 hours

---

## Summary

### Overall Phase 6 Progress
- ✅ Phase 6.1: Complete (52 tests, 100%)
- 🔄 Phase 6.2: Structured, needs implementation (7-9 hours)
- ⏭️ Phase 6.3: Planned (4-5 hours)
- ⏭️ Phase 6.4: Planned (6-8 hours)

### Total Remaining Effort: 17-22 hours

### Critical Path
1. Complete Phase 6.2 integration tests
2. Run Phase 6.3 load tests
3. Perform Phase 6.4 UAT
4. Document findings
5. Fix any issues discovered
6. Re-run tests to verify fixes

---

## Recommendations

### For Phase 6.2 (Integration Testing)
**Priority**: High
**Effort**: 7-9 hours
**Dependencies**: Jest setup, Anthropic SDK mock

**Decision Point**: 
- **Option A**: Complete full integration test suite (recommended for production)
- **Option B**: Focus on manual testing scenarios (faster, less comprehensive)
- **Option C**: Hybrid approach - automate critical paths, manual test edge cases

### For Phase 6.3 (Load Testing)
**Priority**: Medium
**Effort**: 4-5 hours
**Dependencies**: Deployed test environment

**Decision Point**:
- Defer until after Phase 7 documentation
- Focus on most critical scenarios only
- Optional for MVP

### For Phase 6.4 (UAT)
**Priority**: High
**Effort**: 6-8 hours
**Dependencies**: None

**Decision Point**:
- Can proceed now without 6.2/6.3
- Provides immediate value
- Catches user-facing issues

---

**Last Updated**: Phase 6.1 Complete, 6.2 Structured (11/10/2025)
