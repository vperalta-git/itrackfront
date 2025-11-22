// Quick test to check driver data in database
const axios = require('axios');

const BASE_URL = 'http://192.168.254.147:5000';

async function testDriverData() {
  try {
    console.log('🔍 Fetching all users...');
    const usersRes = await axios.get(`${BASE_URL}/getUsers`);
    const users = usersRes.data.data || [];
    
    console.log(`\n📊 Total users: ${users.length}`);
    
    const drivers = users.filter(u => u.role === 'Driver');
    console.log(`\n🚗 Driver accounts: ${drivers.length}`);
    
    drivers.forEach((driver, index) => {
      console.log(`\n  Driver ${index + 1}:`);
      console.log(`    Name: ${driver.accountName || driver.name || driver.username}`);
      console.log(`    Email: ${driver.email}`);
      console.log(`    Role: ${driver.role}`);
      console.log(`    ID: ${driver._id}`);
    });
    
    console.log('\n\n🔍 Fetching all allocations...');
    const allocRes = await axios.get(`${BASE_URL}/getAllocation`);
    const allocations = allocRes.data.data || [];
    
    console.log(`\n📊 Total allocations: ${allocations.length}`);
    
    if (allocations.length > 0) {
      console.log('\n📋 Allocation details:');
      allocations.forEach((alloc, index) => {
        console.log(`\n  Allocation ${index + 1}:`);
        console.log(`    Vehicle: ${alloc.unitName} (${alloc.unitId})`);
        console.log(`    Assigned Driver: ${alloc.assignedDriver || 'Not assigned'}`);
        console.log(`    Assigned Driver Email: ${alloc.assignedDriverEmail || 'Not set'}`);
        console.log(`    Status: ${alloc.status}`);
        console.log(`    Pickup: ${alloc.pickupPoint || 'Not set'}`);
        console.log(`    Dropoff: ${alloc.dropoffPoint || 'Not set'}`);
      });
      
      // Check which allocations match which drivers
      console.log('\n\n🔗 Allocation-Driver Matching:');
      drivers.forEach(driver => {
        const driverName = driver.accountName || driver.name || driver.username;
        const driverEmail = driver.email;
        
        const matchedAllocs = allocations.filter(alloc => {
          const emailMatch = alloc.assignedDriverEmail && 
                           alloc.assignedDriverEmail.toLowerCase() === driverEmail.toLowerCase();
          const nameMatch = alloc.assignedDriver && 
                          alloc.assignedDriver.toLowerCase() === driverName.toLowerCase();
          return emailMatch || nameMatch;
        });
        
        console.log(`\n  Driver: ${driverName} (${driverEmail})`);
        console.log(`    Matched Allocations: ${matchedAllocs.length}`);
        matchedAllocs.forEach((alloc, idx) => {
          console.log(`      ${idx + 1}. ${alloc.unitName} - ${alloc.status} (matched by: ${
            alloc.assignedDriverEmail === driverEmail ? 'EMAIL' : 'NAME'
          })`);
        });
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDriverData();
