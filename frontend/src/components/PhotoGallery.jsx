// Photo Gallery component featuring CSS columns masonry layout, multi-filter tags,
// file drag-and-drop upload with per-file progress bars, photo selection with batch zip download,
// favorite like toggles, paginated load more button, and an accessible keyboard lightbox.

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  UploadCloud,
  Download,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Image as ImageIcon,
  CheckSquare,
  Square,
} from 'lucide-react';
import { api, uploadPhotoWithProgress, downloadEventPhotosZip } from '../api';

export default function PhotoGallery({ eventId }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state: 'all' | 'mine' | 'favorites' | specific YYYY-MM-DD string
  const [activeFilter, setActiveFilter] = useState('all');
  const [availableDays, setAvailableDays] = useState([]);

  // Selection state for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [zipError, setZipError] = useState('');

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Upload queue state: array of { id, file, name, size, progress, status, error }
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Build query string based on active filter and page
  const buildQuery = useCallback(
    (pageNum, filter) => {
      const params = new URLSearchParams();
      params.set('page', pageNum);

      if (filter === 'mine') {
        params.set('mine', 'true');
      } else if (filter === 'favorites') {
        params.set('favorites', 'true');
      } else if (filter && filter !== 'all') {
        // Specific calendar day
        params.set('day', filter);
      }

      return params.toString();
    },
    []
  );

  // Load photos from API
  const fetchPhotos = useCallback(
    async (pageNum = 1, filter = activeFilter, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const query = buildQuery(pageNum, filter);
        const data = await api.get(`/events/${eventId}/photos/?${query}`);
        const fetched = data.results || [];

        if (append) {
          setPhotos((prev) => [...prev, ...fetched]);
        } else {
          setPhotos(fetched);
        }

        setPage(data.current_page || pageNum);
        setTotalPages(data.total_pages || 1);

        // Collect distinct days from fetched photos for the day filter tags
        if (!append && fetched.length > 0) {
          const daysSet = new Set();
          fetched.forEach((p) => {
            if (p.taken_at) {
              const dayStr = p.taken_at.slice(0, 10);
              daysSet.add(dayStr);
            }
          });
          setAvailableDays(Array.from(daysSet));
        }
      } catch (err) {
        setError(err.message || 'Failed to load photos.');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventId, activeFilter, buildQuery]
  );

  // Reload photos whenever active filter or eventId changes
  useEffect(() => {
    setSelectedIds(new Set());
    setPage(1);
    fetchPhotos(1, activeFilter, false);
  }, [eventId, activeFilter, fetchPhotos]);

  // Load next page when "Load more" is clicked
  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      fetchPhotos(page + 1, activeFilter, true);
    }
  };

  // Keyboard navigation for the lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1 < photos.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 >= 0 ? prev - 1 : photos.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, photos.length]);

  // Toggle favorite status on a photo
  const handleToggleLike = async (photoId, e) => {
    e.stopPropagation();

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const isLiked = photo.liked_by_me;
    // Optimistic UI update
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === photoId) {
          return {
            ...p,
            liked_by_me: !isLiked,
            like_count: isLiked ? Math.max(0, p.like_count - 1) : p.like_count + 1,
          };
        }
        return p;
      })
    );

    try {
      if (isLiked) {
        await api.delete(`/photos/${photoId}/like/`);
      } else {
        await api.post(`/photos/${photoId}/like/`);
      }
    } catch {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id === photoId) {
            return {
              ...p,
              liked_by_me: isLiked,
              like_count: photo.like_count,
            };
          }
          return p;
        })
      );
    }
  };

  // Toggle selection checkbox on a photo
  const handleToggleSelect = (photoId, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
        return next;
      }
      if (next.size >= 50) {
        return next;
      }
      next.add(photoId);
      return next;
    });

    if (selectedIds.has(photoId)) {
      setZipError('');
    } else if (selectedIds.size >= 50) {
      setZipError('Maximum 50 photos can be selected for a single zip archive.');
    } else {
      setZipError('');
    }
  };

  const allVisiblePhotosSelected =
    photos.length > 0 && photos.every((photo) => selectedIds.has(photo.id));

  const handleToggleSelectAll = () => {
    const next = new Set(selectedIds);

    if (allVisiblePhotosSelected) {
      photos.forEach((photo) => next.delete(photo.id));
      setZipError('');
    } else {
      const missingVisibleIds = photos
        .map((photo) => photo.id)
        .filter((photoId) => !next.has(photoId));
      const availableSlots = Math.max(0, 50 - next.size);

      missingVisibleIds.slice(0, availableSlots).forEach((photoId) => next.add(photoId));

      if (missingVisibleIds.length > availableSlots) {
        setZipError('Maximum 50 photos can be selected for a single zip archive.');
      } else {
        setZipError('');
      }
    }
    setSelectedIds(next);
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setZipError('');
  };

  // Batch download selected photos as a zip archive
  const handleDownloadZip = async () => {
    if (selectedIds.size === 0) return;

    if (selectedIds.size > 50) {
      setZipError('Maximum 50 photos can be downloaded in a single zip archive.');
      return;
    }

    setDownloadingZip(true);
    setZipError('');
    try {
      await downloadEventPhotosZip(eventId, Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      setZipError(err.message || 'Failed to download zip file.');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Process and upload a list of selected files with individual progress bars
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;

    const newQueueItems = Array.from(files).map((file, idx) => ({
      id: `${Date.now()}_${idx}_${file.name}`,
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending',
      error: null,
    }));

    setUploadQueue((prev) => [...newQueueItems, ...prev]);

    // Upload files sequentially or in small batches
    for (const item of newQueueItems) {
      // Update item status to uploading
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );

      try {
        const uploadedResult = await uploadPhotoWithProgress(
          eventId,
          item.file,
          (percent) => {
            setUploadQueue((prev) =>
              prev.map((q) =>
                q.id === item.id ? { ...q, progress: percent } : q
              )
            );
          }
        );

        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, progress: 100, status: 'complete' } : q
          )
        );

        // Prepend new photo to gallery
        const newPhotoList = Array.isArray(uploadedResult)
          ? uploadedResult
          : [uploadedResult];
        setPhotos((prev) => [...newPhotoList, ...prev]);
      } catch (uploadErr) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', error: uploadErr.message }
              : q
          )
        );
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const currentLightboxPhoto =
    lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div>
      {/* Upload Drop Zone & File Picker */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: '2px dashed',
          borderColor: isDragging ? 'var(--color-accent)' : 'var(--color-border)',
          backgroundColor: isDragging ? 'rgba(25, 113, 194, 0.05)' : 'var(--color-bg-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6) var(--space-4)',
          textAlign: 'center',
          marginBottom: 'var(--space-6)',
          transition: 'border-color 100ms ease, background-color 100ms ease',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-muted)',
            color: 'var(--color-accent)',
            marginBottom: 'var(--space-2)',
          }}
        >
          <UploadCloud size={22} />
        </div>

        <h3
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            margin: '0 0 var(--space-1) 0',
            color: 'var(--color-text)',
          }}
        >
          Drag and drop photos here, or click to upload
        </h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            margin: '0 0 var(--space-3) 0',
          }}
        >
          Supports JPEG, PNG, and WebP at full resolution up to 25MB each.
        </p>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-secondary"
          style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
        >
          <span>Choose files</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              handleUploadFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Upload Progress Queue List */}
      {uploadQueue.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
              Uploads ({uploadQueue.filter((q) => q.status === 'complete').length}/
              {uploadQueue.length})
            </span>
            <button
              type="button"
              onClick={() =>
                setUploadQueue((prev) => prev.filter((q) => q.status !== 'complete'))
              }
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            >
              Clear completed
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                style={{
                  fontSize: '0.8125rem',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
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
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color:
                        item.status === 'complete'
                          ? 'var(--color-success)'
                          : item.status === 'error'
                          ? 'var(--color-danger)'
                          : 'var(--color-text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {item.status === 'complete'
                      ? 'Uploaded'
                      : item.status === 'error'
                      ? item.error || 'Failed'
                      : `${item.progress}%`}
                  </span>
                </div>

                <div className="upload-progress-track">
                  <div
                    className="upload-progress-fill"
                    style={{
                      width: `${item.progress}%`,
                      backgroundColor:
                        item.status === 'error'
                          ? 'var(--color-danger)'
                          : item.status === 'complete'
                          ? 'var(--color-success)'
                          : 'var(--color-accent)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tags: Rectangular (never pills) */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {photos.length > 0 && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className={`filter-tag ${allVisiblePhotosSelected ? 'filter-tag-active' : ''}`}
            aria-pressed={allVisiblePhotosSelected}
          >
            {allVisiblePhotosSelected ? <Square size={13} /> : <CheckSquare size={13} />}
            <span>{allVisiblePhotosSelected ? 'Deselect all' : 'Select all'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`filter-tag ${activeFilter === 'all' ? 'filter-tag-active' : ''}`}
        >
          All photos
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('mine')}
          className={`filter-tag ${activeFilter === 'mine' ? 'filter-tag-active' : ''}`}
        >
          My uploads
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('favorites')}
          className={`filter-tag ${activeFilter === 'favorites' ? 'filter-tag-active' : ''}`}
        >
          Favorites
        </button>

        {availableDays.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveFilter(activeFilter === day ? 'all' : day)}
            className={`filter-tag ${activeFilter === day ? 'filter-tag-active' : ''}`}
          >
            <Calendar size={13} />
            <span>{day}</span>
          </button>
        ))}
      </div>

      {/* Error state */}
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

      {/* Loading state */}
      {loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-12)',
            gap: 'var(--space-2)',
            color: 'var(--color-text-muted)',
            fontSize: '0.875rem',
          }}
        >
          <Loader2 size={20} className="animate-spin" />
          <span>Loading gallery photos...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && photos.length === 0 && (
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: 'var(--space-12) var(--space-4)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-3)',
              color: 'var(--color-text-muted)',
            }}
          >
            <ImageIcon size={24} />
          </div>
          <h3
            style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              margin: '0 0 var(--space-1) 0',
              color: 'var(--color-text)',
            }}
          >
            No photos found
          </h3>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '380px',
              margin: '0 auto var(--space-4) auto',
              lineHeight: 1.5,
            }}
          >
            {activeFilter !== 'all'
              ? 'No photos match the selected filter. Try switching back to all photos.'
              : 'Be the first to upload photos to this event album.'}
          </p>
          {activeFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className="btn btn-secondary"
            >
              Show all photos
            </button>
          )}
        </div>
      )}

      {/* Photo Grid using CSS Columns: 2 on phones, up to 5 on wide screens */}
      {!loading && photos.length > 0 && (
        <div className="photo-grid-columns">
          {photos.map((photo, index) => {
            const isSelected = selectedIds.has(photo.id);
            const isLiked = Boolean(photo.liked_by_me);

            return (
              <div
                key={photo.id}
                className="photo-grid-item"
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-bg-muted)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                  cursor: 'pointer',
                }}
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={photo.thumbnail_url || photo.original_url}
                  alt={photo.original_filename || 'Event photo'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    display: 'block',
                    objectFit: 'cover',
                  }}
                />

                {/* Top overlay: Checkbox for selection */}
                <div
                  style={{
                    position: 'absolute',
                    top: 'var(--space-2)',
                    left: 'var(--space-2)',
                    zIndex: 10,
                  }}
                  onClick={(e) => handleToggleSelect(photo.id, e)}
                >
                  <button
                    type="button"
                    aria-label={isSelected ? 'Deselect photo' : 'Select photo'}
                    style={{
                      background: isSelected ? 'var(--color-accent)' : 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.4)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </div>

                {/* Bottom overlay: Favorite toggle with like count */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'var(--space-2)',
                    right: 'var(--space-2)',
                    zIndex: 10,
                  }}
                  onClick={(e) => handleToggleLike(photo.id, e)}
                >
                  <button
                    type="button"
                    aria-label={isLiked ? 'Unlike photo' : 'Like photo'}
                    style={{
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: isLiked ? '#f85149' : '#ffffff',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    <Heart
                      size={14}
                      fill={isLiked ? '#f85149' : 'transparent'}
                      color={isLiked ? '#f85149' : '#ffffff'}
                    />
                    <span>{photo.like_count || 0}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button for Pagination */}
      {!loading && page < totalPages && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn btn-secondary"
            style={{ padding: '0.625rem 1.5rem', fontSize: '0.875rem' }}
          >
            {loadingMore ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Loading more photos...</span>
              </>
            ) : (
              <span>Load more photos</span>
            )}
          </button>
        </div>
      )}

      {/* Floating Selection Bottom Bar */}
      {selectedIds.size > 0 && (
        <div className="selection-bottom-bar" role="toolbar" aria-label="Selected photos actions">
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'photo' : 'photos'} selected
          </div>

          {zipError && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }}>
              {zipError}
            </span>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={downloadingZip}
              className="btn btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}
            >
              Clear
            </button>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="btn btn-primary"
              style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
            >
              {downloadingZip ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Preparing zip...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download zip</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Simple Accessible Lightbox */}
      {currentLightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview lightbox"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Lightbox Header with Close and Download buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-4) var(--space-6)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <span>
                {lightboxIndex + 1} of {photos.length}
              </span>
              {currentLightboxPhoto.taken_at && (
                <span style={{ marginLeft: 'var(--space-3)', color: '#8b949e' }}>
                  {new Date(currentLightboxPhoto.taken_at).toLocaleString()}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <a
                href={currentLightboxPhoto.original_url}
                download
                className="btn btn-secondary"
                style={{
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                }}
              >
                <Download size={14} />
                <span>Original</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close lightbox"
                className="btn btn-secondary"
                style={{
                  color: '#ffffff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                }}
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Main Lightbox View Area with Prev / Next Navigation */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-4)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Previous Button */}
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev - 1 >= 0 ? prev - 1 : photos.length - 1
                )
              }
              aria-label="Previous photo"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Central High-Resolution Preview Image */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '0 var(--space-4)',
              }}
            >
              <img
                src={
                  currentLightboxPhoto.medium_preview_url ||
                  currentLightboxPhoto.original_url
                }
                alt={currentLightboxPhoto.original_filename || 'Enlarged photo'}
                style={{
                  maxHeight: 'calc(100vh - 160px)',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-sm)',
                }}
              />
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() =>
                setLightboxIndex((prev) =>
                  prev + 1 < photos.length ? prev + 1 : 0
                )
              }
              aria-label="Next photo"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 'var(--radius-sm)',
                color: '#ffffff',
                padding: 'var(--space-3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
