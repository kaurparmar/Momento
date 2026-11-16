// Profile page showing account details and letting the user update their display name.

import { useState } from 'react';
import { AlertCircle, Check, Loader2, Save, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export default function Profile() {
  useDocumentMeta('Your profile', 'View your account details and update your display name.');

  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanName = displayName.trim();
    if (!cleanName) {
      setError('Display name cannot be empty.');
      setSaved(false);
      return;
    }

    setIsSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateProfile(cleanName);
      setDisplayName(cleanName);
      setSaved(true);
    } catch (requestError) {
      setError(requestError.message || 'Could not update your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = displayName.trim() !== (user?.display_name || '');

  return (
    <section className="profile-page">
      <div className="profile-card card">
        <div className="profile-heading">
          <div className="profile-icon" aria-hidden="true">
            <UserRound size={22} />
          </div>
          <div>
            <h1>Your profile</h1>
            <p>View your account details and update your display name.</p>
          </div>
        </div>

        <dl className="profile-details">
          <div>
            <dt>Email address</dt>
            <dd>{user?.email}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit}>
          <label htmlFor="profile-display-name" className="profile-label">
            Display name
          </label>
          <input
            id="profile-display-name"
            className="input"
            type="text"
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setSaved(false);
            }}
            maxLength={100}
            autoComplete="name"
            required
            disabled={isSaving}
          />

          {error && (
            <p className="profile-feedback profile-error" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              {error}
            </p>
          )}
          {saved && (
            <p className="profile-feedback profile-success" role="status">
              <Check size={16} aria-hidden="true" />
              Profile updated.
            </p>
          )}

          <button
            className="btn btn-primary profile-save"
            type="submit"
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
