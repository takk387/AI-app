# Fix: Multi-Image Upload with Selective Merging for Layout Builder

## Problem Summary

The Layout Builder has **two critical issues**:

1. **Images are NOT sent to Gemini at all** - Only video processing pipeline exists
2. **Only single file upload is supported** - User wants multi-image with selective merging

### User's Exact Requirement
> "I should be able to upload more than one image and tell the AI what I want from them. Whether merge certain aspects, I want the buttons from image one but the colors and the rest of the layout from image two."

---

## Root Cause Analysis

### Issue 1: Images Are Never Transmitted to Gemini

**ArchitectService.ts** only has `videoFile` parameter and `videoBase64` fields.
**API Route** only processes videos via `GoogleAIFileManager`.
Images are accepted by UI, stored in state, but **silently discarded**.

### Issue 2: Single File Only

**ChatInput.tsx** uses single `<input type="file">` with `selectedFile: File | null`.
**LayoutBuilderWizard.tsx** manages `uploadedFile: File | null` (singular).
No support for multiple files or indexing them for AI reference.

---

## The Fix

### Overview

| Component | Current | After Fix |
|-----------|---------|-----------|
| ChatInput | Single file upload | Multi-file upload (up to 4 images) |
| LayoutBuilderWizard | `uploadedFile: File \| null` | `uploadedFiles: File[]` |
| ArchitectService | `videoFile?: File` | `mediaFiles?: File[]` |
| API Route | Video-only processing | Images inline, videos via FileManager |
| System Prompt | No multi-image instructions | Indexed image references (Image 1, Image 2...) |

---

## Files to Modify

### 1. `src/components/ChatInput.tsx`

**Changes:**
- Add multi-file selection support
- Display uploaded files as indexed chips: "Image 1", "Image 2", etc.
- Allow removal of individual files
- Keep single file for videos (videos are large)

```typescript
interface ChatInputProps {
  // ...existing props
  onFileSelect?: (files: File[]) => void;  // Changed: array of files
  selectedFiles?: File[];                   // Changed: array of files
}

// File input changes:
<input
  ref={fileInputRef}
  type="file"
  accept="image/*,video/*"
  multiple  // NEW: allow multiple selection
  onChange={handleFileChange}
  className="hidden"
/>

// Display as indexed chips:
{selectedFiles?.map((file, index) => (
  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-gold-500/20 rounded">
    <span className="text-xs text-gold-300">
      {file.type.startsWith('image/') ? `Image ${index + 1}` : `Video`}
    </span>
    <button onClick={() => removeFile(index)}>×</button>
  </div>
))}
```

### 2. `src/components/LayoutBuilderWizard.tsx`

**Changes:**
- Change `uploadedFile` to `uploadedFiles: File[]`
- Update handlers to work with arrays
- Pass array to ArchitectService

```typescript
// State change
const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

// Handler change
const handleFileSelect = useCallback((files: File[]) => {
  // Limit to 4 images + 1 video
  const images = files.filter(f => f.type.startsWith('image/')).slice(0, 4);
  const video = files.find(f => f.type.startsWith('video/'));
  setUploadedFiles(video ? [...images, video] : images);
}, []);

// Initial generation change
const handleInitialGeneration = async (prompt: string, mediaFiles?: File[]) => {
  const newManifest = await architect.generateLayoutManifest(appConcept, prompt, mediaFiles);
  // ...
};
```

### 3. `src/services/ArchitectService.ts`

**Changes:**
- Rename `videoFile` → `mediaFiles: File[]`
- Encode each image as separate base64 entry
- Keep video separate (still uses FileManager)

```typescript
async generateLayoutManifest(
  concept: AppConcept | null | undefined,
  userPrompt: string,
  mediaFiles?: File[]  // Changed: array of files
): Promise<LayoutManifest> {

  const requestBody: {
    concept?: AppConcept;
    userPrompt: string;
    images?: Array<{ base64: string; mimeType: string; name: string }>;
    videoBase64?: string;
    videoMimeType?: string;
    videoFileName?: string;
  } = { userPrompt };

  if (concept) {
    requestBody.concept = concept;
  }

  if (mediaFiles && mediaFiles.length > 0) {
    const images: Array<{ base64: string; mimeType: string; name: string }> = [];

    for (const file of mediaFiles) {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      if (file.type.startsWith('image/')) {
        images.push({
          base64,
          mimeType: file.type,
          name: file.name,
        });
      } else if (file.type.startsWith('video/')) {
        // Only one video supported
        requestBody.videoBase64 = base64;
        requestBody.videoMimeType = file.type;
        requestBody.videoFileName = file.name;
      }
    }

    if (images.length > 0) {
      requestBody.images = images;
    }
  }

  // ... rest of method
}
```

