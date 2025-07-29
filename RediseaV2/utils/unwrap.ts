// utils/
import { ApiResponse } from '../types/api.types';

/**
 * Unwraps `data` field from ApiResponse. Throws if data is undefined.
 */
export function unwrapData<T>(response: ApiResponse<T>, errorMessage?: string): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(errorMessage || 'Expected response.data to be defined');
  }
  return response.data;
}
