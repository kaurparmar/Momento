// Displays a clear 404 page for routes that do not exist.

import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function NotFound() {
  useDocumentMeta('Page Not Found', 'The requested page could not be found.');

  return (
    <div className="error-page">
      <div className="card error-page-card">
        <div className="error-page-code" aria-hidden="true">
          <FileQuestion size={24} />
        </div>
        <p className="error-page-status">404</p>
        <h1
          style={{ margin: 0 }}
        >
          Page not found
        </h1>
        <p
          className="error-page-description"
        >
          The link you followed does not exist, or the page has been removed.
        </p>
        <div className="error-page-actions">
          <Link to="/" className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>Return to home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
