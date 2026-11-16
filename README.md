# PhotoDrop

A web app where a group creates an event, shares an invite link, everyone uploads photos at full quality, and anyone can filter, select and download them.

**Stack:** Django 5, Django REST Framework, MongoDB with MongoEngine, React, Vite and Tailwind CSS.

## Prerequisites

- Python 3.10 or newer
- Node.js 20.19 or newer
- A MongoDB instance, either local or MongoDB Atlas

## Start the project

Install the backend and frontend dependencies once. From the project root, open two terminals.

### Terminal 1: Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py runserver
```

If PowerShell prevents virtual environment activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate it again.

The API will be available at `http://localhost:8000`.

### Terminal 2: Frontend

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` and `/media` requests to the backend on port 8000.

## MongoDB configuration

The development environment reads `MONGO_URI` from `backend/.env`. The example points to a local MongoDB server:

```text
MONGO_URI=mongodb://localhost:27017/photodrop_dev
```

Start your local MongoDB service before using the app, or change `MONGO_URI` to your MongoDB Atlas connection string. The application creates its database when it first writes data. The example secret is for local development only and must be replaced before deployment.

## Run backend tests

Activate the backend virtual environment, then run:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

Tests use an in-memory MongoDB mock and do not require a running MongoDB server.

## Build the frontend

```powershell
cd frontend
npm run build
```

The production files are written to `frontend/dist/`.
