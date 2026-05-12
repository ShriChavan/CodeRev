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
  let jsonText = '';
  try {
    const trimmed = responseText.trim();
    console.log('🔍 Parsing Gemini response, length:', trimmed.length);

    // Remove markdown code block wrapper (```json ... ```)
    jsonText = trimmed;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7); // Remove ```json
      console.log('📝 Removed ```json prefix');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3); // Remove ```
      console.log('📝 Removed ``` prefix');
    }
    
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.substring(0, jsonText.length - 3); // Remove trailing ```
      console.log('📝 Removed trailing ```');
    }
    
    jsonText = jsonText.trim();

    if (!jsonText) {
      console.error('❌ Empty JSON text after removing wrapper');
      return [];
    }

    console.log('📋 Extracted JSON:', jsonText.substring(0, 200));
    const parsed: ParsedResponse | ReviewIssue[] = JSON.parse(jsonText);

    // Handle wrapped response format { "issues": [...] }
    let issues: unknown[] = [];
    if (Array.isArray(parsed)) {
      issues = parsed;
      console.log(`📊 Parsed as array: ${issues.length} items`);
    } else if (parsed && typeof parsed === 'object' && 'issues' in parsed) {
      issues = Array.isArray(parsed.issues) ? parsed.issues : [];
      console.log(`📊 Parsed as object with issues: ${issues.length} items`);
    } else {
      console.log('⚠️ Unexpected response format:', typeof parsed);
    }

    // Validate and filter issues
    console.log(`🔎 Validating ${issues.length} issues...`);
    const validIssues = issues
      .map((issue, index) => {
        const validated = validateAndNormalizeIssue(issue, index);
        if (!validated) {
          console.warn(`   ❌ Issue ${index} failed validation:`, issue);
        }
        return validated;
      })
      .filter((issue): issue is ReviewIssue => issue !== null);

    console.log(`✅ Valid issues after filtering: ${validIssues.length}`);
    return validIssues;
  } catch (error) {
    console.error('❌ Failed to parse Gemini response:', error);
    if (error instanceof SyntaxError) {
      console.error('   📄 Last 200 chars of JSON:', jsonText?.substring(jsonText.length - 200));
      console.error('   📄 Total JSON length:', jsonText?.length);
    }
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
