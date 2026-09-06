# Norda — Full-Stack E-commerce Website

A complete e-commerce web application:

- **Frontend:** plain HTML, CSS and JavaScript (no framework, no build step)
- **Backend:** Node.js + Express.js (REST API)
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT + bcrypt password hashing, with `user` and `admin` roles

```
ecommerce-app/
├── server/     Node/Express/MongoDB API
└── client/     Plain HTML/CSS/JS storefront + admin panel
```

## Features

**Storefront (client)**
- Home page with categories, featured products, new arrivals
- Product listing with search, category filter, price filter, sorting, pagination
- Product detail page with image, price/discount, stock, reviews and review submission
- User registration & login (JWT stored in localStorage)
- Cart (add/update quantity/remove), persisted per user in MongoDB
- Checkout flow that creates an order, decrements stock and clears the cart
- Order history page for the logged-in customer

**Admin panel (client/admin)**
- Dashboard with key stats (products, categories, customers, orders, revenue, low-stock alert)
- Product management (create/edit/delete, image upload)
- Category management (create/edit/delete)
- Order management (view all orders, update status, mark paid)

**Backend (API)**
- `/api/auth` — register, login, profile
- `/api/categories` — CRUD (admin write, public read)
- `/api/products` — CRUD + search/filter/sort/pagination (admin write, public read)
- `/api/cart` — per-user cart (auth required)
- `/api/orders` — checkout, order history, admin order management
- `/api/reviews` — product reviews (auth required to post)
- `/api/uploads` — product image upload (admin, multipart/form-data)
- `/api/admin/dashboard-summary` — admin dashboard stats

Security middleware included: helmet, mongo-sanitize, hpp, rate limiting, CORS.

## 1. Prerequisites

- Node.js 18+ and npm
- A running MongoDB instance — either:
  - Local MongoDB (`mongodb://127.0.0.1:27017`), or
  - A free MongoDB Atlas cluster (get a connection string from atlas.mongodb.com)

## 2. Backend setup

```bash
cd server
npm install
cp .env.example .env
```

Open `.env` and set at minimum:

```
MONGO_URI=mongodb://127.0.0.1:27017/ecommerce_db
JWT_SECRET=some_long_random_string
CLIENT_URL=http://127.0.0.1:5500
```

(`CLIENT_URL` should match whatever origin your frontend is served from — see step 4.)

Seed the database with an admin account and sample categories/products:

```bash
npm run seed
```

This prints the admin login it created (default `admin@example.com` / `Admin@12345`, or whatever you set in `.env`).

Start the API server:

```bash
npm run dev     # with nodemon, auto-restarts on changes
# or
npm start       # plain node
```

The API will be running at `http://localhost:5000/api`, and a health check is available at `http://localhost:5000/api/health`.

## 3. Frontend setup

The frontend is plain static HTML/CSS/JS, so it doesn't need a build step. You have two options:

**Option A — Let the Express server serve it (simplest)**
`server.js` already serves the `client/` folder as static files. With the backend running, just open:
```
http://localhost:5000/index.html
```
No extra setup needed. In this mode you can also set `client/js/config.js` `API_BASE_URL` to an empty string plus keep it as-is (`http://localhost:5000/api` works too since it's the same server).

**Option B — Serve the frontend separately (e.g. VS Code "Live Server", or any static server)**
```bash
cd client
npx serve -l 5500      # or use VS Code's Live Server extension
```
Then open `http://127.0.0.1:5500`. Make sure:
- `client/js/config.js` → `API_BASE_URL = "http://localhost:5000/api"`
- backend `.env` → `CLIENT_URL=http://127.0.0.1:5500` (so CORS allows it)

## 4. Try it out

1. Visit the storefront, browse products, register a customer account, add items to the cart, and check out.
2. Log in as the seeded admin (`admin@example.com` / `Admin@12345`) at `/login.html`, then go to `/admin/dashboard.html` to manage products, categories and orders.

## 5. Notes

- Uploaded product images are stored in `server/uploads/` and served at `/uploads/<filename>`.
- To reset sample data, drop the `ecommerce_db` database and re-run `npm run seed`.
- This is a learning/demo project: payments are simulated (`cod` or a `card` option with no real charge) — wire up a real payment gateway before using it in production.
