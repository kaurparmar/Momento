# PhotoDrop

PhotoDrop is a full quality shared photo album for trips, celebrations, and group events.
An event owner creates an album, shares an invite code or link, and members upload, view, favorite,
filter, select, and download photos.

## Current Features

- Register and log in with JWT authentication.
- Create events with names, descriptions, and optional start and end dates.
- Rename or delete events as the owner.
- Join events using an invite code or public invite link.
- Upload multiple JPEG, PNG, or WebP photos at full resolution.
- Generate thumbnail and medium previews while preserving original files.
- Filter photos by all uploads, personal uploads, favorites, or photo date.
- View photos in an accessible lightbox.
- Select photos and download them individually or as a ZIP archive.
- Show and revoke event member access as the owner.
- Regenerate the invite link automatically after revoking a member.
- Update profile display names and delete accounts.
- Use light or dark mode with a manual theme toggle.
- Use a right-side mobile navigation drawer with a blurred, blocked backdrop.
- View the event members list in a scrollable modal section for owners.
- Use custom 404 and 500 pages for missing routes and server failures.

## Technology

- Backend: Python 3, Django 5, Django REST Framework.
- Database: MongoDB through MongoEngine.
- Authentication: Django REST Framework Simple JWT.
- Image processing: Pillow.
- Frontend: React 19, Vite, React Router, Lucide React.
- Styling: CSS design tokens and Tailwind CSS integration.
- Testing: pytest, pytest-django, and mongomock.

## Prerequisites

- Python 3.10 or newer.
- Node.js 20.19 or newer.
- MongoDB for normal application use.

## Backend Setup

Open a PowerShell terminal in the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py runserver
```

The API runs at `http://localhost:8000`.

Configure MongoDB in `backend/.env`:

```text
MONGO_URI=mongodb://localhost:27017/photodrop_dev
```

An alternate MongoDB Atlas connection string can also be placed in `MONGO_URI`.

## Frontend Setup

Open another PowerShell terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The Vite configuration forwards `/api` and `/media` requests to Django.

## Main Routes

### Frontend pages

- `/` for the event dashboard or public landing page.
- `/events` for the event dashboard.
- `/events/:id` for a selected event.
- `/events/new` for event creation.
- `/join/:code` for invite preview and joining.
- `/login` and `/register` for authentication.
- `/profile` for account details.
- `/privacy` and `/terms` for legal pages.
- `/500` for the server error page.

### Backend API

- `/api/auth/register/`
- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/auth/me/`
- `/api/events/`
- `/api/events/join/`
- `/api/events/invite/<code>/`
- `/api/events/<event_id>/members/`
- `/api/events/<event_id>/members/<user_id>/`
- `/api/events/<event_id>/photos/`
- `/api/events/<event_id>/download/`
- `/api/photos/<photo_id>/like/`

## Event Permissions

- Every event has one owner.
- Event owners can edit or delete events.
- Owners can rename events and delete the event with all associated photos and memberships.
- Event members can view photos and upload photos.
- Only the owner can list members and revoke regular member access.
- The owner cannot revoke their own membership.
- Revoking a member removes that membership and creates a new invite code.

## Testing

Activate the backend environment and run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

The test suite uses an isolated in-memory MongoDB mock. It does not require a separate MongoDB server.

## Frontend Validation

```powershell
cd frontend
npm run lint
npm run build
```

The frontend production output is written to `frontend/dist/`.

## Project Rules

The project is designed as a beginner-readable college application.
It uses plain Django views, plain React components, `useState`, `useEffect`, and React Context.

Before project-wide changes, read [RULES.md](./RULES.md).
