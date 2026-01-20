import { AppConcept } from "@/types/appConcept";
import { LayoutManifest } from "@/types/schema";

/**
 * ArchitectService - Client-side service for generating layout manifests
 *
 * This service calls the server-side API route to handle Gemini AI operations,
 * including file uploads which require Node.js server-side processing.
 */
export class ArchitectService {
  // API key is no longer needed client-side - the server route uses env vars
  constructor(_apiKey?: string) {
    // API key parameter kept for backward compatibility but not used
    // Server-side route uses GOOGLE_AI_API_KEY or GEMINI_API_KEY from env
  }

  /**
   * THE AUTOMATED INGEST PIPELINE
   * Replaces the manual "Ingest-Then-Edit" workflow.
   * Calls the server-side API route to handle Gemini operations.
   */
  async generateLayoutManifest(
    concept: AppConcept | null | undefined,
    userPrompt: string,
    videoFile?: File
  ): Promise<LayoutManifest> {

    // Prepare request body
    const requestBody: {
      concept?: AppConcept;
      userPrompt: string;
      videoBase64?: string;
      videoMimeType?: string;
      videoFileName?: string;
    } = {
      userPrompt,
    };

    // Only include concept if provided
    if (concept) {
      requestBody.concept = concept;
    }

    // Convert video file to base64 if provided
    if (videoFile) {
      console.log("Preparing video for upload...");
      const buffer = await videoFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      requestBody.videoBase64 = base64;
      requestBody.videoMimeType = videoFile.type;
      requestBody.videoFileName = videoFile.name;
    }

    // Call the server-side API route
    const response = await fetch('/api/architect/generate-manifest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.manifest;
  }
}
