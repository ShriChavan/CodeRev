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
import axios from 'axios';

type ViewType = 'input' | 'review';

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [currentRequest, setCurrentRequest] = useState<ReviewRequest | null>(null);
  
  // Test state
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);
  
  // Throttle tracking
  const [throttleRemaining, setThrottleRemaining] = useState(0);
  const [showThrottleWarning, setShowThrottleWarning] = useState(false);

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
      
      // Check if it's a throttle error
      if (errorMessage.includes('Rate limiting')) {
        setShowThrottleWarning(true);
        // Extract wait time if present
        const match = errorMessage.match(/waiting (\d+)s/);
        if (match) {
          const seconds = parseInt(match[1]);
          setThrottleRemaining(seconds);
          // Countdown
          const interval = setInterval(() => {
            setThrottleRemaining(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
      
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

  const handleTestApi = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      
      console.log('🧪 Testing Gemini API...');
      const response = await axios.get('http://localhost:5000/api/test', {
        timeout: 30000,
      });
      
      console.log('📋 Test response:', response.data);
      
      if (response.data.success) {
        setTestResult({
          success: true,
          message: response.data.message || '✅ Gemini API is working!',
          details: JSON.stringify({
            message: response.data.message,
            steps: response.data.steps,
            response: response.data.response,
            timestamp: response.data.timestamp,
          }, null, 2),
        });
        console.log('✅ Test passed:', response.data);
      } else {
        setTestResult({
          success: false,
          message: response.data.error || '❌ API test failed',
          details: JSON.stringify({
            step: response.data.step,
            error: response.data.error,
            details: response.data.details,
            timestamp: response.data.timestamp,
          }, null, 2),
        });
      }
    } catch (err: unknown) {
      let errorMsg = 'Unknown error';
      let errorDetails = '';
      
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.error || err.message || 'API request failed';
        const errData = err.response?.data;
        errorDetails = JSON.stringify({
          status: err.response?.status,
          step: errData?.step,
          error: errData?.error,
          details: errData?.details,
          message: errData?.message,
          timestamp: errData?.timestamp,
        }, null, 2);
      } else if (err instanceof Error) {
        errorMsg = err.message;
        errorDetails = err.stack || '';
      } else {
        errorMsg = String(err);
      }
      
      setTestResult({
        success: false,
        message: `❌ Test failed: ${errorMsg}`,
        details: errorDetails,
      });
      console.error('Test error:', err);
    } finally {
      setTestLoading(false);
    }
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
            {error.includes('Rate limiting') && showThrottleWarning ? (
              <div>
                <p className="error-hint">
                  ⏱️ API protection throttle active. Please wait.
                </p>
                <div className="throttle-timer">
                  <div className="timer-display">
                    ⏳ Wait <span className="timer-number">{throttleRemaining}</span>s before next request
                  </div>
                  <p className="timer-hint">This prevents API quota exhaustion</p>
                </div>
              </div>
            ) : error.includes('Rate limit') ? (
              <div>
                <p className="error-hint">
                  💡 Gemini API rate limit exceeded. Free tier quota consumed.
                </p>
                <p className="error-hint-small">
                  Wait 30-60 minutes for quota reset or upgrade to paid plan
                </p>
                <button onClick={handleBackToInput} className="btn-secondary">
                  Go Back
                </button>
              </div>
            ) : (
              <button onClick={handleBackToInput} className="btn-secondary">
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Test API Box */}
        <div className="test-box">
          <div className="test-box-header">
            <h3>🧪 Test Gemini API Connection</h3>
            <p className="test-box-description">Click to verify the API is working before submitting code</p>
          </div>
          <div className="test-buttons">
            <button 
              onClick={handleTestApi} 
              disabled={testLoading}
              className="btn-test"
            >
              {testLoading ? '⏳ Testing...' : '✨ Test API'}
            </button>
            <button 
              onClick={async () => {
                setTestLoading(true);
                try {
                  const response = await axios.get('http://localhost:5000/api/test-debug', { timeout: 60000 });
                  setTestResult({
                    success: response.data.success,
                    message: `${response.data.success ? '✅' : '❌'} ${response.data.message || response.data.error}`,
                    details: JSON.stringify({
                      issuesFound: response.data.issuesFound,
                      issues: response.data.issues,
                    }, null, 2),
                  });
                } catch (err: unknown) {
                  const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : String(err);
                  setTestResult({ success: false, message: `❌ ${msg}`, details: 'Check server console for details' });
                } finally {
                  setTestLoading(false);
                }
              }}
              disabled={testLoading}
              className="btn-test btn-test-debug"
            >
              {testLoading ? '⏳ Debug...' : '🔍 Debug Test'}
            </button>
          </div>
          
          {testResult && (
            <div className={`test-result ${testResult.success ? 'test-success' : 'test-error'}`}>
              <p className="test-result-message">{testResult.message}</p>
              {testResult.details && (
                <pre className="test-result-details">{testResult.details}</pre>
              )}
            </div>
          )}
        </div>

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
