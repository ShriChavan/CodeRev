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

/**
 * GitHub PR Integration Types
 */

export interface GitHubFile {
  fileName: string;
  filePath: string;
  language: string;
  content: string;
  changeType: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
}

export interface FileReviewResult {
  file: GitHubFile;
  issues: ReviewIssue[];
  summary: {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  reviewedAt: string;
}

export interface BatchPRReviewResponse {
  success: boolean;
  requestId: string;
  timestamp: string;
  prUrl: string;
  prNumber?: number;
  repository?: string;
  filesReviewed: FileReviewResult[];
  overallSummary: {
    totalFiles: number;
    filesWithIssues: number;
    totalIssues: number;
    totalErrors: number;
    totalWarnings: number;
    totalInfo: number;
  };
  error?: string;
}
