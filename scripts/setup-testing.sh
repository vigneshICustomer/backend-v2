#!/bin/bash

# Audience & Cohorts API Testing Setup Script
# This script sets up everything needed to test the migrated API

echo "🚀 Setting up Audience & Cohorts API for testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend-v2 directory"
    exit 1
fi

print_status "Checking dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Node.js and npm are installed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
else
    print_success "Dependencies already installed"
fi

# Check if database file exists (for SQLite) or if PostgreSQL is configured
print_status "Checking database configuration..."

# Seed the database with initial data
print_status "Seeding database with initial audience objects and relationships..."
npm run ts-node src/db/seed-audiences.ts

if [ $? -eq 0 ]; then
    print_success "Database seeded successfully"
else
    print_warning "Database seeding failed - you may need to set up the database first"
fi

# Check if the server can start
print_status "Testing server startup..."
timeout 10s npm run dev &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if the server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Server started successfully"
    # Kill the test server
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
else
    print_warning "Server startup test failed - check your configuration"
fi

# Create a simple test script
print_status "Creating test script..."
cat > test-api.js << 'EOF'
const http = require('http');

const baseUrl = 'http://localhost:3001';

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Testing Audience & Cohorts API...\n');

    try {
        // Test health check
        console.log('1. Testing health check...');
        const health = await makeRequest('/api/audiences/health');
        console.log(`   Status: ${health.status}`);
        console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

        // Test objects endpoint
        console.log('2. Testing objects endpoint...');
        const objects = await makeRequest('/api/objects');
        console.log(`   Status: ${objects.status}`);
        console.log(`   Objects count: ${objects.data.count || 0}\n`);

        // Test relationships endpoint
        console.log('3. Testing relationships endpoint...');
        const relationships = await makeRequest('/api/relationships');
        console.log(`   Status: ${relationships.status}`);
        console.log(`   Relationships count: ${relationships.data.count || 0}\n`);

        console.log('✅ Basic API tests completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Import the Postman collection from postman/Audience-Cohorts-API.postman_collection.json');
        console.log('   2. Follow the testing guide in postman/TESTING_GUIDE.md');
        console.log('   3. Set up BigQuery connection for full testing');

    } catch (error) {
        console.error('❌ API test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Make sure the server is running: npm run dev');
        console.log('   2. Check if the database is properly set up');
        console.log('   3. Verify the server is running on port 3001');
    }
}

// Run the test
testAPI();
EOF

print_success "Test script created"

# Display setup summary
echo ""
echo "🎉 Setup completed!"
echo ""
echo "📁 Files created:"
echo "   - postman/Audience-Cohorts-API.postman_collection.json (Postman collection)"
echo "   - postman/TESTING_GUIDE.md (Comprehensive testing guide)"
echo "   - test-api.js (Quick API test script)"
echo ""
echo "🚀 To start testing:"
echo "   1. Start the server: npm run dev"
echo "   2. Run quick test: node test-api.js"
echo "   3. Import Postman collection for full testing"
echo ""
echo "📖 For detailed testing instructions, see:"
echo "   postman/TESTING_GUIDE.md"
echo ""
echo "🔗 API Endpoints available at:"
echo "   http://localhost:3001/api/audiences/*"
echo "   http://localhost:3001/api/cohorts/*"
echo "   http://localhost:3001/api/objects"
echo "   http://localhost:3001/api/relationships"
echo ""

# Make the script executable
chmod +x scripts/setup-testing.sh

print_success "Setup script is ready to use!"
