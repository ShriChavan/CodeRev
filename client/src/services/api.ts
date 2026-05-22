/**
 * API Service - Axios instance for backend communication
 * TODO: Setup Axios client, request/response interceptors
 */

import axios from 'axios';
import { ReviewRequest, ReviewResponse, BatchPRReviewResponse } from '../types/review.types.js';

// Get API URL from environment or use default
const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

// Rate limiting: Track last request time to prevent rapid successive calls
let lastRequestTime = 0;
const RATE_LIMIT_DELAY_MS = 15000; // 15 second minimum between requests to avoid rate limiting

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
 * Enforces 15-second throttle to avoid API quota exhaustion
 */
export async function submitCodeReview(request: ReviewRequest): Promise<ReviewResponse> {
  let lastError: unknown;
  
  console.log('🔄 Starting code review submission...');
  console.log('   Request details:', { code_length: request.code.length, language: request.language });
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Check rate limit: prevent requests faster than 15 seconds apart
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
        const waitTime = RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
        const seconds = Math.ceil(waitTime / 1000);
        console.warn(`⏳ Rate limiting: waiting ${seconds}s before next request (API quota protection)...`);
        throw new Error(`Rate limiting: waiting ${seconds}s before next request`);
      }
      lastRequestTime = Date.now();

      console.log(`📤 Submitting code review (attempt ${attempt}/${MAX_RETRIES})...`);
      const response = await apiClient.post<ReviewResponse>('/review', request);
      
      console.log('✅ Received response from backend:');
      console.log('   Success:', response.data.success);
      console.log('   Issues found:', response.data.issues?.length || 0);
      console.log('   Request ID:', response.data.requestId);
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
          const seconds = Math.ceil(delayMs / 1000);
          console.warn(`⚠️ Rate limited (429). Retrying in ${seconds}s... (attempt ${attempt}/${MAX_RETRIES})`);
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
  console.error('❌ Max retries exhausted');
  throw lastError;
}

/**
 * Submits GitHub PR URL for batch review
 * Analyzes all changed files in the PR
 */
export async function submitPRReview(prUrl: string, githubToken?: string): Promise<BatchPRReviewResponse> {
  try {
    console.log('🔄 Starting PR review submission...');
    console.log('   PR URL:', prUrl);
    console.log('   Token provided:', githubToken ? 'Yes' : 'No');

    const response = await apiClient.post<BatchPRReviewResponse>('/pr-review', {
      prUrl,
      githubToken,
    }, {
      timeout: 120000, // 2 minutes for batch processing
    });

    console.log('✅ Received PR review response from backend:');
    console.log('   Success:', response.data.success);
    console.log('   Files reviewed:', response.data.filesReviewed?.length || 0);
    console.log('   Total issues:', response.data.overallSummary?.totalIssues || 0);
    console.log('✅ PR review completed:', response.data);
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data as any;
      const errorMessage = errorData?.error || error.message;
      
      console.error(`❌ PR review failed (${statusCode}):`, errorMessage);
      throw new Error(errorMessage || `PR review failed with status code ${statusCode}`);
    }
    
    console.error('❌ PR review error:', error);
    throw error;
  }
}

/**
 * Posts review results as a comment on GitHub PR
 * Requires GitHub token if PR is private
 */
export async function submitPRComment(
  prUrl: string,
  commentBody: string,
  githubToken?: string
): Promise<{ success: boolean; commentUrl?: string; error?: string }> {
  try {
    console.log('📝 Posting review comment to GitHub PR...');
    console.log('   PR URL:', prUrl);
    console.log('   Comment length:', commentBody.length, 'characters');

    const response = await apiClient.post('/pr-review-comment', {
      prUrl,
      commentBody,
      githubToken,
    }, {
      timeout: 30000, // 30 seconds for comment posting
    });

    console.log('✅ Comment posted successfully:');
    console.log('   URL:', response.data.commentUrl);
    console.log('   Message:', response.data.message);

    return {
      success: true,
      commentUrl: response.data.commentUrl,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const errorData = error.response?.data as any;
      const errorMessage = errorData?.error || error.message;

      console.error(`❌ Failed to post comment (${statusCode}):`, errorMessage);
      return {
        success: false,
        error: errorMessage || `Failed with status code ${statusCode}`,
      };
    }

    console.error('❌ Error posting comment:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export default apiClient;
