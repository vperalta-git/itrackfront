import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const RouteSelectionModal = ({ 
  isVisible, 
  onClose, 
  onRouteSelect, 
  initialPickup = null, 
  initialDropoff = null,
  title = "Select Route" 
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995, // Manila center
    longitude: 120.9842,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const [pickupLocation, setPickupLocation] = useState(initialPickup);
  const [dropoffLocation, setDropoffLocation] = useState(initialDropoff);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSelection, setActiveSelection] = useState('pickup'); // 'pickup' or 'dropoff'
  const [googleApiKey, setGoogleApiKey] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // API base URL
  const API_BASE_URL = 'https://backend.acmobility-uat.com';

  useEffect(() => {
    if (isVisible) {
      fetchGoogleApiKey();
      // Location permission removed - only drivers need GPS tracking
      // Saves battery, API calls, and reduces costs
    }
  }, [isVisible]);

  const fetchGoogleApiKey = async () => {
    // Use direct API key for admin/dispatch - backend might be offline
    const FALLBACK_KEY = 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${API_BASE_URL}/api/maps/api-key`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          const data = JSON.parse(text);
          if (data.success && data.apiKey) {
            setGoogleApiKey(data.apiKey);
            console.log('✓ API key loaded from backend');
            return;
          }
        }
      }
      throw new Error('Backend unavailable');
    } catch (err) {
      console.log('ℹ Using direct API key (backend offline)');
      setGoogleApiKey(FALLBACK_KEY);
    }
  };

  useEffect(() => {
    // Auto-search when query changes
    if (searchQuery.length > 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        searchLocations(searchQuery);
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Location tracking removed for admin/dispatch/agent users
  // Only drivers need GPS tracking for real-time location updates
  // This reduces API calls, battery usage, and operational costs

  const searchLocations = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    if (!googleApiKey) {
      console.log('⏳ Waiting for API key...');
      return;
    }

    setIsSearching(true);
    try {
      // Use Google Places API directly (no backend needed)
      const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&location=14.5995,120.9842&radius=50000&key=${googleApiKey}`;
      
      const response = await fetch(autocompleteUrl);
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const text = await response.text();
      const data = text ? JSON.parse(text) : { status: 'ERROR' };

      if (data.status === 'OK' && data.predictions) {
        // Get detailed place info for each prediction
        const detailedResults = await Promise.all(
          data.predictions.slice(0, 5).map(async (prediction) => {
            try {
              // Get place details directly from Google
              const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=name,formatted_address,geometry&key=${googleApiKey}`;
              const detailsResponse = await fetch(detailsUrl);
              
              if (!detailsResponse.ok) return null;
              
              const detailsText = await detailsResponse.text();
              const detailsData = detailsText ? JSON.parse(detailsText) : { status: 'ERROR' };

              if (detailsData.status === 'OK' && detailsData.result) {
                const place = detailsData.result;
                return {
                  name: place.name || prediction.description,
                  address: place.formatted_address || prediction.description,
                  coordinates: {
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng
                  },
                  placeId: prediction.place_id,
                  type: 'search_result'
                };
              }
            } catch (error) {
              console.error('Error fetching place details:', error);
            }
            return null;
          })
        );

        const validResults = detailedResults.filter(result => result !== null);
        setSearchResults(validResults);
        console.log(`✓ Found ${validResults.length} locations`);
      } else {
        setSearchResults([]);
        console.log('ℹ No results found');
      }
    } catch (error) {
      console.error('Search error:', error.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapPress = async (event) => {
    const coordinate = event.nativeEvent.coordinate;
    
    if (!googleApiKey) {
      Alert.alert('Error', 'Google Maps API key not loaded');
      return;
    }

    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${googleApiKey}`;
      const response = await fetch(geocodeUrl);
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const text = await response.text();
      const data = text ? JSON.parse(text) : { status: 'ERROR' };

      let locationData;

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const place = data.results[0];
        locationData = {
          name: place.formatted_address.split(',')[0], // First part as name
          address: place.formatted_address,
          coordinates: coordinate,
          placeId: place.place_id,
          type: 'map_selected'
        };
      } else {
        // Fallback without address
        locationData = {
          name: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
          address: `Coordinates: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
          coordinates: coordinate,
          type: 'map_selected'
        };
      }

      selectLocation(locationData);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback
      const locationData = {
        name: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        address: `Coordinates: ${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        coordinates: coordinate,
        type: 'map_selected'
      };
      
      selectLocation(locationData);
    }
  };

  const selectLocation = (location) => {
    if (activeSelection === 'pickup') {
      setPickupLocation(location);
      setActiveSelection('dropoff');
    } else {
      setDropoffLocation(location);
    }

    // Clear search
    setSearchQuery('');
    setSearchResults([]);

    // Animate map to selected location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...location.coordinates,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Fetch route from Google Directions API
  const fetchRoute = async (pickup, dropoff) => {
    if (!pickup || !dropoff || !googleApiKey) {
      return;
    }

    setIsLoadingRoute(true);
    try {
      const origin = `${pickup.coordinates.latitude},${pickup.coordinates.longitude}`;
      const destination = `${dropoff.coordinates.latitude},${dropoff.coordinates.longitude}`;
      
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${googleApiKey}`;
      
      const response = await fetch(directionsUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch route');
      }
      
      const text = await response.text();
      const data = text ? JSON.parse(text) : { status: 'ERROR' };

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);
        
        // Fit map to show entire route
        if (mapRef.current && points.length > 0) {
          mapRef.current.fitToCoordinates(points, {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          });
        }
        
        console.log('✓ Route loaded with', points.length, 'points');
      } else {
        console.log('ℹ No route found');
        setRouteCoordinates([]);
      }
    } catch (error) {
      console.error('Route fetch error:', error.message);
      setRouteCoordinates([]);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Decode Google's encoded polyline format
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  // Auto-fetch route when both locations are selected
  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      fetchRoute(pickupLocation, dropoffLocation);
    } else {
      setRouteCoordinates([]);
    }
  }, [pickupLocation, dropoffLocation, googleApiKey]);

  const handleConfirmRoute = () => {
    if (!pickupLocation || !dropoffLocation) {
      Alert.alert('Incomplete Route', 'Please select both pickup and drop-off locations');
      return;
    }

    const routeData = {
      pickup: pickupLocation,
      dropoff: dropoffLocation,
      distance: calculateDistance(
        pickupLocation.coordinates,
        dropoffLocation.coordinates
      ),
      estimatedTime: calculateEstimatedTime(
        pickupLocation.coordinates,
        dropoffLocation.coordinates
      )
    };

    onRouteSelect(routeData);
    onClose();
  };

  const calculateDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1); // Distance in km
  };

  const calculateEstimatedTime = (coord1, coord2) => {
    const distance = parseFloat(calculateDistance(coord1, coord2));
    const averageSpeed = 40; // km/h average speed in Metro Manila
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    return timeInMinutes;
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity 
            onPress={handleConfirmRoute}
            style={[styles.confirmButton, (!pickupLocation || !dropoffLocation) && styles.confirmButtonDisabled]}
            disabled={!pickupLocation || !dropoffLocation}
          >
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>

        {/* Selection Mode Tabs */}
        <View style={styles.selectionTabs}>
          <TouchableOpacity
            style={[styles.selectionTab, activeSelection === 'pickup' && styles.activeSelectionTab]}
            onPress={() => setActiveSelection('pickup')}
          >
            <Text style={[styles.selectionTabText, activeSelection === 'pickup' && styles.activeSelectionTabText]}>
              📍 Pickup Location
            </Text>
            {pickupLocation && (
              <Text style={styles.selectedLocationText} numberOfLines={1}>
                {pickupLocation.name}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectionTab, activeSelection === 'dropoff' && styles.activeSelectionTab]}
            onPress={() => setActiveSelection('dropoff')}
          >
            <Text style={[styles.selectionTabText, activeSelection === 'dropoff' && styles.activeSelectionTabText]}>
              🎯 Drop-off Location
            </Text>
            {dropoffLocation && (
              <Text style={styles.selectedLocationText} numberOfLines={1}>
                {dropoffLocation.name}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search for ${activeSelection} location...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.textSecondary}
          />
          {isSearching && (
            <ActivityIndicator 
              style={styles.searchLoader} 
              size="small" 
              color={theme.primary} 
            />
          )}
        </View>

        <View style={styles.content}>
          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'ios' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onPress={handleMapPress}
              onMapReady={() => {
                console.log('🗺️ RouteSelectionModal: Map loaded successfully');
              }}
              onError={(error) => {
                console.error('🗺️ RouteSelectionModal: Map error:', error);
              }}
              showsUserLocation={true}
              showsMyLocationButton={true}
              loadingEnabled={true}
              loadingIndicatorColor="#007AFF"
              loadingBackgroundColor="#FFFFFF"
            >
              {/* Route Polyline */}
              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#007AFF"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              {/* Pickup Marker */}
              {pickupLocation && (
                <Marker
                  coordinate={pickupLocation.coordinates}
                  title="Pickup Location"
                  description={pickupLocation.address}
                  pinColor="#059669"
                />
              )}

              {/* Drop-off Marker */}
              {dropoffLocation && (
                <Marker
                  coordinate={dropoffLocation.coordinates}
                  title="Drop-off Location"
                  description={dropoffLocation.address}
                  pinColor="#dc2626"
                />
              )}
            </MapView>

            {/* Map Instructions */}
            <View style={styles.mapInstructions}>
              <Text style={styles.mapInstructionsText}>
                📍 Tap on map to select {activeSelection} location
              </Text>
            </View>

            {/* Route Summary */}
            {pickupLocation && dropoffLocation && (
              <View style={styles.routeSummary}>
                <Text style={styles.routeSummaryTitle}>📊 Route Summary</Text>
                <Text style={styles.routeSummaryText}>
                  Distance: ~{calculateDistance(pickupLocation.coordinates, dropoffLocation.coordinates)} km
                </Text>
                <Text style={styles.routeSummaryText}>
                  Est. Time: ~{calculateEstimatedTime(pickupLocation.coordinates, dropoffLocation.coordinates)} mins
                </Text>
                {isLoadingRoute && (
                  <View style={styles.routeLoadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.routeLoadingText}>Loading route...</Text>
                  </View>
                )}
                {!isLoadingRoute && routeCoordinates.length > 0 && (
                  <Text style={styles.routeSuccessText}>✓ Route displayed on map</Text>
                )}
              </View>
            )}
          </View>

          {/* Search Results Overlay */}
          {searchResults.length > 0 && (
            <View style={styles.searchResultsOverlay}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.searchResultsContainer}>
                  <Text style={styles.searchResultsTitle}>🔍 Search Results</Text>
                  {searchResults.map((location, index) => (
                    <TouchableOpacity
                      key={`search-${index}`}
                      style={styles.searchResultItem}
                      onPress={() => selectLocation(location)}
                    >
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>{location.name}</Text>
                        <Text style={styles.searchResultAddress}>{location.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: theme.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  confirmButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.textSecondary,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  selectionTabs: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  selectionTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: theme.border,
  },
  activeSelectionTab: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '10',
  },
  selectionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    textAlign: 'center',
  },
  activeSelectionTabText: {
    color: theme.primary,
  },
  selectedLocationText: {
    fontSize: 12,
    color: theme.text,
    textAlign: 'center',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: theme.card,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },
  searchLoader: {
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  mapInstructionsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  routeSummary: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  routeSummaryText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  routeLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  routeLoadingText: {
    fontSize: 13,
    color: theme.textSecondary,
    marginLeft: 8,
  },
  routeSuccessText: {
    fontSize: 13,
    color: '#059669',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    fontWeight: '600',
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    maxHeight: height * 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  searchResultsContainer: {
    padding: 16,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  searchResultItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
});

export default RouteSelectionModal;