/**
 * MapBox Alternative Configuration
 * Free tier: 50,000 map views/month (vs Google's 28,000)
 */

// 1. Install MapBox SDK
// npm install @react-native-mapbox-gl/maps

// 2. Add to app.json
const mapBoxConfig = {
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo"
        }
      }
    },
    "plugins": [
      [
        "@react-native-mapbox-gl/maps",
        {
          "RNMapboxMapsImpl": "mapbox",
          "RNMapboxMapsDownloadToken": "sk.YOUR_SECRET_TOKEN_HERE"
        }
      ]
    ]
  }
};

// 3. Alternative RouteSelectionModal with fallback
const routeSelectionWithFallback = `
import React, { useState } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
// import MapboxGL from '@react-native-mapbox-gl/maps'; // Fallback

const RouteSelectionModal = () => {
  const [useMapBox, setUseMapBox] = useState(false);

  const handleMapError = (error) => {
    console.log('Google Maps failed, switching to MapBox:', error);
    setUseMapBox(true);
  };

  return (
    <View>
      {!useMapBox ? (
        <MapView
          provider={PROVIDER_GOOGLE}
          onError={handleMapError}
          // ... other props
        />
      ) : (
        <Text>MapBox fallback would go here</Text>
        // <MapboxGL.MapView />
      )}
    </View>
  );
};
`;

console.log('MapBox configuration ready');
console.log('1. Remove Google API restrictions first (fastest)');
console.log('2. If still failing, implement MapBox fallback');
console.log('3. MapBox free tier: 50,000 views/month vs Google 28,000');