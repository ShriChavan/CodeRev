/**
 * Gemini AI Service
 * Core service for calling the Google Gemini API
 * Handles API communication, validation, and error handling
 */

import axios, { AxiosError } from 'axios';
import { ReviewRequest } from '../types/review.types.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
const MAX_CODE_LENGTH = 100000; // 100KB limit

interface GeminiRequestPayload {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
  systemInstruction?: {
    parts: Array<{
      text: string;
    }>;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

/**
 * Validates input before sending to Gemini API
 */
function validateInput(codeRequest: ReviewRequest): void {
  if (!codeRequest.code || codeRequest.code.trim().length === 0) {
    throw new Error('Code cannot be empty');
  }

  if (codeRequest.code.length > MAX_CODE_LENGTH) {
    throw new Error(`Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`);
  }

  if (!codeRequest.language || codeRequest.language.trim().length === 0) {
    throw new Error('Language must be specified');
  }

  if (!validateApiKey()) {
    throw new Error('GEMINI_API_KEY not set in environment variables');
  }
}

/**
 * Calls Gemini API with code review prompt
 * Makes actual API call to Google and returns the response text
 */
export async function reviewCodeWithGemini(
  codeRequest: ReviewRequest,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    // 1. Validate input
    validateInput(codeRequest);

    // 2. Build request payload for Gemini
    const payload: GeminiRequestPayload = {
      systemInstruction: {
        parts: [
          {
            text: systemPrompt,
          },
        ],
      },
      contents: [
        {
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.3,
      },
    };

    // 3. Call Gemini API
    const response = await axios.post<GeminiResponse>(
      `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    // 4. Extract and return response text
    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates.length > 0 &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts.length > 0
    ) {
      return response.data.candidates[0].content.parts[0].text;
    }

    throw new Error('Unexpected response format from Gemini API');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message: string } }>;
      if (axiosError.response?.status === 401) {
        throw new Error('Invalid GEMINI_API_KEY');
      }
      if (axiosError.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (axiosError.response?.data?.error?.message) {
        throw new Error(`Gemini API error: ${axiosError.response.data.error.message}`);
      }
      throw new Error(`API request failed: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Checks if Gemini API key is valid
 */
export function validateApiKey(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey.trim().length > 0;
}

/**
 * Estimates token count for code input
 * Rough estimate: ~4 characters per token
 */
export function estimateTokens(code: string): number {
  return Math.ceil(code.length / 4);
}

/**
 * Gets API key from environment
 */
export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}
