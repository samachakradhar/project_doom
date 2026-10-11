/**
 * DOOM Medical AI - Centralized Production API Configuration
 * Supports environment-based deployment (NEXT_PUBLIC_API_URL) with seamless local fallback.
 */

export const API_BASE_URL: string = (
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8000'
).replace(/\/+$/, '');

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}
