# BookLeaf Author Support & Communication Portal

A full-stack author support portal built with **React, Vite, FastAPI, PostgreSQL, and optional Google Gemini integration**.

Authors can view their books and royalty summaries, create support tickets, and exchange messages with the support team. Administrators can manage tickets, apply filters, assign tickets, add private notes, respond to authors, and generate AI-assisted reply drafts.

## Features

### Author Portal
- Secure author login
- Dashboard with book and royalty summaries
- View books and book details
- Create and track support tickets
- Exchange messages with the support team

### Admin Portal
- Secure administrator login
- Ticket queue with status, category, priority, and date filters
- Assign tickets to the current administrator
- Update ticket status, category, and priority
- Add private internal notes
- Reply to authors
- Optional AI-assisted ticket classification and reply drafts

## Technology Stack
- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Python, FastAPI
- **Database:** PostgreSQL, SQLAlchemy
- **Authentication:** JWT bearer tokens
- **AI integration:** Google Gemini API (optional)
- **Deployment:** Render Blueprint configuration

The sample dataset contains 10 authors and 18 books. Messages refresh when a conversation is opened or a message is sent; push-based live updates are not currently provided.

## Project Structure

```text
bookleaf-author-support-portal/
├── backend/
│   ├── app/
│   ├── data/
│   ├── .env.example
│   ├── requirements.txt
│   └── seed.py
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
├── bookleaf_sample_data.json
├── render.yaml
└── README.md
```

## Prerequisites
- Python 3.11 or 3.12
- Node.js 20.19+ or 22.12+
- PostgreSQL 14+
- A Gemini API key only if you want to use AI features

## Local Setup (Windows)

### 1. Create the PostgreSQL database

Start PostgreSQL and open pgAdmin or `psql`. Create a database named `bookleaf`:

```sql
CREATE DATABASE bookleaf;
```

If the database already exists, skip this step.

### 2. Configure the backend

Open PowerShell at the repository root:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and configure:
- `DATABASE_URL`: your local PostgreSQL connection URL, including your PostgreSQL username and password.
- `JWT_SECRET_KEY`: replace the placeholder with a long, unique random secret.
- `FRONTEND_URL`: normally `http://localhost:5173`.
- `GEMINI_API_KEY`: optional; leave blank to disable Gemini features.
- `GEMINI_MODEL`: a model ID supported by your Gemini API key.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `DEMO_PASSWORD`: local demo-account settings.

Never commit your real `.env` file or share its secrets publicly.

Create a virtual environment and install dependencies:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, run this in the current PowerShell session and then activate the environment again:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

Seed the sample data and demo accounts:

```powershell
python seed.py
```

The seed script is designed to avoid duplicating existing authors and books. Existing user accounts are not automatically assigned new passwords when you change `.env`. Use a fresh database if you need a clean demo setup.

Start the backend from the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend URLs:
- API documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 3. Configure and run the frontend

Open a second terminal at the repository root:

```powershell
cd frontend
Copy-Item .env.example .env
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

`VITE_API_URL` should contain only the backend origin, such as `http://127.0.0.1:8000`. The frontend appends `/api/v1` itself. Restart Vite after changing the frontend `.env` file.

## Demo Accounts

Demo account passwords are configured in your own `backend/.env` file.

**Admin account**
- Email: `admin@bookleaf.com` by default, configurable using `ADMIN_EMAIL`
- Password: the value you set for `ADMIN_PASSWORD`

**Author account**
- Email: `priya.sharma@email.com` (first sample author)
- Password: the value you set for `DEMO_PASSWORD`

Other sample author emails are listed in the sample data used by the seed script.

