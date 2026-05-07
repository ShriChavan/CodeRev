/**
 * Prompt Engine
 * Builds comprehensive system and user prompts for code review
 * Designs prompts to get structured, categorized feedback from Gemini
 */

import { ReviewRequest } from '../types/review.types.js';

/**
 * Builds the system prompt for code review
 * Instructs Gemini to analyze code and return JSON with categorized issues
 */
export function buildSystemPrompt(): string {
  return `Review code for issues. Respond only with valid JSON.

Categories: bug (logical errors), security (vulnerabilities), style (formatting), improvement (optimization).
Severity: error (critical), warning (important), info (minor).

JSON format: {"issues": [{"id": "issue-1", "severity": "error", "category": "bug", "title": "Brief title", "description": "Details", "suggestedFix": "Fix"}]}

If no issues: {"issues": []}`;
}

/**
 * Builds the user prompt containing the code to review
 * Includes language context and code content
 */
export function buildUserPrompt(request: ReviewRequest): string {
  const fileName = request.fileName ? ` (${request.fileName})` : '';
  return `Please review the following ${request.language} code${fileName}:\n\n\`\`\`${request.language}\n${request.code}\n\`\`\`\n\nProvide a detailed code review in JSON format as specified.`;
}

/**
 * Creates the full review request structure for the Gemini API
 * Combines system and user prompts with request metadata
 */
export function createReviewRequest(codeRequest: ReviewRequest) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(codeRequest);

  return {
    systemPrompt,
    userPrompt,
  };
}

/**
 * Validates that a language is supported
 */
export function isSupportedLanguage(language: string): boolean {
  const supported = [
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'go',
    'rust',
    'cpp',
    'c',
    'php',
    'ruby',
    'kotlin',
    'swift',
    'sql',
  ];
  return supported.includes(language.toLowerCase());
}
