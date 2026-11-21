// Public landing page explaining product functionality in three clear steps with one call to action.
// Free of testimonials, customer counters, stock photography, and AI-generated imagery.

import { Link } from 'react-router-dom';
import { ArrowRight, FolderPlus, UploadCloud, DownloadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Home() {
  const { isAuthenticated } = useAuth();

  useDocumentMeta(
    'PhotoDrop - Full Quality Event Photo Sharing',
    'One shared album for your trip. Everyone uploads, everyone downloads what they want.'
  );

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: 'var(--space-12) var(--space-4) var(--space-16) var(--space-4)',
      }}
    >
      {/* Hero Section */}
      <section
        style={{
          textAlign: 'left',
          maxWidth: '760px',
          marginBottom: 'var(--space-16)',
        }}
      >
        <p
          style={{
            color: 'var(--color-accent)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 var(--space-3) 0',
          }}
        >
          Shared event photo albums
        </p>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            margin: '0 0 var(--space-4) 0',
            color: 'var(--color-text)',
          }}
        >
          One shared album for your trip. Everyone uploads, everyone downloads what they want.
        </h1>

        <p
          style={{
            fontSize: '1.125rem',
            lineHeight: 1.6,
            color: 'var(--color-text-muted)',
            margin: '0 0 var(--space-8) 0',
          }}
        >
          Create an event, send an invite link to your group, and collect every picture at full resolution.
          No compression, no social media feeds, and no complex setup.
        </p>

        <div>
          <Link
            to={isAuthenticated ? '/events' : '/register'}
            className="btn btn-primary"
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            <span>{isAuthenticated ? 'Go to your events' : 'Create an event'}</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Three Real Steps */}
      <section>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            marginBottom: 'var(--space-6)',
            color: 'var(--color-text)',
          }}
        >
          How it works
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {/* Step 1 */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <FolderPlus size={20} />
            </div>

            <h3
              style={{
                fontSize: '1.0625rem',
                fontWeight: 600,
                margin: '0 0 var(--space-2) 0',
                color: 'var(--color-text)',
              }}
            >
              1. Create an event
            </h3>

            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Start an album with a title and optional dates. You receive a private invite link and code
              to share with friends or family.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <UploadCloud size={20} />
            </div>

            <h3
              style={{
                fontSize: '1.0625rem',
                fontWeight: 600,
                margin: '0 0 var(--space-2) 0',
                color: 'var(--color-text)',
              }}
            >
              2. Everyone uploads
            </h3>

            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Members drag and drop photos from phones or laptops. Files are saved at original quality
              without image compression.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-bg-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-accent)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <DownloadCloud size={20} />
            </div>

            <h3
              style={{
                fontSize: '1.0625rem',
                fontWeight: 600,
                margin: '0 0 var(--space-2) 0',
                color: 'var(--color-text)',
              }}
            >
              3. Download what you want
            </h3>

            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.5,
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Filter by person, favorites, or calendar date. Select the shots you want and download them
              individually or as a single zip archive.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
