---
description: Masterchain debugging workflow with strict protocols
---

# Masterchain Debugging Workflow

## Global Rules

=== DEBUGGING (DO NOT VIOLATE) ===

1. DIAGNOSE FIRST, ACT SECOND: Do not write or suggest any code changes until you have provided a plain-language diagnosis of the problem and received approval to proceed.

2. SURGICAL CHANGES ONLY: Change the absolute minimum amount of code required to fix the issue or implement the modification. If a fix requires changing 3 lines, change exactly 3 lines. Do not rewrite surrounding code "for consistency" or "while we're here."

3. DO NOT TOUCH UNRELATED CODE: Do not modify, move, rename, reformat, reorganize, or "clean up" any code that is not directly part of the fix or modification. If you believe unrelated code has issues, report them separately — do not fix them.

4. PRESERVE ALL EXISTING CODE: Do not remove any code unless you can explain exactly why it is causing the problem. Code that appears unused may be hooked into other files, called dynamically, referenced by external systems, or needed for future features. If you suspect code is unused, ASK — do not delete.

5. TRACE BEFORE REMOVING: Before removing or replacing ANY code, trace its connections. Check: Is it imported elsewhere? Is it called by other functions? Is it referenced in configuration files? Is it used in routing? Does it appear in any other file? Report what you found.

6. SHOW THE DIFF: For every change, show exactly what lines are being modified. Present changes as "BEFORE" and "AFTER" blocks so the user can see precisely what is changing. Do not present entire rewritten files — show only the changed sections with enough surrounding context to locate them.

7. ONE FIX AT A TIME: If there are multiple issues, address them one at a time. Complete one fix, let the user verify it works, then move to the next. Do not bundle fixes.

8. EXPLAIN EVERY CHANGE: For every line you change, explain in plain language what it did before, what it does now, and why the change fixes the problem. No jargon.

9. NO BROAD RECODING: Do not change the coding style, patterns, conventions, or structure of existing code. Match the existing style exactly, even if you would write it differently. The goal is to fix the problem, not improve the codebase.

10. NO PACKAGE CHANGES: Do not install, update, or remove packages unless the problem is specifically caused by a package issue. If you believe a package change is needed, state which one and why and wait for approval.

11. VERIFY PRESERVATION: After presenting your changes, list every function, component, and export in the modified file(s) and confirm that each one still exists and behaves the same as before (except for the intentional fix). This is your checklist that you didn't accidentally break or remove something.

12. ASK ABOUT UNKNOWNS: If you see code you don't understand the purpose of, ask the user about it. Do not assume it is dead code, leftover code, or a mistake.

13. NO HARDCODED FALLBACKS: Do not add hardcoded fallback values that silently replace real data when a connection fails. Examples of what NOT to do: `user?.name || "User"`, `data?.items ?? []`, `config.apiUrl || "http://localhost:3000"`. If real data is unavailable, the code should fail visibly — not silently fall back to fake data that hides the problem. If a fallback already exists in the code and is causing a problem, report it but do not remove it without approval.

## Phase 1: Diagnosis Only

=== DIAGNOSIS PROMPT ===

ROLE: You are diagnosing a problem. Do NOT suggest or write any fixes yet. Only analyze.

INSTRUCTIONS:
1. Read the project files to understand the app and trace the problem. Start with the files most likely related to the problem and follow the connections.
2. Trace the flow from where the problem occurs back through every function and import involved.
3. Identify the specific file(s) and line(s) you believe are causing the problem.
4. Explain your diagnosis in plain language.
5. Do NOT suggest any code changes yet.
6. STOP. Wait for the user to approve the diagnosis before proceeding.

## Phase 2: Approved Fix

=== FIX PROMPT ===

ROLE: You are fixing the problem based on the diagnosis you just provided and the user approved.

INSTRUCTIONS:
1. Fix ONLY the problem from the approved diagnosis.
2. Re-read the files you need to modify directly from the project before making changes.
3. Show every change as a BEFORE/AFTER block with the file name and line location.
4. Change the minimum amount of code necessary.
5. Do not modify any other code, even if you notice other issues.
6. After making the fix, run the code to verify it works.
7. Provide the VERIFY PRESERVATION checklist (Contract Rule 11).
8. STOP. Wait for the user to confirm the fix works.
