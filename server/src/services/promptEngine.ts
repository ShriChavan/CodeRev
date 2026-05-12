/**
 * Prompt Engine
 * Builds comprehensive system and user prompts for code review
 * Designs prompts to get structured, categorized feedback from Gemini
 */

import { ReviewRequest } from '../types/review.types.js';

/**
 * Builds the system prompt for code review
 * Focuses on bugs, security issues, and code quality
 */
export function buildSystemPrompt(): string {
  return `Analyze code for BUGS and SECURITY ISSUES. Max 5 critical issues. Respond ONLY with valid JSON.

Focus on TOP CRITICAL issues only:

BUGS:
- Logic errors, null pointer exceptions, infinite loops, off-by-one errors
- Missing return statements, unreachable code
- Type mismatches, incorrect array access

SECURITY - MUST DETECT:
- SQL injection (string concatenation in queries, + operator, format strings)
- Dangerous functions: eval, exec
- Plaintext passwords, credentials in code
- XSS, CSRF, auth vulnerabilities
- Resource leaks (unclosed files, connections)

CODE QUALITY:
- Missing error handling
- Resource management issues

For EACH issue, be CONCISE (1-2 sentences each):
{
  "id": "issue-X",
  "severity": "error" | "warning" | "info",
  "category": "bug" | "security" | "style" | "improvement",
  "title": "Brief title",
  "description": "1-2 sentence explanation",
  "suggestedFix": "1 sentence fix"
}

ALWAYS respond with: {"issues": [...]}
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
