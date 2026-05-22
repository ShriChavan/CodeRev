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
import { handlePRReview, handlePRCommentPost } from './prReview.js';

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

  console.log(`\n📥 [${requestId}] Received review request`);
  console.log(`   Body keys: ${Object.keys(req.body).join(', ')}`);
  console.log(`   Code length: ${req.body.code?.length || 0} chars`);
  console.log(`   Language: ${req.body.language || 'unknown'}`);
  console.log(`   Code preview: ${String(req.body.code || '').substring(0, 50)}...`);

  try {
    // Validate input
    const validation = validateReviewRequest(req.body);
    if (!validation.valid) {
      console.warn(`   ⚠️ Validation failed: ${validation.error}`);
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
    console.log(`   📄 Gemini response length: ${geminiResponse.length} chars`);
    console.log(`   📄 Gemini response: ${geminiResponse.substring(0, 100)}...`);
    
    const issues = reviewParser.parseGeminiResponse(geminiResponse);
    console.log(`   ✅ Parsed issues: ${issues.length} found`);

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

    console.log(`[${requestId}] ✅ Review complete: ${issues.length} issues found`);
    console.log(`   Summary: ${issues.filter(i => i.severity === 'error').length} errors, ${issues.filter(i => i.severity === 'warning').length} warnings`);
    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[${requestId}] ❌ Error: ${errorMessage}`);
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

/**
 * GET /api/test-debug
 * Debug endpoint with verbose logging
 * Shows exactly what's being sent to Gemini and what it returns
 */
router.get('/test-debug', async (req, res) => {
  try {
    console.log('\n🔍 DEBUG TEST - Full Verbose Output');
    console.log('='.repeat(60));
    
    // Step 1: Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('✅ Step 1: API Key exists:', apiKey ? 'YES' : 'NO');

    if (!apiKey || !geminiService.validateApiKey()) {
      return res.status(500).json({
        success: false,
        error: 'API key not configured',
      });
    }

    // Step 2: Show prompts
    const systemPrompt = promptEngine.buildSystemPrompt();
    const codeRequest = { 
      code: `function test(x) {
  const y = null;
  console.log(y.id);
  while(true) {}
}`, 
      language: 'javascript' 
    };
    const userPrompt = promptEngine.buildUserPrompt(codeRequest);

    console.log('\n📝 System Prompt:');
    console.log('-'.repeat(60));
    console.log(systemPrompt);
    console.log('-'.repeat(60));

    console.log('\n📝 User Prompt:');
    console.log('-'.repeat(60));
    console.log(userPrompt);
    console.log('-'.repeat(60));

    // Step 3: Call API
    console.log('\n🚀 Calling Gemini API...');
    const geminiResponse = await geminiService.reviewCodeWithGemini(
      codeRequest,
      systemPrompt,
      userPrompt
    );

    console.log('\n📤 Gemini Raw Response:');
    console.log('-'.repeat(60));
    console.log(geminiResponse);
    console.log('-'.repeat(60));

    // Step 4: Parse response
    const issues = reviewParser.parseGeminiResponse(geminiResponse);
    console.log('\n📊 Parsed Issues:', JSON.stringify(issues, null, 2));

    return res.json({
      success: true,
      message: 'Debug test complete - check server console for full details',
      issuesFound: issues.length,
      issues: issues,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Debug test error:', errorMessage);
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * GET /api/test
 * Test endpoint to verify Gemini API is working
 * Provides detailed diagnostics for troubleshooting
 */
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Starting API test...');
    
    // Step 1: Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Step 1 - API Key Check:', apiKey ? '✅ Key exists' : '❌ Key missing');
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        step: 'API Key Validation',
        error: 'GEMINI_API_KEY not configured in environment',
        details: 'Check .env file has GEMINI_API_KEY=your_key_here',
        timestamp: new Date().toISOString(),
      });
    }

    if (!geminiService.validateApiKey()) {
      return res.status(500).json({
        success: false,
        step: 'API Key Validation',
        error: 'validateApiKey() returned false',
        details: 'API key exists but validation failed',
        timestamp: new Date().toISOString(),
      });
    }

    console.log('✅ API key validated');

    // Step 2: Attempt simple Gemini API call
    console.log('Step 2 - Calling Gemini API...');
    
    try {
      const testResponse = await geminiService.reviewCodeWithGemini(
        { code: 'console.log("test");', language: 'javascript' },
        'Respond with: OK',
        'This is a test'
      );

      console.log('✅ Gemini API responded:', testResponse.substring(0, 100));

      return res.json({
        success: true,
        message: '✅ Gemini API is working!',
        steps: [
          '✅ API Key found and validated',
          '✅ Successfully called Gemini API',
          '✅ Received response from API',
        ],
        response: testResponse.substring(0, 200),
        timestamp: new Date().toISOString(),
      });
    } catch (apiError) {
      const apiErrorMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.error('❌ Gemini API call failed:', apiErrorMsg);

      return res.status(500).json({
        success: false,
        step: 'Gemini API Call',
        error: apiErrorMsg,
        details: 'Failed to get response from Gemini API. Check: rate limits, API key validity, network connection',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Test endpoint error:', errorMessage);

    return res.status(500).json({
      success: false,
      step: 'Test Execution',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/pr-review
 * Batch review for GitHub Pull Requests
 */
router.post('/pr-review', handlePRReview);

/**
 * POST /api/pr-review-comment
 * Post review results as a comment on GitHub PR
 */
router.post('/pr-review-comment', handlePRCommentPost);

export default router;
