# Manual Testing Guide - Phase 6.2+

## Overview
This guide provides step-by-step instructions for manually testing all optimization work from Phases 1-5. Use this for Phase 6.2 (Integration), 6.3 (Load), and 6.4 (UAT) testing.

---

## Prerequisites

1. **Environment Setup**
   - Application running locally (`npm run dev`)
   - Browser DevTools open (Console + Network tabs)
   - API key configured in `.env.local`

2. **Testing Tools**
   - Browser with DevTools
   - Notepad for recording results
   - Timer for performance measurements

---

## Phase 6.2: Integration Testing (Manual)

### Test 1: Successful Modification Flow

**Objective**: Verify complete happy path

**Steps**:
1. Start the application
2. Create a simple app (e.g., "make a counter app")
3. Wait for app to generate
4. Make a modification: "add a reset button"
5. Verify modification applies successfully

**Expected Results**:
- ✅ Modification completes without errors
- ✅ Code looks clean
- ✅ Reset button appears in preview
- ✅ Console shows no errors

**Record**:
```
Test 1: Successful Modification Flow
Date/Time: _______________
Result: PASS / FAIL
Notes: _________________
```

---

### Test 2: Retry on Parsing Error

**Objective**: Verify retry logic handles JSON errors

**Steps**:
1. Monitor network tab
2. Make a complex modification request
3. Watch for retry attempts in console
4. Note if retry succeeds

**Expected Results**:
- ✅ If parsing error occurs, retry is triggered
- ✅ Console shows "🔄 Retry attempt X/Y"
- ✅ Correction prompt is added
- ✅ Final attempt succeeds

**Record**:
```
Test 2: Retry on Parsing Error
Date/Time: _______________
Retry Triggered: YES / NO
Retry Succeeded: YES / NO
Notes: _________________
```

---

### Test 3: Retry on Validation Error

**Objective**: Verify validation system catches errors

**Steps**:
1. Make modification that might cause validation issues
2. Watch console for validation messages
3. Check if retry is triggered
4. Verify final code is valid

**Expected Results**:
- ✅ Validation runs on generated code
- ✅ Errors logged with "⚠️ Found X error(s)"
- ✅ Auto-fix attempts show "✅ Auto-fixed"
- ✅ Final code passes validation

**Record**:
```
Test 3: Retry on Validation Error
Date/Time: _______________
Validation Errors Found: YES / NO
Auto-Fix Successful: YES / NO
Notes: _________________
```

---

### Test 4: Timeout Handling

**Objective**: Verify timeout detection (hard to trigger manually)

**Note**: Timeouts are rare but should be logged if they occur

**Steps**:
1. Make very complex modification request
2. Watch for timeout message
3. Check if retry occurs

**Expected Results**:
- ✅ Timeout detected at ~45 seconds
- ✅ Retry includes simplification prompt
- ✅ User-friendly error if all retries fail

**Record**:
```
Test 4: Timeout Handling
Date/Time: _______________
Timeout Occurred: YES / NO
Retry Triggered: YES / NO
Notes: _________________
```

---

### Test 5: Pattern Matching Errors

**Objective**: Verify pattern matching error recovery

**Steps**:
1. Create an app with specific code
2. Request modification to that code
3. Watch for pattern matching errors
4. Verify retry includes file contents

**Expected Results**:
- ✅ Pattern matching errors detected
- ✅ Enhanced prompt includes actual file contents
- ✅ Emphasizes exact matching
- ✅ Retry succeeds with correct pattern

**Record**:
```
Test 5: Pattern Matching Errors
Date/Time: _______________
Pattern Error Detected: YES / NO
Retry Succeeded: YES / NO
Notes: _________________
```

---

### Test 6: Request Validation

**Objective**: Verify error handling for invalid requests

**Test Cases**:

#### 6a. Missing API Key
1. Remove ANTHROPIC_API_KEY from `.env.local`
2. Try to generate an app
3. Verify error message

**Expected**: Error message about missing API key

#### 6b. Invalid Request Format
1. Use browser DevTools to send malformed request
2. Verify appropriate error returned

**Expected**: 400 error with clear message

**Record**:
```
Test 6: Request Validation
Date/Time: _______________
6a Result: PASS / FAIL
6b Result: PASS / FAIL
Notes: _________________
```

---

### Test 7: Analytics Integration

**Objective**: Verify analytics tracking

