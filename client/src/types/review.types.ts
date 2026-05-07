/**
 * Copy of shared TypeScript types for frontend use
 * Mirror of server/src/types/review.types.ts
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
