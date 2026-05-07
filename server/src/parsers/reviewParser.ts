/**
 * Review Parser
 * Parses Gemini's response and converts it to typed ReviewIssue array
 * Handles JSON extraction, validation, and error recovery
 */

import { ReviewIssue, IssueSeverity } from '../types/review.types.js';

const VALID_SEVERITIES: IssueSeverity[] = ['error', 'warning', 'info'];
const VALID_CATEGORIES = ['bug', 'security', 'style', 'improvement'];

interface ParsedResponse {
  issues?: ReviewIssue[];
}

/**
 * Parses Gemini's JSON response into typed ReviewIssue array
 * Handles wrapped responses (e.g., { "issues": [...] }) and direct arrays
 */
export function parseGeminiResponse(responseText: string): ReviewIssue[] {
  try {
    const trimmed = responseText.trim();

    // Try to extract JSON from response (in case Gemini adds explanatory text)
    const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response');
      return [];
    }

    const parsed: ParsedResponse | ReviewIssue[] = JSON.parse(jsonMatch[0]);

    // Handle wrapped response format { "issues": [...] }
    let issues: unknown[] = [];
    if (Array.isArray(parsed)) {
      issues = parsed;
    } else if (parsed && typeof parsed === 'object' && 'issues' in parsed) {
      issues = Array.isArray(parsed.issues) ? parsed.issues : [];
    }

    // Validate and filter issues
    const validIssues = issues
      .map((issue, index) => validateAndNormalizeIssue(issue, index))
      .filter((issue): issue is ReviewIssue => issue !== null);

    return validIssues;
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return [];
  }
}

/**
 * Validates a single issue and normalizes its format
 * Returns null if invalid, otherwise returns valid ReviewIssue
 */
function validateAndNormalizeIssue(issue: unknown, index: number): ReviewIssue | null {
  if (!issue || typeof issue !== 'object') {
    return null;
  }

  const i = issue as Record<string, unknown>;

  // Check required fields
  if (
    !i.id ||
    typeof i.id !== 'string' ||
    !i.severity ||
    !i.category ||
    !i.title ||
    typeof i.title !== 'string' ||
    !i.description ||
    typeof i.description !== 'string'
  ) {
    console.warn(`Issue ${index} missing required fields`);
    return null;
  }

  // Validate enum values
  const severity = String(i.severity).toLowerCase();
  const category = String(i.category).toLowerCase();

  if (!VALID_SEVERITIES.includes(severity as IssueSeverity)) {
    console.warn(`Invalid severity: ${severity}, using 'info'`);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`Invalid category: ${category}, using 'improvement'`);
  }

  // Build validated issue
  const validIssue: ReviewIssue = {
    id: String(i.id),
    severity: VALID_SEVERITIES.includes(severity as IssueSeverity)
      ? (severity as IssueSeverity)
      : 'info',
    category: VALID_CATEGORIES.includes(category)
      ? (category as ReviewIssue['category'])
      : 'improvement',
    title: String(i.title),
    description: String(i.description),
  };

  // Optional fields
  if (i.lineNumber && typeof i.lineNumber === 'number' && i.lineNumber > 0) {
    validIssue.lineNumber = i.lineNumber;
  }

  if (i.codeSnippet && typeof i.codeSnippet === 'string') {
    validIssue.codeSnippet = i.codeSnippet;
  }

  if (i.suggestedFix && typeof i.suggestedFix === 'string') {
    validIssue.suggestedFix = i.suggestedFix;
  }

  return validIssue;
}

/**
 * Validates that parsed issues conform to ReviewIssue schema
 */
export function validateIssues(issues: ReviewIssue[]): boolean {
  if (!Array.isArray(issues)) {
    return false;
  }

  return issues.every((issue) => {
    return (
      issue.id &&
      typeof issue.id === 'string' &&
      VALID_SEVERITIES.includes(issue.severity) &&
      VALID_CATEGORIES.includes(issue.category) &&
      issue.title &&
      typeof issue.title === 'string' &&
      issue.description &&
      typeof issue.description === 'string' &&
      (!issue.lineNumber || (typeof issue.lineNumber === 'number' && issue.lineNumber > 0))
    );
  });
}
