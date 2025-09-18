import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import {
  geocodeAddress,
  reverseGeocodeCoordinates,
  getDirections,
  findNearbyPlaces,
  getCurrentLocation,
  PLACE_TYPES,
  TRAVEL_MODES,
  DEFAULT_LOCATIONS,
} from '../utils/mapsApi';

const { width: screenWidth } = Dimensions.get('window');

const GoogleMapsIntegratedView = ({ style, userRole = 'agent', agentFilter = null }) => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', role: '' });
  
  const mapRef = useRef(null);
  
  const [mapRegion, setMapRegion] = useState({
    latitude: DEFAULT_LOCATIONS.PASIG.latitude,
    longitude: DEFAULT_LOCATIONS.PASIG.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName') || 'Unknown User';
        const role = await AsyncStorage.getItem('role') || userRole;
        setUserInfo({ name, role });
      } catch (error) {
        console.error('Error loading user info:', error);
        setUserInfo({ name: 'Unknown User', role: userRole });
      }
    };
    loadUserInfo();
  }, [userRole]);

  // Initialize current location
  useEffect(() => {
    const initLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        setMapRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.log('Could not get current location, using default:', error.message);
        // Keep using default location
      }
    };
    initLocation();
  }, []);

  // Fetch allocations
  const fetchAllocations = async () => {
    try {
      setLoading(true);
      console.log('🗺️ Fetching allocations for:', userInfo.name, userInfo.role);

      const response = await fetch(buildApiUrl('/getAllocation'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      if (!responseText || !responseText.trim()) {
        console.log('📍 Maps: Empty response, using mock data');
        setAllocations(getMockAllocations());
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        setAllocations(getMockAllocations());
        return;
      }

      const allocationsArray = data.data || data.allocation || data || [];
      
      // Filter based on user role and agent filter
      let filteredAllocations = allocationsArray;
      
      if (userRole === 'agent' || agentFilter) {
        const targetAgent = agentFilter || userInfo.name;
        filteredAllocations = allocationsArray.filter(allocation => 
          allocation.assignedAgent === targetAgent || 
          allocation.agent === targetAgent ||
          allocation.userName === targetAgent
        );
      }

      // Add coordinates with geocoding for real addresses
      const processedAllocations = await Promise.all(
        filteredAllocations.map(async (allocation, index) => {
          let coordinates = allocation.coordinates;
          
          // If no coordinates but has address, geocode it
          if (!coordinates && allocation.address) {
            try {
              const geocodeResult = await geocodeAddress(allocation.address);
              if (geocodeResult.results && geocodeResult.results.length > 0) {
                coordinates = {
                  latitude: geocodeResult.results[0].latitude,
                  longitude: geocodeResult.results[0].longitude,
                };
              }
            } catch (geocodeError) {
              console.warn('Failed to geocode address:', allocation.address, geocodeError.message);
            }
          }
          
          // Fallback to random coordinates near default location
          if (!coordinates) {
            coordinates = generateRandomCoordinates();
          }

          return {
            ...allocation,
            id: allocation._id || allocation.id || `allocation-${index}`,
            coordinates,
            title: allocation.unitName || allocation.vin || allocation.vehicleId || `Vehicle ${index + 1}`,
            description: `${allocation.unitId || 'Unknown Model'} - ${allocation.status || 'Unknown Status'}`,
            agent: allocation.assignedAgent || allocation.agent || allocation.userName || 'Unassigned',
            status: allocation.status || 'Unknown',
          };
        })
      );

      setAllocations(processedAllocations);
      console.log(`✅ Maps: Loaded ${processedAllocations.length} allocations`);

    } catch (error) {
      console.error('❌ Error fetching allocations:', error);
      setAllocations(getMockAllocations());
    } finally {
      setLoading(false);
    }
  };

  // Search for places using geocoding
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Error', 'Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      const results = await geocodeAddress(searchQuery);
      
      if (results.results && results.results.length > 0) {
        setSearchResults(results.results);
        setShowSearchModal(true);
      } else {
        Alert.alert('No Results', 'No places found for your search query');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to search for places. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to selected search result
  const navigateToSearchResult = async (result) => {
    const destination = {
      latitude: result.latitude,
      longitude: result.longitude,
    };

    // Animate map to location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        ...destination,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }

    // Get directions if current location is available
    if (currentLocation) {
      try {
        const directionsResult = await getDirections(
          { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
          destination,
          TRAVEL_MODES.DRIVING
        );

        if (directionsResult.route && directionsResult.route.polyline) {
          // Decode polyline and set route coordinates
          const coordinates = decodePolyline(directionsResult.route.polyline);
          setRouteCoordinates(coordinates);
        }
      } catch (error) {
        console.error('Directions error:', error);
      }
    }

    setShowSearchModal(false);
  };

  // Find nearby places
  const findNearby = async (placeType) => {
    if (!currentLocation && !selectedMarker) {
      Alert.alert('Location Required', 'Please enable location services or select a marker first');
      return;
    }

    const searchLocation = selectedMarker?.coordinates || currentLocation;

    try {
      setLoading(true);
      const results = await findNearbyPlaces(
        searchLocation.latitude,
        searchLocation.longitude,
        2000, // 2km radius
        placeType
      );

      if (results.places && results.places.length > 0) {
        setNearbyPlaces(results.places);
        setShowNearbyModal(true);
      } else {
        Alert.alert('No Results', `No ${placeType.replace('_', ' ')} found nearby`);
      }
    } catch (error) {
      console.error('Nearby places error:', error);
      Alert.alert('Search Error', 'Failed to find nearby places. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock coordinates for demo
  const generateRandomCoordinates = () => {
    const baseLatitude = DEFAULT_LOCATIONS.PASIG.latitude;
    const baseLongitude = DEFAULT_LOCATIONS.PASIG.longitude;
    
    return {
      latitude: baseLatitude + (Math.random() - 0.5) * 0.02,
      longitude: baseLongitude + (Math.random() - 0.5) * 0.02,
    };
  };

  // Mock allocations for demo
  const getMockAllocations = () => [
    {
      id: 'demo1',
      title: 'Isuzu D-MAX (ABC-123)',
      description: 'Out for Delivery - Agent: John Doe',
      coordinates: generateRandomCoordinates(),
      status: 'Out for Delivery',
      agent: 'John Doe',
      unitName: 'Isuzu D-MAX',
      unitId: 'ABC-123',
    },
    {
      id: 'demo2',
      title: 'Isuzu MU-X (XYZ-456)',
      description: 'Delivered - Agent: Jane Smith',
      coordinates: generateRandomCoordinates(),
      status: 'Delivered',
      agent: 'Jane Smith',
      unitName: 'Isuzu MU-X',
      unitId: 'XYZ-456',
    },
  ];

  // Simple polyline decoder (basic implementation)
  const decodePolyline = (encoded) => {
    // This is a basic decoder - in production you'd use a proper library
    // For now, return empty array until proper implementation
    return [];
  };

  // Load data on component mount
  useEffect(() => {
    fetchAllocations();
  }, [userInfo]);

  const handleMapReady = () => {
    setMapReady(true);
    console.log('✅ Google Maps integrated view ready');
  };

  const handleMapError = (error) => {
    console.error('❌ Maps: MapView error:', error);
    // Don't crash the app, show user-friendly message
    Alert.alert(
      'Map Loading Issue', 
      'The map is having trouble loading. The app will continue to work with vehicle data. You can try refreshing.',
      [{ text: 'OK', onPress: () => fetchAllocations() }]
    );
  };

  const handleMarkerPress = (allocation) => {
    setSelectedMarker(allocation);
    console.log('📍 Marker selected:', allocation.title);
  };

  const getMarkerColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'green';
      case 'out for delivery': return 'blue';
      case 'in transit': return 'orange';
      case 'pending': return 'red';
      default: return 'gray';
    }
  };

  if (loading && allocations.length === 0) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Google Maps Integration...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header with search */}
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Maps with Google Integration</Text>
        <Text style={styles.subtitle}>
          {allocations.length} Vehicles • {userInfo.role} • {userInfo.name}
        </Text>
        
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for places..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Action buttons */}
      <ScrollView horizontal style={styles.actionBar} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity style={styles.actionButton} onPress={() => findNearby(PLACE_TYPES.GAS_STATION)}>
          <Text style={styles.actionButtonText}>⛽ Gas Stations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => findNearby(PLACE_TYPES.RESTAURANT)}>
          <Text style={styles.actionButtonText}>🍽️ Restaurants</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => findNearby(PLACE_TYPES.REPAIR_SHOP)}>
          <Text style={styles.actionButtonText}>🔧 Repair Shops</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => findNearby(PLACE_TYPES.HOSPITAL)}>
          <Text style={styles.actionButtonText}>🏥 Hospitals</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        mapType="standard"
        onMapReady={handleMapReady}
        onError={handleMapError}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current location"
            pinColor="blue"
          />
        )}

        {/* Vehicle Allocation Markers */}
        {allocations.map((allocation) => (
          <Marker
            key={allocation.id}
            coordinate={allocation.coordinates}
            title={allocation.title}
            description={allocation.description}
            pinColor={getMarkerColor(allocation.status)}
            onPress={() => handleMarkerPress(allocation)}
          />
        ))}

        {/* Nearby Places Markers */}
        {nearbyPlaces.map((place, index) => (
          <Marker
            key={`nearby-${index}`}
            coordinate={place.coordinates}
            title={place.name}
            description={place.vicinity}
            pinColor="purple"
          />
        ))}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={3}
            lineDashPattern={[5, 10]}
          />
        )}
      </MapView>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.mapLoadingText}>Loading Google Maps...</Text>
        </View>
      )}

      {/* Search Results Modal */}
      <Modal visible={showSearchModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Search Results</Text>
            <ScrollView>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => navigateToSearchResult(result)}
                >
                  <Text style={styles.resultTitle}>{result.address}</Text>
                  <Text style={styles.resultSubtitle}>
                    📍 {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowSearchModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Nearby Places Modal */}
      <Modal visible={showNearbyModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nearby Places</Text>
            <ScrollView>
              {nearbyPlaces.map((place, index) => (
                <View key={index} style={styles.resultItem}>
                  <Text style={styles.resultTitle}>{place.name}</Text>
                  <Text style={styles.resultSubtitle}>{place.vicinity}</Text>
                  {place.rating && (
                    <Text style={styles.resultRating}>⭐ {place.rating}/5</Text>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowNearbyModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Selected Marker Info */}
      {selectedMarker && (
        <View style={styles.markerInfo}>
          <Text style={styles.markerTitle}>{selectedMarker.title}</Text>
          <Text style={styles.markerDescription}>{selectedMarker.description}</Text>
          <TouchableOpacity
            style={styles.closeMarkerButton}
            onPress={() => setSelectedMarker(null)}
          >
            <Text style={styles.closeMarkerButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
  },
  actionBar: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: screenWidth * 0.9,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  resultRating: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  markerInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  markerDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeMarkerButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeMarkerButtonText: {
    fontSize: 20,
    color: '#666',
  },
});

export default GoogleMapsIntegratedView;
