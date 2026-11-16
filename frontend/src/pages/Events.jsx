// Events management page with desktop sidebar and mobile top bar.
// Displays the list of events, dates, member counts, copy invite link button, and create event form.

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  FolderPlus,
  KeyRound,
  Shield,
  Search,
} from 'lucide-react';
import { api } from '../api';
import CreateEvent from './CreateEvent';
import PhotoGallery from '../components/PhotoGallery';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

// Helper to format date ranges cleanly in plain English
function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return null;
  }

  const options = { month: 'short', day: 'numeric', year: 'numeric' };

  if (startDate && endDate) {
    const start = new Date(startDate).toLocaleDateString(undefined, options);
    const end = new Date(endDate).toLocaleDateString(undefined, options);
    return `${start} to ${end}`;
  }

  if (startDate) {
    return `Starting ${new Date(startDate).toLocaleDateString(undefined, options)}`;
  }

  return `Ending ${new Date(endDate).toLocaleDateString(undefined, options)}`;
}

export default function Events() {
  const { id: routeEventId } = useParams();
  const navigate = useNavigate();

  useDocumentMeta('My Events', 'Manage and view your shared photo events.');

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(routeEventId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  // Fetch list of events the logged-in user belongs to
  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/events/');
        if (isMounted) {
          const list = Array.isArray(data) ? data : [];
          setEvents(list);

          // If a route param was provided, select it; otherwise select the first event
          if (routeEventId) {
            setSelectedEventId(routeEventId);
          } else if (list.length > 0) {
            setSelectedEventId((prev) => prev || list[0].id || list[0].pk);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load your events.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [routeEventId]);

  const selectedEvent = events.find(
    (e) => String(e.id || e.pk) === String(selectedEventId)
  );
  const searchTerm = eventSearch.trim().toLowerCase();
  const filteredEvents = events.filter((event) =>
    `${event.name || ''} ${event.description || ''}`.toLowerCase().includes(searchTerm)
  );

  const renderEventSearch = (id) => (
    <div className="event-search">
      <Search size={16} aria-hidden="true" />
      <input
        id={id}
        className="input"
        type="search"
        aria-label="Search events by name or description"
        placeholder="Search events"
        value={eventSearch}
        onChange={(event) => setEventSearch(event.target.value)}
      />
    </div>
  );

  // Copy full invite link to clipboard without QR codes
  const handleCopyInviteLink = (inviteCode) => {
    if (!inviteCode) return;
    const inviteUrl = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(inviteCode);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  // Callback when a new event is created
  const handleEventCreated = (newEvent) => {
    setEvents((prev) => [newEvent, ...prev]);
    const newId = newEvent.id || newEvent.pk;
    setSelectedEventId(newId);
    setIsCreating(false);
    navigate(`/events/${newId}`);
  };

  // Submit manual invite code to join an event
  const handleManualJoin = async (e) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim();
    if (!cleanCode) {
      setJoinError('Please enter a valid invite code.');
      return;
    }

    setIsJoining(true);
    setJoinError('');
    try {
      const response = await api.post('/events/join/', { invite_code: cleanCode });
      setShowJoinModal(false);
      setJoinCodeInput('');

      // Refresh events list
      const updatedEvents = await api.get('/events/');
      setEvents(updatedEvents);

      const targetId = response.event?.id || response.event?.pk;
      if (targetId) {
        setSelectedEventId(targetId);
        navigate(`/events/${targetId}`);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join event with this code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 120px)',
      }}
    >
      {/* Mobile Top Bar (visible on narrow screens < 768px) */}
      <div
        className="mobile-events-bar"
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-subtle)',
          padding: 'var(--space-3) var(--space-4)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
            marginBottom: events.length > 0 ? 'var(--space-2)' : 0,
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
            Events ({events.length})
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
            >
              <KeyRound size={14} />
              <span>Join code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                navigate('/events');
              }}
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem' }}
            >
              <Plus size={14} />
              <span>Create</span>
            </button>
          </div>
        </div>

        {events.length > 0 && (
          <>
            {renderEventSearch('mobile-event-search')}
            {filteredEvents.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  overflowX: 'auto',
                  paddingBottom: 'var(--space-1)',
                }}
              >
                {filteredEvents.map((evt) => {
                  const evtId = evt.id || evt.pk;
                  const isSelected = !isCreating && String(selectedEventId) === String(evtId);
                  return (
                    <button
                      key={evtId}
                      type="button"
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedEventId(evtId);
                        navigate(`/events/${evtId}`);
                      }}
                      style={{
                        flexShrink: 0,
                        padding: '0.375rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                        backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-bg)',
                        color: isSelected ? 'var(--color-accent-fg)' : 'var(--color-text)',
                        fontSize: '0.8125rem',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {evt.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="event-search-empty">No events match your search.</p>
            )}
          </>
        )}
      </div>

      <div
        className="events-layout-container"
        style={{
          display: 'flex',
          flex: 1,
        }}
      >
        {/* Desktop Left Sidebar (hidden on mobile via CSS media query) */}
        <aside
          className="desktop-events-sidebar"
          style={{
            width: '300px',
            flexShrink: 0,
            borderRight: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-subtle)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: 'var(--space-4)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                margin: 0,
                color: 'var(--color-text)',
              }}
            >
              My Events
            </h2>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="btn btn-secondary"
                style={{ padding: '0.3125rem 0.625rem', fontSize: '0.75rem' }}
                title="Join an event using an invite code"
              >
                <KeyRound size={13} />
                <span>Join</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  navigate('/events');
                }}
                className="btn btn-primary"
                style={{ padding: '0.3125rem 0.625rem', fontSize: '0.75rem' }}
              >
                <Plus size={13} />
                <span>New</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 'var(--space-8)',
                  gap: 'var(--space-2)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                <span>Loading events...</span>
              </div>
            )}

            {!loading && events.length === 0 && (
              <div
                style={{
                  padding: 'var(--space-6) var(--space-4)',
                  textAlign: 'center',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.8125rem',
                }}
              >
                <p style={{ margin: '0 0 var(--space-3) 0' }}>No events found.</p>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.8125rem' }}
                >
                  <Plus size={14} />
                  <span>Create first event</span>
                </button>
              </div>
            )}

            {!loading && events.length > 0 && (
              <div className="event-search event-search-sidebar">
                <Search size={16} aria-hidden="true" />
                <input
                  id="desktop-event-search"
                  className="input"
                  type="search"
                  aria-label="Search events by name or description"
                  placeholder="Search events"
                  value={eventSearch}
                  onChange={(event) => setEventSearch(event.target.value)}
                />
              </div>
            )}

            {!loading &&
              filteredEvents.map((evt) => {
                const evtId = evt.id || evt.pk;
                const isSelected = !isCreating && String(selectedEventId) === String(evtId);
                const dates = formatDateRange(evt.start_date, evt.end_date);

                return (
                  <button
                    key={evtId}
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setSelectedEventId(evtId);
                      navigate(`/events/${evtId}`);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: 'var(--space-3) var(--space-3)',
                      marginBottom: 'var(--space-1)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-accent)' : 'transparent',
                      backgroundColor: isSelected ? 'var(--color-bg)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 100ms ease, border-color 100ms ease',
                      display: 'block',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '0.875rem',
                          color: 'var(--color-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {evt.name}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            evt.my_role === 'owner' ? 'rgba(25, 113, 194, 0.1)' : 'var(--color-bg-muted)',
                          color:
                            evt.my_role === 'owner' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                          fontWeight: 500,
                          flexShrink: 0,
                          textTransform: 'capitalize',
                        }}
                      >
                        {evt.my_role || 'member'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} />
                        {evt.member_count || 1} {evt.member_count === 1 ? 'member' : 'members'}
                      </span>
                      {dates && (
                        <span
                          style={{
                            maxWidth: '130px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {dates}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

            {!loading && events.length > 0 && filteredEvents.length === 0 && (
              <p className="event-search-empty">No events match your search.</p>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: 'var(--space-6) var(--space-6)',
            overflowY: 'auto',
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(201, 42, 42, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          {isCreating ? (
            <CreateEvent
              onCreated={handleEventCreated}
              onCancel={() => {
                setIsCreating(false);
                if (events.length > 0 && !selectedEventId) {
                  setSelectedEventId(events[0].id || events[0].pk);
                }
              }}
            />
          ) : selectedEvent ? (
            <div>
              {/* Event Header Banner */}
              <div
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: 'var(--space-6)',
                  marginBottom: 'var(--space-6)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <div>
                    <h1
                      style={{
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        margin: '0 0 var(--space-2) 0',
                        color: 'var(--color-text)',
                      }}
                    >
                      {selectedEvent.name}
                    </h1>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Users size={16} />
                        <span>
                          {selectedEvent.member_count || 1}{' '}
                          {selectedEvent.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>

                      {formatDateRange(selectedEvent.start_date, selectedEvent.end_date) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <Calendar size={16} />
                          <span>
                            {formatDateRange(selectedEvent.start_date, selectedEvent.end_date)}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <Shield size={16} />
                        <span style={{ textTransform: 'capitalize' }}>
                          Role: {selectedEvent.my_role || 'member'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Copy Invite Link Action Button */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => handleCopyInviteLink(selectedEvent.invite_code)}
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}
                      title="Copy public invitation link"
                    >
                      {copiedCode === selectedEvent.invite_code ? (
                        <>
                          <Check size={16} color="var(--color-success)" />
                          <span style={{ color: 'var(--color-success)' }}>Link copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          <span>Copy invite link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {selectedEvent.description && (
                  <p
                    style={{
                      fontSize: '0.9375rem',
                      color: 'var(--color-text)',
                      margin: 'var(--space-3) 0 0 0',
                      lineHeight: 1.5,
                      maxWidth: '720px',
                    }}
                  >
                    {selectedEvent.description}
                  </p>
                )}
              </div>

              {/* Event Photos Gallery */}
              <PhotoGallery
                key={selectedEvent.id || selectedEvent.pk}
                eventId={selectedEvent.id || selectedEvent.pk}
              />
            </div>
          ) : (
            /* Plain Empty State */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                textAlign: 'center',
                padding: 'var(--space-8)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <FolderPlus size={28} />
              </div>
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  marginBottom: 'var(--space-2)',
                  color: 'var(--color-text)',
                }}
              >
                No events yet
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                  maxWidth: '360px',
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-6)',
                }}
              >
                Create your first event to start collecting full-quality photos from everyone in your group.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="btn btn-primary"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  <Plus size={16} />
                  <span>Create an event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(true)}
                  className="btn btn-secondary"
                  style={{ padding: '0.625rem 1.25rem' }}
                >
                  <KeyRound size={16} />
                  <span>Join with code</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Manual Join Modal */}
      {showJoinModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              maxWidth: '420px',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                margin: '0 0 var(--space-2) 0',
                color: 'var(--color-text)',
              }}
            >
              Join an event
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                margin: '0 0 var(--space-4) 0',
              }}
            >
              Enter the invite code shared by the event organizer.
            </p>

            {joinError && (
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
                {joinError}
              </div>
            )}

            <form onSubmit={handleManualJoin}>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label
                  htmlFor="joinCode"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    marginBottom: 'var(--space-1)',
                    color: 'var(--color-text)',
                  }}
                >
                  Invite code
                </label>
                <input
                  id="joinCode"
                  type="text"
                  required
                  placeholder="e.g. ab12CD34ef"
                  className="input"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  disabled={isJoining}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinError('');
                  }}
                  className="btn btn-secondary"
                  disabled={isJoining}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isJoining}
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <span>Join event</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
