// Top navigation bar showing application title, active user info, and authentication actions.
// Adapts cleanly between mobile screens (360px) and wide desktop displays (1600px).
// Includes an account deletion option with confirmation modal.

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Camera,
  LogOut,
  User,
  LogIn,
  UserPlus,
  Trash2,
  AlertTriangle,
  Loader2,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, deleteAccount, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="site-header-inner"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0.75rem var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
          }}
        >
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              textDecoration: 'none',
              color: 'var(--color-text)',
              fontWeight: 600,
              fontSize: '1.125rem',
            }}
          >
            <Camera size={20} color="var(--color-accent)" />
            <span>PhotoDrop</span>
          </Link>

          <nav
            id="site-navigation"
            className={`site-navigation${isMenuOpen ? ' is-open' : ''}`}
            aria-label="Main navigation"
          >
            <div className="mobile-nav-drawer-header">
              <span>Menu</span>
              <button
                type="button"
                className="btn btn-secondary mobile-nav-close"
                aria-label="Close menu"
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              className="btn theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {isAuthenticated ? (
              <>
                <Link
                  to="/events"
                  className="site-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Events
                </Link>

                <Link
                  to="/profile"
                  className="site-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                >
                  <User size={16} />
                  <span>{user?.display_name || user?.email}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.375rem 0.625rem',
                    fontSize: '0.75rem',
                    color: 'var(--color-danger)',
                  }}
                  title="Delete my account"
                >
                  <Trash2 size={13} />
                  <span>Delete account</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                  aria-label="Log out"
                >
                  <LogOut size={14} />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-secondary"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <LogIn size={14} />
                  <span>Log in</span>
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
                >
                  <UserPlus size={14} />
                  <span>Register</span>
                </Link>
              </>
            )}
          </nav>

          <button
            type="button"
            className="btn btn-secondary site-nav-toggle"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="site-navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsMenuOpen(false)}
          tabIndex={-1}
        />
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <AlertTriangle size={20} color="var(--color-danger)" />
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                Delete my account
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete your account? This action permanently removes your account,
              all photos you uploaded, and any events you created. This cannot be undone.
            </p>

            {deleteError && (
              <div
                role="alert"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(201, 42, 42, 0.1)',
                  border: '1px solid var(--color-danger)',
                  color: 'var(--color-danger)',
                  fontSize: '0.8125rem',
                  marginBottom: 'var(--space-3)',
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                }}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="btn btn-danger"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete my account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
