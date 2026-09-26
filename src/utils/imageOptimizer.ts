import { Article } from '../types';

/**
 * Image Optimization, CDN delivery, and Safe Cache-Busting utilities.
 * Handles responsive formats, custom width dimensions, compression quality,
 * and deterministic cache-busting versioning (?v=updatedAt) to ensure
 * updated images immediately propagate across devices without stale CDN/browser caches.
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
 * Single source of truth for extracting an article's cover image.
 * Unifies featuredImage, coverImage, and coverImageUrl into a consistent accessor.
 */
export function getArticleCoverImage(article: Partial<Article> | null | undefined): string {
  if (!article) return '';
  const raw = (article.featuredImage || article.coverImage || article.coverImageUrl || '').trim();
  return raw;
}

/**
 * Extracts the stable cache-busting version token for an article's image.
 * Returns coverImageUpdatedAt if available, falling back to updatedAt or createdAt.
 */
export function getArticleCoverVersion(article: Partial<Article> | null | undefined): string | number | undefined {
  if (!article) return undefined;
  return article.coverImageUpdatedAt || article.updatedAt || article.createdAt;
}

/**
 * Helper to safely append or update a cache version query parameter (?v=...) on an image URL.
 * Does not modify inline data: URIs or blob: URLs.
 */
function appendCacheVersion(url: string, version: string | number | undefined | null): string {
  if (!version) return url;
  const strVersion = String(version).trim();
  if (!strVersion) return url;

  // Data URIs and Blob URIs are self-contained and immutable
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  try {
    // If it is a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const parsed = new URL(url);
      parsed.searchParams.set('v', strVersion);
      return parsed.toString();
    }

    // Relative path (e.g. /assets/image.jpg)
    const [pathPart, queryPart] = url.split('?');
    const params = new URLSearchParams(queryPart || '');
    params.set('v', strVersion);
    return `${pathPart}?${params.toString()}`;
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(strVersion)}`;
  }
}

/**
 * Transforms an image URL with CDN query parameters for optimal loading:
 * - Unsplash: &auto=format&fit=crop&q={quality}&w={width}
 * - Cloudinary: f_auto,q_{quality},w_{width},c_{fit}
 * - Appends safe, deterministic versioning (?v=updatedAt) when cacheVersion is provided.
 */
export function getOptimizedImageUrl(
  url: string | undefined | null,
  variant: ImageVariant | ImageOptimizerOptions = 'card',
  cacheVersion?: number | string
): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Data URIs and Blob URIs don't need CDN params or cache busting
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

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

  let resultUrl = trimmed;

  // Unsplash CDN parameter injection
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', options.fit);
      parsed.searchParams.set('q', options.quality.toString());
      parsed.searchParams.set('w', options.width.toString());
      if (cacheVersion) {
        parsed.searchParams.set('v', String(cacheVersion));
      }
      return parsed.toString();
    } catch {
      const base = trimmed.split('?')[0];
      const vParam = cacheVersion ? `&v=${encodeURIComponent(String(cacheVersion))}` : '';
      return `${base}?auto=format&fit=${options.fit}&q=${options.quality}&w=${options.width}${vParam}`;
    }
  }

  // Cloudinary image transformation
  if (trimmed.includes('res.cloudinary.com')) {
    try {
      if (trimmed.includes('/upload/')) {
        resultUrl = trimmed.replace(
          '/upload/',
          `/upload/f_${options.format},q_${options.quality},w_${options.width},c_${options.fit}/`
        );
      }
    } catch {
      resultUrl = trimmed;
    }
  }

  // Apply deterministic cache-busting version token for Firebase Storage and all other image URLs
  if (cacheVersion) {
    resultUrl = appendCacheVersion(resultUrl, cacheVersion);
  }

  return resultUrl;
}

