# TechArtha WealthTech - MVP

TechArtha is a vernacular, simple, and trustworthy investment platform designed primarily for B30/Tier-2/Tier-3 India and first-time investors. 
The application focuses on simplicity, trust, and education before asking for money.

## Architecture

This project is a monorepo consisting of:
- **Mobile App**: React Native with Expo, built for Android (low-bandwidth optimized).
- **Backend API**: NestJS (Node.js) using PostgreSQL and Prisma.
- **Admin**: (Placeholder for future) Next.js.

## Tech Stack
- **Frontend**: React Native, Expo, TypeScript, React Navigation, TanStack Query, Zustand, i18n
- **Backend**: Node.js, NestJS, TypeScript, Prisma, PostgreSQL
- **Infrastructure**: Docker, Docker Compose

## Folder Structure
```
techartha/
├── apps/
│   ├── mobile/         # React Native Expo app
│   └── admin/          # Placeholder for admin dashboard
├── services/
│   └── api/            # NestJS backend
├── docs/               # Architecture and setup documentation
├── .env.example        # Example environment variables
├── docker-compose.yml  # Local infrastructure setup
└── package.json        # Workspace configuration
```

## Local Setup

### 1. Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- Expo CLI

### 2. Environment Variables
Copy the `.env.example` file to `.env` in the root directory and update the values as needed.
```bash
cp .env.example .env
```

### 3. Install Dependencies
Run the following from the root directory to install dependencies for all workspaces:
```bash
npm install
```

### 4. Database Setup
Start the local PostgreSQL database using Docker:
```bash
docker-compose up -d
```

Run Prisma migrations from the root directory:
```bash
npm run db:migrate
```

### 5. Running the Backend
```bash
npm run api
```
The API will run on `http://localhost:3000`.

### 6. Running the Mobile App
```bash
npm run mobile
```
This will start the Expo development server. You can scan the QR code in the Expo Go app or run it on an Android emulator.

## Environments (Mock vs Production)
The application supports a `KYC_PROVIDER` environment variable. 
- Set `KYC_PROVIDER=mock` to run locally without HyperVerge credentials. This will simulate KYC verification.
- Set `KYC_PROVIDER=hyperverge` and provide the relevant HyperVerge API keys to use the real integration.

## Testing
Run tests across the workspace:
```bash
npm run test
```

## Security Note
NEVER commit `.env` or any real API keys to the repository.
