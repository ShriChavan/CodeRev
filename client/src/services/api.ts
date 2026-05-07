/**
 * API Service - Axios instance for backend communication
 * TODO: Setup Axios client, request/response interceptors
 */

import axios from 'axios';
import { ReviewRequest, ReviewResponse } from '../types/review.types.js';

// Get API URL from environment or use default
const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

// Rate limiting: Track last request time to prevent rapid successive calls
let lastRequestTime = 0;
const RATE_LIMIT_DELAY_MS = 5000; // 5 second minimum between requests

// Retry configuration for rate limit errors (429)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Initial 2 second delay, then exponential backoff

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60 seconds for retries
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Calls backend /api/review endpoint with automatic retry on rate limit
 * Implements exponential backoff for 429 (rate limit) errors
 */
export async function submitCodeReview(request: ReviewRequest): Promise<ReviewResponse> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Check rate limit: prevent requests faster than 5 seconds apart
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
        const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
        console.warn(`⏳ Rate limiting: waiting ${waitTime}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      lastRequestTime = Date.now();

      console.log(`📤 Submitting code review request (attempt ${attempt}/${MAX_RETRIES}) to: ${API_BASE_URL}`);
      const response = await apiClient.post<ReviewResponse>('/review', request);
      console.log('✅ Review completed:', response.data);
      return response.data;
      
    } catch (error: unknown) {
      lastError = error;
      
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorData = error.response?.data as any;
        const errorMessage = errorData?.error || error.message;
        
        // Handle rate limit errors (429) with exponential backoff
        if (statusCode === 429 && attempt < MAX_RETRIES) {
          const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.warn(`⚠️ Rate limited (429). Retrying in ${delayMs}ms... (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // Try again
        }
        
        // For other errors, don't retry
        console.error(`❌ Request failed (${statusCode}):`, errorMessage);
        throw new Error(errorMessage || `Request failed with status code ${statusCode}`);
      }
      
      console.error('❌ Network error:', error);
      throw error;
    }
  }
  
  // All retries exhausted
  console.error('❌ Max retries exceeded');
  throw lastError;
}

export default apiClient;
