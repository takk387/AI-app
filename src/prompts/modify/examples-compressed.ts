/**
 * Compressed modification examples
 * Reduced from ~1200 tokens to ~471 tokens (61% reduction)
 */

export const MODIFICATION_EXAMPLES = `
EXAMPLES:

1. Dark Mode Toggle:
{"changeType": "MODIFICATION", "summary": "Added dark mode toggle",
 "files": [{"path": "src/App.tsx", "action": "MODIFY", "changes": [
   {"type": "AST_ADD_STATE", "name": "darkMode", "setter": "setDarkMode", "initialValue": "false"},
   {"type": "AST_INSERT_JSX", "targetElement": "h1", "position": "after",
    "jsx": "<button onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️' : '🌙'}</button>"},
   {"type": "AST_MODIFY_CLASSNAME", "targetElement": "div", "staticClasses": ["min-h-screen"],
    "template": {"variable": "darkMode", "trueValue": "bg-gray-900 text-white", 
                 "falseValue": "bg-white text-black", "operator": "?"}}
 ]}]}

2. Button Color Change:
{"changeType": "MODIFICATION", "summary": "Changed button to blue",
 "files": [{"path": "src/App.tsx", "action": "MODIFY", "changes": [
   {"type": "REPLACE", "searchFor": "bg-gray-500", "replaceWith": "bg-blue-500"}
 ]}]}

3. localStorage Counter:
{"changeType": "MODIFICATION", "summary": "Added counter with localStorage",
 "files": [{"path": "src/App.tsx", "action": "MODIFY", "changes": [
   {"type": "AST_ADD_STATE", "name": "count", "setter": "setCount", "initialValue": "0"},
   {"type": "AST_ADD_USEEFFECT", "body": "const saved = localStorage.getItem('count'); if (saved) setCount(parseInt(saved));", "dependencies": []},
   {"type": "AST_ADD_USEEFFECT", "body": "localStorage.setItem('count', count.toString());", "dependencies": ["count"]},
   {"type": "AST_INSERT_JSX", "targetElement": "div", "position": "inside_end",
    "jsx": "<button onClick={() => setCount(count + 1)}>Count: {count}</button>"}
 ]}]}

KEY RULES:
- Only JSON output (no conversational text)
- Minimal changes (surgical edits only)
- Exact searchFor patterns (character-for-character)
- Preserve existing code unless explicitly requested to change
`.trim();
