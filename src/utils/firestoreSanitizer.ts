/**
 * Firestore Data Sanitization Utility
 * 
 * Google Cloud Firestore rejects documents containing `undefined` values,
 * throwing: "Function addDoc() / setDoc() / updateDoc() called with invalid data.
 * Unsupported field value: undefined (found in field ...)"
 * 
 * This utility recursively removes all properties whose values are `undefined`
 * from objects and arrays before sending payloads to Firestore.
 */

export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === undefined) {
    return undefined as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeFirestoreData(item)) as any;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeFirestoreData(value);
    }
  }
  return clean as T;
}
