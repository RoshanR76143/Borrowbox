# BorrowBox

A full-stack library book-borrowing platform. Vanilla HTML/CSS/JS on the
frontend, Node.js + Express + MongoDB/Mongoose on the backend, with JWT
authentication and role-based access control.

```
BorrowBox/
├── frontend/          Static site (HTML, CSS, vanilla JS) — no build step
└── server/             Express + MongoDB REST API
```

---

## 1. Folder structure

```
BorrowBox/
│
├── frontend/
│   ├── index.html        Landing page
│   ├── login.html        Login
│   ├── register.html     Registration
│   ├── dashboard.html     User dashboard
│   ├── books.html        Browse / search / filter catalog
│   ├── borrowed.html     User's borrowed books + returns
│   ├── profile.html      Profile view/edit
│   ├── admin.html        Admin dashboard (books, users, borrows)
│   ├── style.css         Design system + all page styles
│   ├── app.js            Shared API client, auth state, toasts, book cards
│   ├── auth.js           Login/register form logic
│   └── assets/
│
├── server/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js                Express app entry point
│       ├── config/db.js          MongoDB connection
│       ├── models/               User, Book, Borrow (Mongoose schemas)
│       ├── controllers/          Route handlers
│       ├── routes/                Express routers
│       ├── middleware/           auth.js (JWT), admin.js (role check)
│       └── utils/                generateToken.js, seed.js
│
└── README.md
```

---

## 2. Backend installation

```bash
cd BorrowBox/server
npm install
```

## 3. Environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

`.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/BorrowBox?appName=Cluster0
JWT_SECRET=CHANGE_THIS_SECRET
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000
```

Never commit your real `.env` file — it's already covered by the
`.env.example` pattern; add `.env` to your own `.gitignore` if you
initialize a git repo.

## 4. MongoDB setup

You can use either MongoDB Atlas (cloud) or a local MongoDB install.

**Option A — MongoDB Atlas (recommended)**
1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user (username + password).
3. Under Network Access, allow your IP (or `0.0.0.0/0` for local dev).
4. Copy the connection string into `MONGO_URI` in `.env`, replacing
   `USERNAME`, `PASSWORD`, and `CLUSTER`.

**Option B — Local MongoDB**
1. Install and start MongoDB locally (`mongod`).
2. Set `MONGO_URI=mongodb://127.0.0.1:27017/BorrowBox` in `.env`.

## 5. Seed the demo catalog (optional but recommended)

```bash
npm run seed
```

This adds the 8 demo books (Atomic Habits, The Alchemist, Deep Work, Ikigai,
The Psychology of Money, Rich Dad Poor Dad, Clean Code, The Pragmatic
Programmer) if they don't already exist. Safe to re-run.

## 6. Create an admin account

Registration always creates a `user`-role account — there is no admin
signup form, by design. To create (or promote) an admin, run the seed
script with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set:

```bash
ADMIN_EMAIL=admin@borrowbox.com ADMIN_PASSWORD=admin123456 npm run seed
```

- If a user with that email already exists, it is promoted to `admin`.
- Otherwise a new admin account is created with that email/password.

Then log in normally at `login.html` with those credentials — you'll see
an **Admin** link in the navbar and can visit `admin.html`.

## 7. Start the backend

```bash
npm start        # production
npm run dev       # with nodemon, auto-restarts on changes
```

The API will be running at `http://localhost:5000`. Verify with:

```bash
curl http://localhost:5000/api/health
```

## 8. Open the frontend

The frontend is static — no build step, no bundler. Two easy ways to run it:

- **VS Code Live Server**: open the `frontend/` folder in VS Code, install
  the "Live Server" extension, right-click `index.html` → "Open with Live
  Server" (serves on `http://localhost:5500`).
- **Any static server**, e.g.:
  ```bash
  cd BorrowBox/frontend
  npx serve .
  ```

`frontend/app.js` points at `http://localhost:5000/api` — if you serve the
frontend from a different origin, add that origin to `CLIENT_ORIGIN` in the
server's `.env`.

---

## 9. API endpoints

All responses follow:

```json
{ "success": true, "message": "…", "data": { } }
{ "success": false, "message": "…" }
```

### Auth — `/api/auth`
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Create a `user`-role account |
| POST | `/login` | Public | Log in, returns JWT + user |
| GET | `/me` | Private | Get your own profile |
| PUT | `/me` | Private | Update your own name |
| GET | `/users` | Admin | List all users |
| GET | `/users/:id` | Admin | Get one user |
| PUT | `/users/:id/status` | Admin | Enable/disable a user (`{ isActive }`) |

### Books — `/api/books`
| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/?search=&category=&sort=` | Public | List/search/filter/sort books |
| GET | `/:id` | Public | Get one book |
| POST | `/` | Admin | Create a book |
| PUT | `/:id` | Admin | Update a book (incl. copy counts) |
| DELETE | `/:id` | Admin | Delete a book (blocked if actively borrowed) |

### Borrow — `/api/borrow`
| Method | Route | Access | Description |
|---|---|---|---|
| POST | `/` | Private | Borrow a book (`{ bookId }`), 14-day due date |
| POST | `/:id/return` | Private | Return a borrowed book |
| GET | `/my` | Private | Your own borrow history + summary counts |
| GET | `/stats` | Admin | Dashboard statistics |
| GET | `/` | Admin | All borrow records |

### Health
| Method | Route | Access |
|---|---|---|
| GET | `/api/health` | Public |

---

## 10. Notes on the design

The frontend uses a warm, library-catalog visual language: parchment
background, charcoal ink, muted forest green as the primary accent, and
soft brown as a secondary accent for return/borrow actions — built with
plain CSS custom properties in `style.css`, no framework. The book catalog
is rendered as index-card style grid items, and the hero features a
signature "catalog card" element styled after a library ticket.

## 11. Security notes

- Passwords are hashed with `bcryptjs` before saving; the password field
  is excluded from all reads (`select: false`).
- JWT auth (`middleware/auth.js`) protects private routes; a separate
  `middleware/admin.js` guards admin-only routes.
- Registration always forces `role: 'user'` server-side, regardless of
  what's sent in the request body.
- CORS is restricted to the origins listed in `CLIENT_ORIGIN`.
