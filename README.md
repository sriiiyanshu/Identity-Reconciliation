# Identity Reconciliation Boilerplate

Monorepo setup with Express API and React client.

## Stack

- Express
- React + Vite
- Prisma ORM
- SQLite
- Zod

## Project Structure

- `server` for backend API
- `client` for frontend app

## Setup

```bash
npm install
cp server/.env.example server/.env
npm run db:generate
npm run db:push
npm run dev
```

## Endpoints

- `GET /health`
- `POST /identify`

## Example Request

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

Frontend runs on `http://localhost:5173` and backend runs on `http://localhost:3000`.
