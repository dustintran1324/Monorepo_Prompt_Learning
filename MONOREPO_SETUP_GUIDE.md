# Monorepo Setup Guide: Step-by-Step Migration

## Overview
This guide provides detailed steps to create a new monorepo structure for your Qualtrics prompt learning tool, combining the existing backend with a new React frontend.

## Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account (or preferred Git hosting)
- VS Code or preferred IDE

## Step 1: Create New Repository Structure

### 1.1 Initialize New Repository
```bash
# Create new directory for monorepo
mkdir qualtrics-prompt-tool-fullstack
cd qualtrics-prompt-tool-fullstack

# Initialize git repository
git init

# Create basic monorepo structure
mkdir -p apps/backend apps/frontend packages shared docs
```

### 1.2 Create Root Package.json
```bash
# Initialize root package.json
npm init -y
```

Edit the root `package.json`:
```json
{
  "name": "qualtrics-prompt-tool",
  "version": "1.0.0",
  "private": true,
  "description": "Interactive survey tool for prompt-writing skill improvement",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "npm run dev --workspace=apps/backend",
    "dev:frontend": "npm run dev --workspace=apps/frontend",
    "build": "npm run build --workspace=apps/backend && npm run build --workspace=apps/frontend",
    "build:backend": "npm run build --workspace=apps/backend",
    "build:frontend": "npm run build --workspace=apps/frontend",
    "start": "npm run start --workspace=apps/backend",
    "install:all": "npm install && npm install --workspace=apps/backend && npm install --workspace=apps/frontend",
    "clean": "npm run clean --workspace=apps/backend && npm run clean --workspace=apps/frontend",
    "lint": "npm run lint --workspace=apps/backend && npm run lint --workspace=apps/frontend",
    "test": "npm run test --workspace=apps/backend && npm run test --workspace=apps/frontend"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "cross-env": "^7.0.3"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### 1.3 Install Root Dependencies
```bash
npm install
```

## Step 2: Migrate Backend

### 2.1 Copy Existing Backend
```bash
# Copy your existing backend files to apps/backend
cp -r /path/to/your/current/backend/* apps/backend/

# Navigate to backend directory
cd apps/backend
```

### 2.2 Update Backend Package.json
Edit `apps/backend/package.json`:
```json
{
  "name": "@qualtrics-tool/backend",
  "version": "1.0.0",
  "private": true,
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'Backend build completed'",
    "clean": "rm -rf node_modules",
    "lint": "eslint src/ --ext .js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^17.2.0",
    "express": "^5.1.0",
    "mongodb": "^6.18.0",
    "mongoose": "^8.16.3",
    "openai": "^5.9.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.10",
    "eslint": "^8.0.0"
  }
}
```

### 2.3 Update Backend Environment Configuration
Create `apps/backend/.env.example`:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/qualtrics-tool
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 2.4 Update Backend CORS Configuration
Edit `apps/backend/src/app.js` to handle frontend URL:
```javascript
const cors = require('cors');

// CORS configuration for monorepo
const corsOptions = {
  origin: [
    'http://localhost:5173', // Vite default port
    'http://localhost:3000', // Backend port for testing
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

## Step 3: Create Frontend Application

### 3.1 Initialize React Application
```bash
# From monorepo root
cd apps/frontend

# Create Vite React TypeScript project
npm create vite@latest . -- --template react-ts

# Answer prompts:
# - Package name: @qualtrics-tool/frontend
# - Select framework: React
# - Select variant: TypeScript
```

### 3.2 Install Frontend Dependencies
```bash
# Core dependencies
npm install \
  react-router-dom \
  zustand \
  react-hook-form \
  @hookform/resolvers \
  zod \
  axios \
  react-markdown \
  clsx

# UI dependencies
npm install \
  @radix-ui/react-select \
  @radix-ui/react-dialog \
  @radix-ui/react-button \
  @radix-ui/react-textarea \
  lucide-react

# Styling
npm install -D \
  tailwindcss \
  postcss \
  autoprefixer \
  @tailwindcss/typography

# Development dependencies
npm install -D \
  @types/react \
  @types/react-dom \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  prettier \
  eslint-plugin-react-hooks
```

### 3.3 Configure Tailwind CSS
```bash
# Initialize Tailwind
npx tailwindcss init -p
```

Edit `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
```

### 3.4 Update Frontend Package.json
Edit `apps/frontend/package.json`:
```json
{
  "name": "@qualtrics-tool/frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "clean": "rm -rf dist node_modules"
  },
  "dependencies": {
    // ... dependencies from step 3.2
  },
  "devDependencies": {
    // ... dev dependencies from step 3.2
  }
}
```

### 3.5 Configure Vite for API Proxy
Edit `apps/frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
})
```

## Step 4: Create Shared Packages

### 4.1 Create Shared Types Package
```bash
# From monorepo root
mkdir -p packages/types/src
cd packages/types

# Initialize package
npm init -y
```

Edit `packages/types/package.json`:
```json
{
  "name": "@qualtrics-tool/types",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Create `packages/types/src/index.ts`:
```typescript
export interface Attempt {
  _id?: string;
  userId: string;
  attempt: number;
  prompt: string;
  llmOutput?: string;
  feedback?: string;
  chatHistory: ChatMessage[];
  predictions?: Prediction[];
  metadata: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    processingTimeMs: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Prediction {
  tweet_id: string;
  tweet_text: string;
  class_label: string;
  predicted_label: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AttemptRequest {
  userId: string;
  prompt: string;
  attempt: number;
  taskType?: 'binary' | 'multiclass';
  feedbackLevel?: 'none' | 'fixed' | 'llm';
}

export interface AttemptResponse {
  attempt: number;
  llmOutput: string;
  feedback?: string;
  predictions?: Prediction[];
  metadata: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
    processingTimeMs: number;
  };
}
```

Create `packages/types/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Step 5: Configure Workspace Dependencies

### 5.1 Update Backend to Use Shared Types
Edit `apps/backend/package.json` to add dependency:
```json
{
  "dependencies": {
    // ... existing dependencies
    "@qualtrics-tool/types": "workspace:*"
  }
}
```

### 5.2 Update Frontend to Use Shared Types
Edit `apps/frontend/package.json` to add dependency:
```json
{
  "dependencies": {
    // ... existing dependencies
    "@qualtrics-tool/types": "workspace:*"
  }
}
```

### 5.3 Install Workspace Dependencies
```bash
# From monorepo root
npm install
```

## Step 6: Create Configuration Files

### 6.1 Create Root ESLint Configuration
Create `.eslintrc.js`:
```javascript
module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
  },
  overrides: [
    {
      files: ['apps/frontend/**/*.{ts,tsx}'],
      extends: [
        'eslint:recommended',
        '@typescript-eslint/recommended',
        'plugin:react-hooks/recommended',
      ],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint', 'react-hooks'],
      env: {
        browser: true,
      },
    },
    {
      files: ['apps/backend/**/*.js'],
      env: {
        node: true,
      },
    },
  ],
};
```

### 6.2 Create Root Prettier Configuration
Create `.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### 6.3 Create Root .gitignore
Create `.gitignore`:
```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
*.temp

# Database
*.db
*.sqlite

# Compiled TypeScript
*.tsbuildinfo
```

