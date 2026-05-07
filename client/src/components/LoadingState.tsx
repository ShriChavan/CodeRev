/**
 * LoadingState Component
 * Shows loading spinner and message during code review
 */

import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Analyzing your code with AI...' }) => {
  return (
    <div className="loading-state">
      <div className="spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-message">{message}</p>
      <p className="loading-hint">Usually 5-10 seconds (may retry if API rate limited)</p>
    </div>
  );
};

export default LoadingState;
