import { AppConcept } from "@/types/appConcept";
import { LayoutManifest } from "@/types/schema";

/**
 * ArchitectService - Client-side service for generating layout manifests
 *
 * This service calls the server-side API route to handle Gemini AI operations,
 * including file uploads which require Node.js server-side processing.
 *
 * Supports multi-image upload with indexed references (Image 1, Image 2, etc.)
 * for selective merging: "buttons from Image 1, colors from Image 2"
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
   *
   * @param concept - Optional app concept for context
   * @param userPrompt - User's text prompt
   * @param mediaFiles - Array of image/video files (up to 4 images + 1 video)
   */
  async generateLayoutManifest(
    concept: AppConcept | null | undefined,
    userPrompt: string,
    mediaFiles?: File[]
  ): Promise<LayoutManifest> {

    // Prepare request body
    const requestBody: {
      concept?: AppConcept;
      userPrompt: string;
      images?: Array<{ base64: string; mimeType: string; name: string }>;
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

    // Convert media files to base64
    if (mediaFiles && mediaFiles.length > 0) {
      const images: Array<{ base64: string; mimeType: string; name: string }> = [];

      for (const file of mediaFiles) {
        console.log(`Preparing ${file.type.startsWith('image/') ? 'image' : 'video'} for upload: ${file.name}`);
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        if (file.type.startsWith('image/')) {
          // Images go into the images array
          images.push({
            base64,
            mimeType: file.type,
            name: file.name,
          });
        } else if (file.type.startsWith('video/')) {
          // Only one video supported - use existing video fields
          requestBody.videoBase64 = base64;
          requestBody.videoMimeType = file.type;
          requestBody.videoFileName = file.name;
        }
      }

      if (images.length > 0) {
        requestBody.images = images;
        console.log(`Sending ${images.length} image(s) for analysis`);
      }
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
