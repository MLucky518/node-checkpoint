#!/bin/bash

# Quick start script for testing node-checkpoint
# This script starts Docker databases, runs tests, and cleans up

set -e

echo "🚀 node-checkpoint Test Quick Start"
echo "===================================="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    echo "   Please install Docker and docker-compose first"
    exit 1
fi

# Start databases
echo "📦 Starting test databases..."
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for databases to be ready..."
echo "   This may take 15-20 seconds on first run..."

# Wait for health checks to pass (max 60 seconds)
TIMEOUT=60
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    HEALTHY=$(docker-compose -f docker-compose.test.yml ps | grep -c "healthy" || true)
    if [ "$HEALTHY" -eq "2" ]; then
        echo "✓ Both databases are healthy!"
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo "   Waiting... ($ELAPSED seconds)"
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⚠ Warning: Databases may not be fully ready"
fi

# Check database health
echo ""
echo "🔍 Database status:"
docker-compose -f docker-compose.test.yml ps

# Run unit tests
echo ""
echo "🧪 Running unit tests..."
node test/basic.test.js

# Run integration tests
echo ""
echo "🔗 Running integration tests..."
node test/integration.test.js

# Cleanup
echo ""
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.test.yml down

echo ""
echo "✅ All tests completed successfully!"
echo ""
echo "To run tests again:"
echo "  npm test              # Run all tests (requires databases running)"
echo "  npm run test:unit     # Run only unit tests"
echo "  npm run test:integration  # Run only integration tests"
echo "  npm run test:docker   # Start databases, test, and cleanup"
echo ""
echo "To manually start databases:"
echo "  docker-compose -f docker-compose.test.yml up -d"
echo ""
echo "To stop databases:"
echo "  docker-compose -f docker-compose.test.yml down"
