# Quiz API

A RESTful API for a quiz application built with Hono.js and Prisma ORM.

## Features

- CRUD operations for categories, questions, and answers
- Data validation with Zod
- XSS protection
- TypeScript for type safety
- PostgreSQL database with Prisma ORM

## API Endpoints

### Categories

- `GET /categories` - Get all categories
- `GET /categories/:slug` - Get a single category with its questions and answers
- `POST /category` - Create a new category
- `PATCH /category/:slug` - Update a category
- `DELETE /category/:slug` - Delete a category and its related data

### Questions

- `GET /questions` - Get all questions
- `GET /questions/category/:slug` - Get questions by category
- `POST /question` - Create a new question with answers
- `PATCH /question/:id` - Update a question
- `DELETE /question/:id` - Delete a question and its answers

## Setup

### Prerequisites

- Node.js 22 or higher
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```
   DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
   PORT=3000
   ```
4. Run database migrations:
   ```bash
   npm run migrate
   ```
5. Seed the database:
   ```bash
   npm run seed
   ```
6. Build and start the server:
   ```bash
   npm run build
   npm start
   ```

### Development

Run the development server:
```bash
npm run dev
```

### Testing

Run tests:
```bash
npm test
```

## License

MIT
