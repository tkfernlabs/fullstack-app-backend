# Full-Stack App Backend

A robust Node.js backend API with Express, PostgreSQL (Neon), JWT authentication, and RESTful endpoints.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **RESTful API**: Clean and well-structured API endpoints
- **PostgreSQL Database**: Using Neon for cloud-hosted PostgreSQL
- **CRUD Operations**: Full Create, Read, Update, Delete functionality for posts
- **Input Validation**: Request validation using express-validator
- **CORS Support**: Cross-Origin Resource Sharing enabled
- **Error Handling**: Comprehensive error handling and validation

## API Endpoints

### Public Endpoints

- `GET /api/health` - Health check endpoint
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/posts` - Get all posts

### Protected Endpoints (Requires Authentication)

- `GET /api/users/profile` - Get current user profile
- `POST /api/posts` - Create a new post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables in `.env`
4. Initialize the database with `init.sql`
5. Run the server: `npm start` or `npm run dev` for development

## Environment Variables

- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)

## Technologies Used

- Node.js
- Express.js
- PostgreSQL (Neon)
- JWT for authentication
- Bcrypt for password hashing
- Express-validator for input validation
- CORS for cross-origin support
