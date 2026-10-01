# Nayagi Incubation Center Backend & Management Portal

Comprehensive, fast, and secure Python FastAPI backend with SQLite database, JWT authentication, and built-in modern Admin & User Team Web Dashboards.

---

## 🚀 How to Run the Project

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the FastAPI Backend Server:**
   ```bash
   python run.py
   ```
   *or*
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

3. **Access the Portal in Browser:**
   - **Unified Login & Landing Page:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
   - **Admin Dashboard:** [http://127.0.0.1:8000/admin.html](http://127.0.0.1:8000/admin.html)
   - **User Team Dashboard:** [http://127.0.0.1:8000/dashboard.html](http://127.0.0.1:8000/dashboard.html)
   - **Interactive Swagger OpenAPI Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🔑 Demo Credentials (Pre-seeded)

### 1. Admin Login (Authorized Admin Whitelist)
- **Email:** `admin@incubation.com`
- **Password:** `AdminPass123!`
- **Role:** `admin` (Has full master control & access to Admin Dashboard)

### 2. User Team Login
- **Email:** `user@alphainno.com`
- **Password:** `UserPass123!`
- **Team Name:** `Alpha Innovations`
- **Role:** `user` (Access to User Team Dashboard)

---

## 🛡️ Admin Whitelist Access Control
- **Strict Access Control Rule:** Only users logged in with email addresses configured in the **Authorized Admin Emails List** (e.g. `admin@incubation.com`, `admin2@incubation.com`, `kalai@nayagi.com`, `director@incubation.com`) are permitted to access Admin endpoints and Admin Dashboard.
- Admin can edit and manage this list dynamically from **Admin Settings** tab!

---

## 📡 REST API Documentation for Frontend Integration

### 1. Authentication Endpoints (`/api/auth`)
- `POST /api/auth/register`: Register new user (accepts `email`, `password`, `full_name`, `team_name`).
- `POST /api/auth/login`: Authenticate and receive JWT Bearer Token (`email`, `password`).
- `GET /api/auth/me`: Get current authenticated user info.

### 2. Admin Portal Endpoints (`/api/admin`) *(Requires Admin Bearer Token)*
- `GET /api/admin/stats`: Get dashboard metrics & current center announcement.
- `GET /api/admin/settings`: Get incubation settings & authorized admin emails list.
- `PUT /api/admin/settings`: Update incubation name, announcement, or admin email whitelist.
- `POST /api/admin/teams`: Create a new startup team (`name`, `idea_title`, `domain`, `description`).
- `GET /api/admin/teams`: Get list of all incubated teams with member rosters.
- `PUT /api/admin/teams/{team_id}`: Update team details.
- `DELETE /api/admin/teams/{team_id}`: Delete a team.
- `POST /api/admin/teams/{team_id}/members`: Add member to any team (`name`, `role_in_team`, `email`, `phone`).
- `DELETE /api/admin/members/{member_id}`: Remove team member.
- `GET /api/admin/attendance`: Get attendance records for all teams (optional query params: `target_date`, `team_id`).

### 3. User / Team Endpoints (`/api/team`) *(Requires User Bearer Token)*
- `GET /api/team/my-team`: Get current user's team details & member list.
- `POST /api/team/members`: Add a new member to your team.
- `DELETE /api/team/members/{member_id}`: Remove a member from your team.
- `POST /api/team/attendance`: Submit daily attendance (`date`, `status`: Present/Absent/Half Day/Working Remotely, `work_summary`).
- `GET /api/team/attendance`: Get attendance submission history for your team.

### 4. 1-on-1 Direct Messaging Endpoints (`/api/messages`)
- `POST /api/messages/team/{team_id}`: Send direct message to team (Admin can message any team; User team can message Admin).
- `GET /api/messages/team/{team_id}`: Get conversation history for team.
