# 🧪 Phase 2 Testing Guide

## Quick Test (5 Minutes)

### Step 1: Start Dev Server

```bash
npm run dev
```

### Step 2: Run Tests

**Option A: Using curl (Command Line)**

```bash
curl -X POST http://localhost:3000/api/test-modifier
```

**Option B: Using Browser**

1. Open: http://localhost:3000/api/test-modifier
2. Click POST request (or use Postman/Insomnia)

**Option C: Using PowerShell**

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/test-modifier" -Method POST
```

### Step 3: Check Results

The API will return JSON with:

```json
{
  "timestamp": "2025-11-02T...",
  "tests": [
    {
      "name": "Add Import to Clean File",
      "passed": true,
      "code": "...modified code..."
    },
    ...
  ],
  "summary": {
    "passed": 6,
    "failed": 0,
    "total": 6
  }
}
```

---

## What's Being Tested

### Test 1: Add Import ✅

- Adds `import { useState } from 'react';` to clean file
- Validates proper positioning

### Test 2: Merge Imports ✅

- Merges new import with existing
- Ensures no duplicates

### Test 3: Wrap in AuthGuard ✅

- **THE BIG ONE** - Tests authentication wrapper
- Adds import
- Wraps JSX properly
- Correct indentation

### Test 4: Add State Variable ✅

- Adds useState hook
- Auto-imports useState
- Proper formatting

### Test 5: Multiple Modifications ✅

- Tests complete workflow:
  - Multiple imports
  - Multiple state variables
  - AuthGuard wrapper
- Validates no "undefined" in output

### Test 6: Error Handling ✅

- Tests validation catches invalid imports
- Ensures proper error messages

---

## Expected Results

### ✅ All Tests Should Pass

```
📊 TEST SUMMARY:
Total: 6
✅ Passed: 6
❌ Failed: 0
```

### Sample Output (Test 3 - AuthGuard)

**Input:**

```typescript
export default function App() {
  return (
    <div className="container">
      <h1>My App</h1>
    </div>
  );
}
```

**Output:**

```typescript
import AuthGuard from '@/components/AuthGuard';

export default function App() {
  return (
    <AuthGuard>
      <div className="container">
        <h1>My App</h1>
      </div>
    </AuthGuard>
  );
}
```

---

## Troubleshooting

### If Tests Fail

**Check Console Logs:**

```bash
# In your dev server terminal, you'll see:
🧪 TEST 1: Add Import to Clean File
🧪 TEST 2: Merge Imports
🧪 TEST 3: Wrap Element in AuthGuard
...
📊 TEST SUMMARY:
Total: 6
✅ Passed: X
❌ Failed: Y
```

**Common Issues:**

1. **Import errors**: Check that tree-sitter packages are installed

   ```bash
   npm install tree-sitter tree-sitter-typescript
   ```

2. **Parse errors**: Check the error messages in the JSON response

3. **Server not running**: Make sure `npm run dev` is active

---

## Advanced Testing

### Test with Real Generated Code

Modify `tests/modifier-basic.test.mjs` to use actual code from your AI generator:

1. Copy a generated component
2. Run modifier on it
3. Verify output

### Integration with Your App

Use the modifier in `src/app/api/ai-builder/modify/route.ts`:

```typescript
import { ASTModifier } from '@/utils/astModifier';

// After generating code with AI:
const modifier = new ASTModifier(generatedCode);
await modifier.initialize();

// Apply modifications based on user request
if (needsAuth) {
  const tree = modifier.getTree();
  const parser = modifier.getParser();
  const mainDiv = parser.findComponent(tree, 'div');

  if (mainDiv) {
    modifier.wrapElement(mainDiv, {
      component: 'AuthGuard',
      import: {
        source: '@/components/AuthGuard',
        defaultImport: 'AuthGuard',
      },
    });
  }
}

const result = await modifier.generate();
return result.code; // Send to user
```

---

## Success Criteria

✅ All 6 tests pass  
✅ No "undefined" in any output  
✅ Proper indentation maintained  
✅ Valid TypeScript syntax  
✅ AuthGuard wrapper works correctly  
✅ Imports properly deduplicated

---

## Next Steps After Tests Pass

1. ✅ Phase 2 Validated
2. ⏭️ Proceed to Phase 3 (AI Integration)
3. 🎯 Solve authentication issue end-to-end
4. 🚀 Production deployment

---

**Run the test now and let me know the results!**