**Steps**:
1. Make several requests (mix of success/failure)
2. Open `http://localhost:3000/api/analytics`
3. Review analytics data

**Expected Results**:
- ✅ Request counts accurate
- ✅ Success/failure tracked correctly
- ✅ Error breakdown shows categories
- ✅ Token usage recorded
- ✅ Retry attempts logged

**Record**:
```
Test 7: Analytics Integration
Date/Time: _______________
Total Requests: _______
Successful: _______
Failed: _______
Retry Attempts Logged: YES / NO
Notes: _________________
```

---

## Phase 6.3: Load Testing (Manual)

### Test 1: Multiple Concurrent Requests

**Objective**: Test handling of concurrent requests

**Steps**:
1. Open 3-5 browser tabs
2. Start modification in each tab simultaneously
3. Observe behavior

**Expected Results**:
- ✅ All requests complete
- ✅ No errors or crashes
- ✅ Reasonable response times
- ✅ No memory issues

**Record**:
```
Test: Multiple Concurrent Requests
Date/Time: _______________
Tabs Used: _______
All Completed: YES / NO
Average Time: _______ seconds
Issues: _________________
```

---

### Test 2: Sustained Usage

**Objective**: Test stability over extended use

**Steps**:
1. Use application continuously for 30 minutes
2. Make 15-20 modifications
3. Monitor for memory leaks or slowdowns

**Expected Results**:
- ✅ Performance stays consistent
- ✅ No memory growth
- ✅ No slowdowns over time
- ✅ No crashes or errors

**Record**:
```
Test: Sustained Usage
Date/Time: _______________
Duration: _______ minutes
Modifications Made: _______
Performance Degradation: YES / NO
Memory Issues: YES / NO
Notes: _________________
```

---

## Phase 6.4: User Acceptance Testing

### Test Category 1: Common Modifications

**Test each scenario and verify results**:

#### 1a. Add a Button
**Request**: "Add a button that says 'Click me'"

**Verify**:
- ✅ Button appears
- ✅ Code is clean
- ✅ No console errors

#### 1b. Change Colors
**Request**: "Change the background to blue"

**Verify**:
- ✅ Color changes correctly
- ✅ Code uses proper CSS
- ✅ No style conflicts

#### 1c. Add State
**Request**: "Add a counter that increments on button click"

**Verify**:
- ✅ useState imported
- ✅ State works correctly
- ✅ Counter increments

#### 1d. Add New Component
**Request**: "Add a Card component that displays a title and description"

**Verify**:
- ✅ Component created
- ✅ Props handled correctly
- ✅ Renders properly

#### 1e. Modify Existing Component
**Request**: "Add a prop to the existing component"

**Verify**:
- ✅ Prop added correctly
- ✅ Type safety maintained (if TypeScript)
- ✅ No breaking changes

**Record**:
```
Test Category 1: Common Modifications
Date/Time: _______________
1a Result: PASS / FAIL
1b Result: PASS / FAIL
1c Result: PASS / FAIL
1d Result: PASS / FAIL
1e Result: PASS / FAIL
Notes: _________________
```

---

### Test Category 2: Error Recovery Experience

**Test each scenario and verify user experience**:

#### 2a. Parsing Error Recovery
**Trigger**: Complex modification that might cause JSON error

**Verify**:
- ✅ User sees clear message
- ✅ System attempts retry automatically
- ✅ Final result is successful OR
- ✅ Clear error message if all retries fail

#### 2b. Validation Error Recovery
**Trigger**: Request that might cause code validation issues

**Verify**:
- ✅ Validation catches errors
- ✅ Auto-fix attempts
- ✅ User not exposed to technical details

#### 2c. Error Message Quality
**Check all error messages for**:
- ✅ Clear, non-technical language
- ✅ Actionable suggestions
- ✅ No confusing jargon
- ✅ Helpful guidance

**Record**:
```
Test Category 2: Error Recovery
Date/Time: _______________
2a Result: PASS / FAIL
2b Result: PASS / FAIL
2c Result: PASS / FAIL
Notes: _________________
```

---

### Test Category 3: New AST Operations

**Test each new operation**:

#### 3a. RENAME_VARIABLE
**Request**: "Rename the count variable to counter"

**Verify**:
- ✅ All occurrences renamed
- ✅ No broken references
- ✅ Code still works

#### 3b. EXTRACT_COMPONENT
**Request**: "Extract the button into its own component"

