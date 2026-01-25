# ESLint Warnings Assessment

## Summary

**Total Warnings: 226**

| Category                                   | Count | Action                                    |
| ------------------------------------------ | ----- | ----------------------------------------- |
| Console statements                         | ~96   | Migrate to logger service                 |
| Unused variables/imports                   | ~75   | Mixed: Remove dead code, keep future impl |
| `@typescript-eslint/no-explicit-any`       | 15    | Add proper types                          |
| `@typescript-eslint/no-non-null-assertion` | 15    | Mostly tests - acceptable                 |
| `@next/next/no-img-element`                | 8     | Convert to Next.js Image                  |
| `import/no-anonymous-default-export`       | 8     | Add named exports                         |
| Other (prefer-const, hooks)                | ~9    | Fix individually                          |

---

## Items to SKIP (Ambiguous - Future vs Dead)

The following items are ambiguous (future implementation vs dead code) - skip for now:

1. **PhaseExecutionManager's 26 design token map imports** - May be needed for future code generation
2. **v0Service and lottieService API placeholders** - May implement real API later
3. **MainBuilderView's smartContext and appBuilderSync** - Background hooks for future features

---

## Implementation Phases

### Phase 1: Quick Fixes (8 items)

| File                                       | Line | Issue              | Fix                                     |
| ------------------------------------------ | ---- | ------------------ | --------------------------------------- |
| `app/api/ai-builder/full-app/route.ts`     | 386  | `prefer-const`     | Change `let files` to `const files`     |
| `components/NaturalConversationWizard.tsx` | 198  | Missing hook dep   | Add `setMessages` to dependency array   |
| `components/AnalysisProgressIndicator.tsx` | 327  | Unused param       | Rename `index` → `_index`               |
| `components/AnimationTimeline.tsx`         | 298  | Unused param       | Rename `isPlaying` → `_isPlaying`       |
| `components/AppNavigation.tsx`             | 131  | Unused param       | Rename `index` → `_index`               |
| `components/PreviewContainer.tsx`          | 157  | Unused param       | Rename `isFullscreen` → `_isFullscreen` |
| `services/colormindService.ts`             | 124  | Unused catch param | Rename `e` → `_e`                       |
| `services/colormindService.ts`             | 134  | Unused catch param | Rename `e` → `_e`                       |

---

### Phase 2: Clear Dead Code Removal (25 items)

#### Unused Type Imports

| File                                            | Line | Variable                |
| ----------------------------------------------- | ---- | ----------------------- |
| `app/api/ai-builder/full-app/route.ts`          | 21   | `ArchitectureSpec`      |
| `components/ArchitectureTemplatePicker.tsx`     | 12   | `architectureTemplates` |
| `components/SettingsPage.tsx`                   | 12   | `UIDensity`             |
| `hooks/useDraftPersistence.ts`                  | 29   | `TPlan`                 |
| `hooks/useSendMessage.ts`                       | 22   | `LayoutMessage`         |
| `hooks/useVersionHandlers.ts`                   | 19   | `PendingChange`         |
| `hooks/useVersionHandlers.ts`                   | 20   | `PendingDiff`           |
| `services/DynamicPhaseGenerator.ts`             | 25   | `BackendPhaseSpec`      |
| `services/PhaseExecutionManager.ts`             | 22   | `ImportInfo`            |
| `services/__tests__/CodeContextService.test.ts` | 11   | `UpdateContextResult`   |

#### Unused Imports

| File                                                      | Line | Variable                    |
| --------------------------------------------------------- | ---- | --------------------------- |
| `components/AppNavigation.tsx`                            | 3    | `useState`                  |
| `components/AppNavigation.tsx`                            | 6    | `motion`, `AnimatePresence` |
| `components/AppNavigation.tsx`                            | 9    | `WandIcon`, `LayoutIcon`    |
| `components/__tests__/NaturalConversationWizard.test.tsx` | 9    | `React`                     |
| `conversation-wizard/__tests__/ChatInputArea.test.tsx`    | 7    | `React`                     |
| `hooks/useSendMessage.ts`                                 | 29   | `captureLayoutPreview`      |

#### Variables Assigned But Never Read

| File                                           | Line | Variable          | Notes                                    |
| ---------------------------------------------- | ---- | ----------------- | ---------------------------------------- |
| `components/AppNavigation.tsx`                 | 94   | `user`            | Destructured from useAuth but never used |
| `components/MainBuilderView.tsx`               | 179  | `setExportingApp` | Confirmed unused anywhere in codebase    |
| `services/CompilerService.ts`                  | 46   | `imports`         | Assigned but never read                  |
| `services/CompilerService.ts`                  | 99   | `imports`         | Assigned but never read                  |
| `services/ExportService.ts`                    | 207  | `encodedFiles`    | Assigned but never read                  |
| `services/deployment/DesktopDeployService.ts`  | 68   | `tauriConfig`     | Assigned but never read                  |
| `services/deployment/DomainPurchaseService.ts` | 243  | `data`            | Assigned but never read                  |
| `services/deployment/MobileDeployService.ts`   | 108  | `capacitorConfig` | Assigned but never read                  |
| `utils/colorExtraction.ts`                     | 300  | `darkArea`        | Assigned but never read                  |

