'use client';

import Image from 'next/image';
import { XIcon } from '@/components/ui/Icons';

interface PendingImagesPreviewProps {
  images: string[];
  onRemove: (index: number) => void;
}

/**
 * Preview of pending images to be sent with the next message
 */
export function PendingImagesPreview({ images, onRemove }: PendingImagesPreviewProps) {
  if (images.length === 0) return null;

  return (
    <div className="px-6 py-2 flex gap-2">
      {images.map((img, i) => (
        <div key={`pending-${img.slice(-20)}`} className="relative">
          <Image
            src={img}
            alt={`Upload ${i + 1}`}
            width={64}
            height={64}
            className="w-16 h-16 object-cover rounded-lg"
            style={{ border: '1px solid var(--border-color)' }}
            unoptimized
          />
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
            }}
          >
            <XIcon size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default PendingImagesPreview;
