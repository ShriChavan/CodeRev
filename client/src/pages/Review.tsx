/**
 * Review Page
 * Displays review results after submission
 * TODO: Accept review data from navigation state
 */

import React, { useState } from 'react';
import ReviewPanel from '../components/ReviewPanel.js';
import LoadingState from '../components/LoadingState.js';
import { ReviewResponse } from '../types/review.types.js';

export const Review: React.FC = () => {
  // TODO: Get review data from router state
  const [review] = useState<ReviewResponse | null>(null);
  const [loading] = useState(false);

  if (loading) {
    return <LoadingState />;
  }

  if (!review) {
    return (
      <div className="review-page empty">
        <p>No review loaded. Go back and submit code for analysis.</p>
      </div>
    );
  }

  return (
    <div className="review-page">
      <ReviewPanel review={review} />
    </div>
  );
};

export default Review;
