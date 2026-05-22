import React, { useState } from 'react';

interface PRInputProps {
  onSubmit: (prUrl: string, githubToken?: string) => void;
  isLoading: boolean;
}

/**
 * PRInput Component
 * Form for users to input GitHub PR URL and optional authentication token
 */
export default function PRInput({ onSubmit, isLoading }: PRInputProps) {
  const [prUrl, setPrUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate PR URL
    if (!prUrl.trim()) {
      setError('Please enter a GitHub PR URL');
      return;
    }

    // Basic URL validation
    if (!prUrl.includes('github.com') || !prUrl.includes('/pull/')) {
      setError('Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123');
      return;
    }

    onSubmit(prUrl, githubToken || undefined);
  };

  return (
    <form className="pr-input-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="prUrl">GitHub PR URL</label>
        <input
          id="prUrl"
          type="url"
          placeholder="https://github.com/owner/repo/pull/123"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          disabled={isLoading}
          className="pr-url-input"
          required
        />
        <small className="input-hint">
          Paste your GitHub PR URL. We'll analyze all changed files.
        </small>
      </div>

      <div className="form-group">
        <label className="token-label">
          <input
            type="checkbox"
            checked={showToken}
            onChange={(e) => setShowToken(e.target.checked)}
            disabled={isLoading}
            className="token-checkbox"
          />
          <span>Provide GitHub token (for private repos)</span>
        </label>
        {showToken && (
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            disabled={isLoading}
            className="token-input"
          />
        )}
        <small className="input-hint">
          Optional: Use a GitHub Personal Access Token for private repositories.
          Your token is never stored and only sent to analyze the PR.
        </small>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        type="submit"
        disabled={isLoading || !prUrl.trim()}
        className="submit-btn"
      >
        {isLoading ? (
          <>
            <span className="spinner"></span>
            Analyzing PR...
          </>
        ) : (
          <>
            🔍 Review Pull Request
          </>
        )}
      </button>

      <div className="pr-features">
        <h4>What we'll do:</h4>
        <ul>
          <li>✅ Fetch all changed files from the PR</li>
          <li>✅ Analyze each file for bugs & security issues</li>
          <li>✅ Categorize issues by severity</li>
          <li>✅ Show detailed results for each file</li>
        </ul>
      </div>
    </form>
  );
}