## Step 7: Create Documentation

### 7.1 Create Root README.md
Create `README.md`:
```markdown
# Qualtrics Prompt Learning Tool

Interactive survey tool that helps users improve prompt-writing skills through iterative attempts with AI feedback.

## Architecture

This is a monorepo containing:
- **Backend** (`apps/backend`): Node.js/Express API with MongoDB and OpenAI integration
- **Frontend** (`apps/frontend`): React/TypeScript SPA with Vite
- **Shared Types** (`packages/types`): Common TypeScript definitions

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- OpenAI API key

### Installation
```bash
# Install all dependencies
npm run install:all

# Copy environment files
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env with your configuration
```

### Development
```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend  # Backend only (http://localhost:3000)
npm run dev:frontend # Frontend only (http://localhost:5173)
```

### Building
```bash
# Build all applications
npm run build

# Or build individually
npm run build:backend
npm run build:frontend
```

## Project Structure
```
qualtrics-prompt-tool/
├── apps/
│   ├── backend/          # Express API server
│   └── frontend/         # React application
├── packages/
│   └── types/            # Shared TypeScript types
├── docs/                 # Documentation
└── shared/               # Shared utilities
```

## Environment Variables

### Backend (.env)
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/qualtrics-tool
OPENAI_API_KEY=your_key_here
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Scripts

- `npm run dev` - Start both applications in development mode
- `npm run build` - Build all applications for production
- `npm run lint` - Run linting across all packages
- `npm run clean` - Clean all node_modules and build artifacts

## Contributing

1. Clone the repository
2. Install dependencies: `npm run install:all`
3. Set up environment variables
4. Start development: `npm run dev`
5. Make changes and test
6. Submit pull request
```

