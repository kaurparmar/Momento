# PhotoDrop Project Architecture and Beginner Guide

This guide explains the current PhotoDrop project for students, teachers, and anyone
preparing to explain or demonstrate it.

## 1. Project Purpose

PhotoDrop is a web application for sharing photos at full resolution within a private event.

The normal flow is:

1. A user registers or logs in.
2. The user creates an event.
3. PhotoDrop gives the event owner an invite code and link.
4. Other users join through the invite.
5. Members upload original photos.
6. Members view, filter, favorite, select, and download photos.
7. The owner can view members and revoke regular member access.

## 2. Technology Stack

### Frontend

- React 19
- Vite
- React Router
- Lucide React icons
- Plain CSS design tokens
- React Context for global authentication and theme state

### Backend

- Python
- Django
- Django REST Framework
- MongoEngine
- JWT access and refresh tokens
- Pillow for image processing

### Database

- MongoDB
- MongoEngine is used as the Object Document Mapper.

## 3. Folder Structure

```text
Momento/
├── backend/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── events/
│   │   └── photos/
│   ├── config/
│   ├── media/
│   ├── manage.py
│   ├── pytest.ini
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── README.md
├── RULES.md
└── EXPLAINED.md
```

## 4. Backend Applications

### `apps.accounts`

This app manages users and authentication.

It provides:

- Account registration.
- Email and password login.
- JWT access and refresh tokens.
- Profile viewing and display name updates.
- Account deletion.
- Login and registration request throttling.
- Custom MongoDB JWT authentication.

### `apps.events`

This app manages events and memberships.

It provides:

- Event creation, listing, retrieval, updates, and deletion.
- Owner and member roles.
- Event joining by invite code.
- Public invite preview.
- Owner-only member listing.
- Owner-only member access revocation.
- Leaving events for regular members.
- Invite code regeneration.

### `apps.photos`

This app manages photo data and files.

It provides:

- Multiple photo uploads.
- Photo validation.
- Original, medium, and thumbnail file storage.
- EXIF date extraction.
- Gallery pagination.
- Filters for uploader, personal uploads, favorites, and date.
- Individual photo downloads.
- ZIP downloads for selected photos.
- Photo liking and unliking.
- Uploader or owner photo deletion.

## 5. Database Models

MongoDB stores JSON-like documents. MongoEngine is used to define and query them.

### `User`

The user collection stores:

- Unique email address.
- Display name.
- Hashed password.
- Active account state.
- Creation and update timestamps.

Django password hashing is used. Plain text passwords are never stored.

### `Event`

The event collection stores:

- Event name.
- Optional description.
- Optional start and end dates.
- Optional cover photo path.
- Owner reference.
- Unique invite code.
- Creation and update timestamps.

An owner membership is created automatically when an event is created.

### `Membership`

The membership collection links a user to an event.

It stores:

- User reference.
- Event reference.
- Role, either `owner` or `member`.
- Join timestamp.

A compound unique index prevents duplicate user and event memberships.

### `Photo`

The photo collection stores:

- Event reference.
- Uploader reference.
- Original file path.
- Medium preview path.
- Thumbnail path.
- Width and height.
- Original timestamp or upload timestamp.
- Original file size.
- Creation timestamp.

### `Like`

The like collection stores:

- User reference.
- Photo reference.
- Creation timestamp.

A compound unique index prevents a user from liking the same photo twice.

## 6. Authentication Flow

The frontend stores the JWT access and refresh tokens in browser local storage.

When a user logs in:

1. React sends email and password to `/api/auth/login/`.
2. Django validates the credentials.
3. Django creates access and refresh tokens.
4. React stores both tokens and sets the current user.

Every protected API request includes:

```text
Authorization: Bearer <access_token>
```

If the access token expires, the API client sends the refresh token to
`/api/auth/refresh/`. It receives a new access token and retries the original request.

## 7. Event and Member Permissions

The event owner is stored in the event document and also has an `owner` membership.

Backend checks:

- An event member can view event photos.
- An event member can upload and like photos.
- A photo uploader or event owner can delete a photo.
- Only an event owner can edit or delete the event.
- Only an event owner can list or revoke members.
- A member can leave an event.
- The event owner cannot leave or revoke their own membership.

When the owner revokes a regular member:

