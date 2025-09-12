# Google Maps API Setup for I-Track Backend

## Overview

The I-Track backend now uses Google Maps API for all mapping services instead of OpenStreetMap. This provides better reliability, accuracy, and performance for your mobile app.

## Required APIs

Your Google Cloud project needs these APIs enabled:

1. **Geocoding API** - Convert addresses to coordinates
2. **Directions API** - Get route directions between points
3. **Places API** - Find nearby places and points of interest
4. **Maps JavaScript API** - For web map display (if needed)

## Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Geocoding API
   - Directions API
   - Places API
   - Maps JavaScript API
4. Go to "Credentials" and create an API Key
5. **IMPORTANT**: Restrict your API key for security:
   - Application restrictions: HTTP referrers or IP addresses
   - API restrictions: Select only the APIs you enabled above

## Step 2: Configure Render Environment Variable

1. Log into your Render dashboard
2. Go to your `itrack-backend-api` service
3. Go to "Environment" tab
4. Add a new environment variable:
   - **Key**: `GOOGLE_MAPS_API_KEY`
   - **Value**: Your Google Maps API key (paste it here)
5. Save and redeploy

## Step 3: Test the Integration

After deployment, test these endpoints:

- `https://itrack-backend-1.onrender.com/api/maps/geocode?address=Manila,Philippines`
- `https://itrack-backend-1.onrender.com/api/maps/reverse-geocode?lat=14.5995&lon=120.9842`
- `https://itrack-backend-1.onrender.com/api/maps/directions?start_lat=14.5995&start_lon=120.9842&end_lat=14.6042&end_lon=121.0222`
- `https://itrack-backend-1.onrender.com/api/maps/nearby?lat=14.5995&lon=120.9842&type=restaurant`

## Expected Benefits with Starter Plan

✅ **Better Performance**: Google Maps API is faster and more reliable
✅ **Higher Rate Limits**: Starter plan + Google API = no rate limiting issues
✅ **Accurate Data**: Google Maps has the most up-to-date mapping data
✅ **Mobile Optimized**: APIs designed for mobile app integration
✅ **No CORS Issues**: Google APIs work seamlessly with mobile apps

## Cost Considerations

- Google Maps API has generous free tier (28,000+ requests/month free)
- Your Render Starter plan ($7/month) provides better compute resources
- Combined cost is very reasonable for a production mobile app

## Troubleshooting

**If you see "API key not configured":**

- Make sure you added `GOOGLE_MAPS_API_KEY` to Render environment variables
- Redeploy the service after adding the environment variable

**If you see "API key invalid":**

- Check that your API key is correct
- Verify the required APIs are enabled in Google Cloud Console
- Make sure API restrictions allow the APIs you're using

**If requests fail:**

- Check your Google Cloud Console for API quota/billing issues
- Verify your API key restrictions aren't too restrictive

## Next Steps

1. Add your Google Maps API key to Render environment variables
2. Redeploy your service
3. Test the endpoints above
4. Update your mobile app if needed to use the new endpoint responses

The backend is now ready for production with Google Maps integration! 🚀
