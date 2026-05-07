/**
 * IssueBadge Component
 * Color-coded severity badge for review issues
 * Severities: error (red), warning (yellow), info (blue)
 */

import React from 'react';
import { IssueSeverity } from '../types/review.types.js';

interface IssueBadgeProps {
  severity: IssueSeverity;
  children?: React.ReactNode;
}

const severityEmoji: Record<IssueSeverity, string> = {
  error: '🔴',
  warning: '🟡',
  info: '🔵',
};

const severityLabel: Record<IssueSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export const IssueBadge: React.FC<IssueBadgeProps> = ({ severity, children }) => {
  const displayText = children || severityLabel[severity];

  return (
    <span className={`badge badge-${severity}`}>
      {severityEmoji[severity]} {displayText}
    </span>
  );
};

export default IssueBadge;
