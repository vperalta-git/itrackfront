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
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [recentLocations, setRecentLocations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSelection, setActiveSelection] = useState('pickup'); // 'pickup' or 'dropoff'
  
  const mapRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Predefined common locations for the vehicle inventory business
  const commonLocations = [
    {
      name: 'Isuzu Laguna Stockyard',
      address: 'Isuzu Stockyard, Santa Rosa, Laguna, Philippines',
      coordinates: { latitude: 14.3122, longitude: 121.1115 },
      type: 'stockyard'
    },
    {
      name: 'Isuzu Pasig Branch',
      address: 'Isuzu Pasig Dealership, Pasig City',
      coordinates: { latitude: 14.5764, longitude: 121.0851 },
      type: 'dealership'
    },
    {
      name: 'Isuzu Quezon City',
      address: 'Isuzu QC Branch, Quezon City',
      coordinates: { latitude: 14.6760, longitude: 121.0437 },
      type: 'dealership'
    },
    {
      name: 'Isuzu Marikina Service',
      address: 'Isuzu Service Center, Marikina City',
      coordinates: { latitude: 14.6507, longitude: 121.1029 },
      type: 'service'
    },
    {
      name: 'Manila Port Area',
      address: 'Manila Port, Manila City',
      coordinates: { latitude: 14.5833, longitude: 120.9667 },
      type: 'port'
    },
    {
      name: 'NLEX Entry Point',
      address: 'NLEX Balintawak Entry, Quezon City',
      coordinates: { latitude: 14.6896, longitude: 120.9881 },
      type: 'highway'
    },
    {
      name: 'SLEX Entry Point',
      address: 'SLEX Magallanes Entry, Makati City',
      coordinates: { latitude: 14.5547, longitude: 121.0244 },
      type: 'highway'
    },
    {
      name: 'Batangas Port',
      address: 'Batangas International Port, Batangas',
      coordinates: { latitude: 13.7565, longitude: 121.0583 },
      type: 'port'
    }
  ];

  useEffect(() => {
    if (isVisible) {
      loadRecentLocations();
      requestLocationPermission();
    }
  }, [isVisible]);

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

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const currentRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      
      setMapRegion(currentRegion);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion(currentRegion);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const loadRecentLocations = async () => {
    try {
      const stored = await AsyncStorage.getItem('recentRouteLocations');
      if (stored) {
        const locations = JSON.parse(stored);
        setRecentLocations(locations.slice(0, 10)); // Keep only 10 most recent
      }
    } catch (error) {
      console.error('Error loading recent locations:', error);
    }
  };

  const saveLocationToRecent = async (location) => {
    try {
      const recent = await AsyncStorage.getItem('recentRouteLocations');
      let locations = recent ? JSON.parse(recent) : [];
      
      // Remove if already exists to avoid duplicates
      locations = locations.filter(loc => loc.name !== location.name);
      
      // Add to beginning
      locations.unshift({
        ...location,
        timestamp: Date.now()
      });
      
      // Keep only 20 recent locations
      locations = locations.slice(0, 20);
      
      await AsyncStorage.setItem('recentRouteLocations', JSON.stringify(locations));
      setRecentLocations(locations.slice(0, 10));
    } catch (error) {
      console.error('Error saving recent location:', error);
    }
  };

  const searchLocations = async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Note: In a real implementation, you would use Google Places API
      // For now, we'll simulate search results
      const mockResults = [
        {
          name: query,
          address: `${query}, Metro Manila, Philippines`,
          coordinates: {
            latitude: 14.5995 + (Math.random() - 0.5) * 0.1,
            longitude: 120.9842 + (Math.random() - 0.5) * 0.1
          },
          type: 'search_result'
        }
      ];

      // Also search common locations
      const commonMatches = commonLocations.filter(location =>
        location.name.toLowerCase().includes(query.toLowerCase()) ||
        location.address.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults([...commonMatches, ...mockResults]);
    } catch (error) {
      console.error('Error searching locations:', error);
      Alert.alert('Error', 'Failed to search locations');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMapPress = async (event) => {
    const coordinate = event.nativeEvent.coordinate;
    
    try {
      // Reverse geocode to get address
      const reverseGeocode = await Location.reverseGeocodeAsync(coordinate);
      let address = 'Unknown Location';
      
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        address = [
          addr.streetNumber,
          addr.street,
          addr.city,
          addr.region
        ].filter(Boolean).join(', ');
      }

      const locationData = {
        name: address,
        address: address,
        coordinates: coordinate,
        type: 'map_selected'
      };

      selectLocation(locationData);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback without address
      const locationData = {
        name: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
        address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
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

    // Save to recent locations
    saveLocationToRecent(location);

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

  const LocationTypeIcon = ({ type }) => {
    const icons = {
      stockyard: '🏭',
      dealership: '🏢',
      service: '🔧',
      port: '🚢',
      highway: '🛣️',
      search_result: '🔍',
      map_selected: '📍',
      recent: '🕒'
    };
    return <Text style={styles.locationIcon}>{icons[type] || '📍'}</Text>;
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
              </View>
            )}
          </View>

          {/* Location Options */}
          <View style={styles.locationOptions}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Search Results */}
              {searchResults.length > 0 && (
                <View style={styles.locationSection}>
                  <Text style={styles.sectionTitle}>🔍 Search Results</Text>
                  {searchResults.map((location, index) => (
                    <TouchableOpacity
                      key={`search-${index}`}
                      style={styles.locationItem}
                      onPress={() => selectLocation(location)}
                    >
                      <LocationTypeIcon type={location.type} />
                      <View style={styles.locationInfo}>
                        <Text style={styles.locationName}>{location.name}</Text>
                        <Text style={styles.locationAddress}>{location.address}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Common Locations */}
              {searchQuery.length === 0 && (
                <>
                  <View style={styles.locationSection}>
                    <Text style={styles.sectionTitle}>⭐ Common Locations</Text>
                    {commonLocations.map((location, index) => (
                      <TouchableOpacity
                        key={`common-${index}`}
                        style={styles.locationItem}
                        onPress={() => selectLocation(location)}
                      >
                        <LocationTypeIcon type={location.type} />
                        <View style={styles.locationInfo}>
                          <Text style={styles.locationName}>{location.name}</Text>
                          <Text style={styles.locationAddress}>{location.address}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recent Locations */}
                  {recentLocations.length > 0 && (
                    <View style={styles.locationSection}>
                      <Text style={styles.sectionTitle}>🕒 Recent Locations</Text>
                      {recentLocations.map((location, index) => (
                        <TouchableOpacity
                          key={`recent-${index}`}
                          style={styles.locationItem}
                          onPress={() => selectLocation(location)}
                        >
                          <LocationTypeIcon type="recent" />
                          <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>{location.name}</Text>
                            <Text style={styles.locationAddress}>{location.address}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
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
    flexDirection: 'row',
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
  locationOptions: {
    width: width * 0.4,
    backgroundColor: theme.card,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  locationSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.surface,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
});

export default RouteSelectionModal;