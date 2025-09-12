#!/bin/bash

# I-Track Backend Health Check & Deployment Verification Script
# This script tests all endpoints and verifies the backend is working correctly

echo "🚀 I-Track Backend Health Check Started"
echo "======================================="

BASE_URL=${1:-"https://itrack-backend.onrender.com"}
echo "Testing Base URL: $BASE_URL"
echo ""

# Function to test an endpoint
test_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    local expected_status=${3:-200}
    
    echo -n "Testing $method $endpoint ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -o /tmp/response.json "$BASE_URL$endpoint")
    fi
    
    if [ "$response" = "$expected_status" ]; then
        echo "✅ OK ($response)"
        return 0
    else
        echo "❌ FAILED ($response)"
        echo "Response:"
        cat /tmp/response.json 2>/dev/null || echo "No response body"
        echo ""
        return 1
    fi
}

# Test critical endpoints
echo "📋 Testing Critical Endpoints:"
echo "------------------------------"

test_endpoint "/"
test_endpoint "/health"
test_endpoint "/api/config"
test_endpoint "/api/mobile-config"
test_endpoint "/test"

echo ""
echo "📋 Testing API Endpoints:"
echo "-------------------------"

test_endpoint "/getUsers"
test_endpoint "/getAllocation"
test_endpoint "/getStock"
test_endpoint "/getRequest"
test_endpoint "/getCompletedRequests"
test_endpoint "/dashboard/stats"
test_endpoint "/api/dispatch/assignments"

echo ""
echo "🗺️  Testing Maps Endpoints:"
echo "----------------------------"

test_endpoint "/api/maps/geocode?address=Manila,Philippines"
test_endpoint "/api/maps/reverse-geocode?lat=14.5995&lon=120.9842"
test_endpoint "/api/maps/nearby?lat=14.5995&lon=120.9842&radius=1000"

echo ""
echo "🔐 Testing Authentication:"
echo "--------------------------"

# Test login with sample data
echo -n "Testing POST /login ... "
login_response=$(curl -s -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -o /tmp/login_response.json \
  "$BASE_URL/login")

if [ "$login_response" = "200" ]; then
    echo "✅ OK ($login_response)"
else
    echo "❌ FAILED ($login_response)"
    echo "Response:"
    cat /tmp/login_response.json 2>/dev/null || echo "No response body"
fi

echo ""
echo "📊 Health Check Summary:"
echo "========================"

# Get health status
health_response=$(curl -s "$BASE_URL/health")
echo "Health Status: $health_response"

# Get server config
config_response=$(curl -s "$BASE_URL/api/config" | head -c 500)
echo ""
echo "Server Config (first 500 chars): $config_response"

echo ""
echo "🎉 Health Check Complete!"
echo "========================="
echo "If all endpoints show ✅ OK, your backend is ready for production!"
echo "If you see ❌ FAILED, check the Render logs for detailed error information."