### 4. `src/app/api/architect/generate-manifest/route.ts`

**Changes:**
- Add `images` field to request interface
- Process images as inline base64 (Gemini supports this)
- Add indexed image analysis instructions
- Update system prompt for multi-image merging

```typescript
interface GenerateManifestRequest {
  concept?: AppConcept;
  userPrompt: string;
  images?: Array<{ base64: string; mimeType: string; name: string }>;
  videoBase64?: string;
  videoMimeType?: string;
  videoFileName?: string;
}

// In POST handler:
const { concept, userPrompt, images, videoBase64, videoMimeType, videoFileName } = body;

// Process images first (before system prompt is added)
if (images && images.length > 0) {
  // Add each image with its index for reference
  images.forEach((img, index) => {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
    parts.push({
      text: `[IMAGE ${index + 1}] - Reference this as "Image ${index + 1}" in your analysis.`,
    });
  });

  // Add multi-image analysis instructions
  parts.push({
    text: `
MULTI-IMAGE ANALYSIS INSTRUCTIONS:
You have been provided ${images.length} reference image(s), labeled "Image 1", "Image 2", etc.

USER REQUEST: "${userPrompt}"

EXTRACTION RULES:
1. If user says "replicate Image 1" → Extract ALL elements, colors, and structure from Image 1
2. If user says "buttons from Image 1, colors from Image 2" →
   - Extract button styles/shapes from Image 1
   - Extract color palette from Image 2
   - Merge them in the output manifest
3. If user says "layout from Image 1, header from Image 2" →
   - Use Image 1's overall structure
   - Replace/use Image 2's header component
4. For each image, extract:
   - Exact hex color values (#RRGGBB format)
   - Component structure (buttons, cards, headers, etc.)
   - Spacing and proportions
   - Typography (font styles, sizes)

OUTPUT: A single merged LayoutManifest following the user's specific instructions.
`,
  });
}

// Update system prompt to mention multi-image capability
const systemPrompt = `
ROLE: Expert Frontend Architect specializing in UI replication and composition.
${contextLine}

${images && images.length > 0 ? `
REFERENCE IMAGES: ${images.length} image(s) provided, indexed as Image 1, Image 2, etc.
The user may request selective elements from different images. Follow their instructions precisely.
` : ''}

TASK: Generate a complete LayoutManifest based on the user's specific instructions.
// ...rest of existing prompt
`;
```

---

## How It Will Work After Fix

### Scenario 1: Single Image Replication
1. User uploads 1 image → displayed as "Image 1"
2. User types "replicate this exactly"
3. API receives image as inline base64
4. Gemini extracts ALL colors, components, structure
5. Manifest returned with accurate colors and layout

### Scenario 2: Multi-Image Selective Merge
1. User uploads 2 images → displayed as "Image 1", "Image 2"
2. User types "I want the buttons and cards from Image 1, but the color scheme from Image 2"
3. API receives both images, indexed
4. Gemini:
   - Extracts button/card styles from Image 1
   - Extracts color palette from Image 2
   - Merges them in the manifest
5. Manifest returned with merged design

### Scenario 3: Video + Image Combination
1. User uploads 1 image + 1 video
2. User types "use the layout from the image, but detect loading states from the video"
3. API:
   - Sends image inline
   - Uploads video via FileManager
4. Gemini combines structural analysis (image) with temporal inference (video)

---

## UI Display Changes

**Before:**
```
[Upload Reference] - shows single file name
```

**After:**
```
[Add Reference +]
| Image 1: screenshot.png [×] |
| Image 2: design-ref.jpg [×] |
```

Chips are removable individually. Maximum 4 images + 1 video.

---

## Verification Plan

1. **Single image upload**
   - Upload colorful screenshot (e.g., Stripe)
   - Type "replicate this exactly"
   - Verify: manifest has extracted colors, not hardcoded grays

2. **Multi-image selective merge**
   - Upload Image 1 (dark theme site) + Image 2 (colorful buttons site)
   - Type "use the buttons from Image 2, colors from Image 1"
   - Verify: manifest has dark colors but button styles from Image 2

3. **Default prompt for image-only**
   - Upload image, leave text empty, click Send
   - Verify: uses default "Create an exact replica..." prompt

4. **Video + Image**
   - Upload 1 image + 1 video
   - Type "layout from image, detect loading states from video"
   - Verify: manifest has image structure + video-inferred states

---

## Why This Was Broken

The system was built video-first for "temporal inference" (detecting hover states, loading sequences from recordings). Image support was assumed to "just work" but:
1. No image transmission path existed
2. UI only supported single file
3. No multi-image indexing for selective extraction

The prompts describe image handling, but images never reached Gemini.
