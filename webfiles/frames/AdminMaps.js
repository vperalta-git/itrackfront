import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import L from "leaflet";
import Sidebar from './Sidebar';
import '../css/ServiceRequest.css';
import '../css/AdminMaps.css';
import logo from '../icons/I-track logo.png';
import refreshIcon from '../icons/refresh.png';
import truckIconImg from "../icons/truck1.png";
import { getCurrentUser } from '../getCurrentUser';

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: truckIconImg,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// Status color markers
const createColorIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.607 0 0 5.607 0 12.5c0 9.375 12.5 28.125 12.5 28.125S25 21.875 25 12.5C25 5.607 19.393 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="7" fill="white"/>
    </svg>
  `)}`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const AdminMaps = () => {
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [driverLocations, setDriverLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showAllDrivers, setShowAllDrivers] = useState(true);
  const [isLiveTrackingEnabled, setIsLiveTrackingEnabled] = useState(false);
  const trackingInterval = useRef(null);

  // Enhanced region with better coverage for Philippines (Manila)
  const defaultCenter = [14.5995, 120.9842]; // [lat, lng] for Leaflet
  const defaultZoom = 11;

  useEffect(() => {
    const getUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    getUser();
    
    fetchMapData();
    
    // Set up refresh interval (30 seconds like mobile app)
    const refreshInterval = setInterval(fetchMapData, 30000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Live tracking effect
  useEffect(() => {
    if (isLiveTrackingEnabled) {
      startLiveTracking();
    } else {
      stopLiveTracking();
    }

    return () => stopLiveTracking();
  }, [isLiveTrackingEnabled, showAllDrivers, selectedDriver]);

  const startLiveTracking = () => {
    // Stop existing interval
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
    }

    // Start new tracking interval
    trackingInterval.current = setInterval(() => {
      fetchDriverLocations();
    }, 5000); // Update every 5 seconds for live tracking

    // Fetch immediately
    fetchDriverLocations();
  };

  const stopLiveTracking = () => {
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = null;
    }
  };

  const fetchDriverLocations = async () => {
    try {
      let url = 'https://itrack-web-backend.onrender.com/api/all-driver-locations';
      
      // If tracking specific driver, use individual endpoint
      if (!showAllDrivers && selectedDriver) {
        url = `https://itrack-web-backend.onrender.com/api/driver-location/${selectedDriver}`;
      }

      const response = await axios.get(url, { withCredentials: true });
      
      if (response.data.success) {
        if (showAllDrivers) {
          setDriverLocations(response.data.data || []);
        } else {
          setDriverLocations(response.data.data ? [response.data.data] : []);
        }
        console.log(`✅ Live tracking: Updated ${showAllDrivers ? 'all drivers' : selectedDriver}`);
      }
    } catch (error) {
      console.error('❌ Live tracking error:', error);
      // Don't show error to user as this runs frequently
      setDriverLocations([]);
    }
  };

  const toggleLiveTracking = () => {
    setIsLiveTrackingEnabled(!isLiveTrackingEnabled);
  };

  const handleDriverSelection = (driverName) => {
    setSelectedDriver(driverName);
    setShowAllDrivers(false);
    if (isLiveTrackingEnabled) {
      fetchDriverLocations();
    }
  };

  const showAllDriversTracking = () => {
    setShowAllDrivers(true);
    setSelectedDriver(null);
    if (isLiveTrackingEnabled) {
      fetchDriverLocations();
    }
  };

  const fetchMapData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Admin Maps: Fetching data...');

      // Fetch allocations
      const allocationResponse = await axios.get('https://itrack-web-backend.onrender.com/api/getAllocation', { 
        withCredentials: true 
      });
      
      if (allocationResponse.data) {
        const allocationArray = Array.isArray(allocationResponse.data) ? allocationResponse.data : [];
        setAllocations(allocationArray);
        console.log(`✅ Admin Maps: Loaded ${allocationArray.length} allocations`);
      }

      // Fetch vehicle stock
      const stockResponse = await axios.get('https://itrack-web-backend.onrender.com/api/getStock', { 
        withCredentials: true 
      });
      
      if (stockResponse.data) {
        const stockArray = Array.isArray(stockResponse.data) ? stockResponse.data : [];
        setVehicles(stockArray);
        console.log(`✅ Admin Maps: Loaded ${stockArray.length} vehicles`);
      }

      setLastUpdate(new Date());

    } catch (error) {
      console.error('❌ Admin Maps: API error:', error);
      setError('Failed to load map data. Please try again.');
      // Don't crash - just use empty data
      setVehicles([]);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleStatus = (vehicle) => {
    if (!vehicle) return 'unknown';
    return vehicle.status || 'available';
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return '#4CAF50'; // Green
      case 'allocated': return '#FF9800'; // Orange
      case 'in transit': return '#2196F3'; // Blue
      case 'delivered': return '#9C27B0'; // Purple
      case 'pending': return '#FFC107'; // Yellow
      default: return '#757575'; // Gray
    }
  };

  const getDriverStatusColor = (location) => {
    if (!location.isRecent) return '#757575'; // Gray for stale locations
    if (location.vehicleInfo?.status === 'In Transit') return '#2196F3'; // Blue
    if (location.vehicleInfo?.status === 'Out for Delivery') return '#FF9800'; // Orange
    if (location.vehicleInfo?.status === 'Delivered') return '#4CAF50'; // Green
    return '#F44336'; // Red for pending or unknown
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const generateMapCoordinates = (index, type = 'vehicle') => {
    // FALLBACK coordinates around Manila area - only used when no real location available
    const baseOffset = type === 'vehicle' ? 0.01 : 0.02;
    const lat = defaultCenter[0] + (Math.random() - 0.5) * baseOffset;
    const lng = defaultCenter[1] + (Math.random() - 0.5) * baseOffset;
    return [lat, lng];
  };

  // Helper function to get real location from data
  const getRealLocation = (item, index, type) => {
    // Check for various location properties
    if (item.location?.latitude && item.location?.longitude) {
      return [item.location.latitude, item.location.longitude];
    }
    if (item.currentLocation?.latitude && item.currentLocation?.longitude) {
      return [item.currentLocation.latitude, item.currentLocation.longitude];
    }
    if (item.deliveryLocation?.latitude && item.deliveryLocation?.longitude) {
      return [item.deliveryLocation.latitude, item.deliveryLocation.longitude];
    }
    if (item.coordinates?.lat && item.coordinates?.lng) {
      return [item.coordinates.lat, item.coordinates.lng];
    }
    if (item.lat && item.lng) {
      return [item.lat, item.lng];
    }
    if (item.latitude && item.longitude) {
      return [item.latitude, item.longitude];
    }
    
    // Only use fallback if no real location found
    console.warn(`No real location found for ${type} ${item.unitId || item.id || index}, using fallback`);
    return generateMapCoordinates(index, type);
  };

  const isValidLatLng = (lat, lng) =>
    typeof lat === "number" &&
    typeof lng === "number" &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;

  return (
    <div className="admin-page">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="header">
          <div className="header-left">
            <img src={logo} alt="I-Track Logo" className="logo" />
            <h1>Admin Fleet Map View</h1>
          </div>
          <div className="header-right">
            <span className="user-name">Welcome, {currentUser?.accountName || 'Admin'}</span>
          </div>
        </div>

        <div className="content">
          {/* Map Controls */}
          <div className="map-controls">
            <div className="map-stats">
              <div className="stat-item">
                <span className="stat-label">📊 Vehicles:</span>
                <span className="stat-value">{vehicles.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">🚛 Allocations:</span>
                <span className="stat-value">{allocations.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">� Live Drivers:</span>
                <span className="stat-value">{driverLocations.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">�🕒 Last Update:</span>
                <span className="stat-value">{lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
            
            <div className="control-buttons">
              <button 
                className="refresh-btn" 
                onClick={fetchMapData}
                disabled={loading}
              >
                <img src={refreshIcon} alt="Refresh" className="button-icon" />
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>

              <button 
                className={`live-tracking-btn ${isLiveTrackingEnabled ? 'active' : ''}`}
                onClick={toggleLiveTracking}
              >
                {isLiveTrackingEnabled ? '🟢 Live Tracking ON' : '⚪ Live Tracking OFF'}
              </button>

              {isLiveTrackingEnabled && (
                <div className="tracking-mode-controls">
                  <button 
                    className={`mode-btn ${showAllDrivers ? 'active' : ''}`}
                    onClick={showAllDriversTracking}
                  >
                    🗺️ All Drivers
                  </button>
                  
                  <select 
                    className="driver-select"
                    value={selectedDriver || ''}
                    onChange={(e) => e.target.value && handleDriverSelection(e.target.value)}
                    disabled={showAllDrivers}
                  >
                    <option value="">Select Driver</option>
                    {allocations
                      .filter(a => a.assignedDriver)
                      .map(a => a.assignedDriver)
                      .filter((driver, index, arr) => arr.indexOf(driver) === index)
                      .map(driver => (
                        <option key={driver} value={driver}>{driver}</option>
                      ))
                    }
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Status Legend */}
          <div className="status-legend">
            <h3>Status Legend</h3>
            <div className="legend-sections">
              <div className="legend-section">
                <h4>Vehicle Status</h4>
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                    <span>Available</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
                    <span>Allocated</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                    <span>In Transit</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#9C27B0' }}></div>
                    <span>Delivered</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ backgroundColor: '#FFC107' }}></div>
                    <span>Pending</span>
                  </div>
                </div>
              </div>
              
              {isLiveTrackingEnabled && (
                <div className="legend-section">
                  <h4>Live Driver Status</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
                      <span>In Transit</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
                      <span>Out for Delivery</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
                      <span>Delivered</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
                      <span>Pending/Unknown</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#757575' }}></div>
                      <span>Offline/Stale</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-banner">
              ⚠️ {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="loading-banner">
              🔄 Loading map data...
            </div>
          )}

          {/* Main Map Container */}
          <div className="admin-map-container">
            <MapContainer
              center={defaultCenter}
              zoom={defaultZoom}
              style={{ height: "600px", width: "100%" }}
              className="admin-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Vehicle Markers */}
              {vehicles.map((vehicle, index) => {
                // Use real location data if available
                const coordinates = getRealLocation(vehicle, index, 'vehicle');

                if (!isValidLatLng(coordinates[0], coordinates[1])) {
                  console.warn(`Invalid coordinates for vehicle ${vehicle.unitId || index}:`, coordinates);
                  return null;
                }

                const status = getVehicleStatus(vehicle);
                const statusColor = getStatusColor(status);

                return (
                  <Marker
                    key={`vehicle-${index}`}
                    position={coordinates}
                    icon={createColorIcon(statusColor)}
                  >
                    <Popup>
                      <div className="marker-popup">
                        <h4>🚗 Vehicle: {vehicle.unitId || vehicle.id || `V${index + 1}`}</h4>
                        <p><strong>Model:</strong> {vehicle.unitName || 'N/A'}</p>
                        <p><strong>Status:</strong> <span style={{ color: statusColor }}>{status}</span></p>
                        <p><strong>Body Color:</strong> {vehicle.bodyColor || 'N/A'}</p>
                        <p><strong>Variation:</strong> {vehicle.variation || 'N/A'}</p>
                        <p><strong>Location:</strong> {vehicle.location?.address || vehicle.currentLocation?.address || 'GPS Coordinates'}</p>
                        <p><strong>Coordinates:</strong> {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Allocation Markers */}
              {allocations.map((allocation, index) => {
                // Use real location data if available
                const coordinates = getRealLocation(allocation, index, 'allocation');

                if (!isValidLatLng(coordinates[0], coordinates[1])) {
                  console.warn(`Invalid coordinates for allocation ${allocation.unitId || index}:`, coordinates);
                  return null;
                }

                return (
                  <Marker
                    key={`allocation-${index}`}
                    position={coordinates}
                    icon={truckIcon}
                  >
                    <Popup>
                      <div className="marker-popup">
                        <h4>🚛 Assignment: {allocation.unitId || `A${index + 1}`}</h4>
                        <p><strong>Unit Name:</strong> {allocation.unitName || 'N/A'}</p>
                        <p><strong>Driver:</strong> {allocation.assignedDriver || 'N/A'}</p>
                        <p><strong>Status:</strong> <span style={{ color: getStatusColor(allocation.status) }}>{allocation.status || 'Active'}</span></p>
                        <p><strong>Body Color:</strong> {allocation.bodyColor || 'N/A'}</p>
                        <p><strong>Variation:</strong> {allocation.variation || 'N/A'}</p>
                        <p><strong>Date:</strong> {allocation.date ? new Date(allocation.date).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Location:</strong> {allocation.location?.address || allocation.currentLocation?.address || allocation.deliveryLocation?.address || 'GPS Coordinates'}</p>
                        <p><strong>Coordinates:</strong> {coordinates[0].toFixed(6)}, {coordinates[1].toFixed(6)}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Driver Location Markers (Live Tracking) */}
              {isLiveTrackingEnabled && driverLocations.map((location, index) => {
                if (!isValidLatLng(location.latitude, location.longitude)) return null;

                const statusColor = getDriverStatusColor(location);
                const position = [location.latitude, location.longitude];

                return (
                  <Marker
                    key={`driver-live-${location.driverId || index}`}
                    position={position}
                    icon={createColorIcon(statusColor)}
                  >
                    <Popup>
                      <div className="marker-popup">
                        <h4>🚛 Live Driver: {location.driverName}</h4>
                        <p><strong>Vehicle:</strong> {location.vehicleInfo?.unitName || 'No Vehicle'}</p>
                        <p><strong>Status:</strong> <span style={{ color: statusColor }}>{location.vehicleInfo?.status || 'Unknown'}</span></p>
                        <p><strong>Last Update:</strong> {formatTimestamp(location.timestamp)}</p>
                        <p><strong>Accuracy:</strong> {location.accuracy ? `${Math.round(location.accuracy)}m` : 'N/A'}</p>
                        {location.speed > 0 && (
                          <p><strong>Speed:</strong> {Math.round(location.speed * 3.6)} km/h</p>
                        )}
                        <p><strong>Status:</strong> {location.isRecent ? '🟢 Live' : '🔴 Offline'}</p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* Dealership Marker */}
              <Marker position={defaultCenter} icon={createColorIcon('#CB1E2A')}>
                <Popup>
                  <div className="marker-popup">
                    <h4>🏢 Isuzu Dealership</h4>
                    <p><strong>Location:</strong> Manila, Philippines</p>
                    <p><strong>Type:</strong> Main Dealership</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Summary Stats */}
          <div className="map-summary">
            <div className="summary-card">
              <h4>Fleet Overview</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Total Vehicles:</span>
                  <span className="summary-value">{vehicles.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Active Allocations:</span>
                  <span className="summary-value">{allocations.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Available Vehicles:</span>
                  <span className="summary-value">
                    {vehicles.filter(v => getVehicleStatus(v) === 'available').length}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">In Transit:</span>
                  <span className="summary-value">
                    {allocations.filter(a => a.status?.toLowerCase() === 'in transit').length}
                  </span>
                </div>
              </div>
            </div>

            {isLiveTrackingEnabled && (
              <div className="summary-card">
                <h4>Live Tracking Status</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Drivers Online:</span>
                    <span className="summary-value">
                      {driverLocations.filter(d => d.isRecent).length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Drivers Offline:</span>
                    <span className="summary-value">
                      {driverLocations.filter(d => !d.isRecent).length}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Tracking Mode:</span>
                    <span className="summary-value">
                      {showAllDrivers ? 'All Drivers' : selectedDriver || 'Individual'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Update Interval:</span>
                    <span className="summary-value">5 seconds</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMaps;