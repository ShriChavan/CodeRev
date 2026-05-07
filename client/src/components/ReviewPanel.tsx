/**
 * ReviewPanel Component
 * Displays categorized review results with summary statistics
 */

import React from 'react';
import { ReviewResponse, ReviewIssue } from '../types/review.types.js';
import IssueBadge from './IssueBadge.js';

interface ReviewPanelProps {
  review: ReviewResponse;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({ review }) => {
  if (!review.success || !review.issues || review.issues.length === 0) {
    return (
      <div className="review-panel empty">
        <div className="empty-state">
          <h2>✨ No Issues Found!</h2>
          <p>Your code looks great! No issues detected.</p>
        </div>
      </div>
    );
  }

  // Group issues by category
  const categories = ['bug', 'security', 'style', 'improvement'] as const;
  const groupedIssues: Record<typeof categories[number], ReviewIssue[]> = {
    bug: [],
    security: [],
    style: [],
    improvement: [],
  };

  review.issues.forEach((issue) => {
    groupedIssues[issue.category].push(issue);
  });

  const categoryIcons: Record<typeof categories[number], string> = {
    bug: '🐛',
    security: '🔒',
    style: '✨',
    improvement: '💡',
  };

  return (
    <div className="review-panel">
      {/* Summary Section */}
      <div className="summary-section">
        <h2>📊 Review Summary</h2>
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-value">{review.summary?.totalIssues || 0}</div>
            <div className="stat-label">Total Issues</div>
          </div>
          <div className="stat-card stat-error">
            <div className="stat-value">{review.summary?.errorCount || 0}</div>
            <div className="stat-label">Errors</div>
          </div>
          <div className="stat-card stat-warning">
            <div className="stat-value">{review.summary?.warningCount || 0}</div>
            <div className="stat-label">Warnings</div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-value">{review.summary?.infoCount || 0}</div>
            <div className="stat-label">Info</div>
          </div>
        </div>
      </div>

      {/* Issues by Category */}
      <div className="issues-section">
        <h2>🔍 Issues by Category</h2>
        <div className="issues-by-category">
          {categories.map((category) => {
            const issues = groupedIssues[category];
            if (!issues.length) return null;

            return (
              <section
                key={category}
                className={`category category-${category}`}
                data-category={category}
              >
                <h3 className="category-title">
                  {categoryIcons[category]} {category.charAt(0).toUpperCase() + category.slice(1)}
                  <span className="issue-count">({issues.length})</span>
                </h3>

                <ul className="issues-list">
                  {issues.map((issue, idx) => (
                    <li key={issue.id} className="issue-item">
                      <div className="issue-header">
                        <IssueBadge severity={issue.severity} />
                        <h4 className="issue-title">
                          {idx + 1}. {issue.title}
                        </h4>
                      </div>

                      <p className="issue-description">{issue.description}</p>

                      {issue.lineNumber && (
                        <div className="issue-meta">
                          <small>Line {issue.lineNumber}</small>
                        </div>
                      )}

                      {issue.codeSnippet && (
                        <div className="code-snippet">
                          <pre>{issue.codeSnippet}</pre>
                        </div>
                      )}

                      {issue.suggestedFix && (
                        <div className="suggested-fix">
                          <strong>💡 Suggestion:</strong>
                          <pre>{issue.suggestedFix}</pre>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ReviewPanel;