If the seed script has already created the accounts, changing a password in `.env` may not change the existing database account. Use a fresh database or update the account through the project's supported process. Never publish working passwords, database credentials, JWT secrets, or Gemini API keys.

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Authenticate a user |
| GET | `/api/v1/auth/me` | Get the current user |
| GET | `/api/v1/books` | List books available to the user |
| GET | `/api/v1/books/{book_id}` | Get book details |
| POST | `/api/v1/tickets` | Create a support ticket |
| GET | `/api/v1/tickets` | List the user's tickets |
| GET | `/api/v1/tickets/{ticket_id}` | Get ticket details |
| POST | `/api/v1/tickets/{ticket_id}/messages` | Send a ticket message |
| GET | `/api/v1/admin/tickets` | List and filter the admin queue |
| PATCH | `/api/v1/admin/tickets/{ticket_id}` | Update ticket fields |
| POST | `/api/v1/admin/tickets/{ticket_id}/notes` | Add a private note |
| POST | `/api/v1/admin/tickets/{ticket_id}/assign-to-me` | Assign a ticket to the current admin |
| POST | `/api/v1/admin/tickets/{ticket_id}/ai-draft` | Generate an AI-assisted reply draft |
| GET | `/health` | Check backend health |

The admin ticket queue supports status, category, priority, `date_from`, and `date_to` filters. Open `/docs` while the backend is running for the interactive API reference.

## Live Demo

The project is deployed using Render. Check the repository owner's project description or assignment submission for the current live frontend URL. The Render dashboard shows the current frontend and backend URLs.

**Security note:** Do not publish the live admin password or any shared demo password in this README or on GitHub.

## Deploying on Render

The repository includes a `render.yaml` Blueprint for the backend, frontend, and PostgreSQL database.

1. Push the repository to GitHub, ensuring no `.env` files or secrets are committed.
2. In Render, choose **New → Blueprint** and connect the GitHub repository.
3. Review the services and environment variables in `render.yaml`.
4. Configure required secrets in Render, including unique values for `ADMIN_PASSWORD` and `DEMO_PASSWORD`. Configure `GEMINI_API_KEY` if AI features are required.
5. Confirm that `FRONTEND_URL` and `VITE_API_URL` match the actual deployed service URLs.
6. Deploy the services and check the backend health endpoint at `https://<your-api-host>/health`.
7. Review the sample-data seeding configuration before deployment. If automatic seeding is enabled for the initial demo, disable it after the database has been seeded if it is no longer needed.
8. Test admin and author login, book visibility, ticket creation, messages, private notes, filters, assignment, and Gemini features if configured.

Review Render's current plan terms before relying on free hosting. Plans may have usage limits, sleeping services, and database retention or expiry restrictions.

## Build Checks

### Frontend

```powershell
cd frontend
npm ci
npm run build
```

### Backend

With a configured `.env` and reachable PostgreSQL database:

```powershell
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## Acceptance Checklist

- [ ] `/health` returns `{"status":"ok"}` and `/docs` opens.
- [ ] An author can log in and sees only their own books and tickets.
- [ ] An author can create a support ticket.
- [ ] The admin can log in and see the ticket in the queue.
- [ ] Status, category, priority, and date filters work as expected.
- [ ] The admin can assign tickets and update ticket fields.
- [ ] Private admin notes are not visible to authors.
- [ ] Author and admin messages appear in the other user's conversation after reopening or refreshing the ticket.
- [ ] Gemini classification and reply drafts work when a valid API key and supported model are configured.
- [ ] Ticket creation continues to work with fallback classification when Gemini is not configured.
- [ ] Tickets and messages remain in PostgreSQL after the backend restarts.

## Security and Production Considerations

- Use strong, unique values for JWT secrets, database credentials, and demo passwords.
- Configure CORS to allow only the frontend origins you use.
- Do not use sample data or demo accounts for real customer information.
- Review AI-generated drafts before sending them to authors.
- Database tables are currently created with SQLAlchemy `create_all` at startup for assignment simplicity. Consider Alembic migrations for ongoing production use.
- Add automated tests, rate limiting, monitoring, backups, and an incident-recovery plan before using the application for real customer support.

## Verification Status

The frontend production build and core backend flows have been tested locally. The hosted deployment has been tested for login, ticket workflows, and AI-assisted reply drafting. Gemini model availability depends on the model configured in the deployment environment and supported by the API key.
