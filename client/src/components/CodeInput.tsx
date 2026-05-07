/**
 * CodeInput Component
 * Textarea for code input + language selector with form validation
 */

import React, { useState } from 'react';
import { ReviewRequest } from '../types/review.types.js';

interface CodeInputProps {
  onSubmit: (request: ReviewRequest) => Promise<void>;
  loading?: boolean;
}

export const CodeInput: React.FC<CodeInputProps> = ({ onSubmit, loading = false }) => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [validationError, setValidationError] = useState<string>('');

  // All 14 supported languages from backend
  const languages = [
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'c',
    'cpp',
    'go',
    'rust',
    'php',
    'ruby',
    'kotlin',
    'swift',
    'sql',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (!code.trim()) {
      setValidationError('Please enter some code to review');
      return;
    }

    if (code.length > 100000) {
      setValidationError('Code is too large (max 100KB). Please paste a smaller snippet.');
      return;
    }

    try {
      await onSubmit({ code, language });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      setValidationError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="code-input-form">
      <div className="form-header">
        <h2>Paste Your Code</h2>
        <p>Get instant AI-powered feedback on your code quality, security, and style</p>
      </div>

      {validationError && (
        <div className="validation-error">
          ⚠️ {validationError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="language">
          Programming Language:
          <span className="required">*</span>
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={loading}
          className="language-select"
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang.charAt(0).toUpperCase() + lang.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="code">
          Code:
          <span className="required">*</span>
          <span className="char-count">
            {code.length} / 100,000 chars
          </span>
        </label>
        <textarea
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here...&#10;&#10;Supported: JavaScript, TypeScript, Python, Java, C#, C, C++, Go, Rust, PHP, Ruby, Kotlin, Swift, SQL"
          rows={18}
          disabled={loading}
          className="code-textarea"
        />
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="btn-primary"
        >
          {loading ? (
            <>
              <span className="spinner">⏳</span> Analyzing...
            </>
          ) : (
            <>
              <span>🔍</span> Review Code
            </>
          )}
        </button>
        <p className="form-hint">This typically takes 5-10 seconds</p>
      </div>
    </form>
  );
};

export default CodeInput;
