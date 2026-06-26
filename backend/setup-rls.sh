#!/bin/bash

echo "========================================="
echo "Setting up Row-Level Security (RLS)"
echo "========================================="

cd "$(dirname "$0")"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    exit 1
fi

echo "Installing dependencies..."
npm install > /dev/null 2>&1

echo "Setting up RLS policies..."
node scripts/setup-rls.js

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: RLS setup failed"
    exit 1
fi

echo ""
echo "========================================="
echo "RLS setup completed successfully!"
echo "========================================="
echo ""
echo "You can now run the RLS test with:"
echo "  npm run test:rls"
echo ""