---

### Phase 3: Non-null Assertion Fixes (8 production items)

Add proper null checks in production code (test file assertions are acceptable - skip):

| File                                         | Line | Context        |
| -------------------------------------------- | ---- | -------------- |
| `components/LayoutBuilderWizard.tsx`         | 347  | Add null check |
| `components/ReferenceMediaPanel.tsx`         | 538  | Add null check |
| `data/fontDatabase.ts`                       | 921  | Add null check |
| `data/fontDatabase.ts`                       | 927  | Add null check |
| `hooks/useDeployment.ts`                     | 215  | Add null check |
| `services/DynamicPhaseGenerator.ts`          | 2383 | Add null check |
| `services/accessibilityAuditService.ts`      | 416  | Add null check |
| `services/deployment/MobileDeployService.ts` | 232  | Add null check |
| `services/deployment/MobileDeployService.ts` | 239  | Add null check |

---

### Phase 4: Type Safety Fixes (15 items)

Add proper types to replace `any`:

| File                            | Lines                        | Context                    |
| ------------------------------- | ---------------------------- | -------------------------- |
| `app/api/builder/vibe/route.ts` | 176, 196, 280, 281, 307, 318 | Various API response types |
| `components/Engine.tsx`         | 8, 92, 110, 127, 142         | Dynamic engine props/state |
| `types/schema.ts`               | 27, 66                       | Schema type definitions    |

---

### Phase 5: Console Migration (96 items)

Migrate all console statements to `@/utils/logger` service with appropriate levels.

#### API Routes (use `logger.info()` for status, `logger.error()` for errors)

| File                                            | Lines              |
| ----------------------------------------------- | ------------------ |
| `app/api/architect/generate-manifest/route.ts`  | 213, 249, 313, 345 |
| `app/api/builder/vibe/route.ts`                 | 66, 83             |
| `app/api/domains/purchase/route.ts`             | 102                |
| `app/api/domains/search/route.ts`               | 88                 |
| `app/api/domains/transfer/route.ts`             | 59, 83             |
| `app/api/images/generate-background/route.ts`   | 69, 70, 75, 83     |
| `app/api/subscriptions/cancel/route.ts`         | 61                 |
| `app/api/wizard/generate-architecture/route.ts` | 76, 92             |
| `app/api/wizard/generate-phases/route.ts`       | 152, 158, 170, 223 |

#### Components (use `logger.debug()` for debug logs)

| File                                 | Lines          |
| ------------------------------------ | -------------- |
| `app/(protected)/app/build/page.tsx` | 26, 29         |
| `components/LayoutBuilderWizard.tsx` | 161            |
| `components/MainBuilderView.tsx`     | 280            |
| `components/PreviewPanel.tsx`        | 26, 32, 44, 55 |

#### Hooks (use `logger.info()` for status, `logger.debug()` for debug)

| File                               | Lines                   |
| ---------------------------------- | ----------------------- |
| `hooks/usePhaseGeneration.ts`      | 244                     |
| `hooks/useProjectDocumentation.ts` | 160, 216, 225, 259, 263 |
| `hooks/useSendMessage.ts`          | 470, 566                |

#### Services (use appropriate levels based on context)

