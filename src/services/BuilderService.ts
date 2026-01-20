import { LayoutManifest, UISpecNode } from "@/types/schema";

/**
 * BuilderService - Client-side service for vibe coding operations.
 * All Gemini AI calls are delegated to /api/builder/vibe server route.
 */
export class BuilderService {
  // Constructor kept for backward compatibility - apiKey no longer needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_apiKey?: string) {
    // API key is now handled server-side
  }

  /**
   * THE TWO-PART PROMPTING ARCHITECTURE
   * Prevents generic templates by locking in the "Physical Vibe" first.
   * Returns both the styled manifest and the metaphor for use in refineElement.
   */
  async applyVibe(manifest: LayoutManifest, userPrompt: string): Promise<{ manifest: LayoutManifest; metaphor: string }> {
    const response = await fetch('/api/builder/vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'applyVibe',
        manifest,
        prompt: userPrompt
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to apply vibe');
    }

    return response.json();
  }

  /**
   * SCULPTING WORKFLOW (Highlight-to-Refine)
   * Updates a single node's styles without regenerating the whole tree.
   * Latency target: <200ms
   */
  async refineElement(
    node: UISpecNode,
    instruction: string,
    currentMetaphor: string
  ): Promise<UISpecNode> {
    const response = await fetch('/api/builder/vibe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refineElement',
        node,
        prompt: instruction,
        metaphor: currentMetaphor
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to refine element');
    }

    const data = await response.json();
    return data.node;
  }
}
