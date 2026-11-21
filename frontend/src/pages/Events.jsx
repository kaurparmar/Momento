// Events management page with desktop sidebar and mobile top bar.
// Displays events and lets owners manage event members and invite links.

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
  UserMinus,
  UserRound,
  X,
  Pencil,
  Trash2,
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

function dedupeEvents(events) {
  const uniqueEvents = new Map();
  events.forEach((event) => {
    const eventId = event.id || event.pk;
    if (eventId) {
      uniqueEvents.set(String(eventId), event);
    }
  });
  return Array.from(uniqueEvents.values());
}

function EventMembersPanel({ eventId, eventName, onMemberRevoked, onClose }) {
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [revokingMemberId, setRevokingMemberId] = useState(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    api.get(`/events/${eventId}/members/`)
      .then((data) => {
        if (isMounted) {
          setMembers(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setMembersError(err.message || 'Failed to load event members.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setMembersLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const handleRevokeMember = async (member) => {
    const memberName = member.display_name || member.email;
    if (!window.confirm(
      `Remove ${memberName} from "${eventName}"? This will revoke their access and replace the invite link. Anyone using the old link will need the new one.`
    )) {
      return;
    }

    setRevokingMemberId(member.user_id);
    setMembersError('');
    try {
      const response = await api.delete(`/events/${eventId}/members/${member.user_id}/`);
      setMembers((previous) => previous.filter((item) => item.user_id !== member.user_id));
      onMemberRevoked(eventId, response.invite_code);
    } catch (err) {
      setMembersError(err.message || 'Failed to revoke member access.');
    } finally {
      setRevokingMemberId(null);
    }
  };

  return (
    <div className="event-members-overlay" role="dialog" aria-modal="true" aria-labelledby="event-members-heading">
      <button
        type="button"
        className="event-members-backdrop"
        aria-label="Close members"
        onClick={onClose}
        tabIndex={-1}
      />
      <section className="event-members-modal p-4">
        <div className="event-members-modal-header">
          <h2 id="event-members-heading">
            <Users size={18} />
            Members ({members.length})
          </h2>
          <button
            type="button"
            className="btn btn-secondary event-members-close"
            onClick={onClose}
            aria-label="Close members"
            title="Close members"
          >
            <X size={16} />
          </button>
        </div>

        <div className="event-members-modal-body p-7">
          {membersError && (
            <div role="alert" className="event-members-error">
              {membersError}
            </div>
          )}

          {membersLoading ? (
            <div className="event-members-loading p-4">
              <Loader2 size={16} className="animate-spin" />
              <span>Loading members...</span>
            </div>
          ) : (
            <div className="event-members-list">
              {members.map((member) => (
                <div key={member.user_id} className="event-member-row">
                  <div className="event-member-info">
                    <UserRound size={18} />
                    <div>
                      <div className="event-member-name">
                        {member.display_name || member.email}
                        {member.role === 'owner' && <span> (owner)</span>}
                      </div>
                      <div className="event-member-email">{member.email}</div>
                    </div>
                  </div>

                  {member.role !== 'owner' && (
                    <button
                      type="button"
                      className="btn btn-secondary event-member-revoke"
                      aria-label={`Revoke access for ${member.display_name || member.email}`}
                      title="Revoke access"
                      disabled={revokingMemberId !== null}
                      onClick={() => handleRevokeMember(member)}
                    >
                      {revokingMemberId === member.user_id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <UserMinus size={14} />
                      )}
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
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
  const [showMembersEventId, setShowMembersEventId] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [eventNameInput, setEventNameInput] = useState('');
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch list of events the logged-in user belongs to
  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setLoading(true);
      setError('');
      try {
        const data = await api.get('/events/');
        if (isMounted) {
          const list = dedupeEvents(Array.isArray(data) ? data : []);
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

  useEffect(() => {
    if (!showMembersEventId) {
      return undefined;
    }

    const closeMembersOnEscape = (event) => {
      if (event.key === 'Escape') {
        setShowMembersEventId(null);
        document.querySelector('.event-members-overlay')?.remove();
        document.body.style.overflow = '';
      }
    };

    window.addEventListener('keydown', closeMembersOnEscape);
    return () => window.removeEventListener('keydown', closeMembersOnEscape);
  }, [showMembersEventId]);

  useEffect(() => {
    if (!showRenameModal && !showDeleteModal) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeManagementModal = (event) => {
      if (event.key === 'Escape') {
        setShowRenameModal(false);
        setShowDeleteModal(false);
      }
    };

    window.addEventListener('keydown', closeManagementModal);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeManagementModal);
    };
  }, [showRenameModal, showDeleteModal]);

  const selectedEvent = events.find(
    (e) => String(e.id || e.pk) === String(selectedEventId)
  );
  const searchTerm = eventSearch.trim().toLowerCase();
  const filteredEvents = events.filter((event) =>
    `${event.name || ''} ${event.description || ''}`.toLowerCase().includes(searchTerm)
  );

  const closeMembers = () => {
    setShowMembersEventId(null);
    document.querySelector('.event-members-overlay')?.remove();
    document.body.style.overflow = '';
  };

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
    const inviteUrl = `${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(inviteCode);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const openRenameModal = () => {
    setEventNameInput(selectedEvent.name);
    setRenameError('');
    setShowRenameModal(true);
  };

  const handleRenameEvent = async (e) => {
    e.preventDefault();
    const cleanName = eventNameInput.trim();
    if (!cleanName) {
      setRenameError('Event name is required.');
      return;
    }

    setIsRenaming(true);
    setRenameError('');
    try {
      const updatedEvent = await api.patch(`/events/${selectedEventId}/`, { name: cleanName });
      setEvents((previous) =>
        dedupeEvents(
          previous.map((event) => {
            const eventId = event.id || event.pk;
            return String(eventId) === String(selectedEventId) ? updatedEvent : event;
          })
        )
      );
      setShowRenameModal(false);
    } catch (err) {
      setRenameError(err.message || 'Failed to rename event.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteEvent = async () => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/events/${selectedEventId}/`);
      const remainingEvents = dedupeEvents(
        events.filter((event) => {
          const eventId = event.id || event.pk;
          return String(eventId) !== String(selectedEventId);
        })
      );
      setEvents(remainingEvents);
      setShowDeleteModal(false);
      setShowMembersEventId(null);

      if (remainingEvents.length > 0) {
        const nextEventId = remainingEvents[0].id || remainingEvents[0].pk;
        setSelectedEventId(nextEventId);
        navigate(`/events/${nextEventId}`);
      } else {
        setSelectedEventId(null);
        navigate('/events');
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete event.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Callback when a new event is created
  const handleEventCreated = (newEvent) => {
    setEvents((prev) => dedupeEvents([newEvent, ...prev]));
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
      setEvents(dedupeEvents(Array.isArray(updatedEvents) ? updatedEvents : []));

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
                      {selectedEvent.my_role === 'owner' ? (
                        <button
                          type="button"
                          className="event-members-trigger"
                          title="See members"
                          aria-label={`See members of ${selectedEvent.name}`}
                          aria-expanded={showMembersEventId === (selectedEvent.id || selectedEvent.pk)}
                          onClick={() =>
                            setShowMembersEventId((openEventId) =>
                              openEventId === (selectedEvent.id || selectedEvent.pk)
                                ? null
                                : (selectedEvent.id || selectedEvent.pk)
                            )
                          }
                        >
                          <Users size={16} />
                          <span>
                            {selectedEvent.member_count || 1}{' '}
                            {selectedEvent.member_count === 1 ? 'member' : 'members'}
                          </span>
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <Users size={16} />
                          <span>
                            {selectedEvent.member_count || 1}{' '}
                            {selectedEvent.member_count === 1 ? 'member' : 'members'}
                          </span>
                        </div>
                      )}

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
                    {selectedEvent.my_role === 'owner' && (
                      <>
                        <button
                          type="button"
                          onClick={openRenameModal}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}
                          title="Rename event"
                        >
                          <Pencil size={16} />
                          <span>Rename</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setShowDeleteModal(true);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', color: 'var(--color-danger)' }}
                          title="Delete event"
                        >
                          <Trash2 size={16} />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
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

              {selectedEvent.my_role === 'owner' &&
                showMembersEventId === (selectedEvent.id || selectedEvent.pk) && (
                <EventMembersPanel
                  key={selectedEvent.id || selectedEvent.pk}
                  eventId={selectedEvent.id || selectedEvent.pk}
                  eventName={selectedEvent.name}
                  onClose={closeMembers}
                  onMemberRevoked={(eventId, inviteCode) =>
                    setEvents((previous) =>
                      previous.map((event) => {
                        const currentId = event.id || event.pk;
                        if (String(currentId) !== String(eventId)) {
                          return event;
                        }
                        return {
                          ...event,
                          member_count: Math.max(0, (event.member_count || 0) - 1),
                          invite_code: inviteCode,
                        };
                      })
                    )
                  }
                />
              )}

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

      {showRenameModal && selectedEvent && (
        <div className="event-management-overlay" role="dialog" aria-modal="true" aria-labelledby="rename-event-heading">
          <button
            type="button"
            className="event-management-backdrop"
            aria-label="Close rename event"
            onClick={() => setShowRenameModal(false)}
            tabIndex={-1}
          />
          <form className="event-management-modal" onSubmit={handleRenameEvent}>
            <div className="event-management-header p-7">
              <div>
                <h2 id="rename-event-heading">Rename event</h2>
                <p>Change the name shown in this shared album.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary event-members-close"
                onClick={() => setShowRenameModal(false)}
                aria-label="Close rename event"
                disabled={isRenaming}
              >
                <X size={16} />
              </button>
            </div>

            <div className="event-management-body p-7">
              {renameError && (
                <div role="alert" className="event-management-error">
                  {renameError}
                </div>
              )}
              <label htmlFor="event-name-input">Event name</label>
              <input
                id="event-name-input"
                className="input"
                type="text"
                maxLength={200}
                value={eventNameInput}
                onChange={(e) => setEventNameInput(e.target.value)}
                disabled={isRenaming}
                autoFocus
              />
            </div>

            <div className="event-management-actions p-7">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRenameModal(false)}
                disabled={isRenaming}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isRenaming}>
                {isRenaming ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                <span>{isRenaming ? 'Saving...' : 'Save name'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {showDeleteModal && selectedEvent && (
        <div className="event-management-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-event-heading">
          <button
            type="button"
            className="event-management-backdrop"
            aria-label="Close delete event"
            onClick={() => setShowDeleteModal(false)}
            tabIndex={-1}
          />
          <div className="event-management-modal event-delete-modal p-7">
            <div className="event-management-header p-4">
              <div>
                <h2 id="delete-event-heading">Delete event</h2>
                <p>Permanently delete &quot;{selectedEvent.name}&quot;?</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary event-members-close"
                onClick={() => setShowDeleteModal(false)}
                aria-label="Close delete event"
                disabled={isDeleting}
              >
                <X size={16} />
              </button>
            </div>

            <div className="event-management-body p-4">
              {deleteError && (
                <div role="alert" className="event-management-error">
                  {deleteError}
                </div>
              )}
              <p className="event-delete-warning">
                This removes the event, memberships, photos, and favorites. This action cannot be undone.
              </p>
            </div>

            <div className="event-management-actions p-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span>{isDeleting ? 'Deleting...' : 'Delete event'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
