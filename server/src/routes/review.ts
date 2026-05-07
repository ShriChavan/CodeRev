/**
 * API Routes - Review Endpoint
 * Handles POST /api/review requests
 * Full endpoint implementation with validation and error handling
 */

import { Router, Request, Response } from 'express';
import { ReviewRequest, ReviewResponse } from '../types/review.types.js';
import * as geminiService from '../services/geminiService.js';
import * as promptEngine from '../services/promptEngine.js';
import * as reviewParser from '../parsers/reviewParser.js';

const router = Router();

const MAX_CODE_LENGTH = 100000; // 100KB

/**
 * Validates incoming review request
 */
function validateReviewRequest(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const req = data as Record<string, unknown>;

  // Check code
  if (!req.code || typeof req.code !== 'string') {
    return { valid: false, error: 'Code is required and must be a string' };
  }

  if (req.code.trim().length === 0) {
    return { valid: false, error: 'Code cannot be empty' };
  }

  if (req.code.length > MAX_CODE_LENGTH) {
    return { valid: false, error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` };
  }

  // Check language
  if (!req.language || typeof req.language !== 'string') {
    return { valid: false, error: 'Language is required and must be a string' };
  }

  if (!promptEngine.isSupportedLanguage(req.language)) {
    return {
      valid: false,
      error: `Unsupported language: ${req.language}. Supported: javascript, python, java, typescript, go, rust, csharp, c, cpp, php, ruby, kotlin, swift, sql`,
    };
  }

  return { valid: true };
}

/**
 * POST /api/review
 * Accepts code and returns AI-powered review
 *
 * Request body:
 * {
 *   "code": "function...",
 *   "language": "javascript",
 *   "fileName": "example.js" (optional)
 * }
 */
router.post('/review', async (req: Request, res: Response<ReviewResponse>) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Validate input
    const validation = validateReviewRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        requestId,
        timestamp: new Date().toISOString(),
        issues: [],
        error: validation.error || 'Invalid request',
      });
    }

    const codeRequest: ReviewRequest = {
      code: String(req.body.code),
      language: String(req.body.language),
      fileName: req.body.fileName ? String(req.body.fileName) : undefined,
    };

    // Check API key
    if (!geminiService.validateApiKey()) {
      console.error('GEMINI_API_KEY not configured');
      return res.status(500).json({
        success: false,
        requestId,
        timestamp: new Date().toISOString(),
        issues: [],
        error: 'Server not properly configured: Missing API key',
      });
    }

    // Build prompts
    const systemPrompt = promptEngine.buildSystemPrompt();
    const userPrompt = promptEngine.buildUserPrompt(codeRequest);

    // Call Gemini API
    console.log(`[${requestId}] Calling Gemini API for ${codeRequest.language} code`);
    const geminiResponse = await geminiService.reviewCodeWithGemini(
      codeRequest,
      systemPrompt,
      userPrompt
    );

    // Parse response
    const issues = reviewParser.parseGeminiResponse(geminiResponse);

    // Validate parsed issues
    if (!reviewParser.validateIssues(issues)) {
      console.warn(`[${requestId}] Some issues failed validation`);
    }

    // Build success response
    const response: ReviewResponse = {
      success: true,
      requestId,
      timestamp: new Date().toISOString(),
      code: codeRequest.code,
      language: codeRequest.language,
      issues,
      summary: {
        totalIssues: issues.length,
        errorCount: issues.filter((i) => i.severity === 'error').length,
        warningCount: issues.filter((i) => i.severity === 'warning').length,
        infoCount: issues.filter((i) => i.severity === 'info').length,
      },
    };

    console.log(`[${requestId}] Review complete: ${issues.length} issues found`);
    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] Review endpoint error:`, errorMessage);

    // Determine appropriate status code
    let statusCode = 500;
    let message = errorMessage;

    if (errorMessage.includes('rate limit')) {
      statusCode = 429;
      message = 'API rate limit exceeded. Please try again later.';
    } else if (errorMessage.includes('API key')) {
      statusCode = 401;
      message = 'Authentication failed. Invalid API key.';
    } else if (errorMessage.includes('timeout')) {
      statusCode = 504;
      message = 'Request timeout. Please try again.';
    }

    res.status(statusCode).json({
      success: false,
      requestId,
      timestamp: new Date().toISOString(),
      issues: [],
      error: message,
    });
  }
});

export default router;
