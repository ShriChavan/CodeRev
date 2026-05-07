/**
 * Home Page
 * Main entry page with code input
 * TODO: Route to review page on submission
 */

import React from 'react';
import CodeInput from '../components/CodeInput.js';
import { ReviewRequest } from '../types/review.types.js';

export const Home: React.FC = () => {
  // TODO: Handle navigation to review page
  // TODO: Pass code/review data to Review page

  const handleCodeSubmit = async (request: ReviewRequest) => {
    // TODO: Implement navigation with data
    console.log('Submitting:', request);
  };

  return (
    <div className="home-page">
      <section className="hero">
        <h1>AI-Powered Code Review</h1>
        <p>Paste your code and get instant feedback on bugs, security, style, and improvements.</p>
      </section>

      <section className="input-section">
        <CodeInput onSubmit={handleCodeSubmit} />
      </section>
    </div>
  );
};

export default Home;