| File                                              | Lines                                 | Level                           |
| ------------------------------------------------- | ------------------------------------- | ------------------------------- |
| `agents/DeploymentAgent.ts`                       | 356, 375, 421, 430                    | `logger.debug()` (placeholders) |
| `services/ArchitectService.ts`                    | 65, 90                                | `logger.info()`                 |
| `services/BackendArchitectureAgent.ts`            | 102, 122                              | `logger.info()`                 |
| `services/GeminiImageService.ts`                  | 69                                    | `logger.error()`                |
| `services/PhaseExecutionManager.ts`               | 851                                   | `logger.debug()`                |
| `services/api-gateway/APIGatewayService.ts`       | 34, 296                               | `logger.info()`                 |
| `services/api-gateway/AnthropicProxyService.ts`   | 283                                   | `logger.error()`                |
| `services/api-gateway/BillingService.ts`          | 54, 59, 74, 158, 214, 237             | Mixed levels                    |
| `services/api-gateway/EmailProxyService.ts`       | 215                                   | `logger.error()`                |
| `services/api-gateway/OpenAIProxyService.ts`      | 261                                   | `logger.error()`                |
| `services/api-gateway/SMSProxyService.ts`         | 231                                   | `logger.error()`                |
| `services/api-gateway/StorageProxyService.ts`     | 200, 251, 399                         | Mixed levels                    |
| `services/api-gateway/StripeConnectService.ts`    | 131, 197, 278, 316, 385               | Mixed levels                    |
| `services/api-gateway/UsageTrackingService.ts`    | 45, 241, 260                          | Mixed levels                    |
| `services/deployment/DatabaseMigrationService.ts` | 467                                   | `logger.info()`                 |
| `services/deployment/DeploymentRetryService.ts`   | 312, 364, 434, 469, 515               | `logger.info()`                 |
| `services/deployment/DesktopDeployService.ts`     | 142                                   | `logger.info()`                 |
| `services/deployment/DomainPurchaseService.ts`    | 211                                   | `logger.info()`                 |
| `services/deployment/MobileDeployService.ts`      | 177                                   | `logger.info()`                 |
| `services/deployment/SubscriptionService.ts`      | 49, 273, 324, 368, 407, 435, 444, 454 | Mixed levels                    |

#### Inngest Functions

| File                                     | Lines              |
| ---------------------------------------- | ------------------ |
| `inngest/functions/databaseMigration.ts` | 215, 220, 228, 246 |
| `inngest/functions/desktopBuild.ts`      | 283                |
| `inngest/functions/mobileBuild.ts`       | 216, 237           |

#### Utils (use `logger.debug()`)

| File                       | Lines |
| -------------------------- | ----- |
| `utils/colorExtraction.ts` | 511   |
| `utils/videoProcessor.ts`  | 21    |

---

### Phase 6: Next.js Best Practices (16 items)

#### Convert `<img>` to `<Image>` Component (8 items)

| File                                                      | Line          |
| --------------------------------------------------------- | ------------- |
| `components/ChatPanel.tsx`                                | 400           |
| `components/ReferenceMediaPanel.tsx`                      | 123, 128, 594 |
| `components/conversation-wizard/MessageBubble.tsx`        | 50            |
| `components/conversation-wizard/PendingImagesPreview.tsx` | 20            |
| `components/documentation/tabs/DesignTab.tsx`             | 92            |
| `components/storage/FileCard.tsx`                         | 121           |

#### Fix Anonymous Default Exports (8 items)

| File                                    | Line |
| --------------------------------------- | ---- |
| `services/accessibilityAuditService.ts` | 453  |
| `services/colormindService.ts`          | 290  |
| `services/fontIdentificationService.ts` | 326  |
| `services/iconifyService.ts`            | 356  |
| `services/lottieService.ts`             | 329  |
| `services/v0Service.ts`                 | 473  |
| `utils/keyframeUtils.ts`                | 609  |
| `utils/layerUtils.ts`                   | 393  |

---

## Verification

After all fixes:

```bash
npm run lint        # Should show reduced warnings
npm run typecheck   # Should pass
npm test            # Should pass
npm run build       # Should succeed
```

---

## Appendix: Items Kept for Future Implementation

These items were flagged as unused but are intentionally kept:

| File                                    | Line     | Variable                       | Reason                                    |
| --------------------------------------- | -------- | ------------------------------ | ----------------------------------------- |
| `components/MainBuilderView.tsx`        | 132      | `setIsGenerating`              | Used by useSendMessage hook               |
| `components/MainBuilderView.tsx`        | 196      | `setShowDocumentationPanel`    | Used by child components                  |
| `components/MainBuilderView.tsx`        | 250      | `smartContext`                 | Initialized for future memory integration |
| `components/MainBuilderView.tsx`        | 276      | `appBuilderSync`               | Auto-sync active with layout manifest     |
| `components/SettingsPage.tsx`           | 47       | `updateAppearanceSettings`     | Used by child component                   |
| `hooks/useDynamicBuildPhases.ts`        | 114      | `onBuildFailed`                | Planned callback                          |
| `hooks/useUnifiedDeployment.ts`         | 136      | `updateStepStatus`             | Internal function - may implement         |
| `hooks/useUnifiedDeployment.ts`         | 163      | `calculateProgress`            | Internal function - may implement         |
| `hooks/useSendMessage.ts`               | 213      | `setAppConcept`                | Store destructuring pattern               |
| `services/ExportService.ts`             | 235      | `options`                      | API signature for future expansion        |
| `services/designSystemGenerator.ts`     | 616      | `tokens`                       | Callback signature                        |
| `services/fontIdentificationService.ts` | 156, 221 | `returnAlternatives`, `weight` | Planned features                          |
| `services/iconifyService.ts`            | 185      | `viewBox`                      | Planned feature                           |
