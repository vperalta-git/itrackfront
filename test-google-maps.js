/**
 * Google Maps API Key Diagnostic Tool
 * Run this to check your API key status and quotas
 */

const API_KEY = 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';

async function checkGoogleMapsAPIKey() {
  console.log('🔍 Testing Google Maps API Key...');
  console.log('API Key:', API_KEY);
  
  try {
    // Test Geocoding API (free tier: 40,000 requests/month)
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Santa+Rosa+Laguna+Philippines&key=${API_KEY}`;
    
    console.log('\n📍 Testing Geocoding API...');
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    console.log('Status:', geocodeData.status);
    console.log('Error Message:', geocodeData.error_message || 'None');
    
    if (geocodeData.status === 'REQUEST_DENIED') {
      console.log('❌ API Key is restricted or invalid');
      console.log('Possible issues:');
      console.log('- API key restrictions (HTTP referrers, IP restrictions)');
      console.log('- Geocoding API not enabled');
      console.log('- Billing not enabled (free tier exhausted)');
    } else if (geocodeData.status === 'OVER_QUERY_LIMIT') {
      console.log('❌ Quota exceeded - Free tier limits reached');
      console.log('Daily limit: 100 requests for Maps SDK');
      console.log('Monthly limit: 40,000 requests for Geocoding');
    } else if (geocodeData.status === 'OK') {
      console.log('✅ Geocoding API working');
      console.log('Location found:', geocodeData.results[0]?.formatted_address);
    }

    // Test Places API (if enabled)
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=Isuzu+Laguna&key=${API_KEY}`;
    
    console.log('\n🏢 Testing Places API...');
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();
    
    console.log('Places Status:', placesData.status);
    console.log('Places Error:', placesData.error_message || 'None');

  } catch (error) {
    console.error('Network Error:', error.message);
  }

  console.log('\n💡 Solutions for blank maps:');
  console.log('1. Enable billing in Google Cloud Console');
  console.log('2. Increase API quotas');
  console.log('3. Remove API key restrictions');
  console.log('4. Use MapBox as alternative (free tier: 50,000 views/month)');
}

// Run the test
checkGoogleMapsAPIKey();