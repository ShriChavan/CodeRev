/**
 * Shared TypeScript types for the CodeRev API
 * Defines all request/response structures for code reviews
 */

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ReviewIssue {
  id: string;
  severity: IssueSeverity;
  category: 'bug' | 'security' | 'style' | 'improvement';
  title: string;
  description: string;
  lineNumber?: number;
  codeSnippet?: string;
  suggestedFix?: string;
}

export interface ReviewRequest {
  code: string;
  language: string;
  fileName?: string;
}

export interface ReviewResponse {
  success: boolean;
  requestId: string;
  timestamp: string;
  code?: string;
  language?: string;
  issues: ReviewIssue[];
  summary?: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  error?: string;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

export interface GeminiApiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}
