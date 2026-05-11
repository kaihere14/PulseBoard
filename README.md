
# PulseBoard

[![Bun](https://img.shields.io/badge/Runtime-Bun-black?style=flat-square&logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/Frontend-React_19-blue?style=flat-square&logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

PulseBoard is a high-performance, full-stack polling and quiz platform designed for real-time engagement. It allows users to create interactive quizzes, share them via unique codes, and collect feedback through both anonymous and authenticated response modes.

Built with a modern tech stack focusing on speed and developer experience, PulseBoard leverages **Bun** as its primary runtime, **React 19** for a cutting-edge frontend, and **Express 5** for a robust backend.

---

## 🚀 Features

- **Instant Quiz Creation**: Build quizzes with multiple questions and share them instantly via unique join codes.
- **Detailed Analytics**: Visualize response data with real-time statistics, including percentage breakdowns and total counts for every question. 📊
- **Quiz Management**: Full control over the quiz lifecycle—toggle between draft, active, and expired states, or delete quizzes as needed. ⚙️
- **Flexible Authentication**: Powered by Clerk, supporting both fully authenticated sessions and anonymous participation.
- **Real-time Sync**: Automatic account synchronization between Clerk and the internal database upon login.
- **Modern Routing**: Type-safe routing using TanStack Router for a seamless SPA experience.
- **Responsive Design**: A sleek, dark-mode-ready interface built with Tailwind CSS 4.
- **Developer First**: Strict linting, formatting, and pre-commit hooks to ensure high code quality.

---
## 🛠 Tech Stack

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: TanStack Router
- **Authentication**: Clerk React SDK
- **Styling**: Tailwind CSS 4 (with `@tailwindcss/vite`)
- **State Management**: React Hooks + TanStack Router state

### Backend

- **Runtime**: Bun
- **Framework**: Express 5
- **Database**: MongoDB via Mongoose
- **Security**: Clerk Express Middleware + CORS
- **Environment**: Dotenv for configuration

### Tooling

- **Package Manager**: Bun
- **Linting**: ESLint 10+
- **Formatting**: Prettier 3.8
- **Git Hooks**: Husky + lint-staged

---

## 📂 Project Structure

```text
├── client/                 # React frontend (Vite + TanStack Router)
│   ├── src/routes/         # File-based routing logic
│   └── vite.config.ts      # Vite configuration with Tailwind 4
├── server/                 # Express backend (Bun)
│   ├── src/app/            # Modular business logic (Auth, Quiz)
│   ├── src/db/             # Database connection & schemas
│   └── src/index.ts        # Server entry point
├── .husky/                 # Git hooks for linting/formatting
├── package.json            # Root workspace & dev tooling
└── bun.lock                # Bun lockfile
```

---

## 🏁 Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed (v1.1.0 or higher recommended)
- A [Clerk](https://clerk.com) account for authentication
- A MongoDB instance (local or Atlas)

### Installation

1. **Clone the repository**

   bash
   git clone https://github.com/kaihere14/PulseBoard.git
   cd PulseBoard
   

2. **Install dependencies**
   Install all dependencies for the root, client, and server:

   bash
   bun install
   cd client && bun install
   cd ../server && bun install
   

3. **Configure Environment Variables**

   Create a `.env` file in the `client/` directory:

   env
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   VITE_API_URL=http://localhost:3000
   

   Create a `.env` file in the `server/` directory:

   env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/pulseboard
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLIENT_URL=http://localhost:5173
   

### Running the Application

You will need two terminal windows to run the full stack:

**Start the Backend:**

bash
cd server
bun run dev


**Start the Frontend:**

bash
cd client
bun run dev


The application will be available at `http://localhost:5173`.

---
## 📖 Usage

### Creating a Quiz

1. Sign in using the landing page.
2. Navigate to the **Home** dashboard.
3. Click **"Create quiz"** to start the creation flow.
4. Once created, you will receive a unique code to share with participants.

### Joining a Quiz

1. On the **Home** dashboard, locate the **"Join a quiz"** section.
2. Enter the unique quiz code provided by the creator.
3. Click **"Join"** to enter the live session.

### Analyzing Results 📈

1. Access your dashboard to see a list of your quizzes.
2. Click on any quiz to view its **Analytics** page.
3. Review detailed response statistics and manage the quiz status (e.g., publishing or closing the quiz).

---
## 🔌 API Documentation

### Authentication

- `GET /api/auth`: Synchronizes the Clerk user with the local database. Requires a valid Clerk JWT in the `Authorization` header.

### Quizzes

- `GET /api/quiz`: Retrieves a list of quizzes created by the authenticated user.
- `POST /api/quiz`: Creates a new quiz session.
- `GET /api/quiz/:slug`: Retrieves quiz details for participants.
- `POST /api/quiz/submit`: Submits answers for a specific quiz.
- `PATCH /api/quiz/:slug`: Updates quiz metadata or status.
- `DELETE /api/quiz/:slug`: Deletes a specific quiz.
- `GET /api/quiz/:slug/analytics`: Fetches aggregated response data and statistics for a quiz.

---
## 🛠 Development

### Linting & Formatting

The project uses strict ESLint and Prettier rules. These are enforced via Husky on every commit.

```bash
# Run linting
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format
```

### Type Checking

```bash
# Server type check
cd server && bun run typecheck
```

---

## 🚀 Deployment

### Backend (Bun)

The server is optimized for Bun's native bundler. Ensure the `CLIENT_URL` environment variable is set to your production frontend URL to allow cross-origin requests:

bash
cd server
bun run build
bun run start


### Frontend (Vite)

bash
cd client
bun run build


The static files will be generated in `client/dist`.

---
## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🙏 Acknowledgments

- [TanStack Router](https://tanstack.com/router) for the incredible type-safe routing.
- [Clerk](https://clerk.com) for making authentication painless.
- [Bun Team](https://bun.sh) for the lightning-fast runtime.
