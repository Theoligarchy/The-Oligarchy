/**
 * Image Optimization and CDN delivery utilities.
 * Handles responsive formats, custom width dimensions, and compression quality
 * for Unsplash and other image CDN providers to optimize performance.
 */

export type ImageVariant = 'avatar' | 'thumbnail' | 'card' | 'banner' | 'full';

export interface ImageOptimizerOptions {
  width?: number;
  quality?: number;
  format?: string;
  fit?: 'crop' | 'cover' | 'fill' | 'scale';
}

const VARIANT_PRESETS: Record<ImageVariant, { width: number; quality: number }> = {
  avatar: { width: 160, quality: 80 },
  thumbnail: { width: 480, quality: 75 },
  card: { width: 800, quality: 80 },
  banner: { width: 1400, quality: 85 },
  full: { width: 1920, quality: 85 }
};

/**
 * Transforms an image URL with CDN query parameters for optimal loading:
 * - Unsplash: &auto=format&fit=crop&q={quality}&w={width}
 * - Cloudinary: f_auto,q_{quality},w_{width},c_{fit}
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  variant: ImageVariant | ImageOptimizerOptions = 'card'
): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  const options: { width: number; quality: number; format: string; fit: string } = {
    format: 'auto',
    fit: 'crop',
    ...(typeof variant === 'string' ? VARIANT_PRESETS[variant] : {
      width: variant.width || 800,
      quality: variant.quality || 80,
      format: variant.format || 'auto',
      fit: variant.fit || 'crop'
    })
  };

  // Unsplash CDN parameter injection
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', options.fit);
      parsed.searchParams.set('q', options.quality.toString());
      parsed.searchParams.set('w', options.width.toString());
      return parsed.toString();
    } catch {
      const base = trimmed.split('?')[0];
      return `${base}?auto=format&fit=${options.fit}&q=${options.quality}&w=${options.width}`;
    }
  }

  // Cloudinary image transformation
  if (trimmed.includes('res.cloudinary.com')) {
    try {
      if (trimmed.includes('/upload/')) {
        return trimmed.replace(
          '/upload/',
          `/upload/f_${options.format},q_${options.quality},w_${options.width},c_${options.fit}/`
        );
      }
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}
