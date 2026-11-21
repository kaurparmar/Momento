// Displays a clear 500 page when the application cannot complete a request.

import { Link } from 'react-router-dom';
import { ServerCrash, ArrowLeft, RefreshCw } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function ServerError() {
  useDocumentMeta('Server Error', 'PhotoDrop could not complete the request.');

  return (
    <div className="error-page">
      <div className="card error-page-card">
        <div className="error-page-code" aria-hidden="true">
          <ServerCrash size={24} />
        </div>
        <p className="error-page-status">500</p>
        <h1>Server error</h1>
        <p className="error-page-description">
          Something went wrong while PhotoDrop handled this request.
          Please try again in a moment.
        </p>
        <div className="error-page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
            <span>Try again</span>
          </button>
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Return to home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
