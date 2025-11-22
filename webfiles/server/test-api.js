// Test script for new API endpoints
// Run this to verify the backend changes are working

const baseURL = 'http://localhost:8000/api';

const testEndpoints = async () => {
  console.log('🧪 Testing I-Track Backend API Endpoints...\n');
  
  try {
    // Test 1: Get all users
    console.log('📝 Test 1: GET /getUsers');
    const usersResponse = await fetch(`${baseURL}/getUsers`);
    const users = await usersResponse.json();
    console.log(`✅ Found ${users.length} users\n`);
    
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`📝 Test 2: GET /profile/${testUser._id}`);
      
      // Test 2: Get user profile
      const profileResponse = await fetch(`${baseURL}/profile/${testUser._id}`);
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log('✅ Profile endpoint working');
        console.log(`   User: ${profile.name || profile.username}`);
        console.log(`   Role: ${profile.role}`);
        console.log(`   Fields: ${Object.keys(profile).join(', ')}\n`);
      } else {
        console.log('❌ Profile endpoint failed\n');
      }
      
      // Test 3: Update profile
      console.log(`📝 Test 3: PUT /profile/${testUser._id}`);
      const updateResponse = await fetch(`${baseURL}/profile/${testUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: 'Updated via API test',
          department: 'Test Department'
        })
      });
      
      if (updateResponse.ok) {
        console.log('✅ Profile update endpoint working\n');
      } else {
        console.log('❌ Profile update endpoint failed\n');
      }
    }
    
    // Test 4: Get managers
    console.log('📝 Test 4: GET /managers');
    const managersResponse = await fetch(`${baseURL}/managers`);
    if (managersResponse.ok) {
      const managers = await managersResponse.json();
      console.log(`✅ Found ${managers.length} managers\n`);
    } else {
      console.log('❌ Managers endpoint failed\n');
    }
    
    // Test 5: Login test
    console.log('📝 Test 5: POST /login');
    const loginResponse = await fetch(`${baseURL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin', // Adjust based on your test data
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      console.log('✅ Login endpoint working');
      console.log(`   Success: ${loginResult.success}\n`);
    } else {
      console.log('⚠️ Login endpoint test failed (expected if credentials don\'t exist)\n');
    }
    
    console.log('🎉 API testing completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 8000');
  }
};

// Run the tests
testEndpoints();
