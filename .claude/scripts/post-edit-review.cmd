@echo off
REM Post-edit TypeScript review hook
REM Runs tsc --noEmit after file edits to catch type errors

echo [Review Hook] Running TypeScript check...
call npx tsc --noEmit 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Review Hook] TypeScript errors found!
    exit /b 2
) else (
    echo [Review Hook] No TypeScript errors.
    exit /b 0
)
