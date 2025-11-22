import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LocationManager = () => {
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchLocationStats();
  }, []);

  const fetchLocationStats = async () => {
    try {
      setLoading(true);
      
      const [vehicleRes, allocationRes] = await Promise.all([
        axios.get('https://itrack-web-backend.onrender.com/api/vehicles-with-locations'),
        axios.get('https://itrack-web-backend.onrender.com/api/allocations-with-locations')
      ]);

      if (vehicleRes.data.success) {
        setVehicles(vehicleRes.data.data.vehicles);
        setStats(prev => ({ ...prev, vehicles: vehicleRes.data.data }));
      }

      if (allocationRes.data.success) {
        setAllocations(allocationRes.data.data.allocations);
        setStats(prev => ({ ...prev, allocations: allocationRes.data.data }));
      }
    } catch (error) {
      console.error('Error fetching location stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const batchUpdateVehicleLocations = async () => {
    try {
      setLoading(true);
      const response = await axios.post('https://itrack-web-backend.onrender.com/api/batch-update-vehicle-locations');
      
      if (response.data.success) {
        alert(`Successfully updated ${response.data.data.updatedCount} vehicles with real locations!`);
        fetchLocationStats(); // Refresh data
      }
    } catch (error) {
      console.error('Error batch updating vehicles:', error);
      alert('Error updating vehicle locations');
    } finally {
      setLoading(false);
    }
  };

  const updateVehicleLocation = async (unitId, latitude, longitude, address) => {
    try {
      const response = await axios.post('https://itrack-web-backend.onrender.com/api/vehicle-location/update', {
        unitId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address
      });

      if (response.data.success) {
        alert('Vehicle location updated successfully!');
        fetchLocationStats(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating vehicle location:', error);
      alert('Error updating vehicle location');
    }
  };

  const PRESET_LOCATIONS = {
    'Isuzu Pasig Dealership': { lat: 14.5791, lng: 121.0655 },
    'Isuzu Makati Showroom': { lat: 14.5547, lng: 121.0244 },
    'Isuzu Quezon City Branch': { lat: 14.6760, lng: 121.0437 },
    'BGC Taguig': { lat: 14.5513, lng: 121.0477 },
    'Ortigas Center': { lat: 14.5866, lng: 121.0635 },
    'Alabang': { lat: 14.4297, lng: 121.0403 },
    'Manila Port': { lat: 14.5833, lng: 120.9667 },
    'Service Center Manila': { lat: 14.5995, lng: 120.9842 }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🗺️ Location Data Manager</h1>
      
      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>🚗 Vehicle Locations</h3>
          <p>Total Vehicles: <strong>{stats.vehicles?.total || 0}</strong></p>
          <p>With Locations: <strong style={{ color: 'green' }}>{stats.vehicles?.withLocations || 0}</strong></p>
          <p>Without Locations: <strong style={{ color: 'red' }}>{stats.vehicles?.withoutLocations || 0}</strong></p>
          
          <button 
            onClick={batchUpdateVehicleLocations}
            disabled={loading}
            style={{
              background: '#CB1E2A',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            {loading ? 'Updating...' : 'Add Real Locations to All Vehicles'}
          </button>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3>🚛 Allocation Locations</h3>
          <p>Total Allocations: <strong>{stats.allocations?.total || 0}</strong></p>
          <p>With Current Location: <strong style={{ color: 'green' }}>{stats.allocations?.withCurrentLocation || 0}</strong></p>
          <p>With Delivery Location: <strong style={{ color: 'green' }}>{stats.allocations?.withDeliveryLocation || 0}</strong></p>
          <p>With Both Locations: <strong style={{ color: 'blue' }}>{stats.allocations?.withBothLocations || 0}</strong></p>
        </div>
      </div>

      <button 
        onClick={fetchLocationStats}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        🔄 Refresh Data
      </button>

      {/* Vehicle List */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h2>🚗 Vehicles ({vehicles.length})</h2>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {vehicles.map((vehicle, index) => (
            <VehicleLocationRow 
              key={vehicle._id || index}
              vehicle={vehicle}
              presetLocations={PRESET_LOCATIONS}
              onUpdate={updateVehicleLocation}
            />
          ))}
        </div>
      </div>

      {/* Allocation List */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>🚛 Allocations ({allocations.length})</h2>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {allocations.map((allocation, index) => (
            <AllocationLocationRow 
              key={allocation._id || index}
              allocation={allocation}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const VehicleLocationRow = ({ vehicle, presetLocations, onUpdate }) => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  const hasLocation = vehicle.location?.latitude && vehicle.location?.longitude;

  const handlePresetUpdate = () => {
    if (!selectedLocation) return;
    const location = presetLocations[selectedLocation];
    onUpdate(vehicle.unitId, location.lat, location.lng, selectedLocation);
  };

  const handleCustomUpdate = () => {
    if (!customLat || !customLng) return;
    onUpdate(vehicle.unitId, customLat, customLng, customAddress || 'Custom Location');
  };

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '15px', 
      marginBottom: '10px', 
      borderRadius: '5px',
      background: hasLocation ? '#f0f8f0' : '#fff8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <strong>{vehicle.unitId}</strong> - {vehicle.unitName}
          <div style={{ fontSize: '12px', color: '#666' }}>
            {vehicle.bodyColor} • {vehicle.variation} • {vehicle.status}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: hasLocation ? 'green' : 'red' }}>
          {hasLocation ? '✅ Has Location' : '❌ No Location'}
        </div>
      </div>

      {hasLocation && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
          📍 Current: {vehicle.location.latitude.toFixed(6)}, {vehicle.location.longitude.toFixed(6)}
          <br />
          📍 Address: {vehicle.location.address}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select 
          value={selectedLocation} 
          onChange={(e) => setSelectedLocation(e.target.value)}
          style={{ padding: '5px' }}
        >
          <option value="">Choose preset location...</option>
          {Object.keys(presetLocations).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button 
          onClick={handlePresetUpdate}
          disabled={!selectedLocation}
          style={{ padding: '5px 10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
        >
          Set Preset
        </button>

        <input 
          type="number" 
          placeholder="Latitude" 
          value={customLat} 
          onChange={(e) => setCustomLat(e.target.value)}
          style={{ width: '100px', padding: '5px' }}
          step="any"
        />
        <input 
          type="number" 
          placeholder="Longitude" 
          value={customLng} 
          onChange={(e) => setCustomLng(e.target.value)}
          style={{ width: '100px', padding: '5px' }}
          step="any"
        />
        <input 
          type="text" 
          placeholder="Address" 
          value={customAddress} 
          onChange={(e) => setCustomAddress(e.target.value)}
          style={{ width: '150px', padding: '5px' }}
        />
        <button 
          onClick={handleCustomUpdate}
          disabled={!customLat || !customLng}
          style={{ padding: '5px 10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '3px' }}
        >
          Set Custom
        </button>
      </div>
    </div>
  );
};

const AllocationLocationRow = ({ allocation }) => {
  const hasCurrentLocation = allocation.currentLocation?.latitude && allocation.currentLocation?.longitude;
  const hasDeliveryLocation = allocation.deliveryLocation?.latitude && allocation.deliveryLocation?.longitude;

  return (
    <div style={{ 
      border: '1px solid #ddd', 
      padding: '15px', 
      marginBottom: '10px', 
      borderRadius: '5px',
      background: (hasCurrentLocation && hasDeliveryLocation) ? '#f0f8f0' : '#fff8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div>
          <strong>{allocation.unitId}</strong> - {allocation.unitName}
          <div style={{ fontSize: '12px', color: '#666' }}>
            Driver: {allocation.assignedDriver} • Status: {allocation.status}
          </div>
        </div>
        <div style={{ fontSize: '12px' }}>
          <span style={{ color: hasCurrentLocation ? 'green' : 'red' }}>
            {hasCurrentLocation ? '✅' : '❌'} Current
          </span>
          {' | '}
          <span style={{ color: hasDeliveryLocation ? 'green' : 'red' }}>
            {hasDeliveryLocation ? '✅' : '❌'} Delivery
          </span>
        </div>
      </div>

      {hasCurrentLocation && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
          📍 Current: {allocation.currentLocation.latitude.toFixed(6)}, {allocation.currentLocation.longitude.toFixed(6)}
          <br />
          📍 Address: {allocation.currentLocation.address}
        </div>
      )}

      {hasDeliveryLocation && (
        <div style={{ fontSize: '12px', color: '#666' }}>
          🎯 Delivery: {allocation.deliveryLocation.latitude.toFixed(6)}, {allocation.deliveryLocation.longitude.toFixed(6)}
          <br />
          🎯 Address: {allocation.deliveryLocation.address}
          <br />
          👤 Customer: {allocation.deliveryLocation.customerName} ({allocation.deliveryLocation.contactNumber})
        </div>
      )}
    </div>
  );
};

export default LocationManager;