# Blog Platform with Comments

A full-stack blogging application built with React + Vite, Node.js, Express, MongoDB, and JWT authentication.

## Features
- Register and log in
- JWT-protected API routes
- Create, view, edit, and delete blog posts
- Add comments to posts; delete your own comments
- Only the post author can edit/delete their posts
- Responsive layout

## Requirements
- Node.js 18+
- MongoDB running locally or a MongoDB Atlas connection string

## 1. Configure the backend
```bash
cd server
npm install
```
Copy `.env.example` to `.env` and update `MONGO_URI` and `JWT_SECRET`.

Start the server:
```bash
npm run dev
```
API runs at `http://localhost:5000`.

## 2. Configure the frontend
Open a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the local URL printed by Vite (usually `http://localhost:5173`).

## API overview
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts` (authenticated)
- `PUT /api/posts/:id` (post author only)
- `DELETE /api/posts/:id` (post author only)
- `POST /api/posts/:id/comments` (authenticated)
- `DELETE /api/posts/:postId/comments/:commentId` (comment author only)

## Notes
- This is a learning starter project. Before production deployment, add stronger validation, rate limiting, email verification, password reset, and security monitoring.
- Never commit your real `.env` file or share your JWT secret.
