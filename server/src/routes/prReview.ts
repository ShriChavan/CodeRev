/**
 * GitHub PR Review Route
 * Handles batch code review for GitHub Pull Requests
 * Endpoint: POST /api/pr-review
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { parsePRUrl, validatePrUrl, getPRFiles, getPRMetadata } from '../services/githubService.js';
import { reviewCodeWithGemini } from '../services/geminiService.js';
import { buildSystemPrompt, buildUserPrompt, isSupportedLanguage } from '../services/promptEngine.js';
import { parseGeminiResponse } from '../parsers/reviewParser.js';
import { BatchPRReviewResponse, FileReviewResult } from '../types/review.types.js';

/**
 * POST /api/pr-review
 * Analyzes all files in a GitHub PR and returns categorized issues
 */
export async function handlePRReview(req: Request, res: Response): Promise<void> {
  const requestId = `pr-${uuidv4()}`.substring(0, 20);
  const timestamp = new Date().toISOString();

  try {
    const { prUrl, githubToken } = req.body;

    // Validate PR URL
    if (!prUrl || typeof prUrl !== 'string') {
      console.log(`[${requestId}] ❌ Missing or invalid PR URL`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        error: 'prUrl is required and must be a string',
      });
      return;
    }

    if (!validatePrUrl(prUrl)) {
      console.log(`[${requestId}] ❌ Invalid GitHub PR URL format: ${prUrl}`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        error: 'Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123',
      });
      return;
    }

    // Parse PR URL
    const parsed = parsePRUrl(prUrl);
    if (!parsed) {
      console.log(`[${requestId}] ❌ Failed to parse PR URL: ${prUrl}`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        error: 'Failed to parse GitHub PR URL',
      });
      return;
    }

    console.log(`[${requestId}] 📥 Received PR review request`);
    console.log(`   PR URL: ${prUrl}`);
    console.log(`   Owner: ${parsed.owner}, Repo: ${parsed.repo}, PR: ${parsed.prNumber}`);

    // Fetch PR metadata
    console.log(`[${requestId}] 📋 Fetching PR metadata...`);
    const metadata = await getPRMetadata(parsed.owner, parsed.repo, parsed.prNumber, githubToken);

    if (!metadata) {
      console.log(`[${requestId}] ❌ Failed to fetch PR metadata`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        prUrl,
        error: 'Failed to fetch PR metadata. Ensure PR URL is correct and repository is accessible.',
      });
      return;
    }

    console.log(`[${requestId}] ✅ PR Metadata: ${metadata.filesChanged} files changed`);

    // Fetch changed files
    console.log(`[${requestId}] 📂 Fetching changed files...`);
    const files = await getPRFiles(parsed.owner, parsed.repo, parsed.prNumber, githubToken);

    if (files.length === 0) {
      console.log(`[${requestId}] ⚠️ No reviewable files found in PR`);
      res.status(200).json({
        success: true,
        requestId,
        timestamp,
        prUrl,
        prNumber: parsed.prNumber,
        repository: `${parsed.owner}/${parsed.repo}`,
        filesReviewed: [],
        overallSummary: {
          totalFiles: metadata.filesChanged,
          filesWithIssues: 0,
          totalIssues: 0,
          totalErrors: 0,
          totalWarnings: 0,
          totalInfo: 0,
        },
      });
      return;
    }

    console.log(`[${requestId}] 🔍 Reviewing ${files.length} files...`);

    // Review each file
    const filesReviewed: FileReviewResult[] = [];
    let totalIssues = 0;
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalInfo = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[${requestId}]   [${i + 1}/${files.length}] Reviewing ${file.filePath}...`);

      try {
        // Validate language
        if (!isSupportedLanguage(file.language)) {
          console.log(`[${requestId}]   ⏭️ Skipping unsupported language: ${file.language}`);
          continue;
        }

        // Check code size
        if (file.content.length > 100000) {
          console.log(`[${requestId}]   ⚠️ File too large (${file.content.length} chars), skipping`);
          continue;
        }

        // Build prompts
        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildUserPrompt({
          code: file.content,
          language: file.language,
          fileName: file.fileName,
        });

        // Call Gemini API
        const geminiResponse = await reviewCodeWithGemini({
          code: file.content,
          language: file.language,
          fileName: file.fileName,
        }, systemPrompt, userPrompt);

        // Parse response
        const issues = parseGeminiResponse(geminiResponse);

        // Calculate summary for this file
        const fileSummary = {
          totalIssues: issues.length,
          errorCount: issues.filter(i => i.severity === 'error').length,
          warningCount: issues.filter(i => i.severity === 'warning').length,
          infoCount: issues.filter(i => i.severity === 'info').length,
        };

        filesReviewed.push({
          file,
          issues,
          summary: fileSummary,
          reviewedAt: new Date().toISOString(),
        });

        totalIssues += fileSummary.totalIssues;
        totalErrors += fileSummary.errorCount;
        totalWarnings += fileSummary.warningCount;
        totalInfo += fileSummary.infoCount;

        console.log(`[${requestId}]   ✅ Found ${fileSummary.totalIssues} issues (${fileSummary.errorCount} errors, ${fileSummary.warningCount} warnings)`);
      } catch (error) {
        console.error(`[${requestId}]   ❌ Error reviewing file ${file.filePath}:`, error);
        // Continue to next file instead of failing the entire review
      }
    }

    // Build response
    const filesWithIssues = filesReviewed.filter(f => f.summary.totalIssues > 0).length;

    const response: BatchPRReviewResponse = {
      success: true,
      requestId,
      timestamp,
      prUrl,
      prNumber: parsed.prNumber,
      repository: `${parsed.owner}/${parsed.repo}`,
      filesReviewed,
      overallSummary: {
        totalFiles: metadata.filesChanged,
        filesWithIssues,
        totalIssues,
        totalErrors,
        totalWarnings,
        totalInfo,
      },
    };

    console.log(`[${requestId}] ✅ PR review complete`);
    console.log(`   Total Issues: ${totalIssues} (${totalErrors} errors, ${totalWarnings} warnings, ${totalInfo} info)`);
    console.log(`   Files with issues: ${filesWithIssues}/${filesReviewed.length}`);

    res.status(200).json(response);
  } catch (error) {
    console.error(`[${requestId}] ❌ Unexpected error:`, error);
    res.status(500).json({
      success: false,
      requestId,
      timestamp,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}

/**
 * POST /api/pr-review-comment
 * Posts the review results as a comment on the GitHub PR
 */
export async function handlePRCommentPost(req: Request, res: Response): Promise<void> {
  const requestId = `comment-${uuidv4()}`.substring(0, 20);
  const timestamp = new Date().toISOString();

  try {
    const { prUrl, githubToken, commentBody } = req.body;

    // Validate inputs
    if (!prUrl || typeof prUrl !== 'string') {
      console.log(`[${requestId}] ❌ Missing or invalid PR URL`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        error: 'prUrl is required and must be a string',
      });
      return;
    }

    if (!commentBody || typeof commentBody !== 'string') {
      console.log(`[${requestId}] ❌ Missing comment body`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        error: 'commentBody is required and must be a string',
      });
      return;
    }

    // Import postPRComment from githubService
    const { postPRComment } = await import('../services/githubService.js');

    console.log(`[${requestId}] 📤 Processing PR comment post request...`);
    const result = await postPRComment(prUrl, commentBody, githubToken);

    if (!result.success) {
      console.log(`[${requestId}] ❌ Failed to post comment: ${result.error}`);
      res.status(400).json({
        success: false,
        requestId,
        timestamp,
        error: result.error || 'Failed to post comment',
      });
      return;
    }

    console.log(`[${requestId}] ✅ Comment posted successfully`);
    res.status(200).json({
      success: true,
      requestId,
      timestamp,
      commentUrl: result.commentUrl,
      message: 'Review comment posted successfully',
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error posting comment:`, error);
    res.status(500).json({
      success: false,
      requestId,
      timestamp,
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
}
