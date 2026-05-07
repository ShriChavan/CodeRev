/**
 * Main App Component
 * Manages state, orchestrates API calls, and handles navigation between input and results
 */

import React, { useState } from 'react';
import './App.css';
import CodeInput from './components/CodeInput';
import ReviewPanel from './components/ReviewPanel';
import LoadingState from './components/LoadingState';
import { ReviewRequest, ReviewResponse } from './types/review.types';
import { submitCodeReview } from './services/api';

type ViewType = 'input' | 'review';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [currentRequest, setCurrentRequest] = useState<ReviewRequest | null>(null);

  const handleCodeSubmit = async (request: ReviewRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      // Call backend API
      const result = await submitCodeReview(request);
      
      setCurrentRequest(request);
      setReview(result);
      setView('review');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to review code';
      setError(errorMessage);
      console.error('Review error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToInput = () => {
    setView('input');
    setReview(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 CodeRev</h1>
        <p className="tagline">AI-Powered Code Review Tool</p>
      </header>

      <main className="app-main">
        {loading && <LoadingState />}

        {error && (
          <div className="error-banner">
            <p>❌ Error: {error}</p>
            {error.includes('Rate limit') ? (
              <div>
                <p className="error-hint">
                  💡 The Gemini API is rate limited. Please wait a moment before trying again.
                </p>
                <button onClick={handleBackToInput} className="btn-secondary">
                  Retry in a Few Seconds
                </button>
              </div>
            ) : (
              <button onClick={handleBackToInput} className="btn-secondary">
                Try Again
              </button>
            )}
          </div>
        )}

        {view === 'input' && !loading && (
          <div className="input-view">
            <CodeInput onSubmit={handleCodeSubmit} loading={loading} />
          </div>
        )}

        {view === 'review' && !loading && review && (
          <div className="review-view">
            <button onClick={handleBackToInput} className="btn-back">
              ← Back to Editor
            </button>
            {currentRequest && (
              <div className="code-info">
                <small>Language: <code>{currentRequest.language}</code> | Code length: <code>{currentRequest.code.length} chars</code></small>
              </div>
            )}
            <ReviewPanel review={review} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>CodeRev © 2026 | Powered by Google Gemini AI</p>
      </footer>
    </div>
  );
};

export default App;