### 7.2 Create Deployment Guide
Create `docs/DEPLOYMENT.md`:
```markdown
# Deployment Guide

## Production Build

### 1. Build Applications
```bash
npm run build
```

### 2. Environment Configuration
Create production environment files:
- `apps/backend/.env.production`
- Frontend environment variables in hosting platform

### 3. Backend Deployment (Railway/Heroku/DigitalOcean)
```bash
cd apps/backend
# Deploy using your preferred platform
```

### 4. Frontend Deployment (Vercel/Netlify)
```bash
cd apps/frontend
# Deploy using your preferred platform
```

## Docker Deployment (Optional)

### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY apps/backend/package*.json ./
RUN npm install --only=production
COPY apps/backend .
EXPOSE 3000
CMD ["npm", "start"]
```

### Frontend Dockerfile
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY apps/frontend/package*.json ./
RUN npm install
COPY apps/frontend .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
```

## Step 8: Initialize Git and Push to Remote

### 8.1 Initialize Git Repository
```bash
# From monorepo root
git add .
git commit -m "Initial monorepo setup with backend and frontend structure

- Migrated existing backend to apps/backend
- Created React frontend in apps/frontend  
- Added shared types package
- Configured workspaces and build scripts
- Added documentation and deployment guides"
```

### 8.2 Create GitHub Repository
```bash
# Create repository on GitHub, then:
git remote add origin https://github.com/yourusername/qualtrics-prompt-tool.git
git branch -M main
git push -u origin main
```

## Step 9: Verify Setup

### 9.1 Test Backend
```bash
npm run dev:backend
# Visit http://localhost:3000/health
```

### 9.2 Test Frontend
```bash
npm run dev:frontend
# Visit http://localhost:5173
```

### 9.3 Test Full Stack
```bash
npm run dev
# Both applications should start and frontend should proxy API calls to backend
```

## Next Steps

1. **Implement Frontend Components**: Use the `FRONTEND_MIGRATION_GUIDE.md` to build out the React components
2. **Connect Frontend to Backend**: Implement API service layer and state management
3. **Add Testing**: Set up testing frameworks for both applications
4. **Configure CI/CD**: Set up automated deployment pipelines
5. **Monitor and Optimize**: Add monitoring, logging, and performance optimization

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3000 (backend) and 5173 (frontend) are available
2. **CORS Errors**: Verify CORS configuration in backend includes frontend URL
3. **Workspace Dependencies**: Run `npm install` from root if shared packages aren't found
4. **Environment Variables**: Ensure all required environment variables are set

### Getting Help

- Check the logs: `npm run dev` shows both backend and frontend logs
- Verify environment variables are loaded correctly
- Test API endpoints individually using curl or Postman
- Check that MongoDB connection is working

This completes your monorepo setup! You now have a solid foundation to build your full-stack Qualtrics prompt learning tool.