import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../constants/api';
import { VEHICLE_MODELS, getUnitNames, getVariationsForUnit, isValidUnitVariationPair } from '../constants/VehicleModels';

/**
 * Enhanced hook for managing vehicle models with dependent dropdowns
 * Supports both local data (fallback) and API data (preferred)
 */
export const useVehicleModels = () => {
  const [vehicleModels, setVehicleModels] = useState(VEHICLE_MODELS);
  const [unitNames, setUnitNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  // Initialize data on mount
  useEffect(() => {
    initializeVehicleModels();
  }, []);

  // Initialize vehicle models from API or fallback to local data
  const initializeVehicleModels = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch from API first
      const response = await fetch(buildApiUrl('/getVehicleModels'), {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          // Convert API format to local format
          const apiModels = {};
          result.data.forEach(model => {
            apiModels[model.unitName] = model.variations;
          });
          
          setVehicleModels(apiModels);
          setUnitNames(Object.keys(apiModels));
          setIsOnline(true);
          
          console.log('✅ Vehicle models loaded from API');
          return; // Successfully loaded from API
        }
      }
      
      // If we get here, API failed or returned invalid data - use local fallback silently
      setVehicleModels(VEHICLE_MODELS);
      setUnitNames(getUnitNames());
      setIsOnline(false);
      // Only log in development, not as a warning
      if (__DEV__) {
        console.log('ℹ️ Using local vehicle models data');
      }
    } catch (err) {
      // Silently fallback to local data - this is expected behavior
      setVehicleModels(VEHICLE_MODELS);
      setUnitNames(getUnitNames());
      setIsOnline(false);
      // Only log in development
      if (__DEV__) {
        console.log('ℹ️ Using local vehicle models data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get variations for a specific unit name
  const getVariationsForUnit = useCallback((unitName) => {
    if (!unitName) return [];
    
    // Use local data if available
    if (vehicleModels[unitName]) {
      return vehicleModels[unitName];
    }
    
    // Fallback to constants
    return getVariationsForUnit(unitName);
  }, [vehicleModels]);

  // Validate unit-variation pair
  const validateUnitVariationPair = useCallback(async (unitName, variation) => {
    if (!unitName || !variation) {
      return { isValid: false, error: 'Both unit name and variation are required' };
    }

    try {
      // Try API validation first if online
      if (isOnline) {
        const response = await fetch(buildApiUrl('/validateUnitVariation'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ unitName, variation }),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            isValid: result.success && result.data?.isValid,
            error: result.success ? null : result.message
          };
        }
      }

      // Fallback to local validation
      const isValid = isValidUnitVariationPair(unitName, variation);
      return {
        isValid,
        error: isValid ? null : 'Invalid unit-variation combination'
      };
    } catch (err) {
      console.warn('⚠️ Validation failed, using local validation:', err.message);
      
      // Fallback to local validation
      const isValid = isValidUnitVariationPair(unitName, variation);
      return {
        isValid,
        error: isValid ? null : 'Invalid unit-variation combination'
      };
    }
  }, [isOnline]);

  // Get variations with API support
  const getVariationsForUnitAsync = useCallback(async (unitName) => {
    if (!unitName) return [];

    try {
      // Try API first if online
      if (isOnline) {
        const response = await fetch(buildApiUrl(`/getVariations/${encodeURIComponent(unitName)}`));
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            return result.data;
          }
        }
      }
      
      // Fallback to local data
      return getVariationsForUnit(unitName);
    } catch (err) {
      console.warn('⚠️ Failed to fetch variations from API, using local data:', err.message);
      return getVariationsForUnit(unitName);
    }
  }, [isOnline, getVariationsForUnit]);

  // Refresh data from API
  const refresh = useCallback(async () => {
    await initializeVehicleModels();
  }, []);

  // Search functionality
  const searchUnits = useCallback((searchTerm) => {
    if (!searchTerm.trim()) return unitNames;
    
    const searchLower = searchTerm.toLowerCase();
    return unitNames.filter(unitName => 
      unitName.toLowerCase().includes(searchLower)
    );
  }, [unitNames]);

  const searchVariations = useCallback((unitName, searchTerm) => {
    const variations = getVariationsForUnit(unitName);
    
    if (!searchTerm.trim()) return variations;
    
    const searchLower = searchTerm.toLowerCase();
    return variations.filter(variation => 
      variation.toLowerCase().includes(searchLower)
    );
  }, [getVariationsForUnit]);

  // Get category for a unit (helper function)
  const getUnitCategory = useCallback((unitName) => {
    if (!unitName) return 'Commercial';
    
    if (unitName.includes('D-Max')) return 'Pickup';
    if (unitName.includes('MU-X')) return 'SUV';
    if (unitName.includes('FVR') || unitName.includes('FVM') || unitName.includes('FXM') || unitName.includes('GXZ') || unitName.includes('EXR')) return 'Heavy Duty';
    if (unitName.includes('NLR') || unitName.includes('NMR') || unitName.includes('NPR') || unitName.includes('NPS') || unitName.includes('NQR') || unitName.includes('FRR') || unitName.includes('FTR') || unitName.includes('FTS')) return 'Truck';
    
    return 'Commercial';
  }, []);

  return {
    // Data
    vehicleModels,
    unitNames,
    
    // State
    loading,
    error,
    isOnline,
    
    // Actions
    getVariationsForUnit,
    getVariationsForUnitAsync,
    validateUnitVariationPair,
    refresh,
    initializeVehicleModels,
    
    // Search
    searchUnits,
    searchVariations,
    
    // Utilities
    getUnitCategory
  };
};