1. The membership document is deleted.
2. The event gets a new invite code.
3. The previous invite link stops working.
4. The frontend removes the member from the open member list.

## 8. Member Interface

On an event owned by the current user, the member count below the event title is a button.

Hovering over it shows the background highlight and “See members” tooltip.

Clicking the count opens a scrollable members modal:

- The modal appears above the event content.
- The background is blurred.
- Page interaction is blocked until dismissal.
- The modal can be closed with the cross button, backdrop, or Escape key.
- Repeated opens display only one member section.
- Regular members do not see the owner-only member control.

## 9. Upload Flow

The photo upload flow is:

```text
React Gallery
    |
    | FormData with files
    v
XMLHttpRequest with progress events
    |
    v
Django PhotoListUploadView
    |
    | Check event membership
    v
Pillow validation and processing
    |
    +-- Save original file
    +-- Save medium preview
    +-- Save thumbnail
    |
    v
Create Photo document in MongoDB
    |
    v
Return photo JSON and refresh the gallery
```

Each request validates file count, file type, and file size before saving.

The original file is never recompressed or replaced. JPEG, PNG, and WebP previews
are created for browsing and the medium preview is used in the lightbox.

## 10. Gallery Features

The gallery supports:

- Multi-file upload.
- Per-file upload progress.
- 20-photo pagination.
- All photo filtering.
- Personal upload filtering.
- Favorite filtering.
- Calendar day filtering.
- Photo selection.
- Individual download.
- ZIP download.
- Favorite toggles.
- Keyboard lightbox navigation.

The ZIP endpoint accepts 1 to 50 selected photo IDs.
It packages original files in memory and protects duplicate filenames with numeric suffixes.

## 11. Frontend Theme and Layout

The interface uses design tokens in `frontend/src/index.css`.

The theme is applied before React renders to reduce initial flashes.
The saved choice is stored in local storage.

If no manual choice exists:

- The app follows the operating system light or dark preference.
- Changing the system preference updates the theme until the user manually chooses one.

The mobile navigation uses a right-side drawer:

- The drawer covers approximately half the screen.
- The drawer itself is not blurred.
- The content below is blurred and blocked.
- A close button, backdrop click, and Escape key dismiss it.

## 12. API Summary

### Authentication

- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `POST /api/auth/refresh/`
- `GET /api/auth/me/`
- `PATCH /api/auth/me/`
- `DELETE /api/auth/me`

### Events

- `GET /api/events/`
- `POST /api/events/`
- `GET /api/events/<id>/`
- `PATCH /api/events/<id>/`
- `DELETE /api/events/<id>/`
- `POST /api/events/join/`
- `GET /api/events/invite/<code>/`
- `POST /api/events/<id>/leave/`
- `POST /api/events/<id>/regenerate-invite-code/`
- `GET /api/events/<id>/members/`
- `DELETE /api/events/<id>/members/<user_id>/`

### Photos

- `GET /api/events/<event_id>/photos/`
- `POST /api/events/<event_id>/photos/`
- `DELETE /api/photos/<photo_id>/`
- `POST /api/photos/<photo_id>/like/`
- `DELETE /api/photos/<photo_id>/like/`
- `GET /api/photos/<photo_id>/download/`
- `POST /api/events/<event_id>/download/`

## 13. Testing

Backend tests are stored beside each Django app:

- `apps/accounts/tests.py`
- `apps/events/tests.py`
- `apps/photos/tests.py`

The test database uses mongomock, so tests run in memory and do not require the real database.

The frontend is validated with:

```text
npm run lint
npm run build
```

## 14. Teacher Explanation Questions

### Why MongoDB

MongoDB stores event, membership, photo, and like records as flexible documents.
MongoEngine gives the project Python classes similar to models in Django.

### Why JWT

JWT allows the frontend and backend to communicate without server-side session storage.
An access token handles normal requests. A refresh token creates a new access token.

### Why store original photos on disk

MongoDB is not needed to hold large image binaries. Disk storage keeps original files available
for full quality downloads and avoids unnecessarily large database documents.

### Why use thumbnail and medium copies

The thumbnail makes the gallery fast. The medium copy makes the lightbox responsive.
The original remains untouched for downloads.

### Why React Context

React Context is a simple built-in feature for sharing authentication, user, and theme state.
The college project does not need Redux or another state library.