**Verify**:
- ✅ New component created
- ✅ Props passed correctly
- ✅ Original code updated

#### 3c. WRAP_JSX
**Request**: "Wrap the content in a Card component"

**Verify**:
- ✅ Content wrapped correctly
- ✅ Proper JSX structure
- ✅ No rendering issues

**Record**:
```
Test Category 3: New AST Operations
Date/Time: _______________
3a Result: PASS / FAIL
3b Result: PASS / FAIL
3c Result: PASS / FAIL
Notes: _________________
```

---

### Test Category 4: End-to-End User Flows

**Complete full user journey**:

#### Flow 1: Create → Modify → Export
**Steps**:
1. Create new app ("make a todo app")
2. Make 3 modifications
3. Export final app
4. Verify export works

**Verify**:
- ✅ Full flow works smoothly
- ✅ State persists between modifications
- ✅ No blocking errors
- ✅ Export is valid and complete

#### Flow 2: Error Recovery → Success
**Steps**:
1. Trigger an error (complex request)
2. System retries
3. Success or clear error message
4. Continue with next modification

**Verify**:
- ✅ Error doesn't block further use
- ✅ System recovers gracefully
- ✅ User can continue working

**Record**:
```
Test Category 4: End-to-End Flows
Date/Time: _______________
Flow 1 Result: PASS / FAIL
Flow 2 Result: PASS / FAIL
Notes: _________________
```

---

## Test Summary Template

```
=================================================
MANUAL TESTING SESSION SUMMARY
=================================================
Date: _______________
Tester: _______________
Environment: _______________

Phase 6.2 - Integration Testing:
- Test 1 (Successful Flow):        PASS / FAIL
- Test 2 (Parsing Retry):          PASS / FAIL
- Test 3 (Validation Retry):       PASS / FAIL
- Test 4 (Timeout):                PASS / FAIL / N/A
- Test 5 (Pattern Matching):       PASS / FAIL
- Test 6 (Request Validation):     PASS / FAIL
- Test 7 (Analytics):              PASS / FAIL

Phase 6.3 - Load Testing:
- Test 1 (Concurrent):             PASS / FAIL
- Test 2 (Sustained):              PASS / FAIL

Phase 6.4 - UAT:
- Category 1 (Modifications):      PASS / FAIL
- Category 2 (Error Recovery):     PASS / FAIL
- Category 3 (AST Operations):     PASS / FAIL
- Category 4 (E2E Flows):          PASS / FAIL

Overall Assessment: _______________

Critical Issues Found:
1. _________________________________
2. _________________________________
3. _________________________________

Minor Issues Found:
1. _________________________________
2. _________________________________
3. _________________________________

Recommendations:
1. _________________________________
2. _________________________________
3. _________________________________

Next Steps:
1. _________________________________
2. _________________________________
3. _________________________________
=================================================
```

---

## Tips for Effective Testing

### 1. Console Monitoring
- Keep DevTools console open
- Look for specific log messages:
  - `✅ Phase 3: Using compressed modular prompts`
  - `🔍 Validating code snippets...`
  - `🔄 Retry attempt X/Y`
  - `✅ Retry attempt X succeeded!`

### 2. Network Tab
- Monitor API calls
- Check request/response sizes
- Verify token counts
- Look for retry patterns

### 3. Analytics Endpoint
- Visit `/api/analytics` regularly
- Verify metrics are accurate
- Check error categorization
- Monitor success rates

### 4. Performance Notes
- Record response times
- Note any slowdowns
- Monitor memory usage (DevTools Performance tab)
- Check for memory leaks (Extended sessions)

### 5. Documentation
- Record all findings
- Screenshot errors
- Note reproduction steps
- Track patterns in failures

---

## Quick Reference: What to Look For

### ✅ Good Signs
- Fast response times (<10 seconds)
- Clean console logs
- Accurate analytics
- Smooth user experience
- Clear error messages
- Successful retries

### ⚠️ Warning Signs
- Slow responses (>15 seconds)
- Console errors or warnings
- Incorrect analytics
- Confusing error messages
- Failed retries
- Memory growth

### ❌ Critical Issues
- Application crashes
- Data loss
- Broken functionality
- Security vulnerabilities
- Complete system failures
- Unrecoverable errors

---

**Last Updated**: Phase 6.2 Manual Testing Guide (11/10/2025)
