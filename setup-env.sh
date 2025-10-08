#!/bin/bash

echo "Setting up Prompt Learning Plugin environment..."

read -p "Enter your MongoDB URI: " MONGODB_URI
read -s -p "Enter your OpenAI API Key: " OPENAI_API_KEY
echo

cat > apps/backend/.env << EOF
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database Configuration
MONGODB_URI=${MONGODB_URI}

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}

# CORS Configuration
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Dataset Configuration
DATASET_PATH=./data/

# Features
MAX_ATTEMPTS=3
FEEDBACK_LEVEL=llm
ENABLE_DEMO_MODE=true
EOF

echo "Environment file created successfully!"
echo "Now you can run: npm run dev"