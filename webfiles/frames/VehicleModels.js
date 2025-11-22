import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import Sidebar from './Sidebar';
import '../css/VehicleModels.css';
import { getCurrentUser } from '../getCurrentUser';

const VehicleModels = () => {
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullUser, setFullUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [formData, setFormData] = useState({
    unitName: '',
    variations: '',
    category: 'Commercial'
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user && user.email) {
        axios.get("https://itrack-web-backend.onrender.com/api/getUsers")
          .then(res => {
            const found = res.data.find(u => u.email === user.email);
            setFullUser(found);
          })
          .catch(() => setFullUser(null));
      }
    });
    
    fetchVehicleModels();
  }, []);

  const fetchVehicleModels = () => {
    setLoading(true);
    axios.get("https://itrack-web-backend.onrender.com/api/vehicle-models")
      .then((response) => {
        if (response.data.success) {
          setVehicleModels(response.data.data || []);
        } else {
          setError('Failed to fetch vehicle models');
        }
      })
      .catch((err) => {
        console.error('Error fetching vehicle models:', err);
        setError('Failed to fetch vehicle models');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const initializeVehicleModels = () => {
    setLoading(true);
    axios.post("https://itrack-web-backend.onrender.com/api/vehicle-models/initialize")
      .then((response) => {
        if (response.data.success) {
          setSuccess(response.data.message);
          fetchVehicleModels();
        } else {
          setError(response.data.message || 'Failed to initialize vehicle models');
        }
      })
      .catch((err) => {
        console.error('Error initializing vehicle models:', err);
        setError('Failed to initialize vehicle models');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleAddModel = () => {
    const { unitName, variations, category } = formData;
    
    if (!unitName.trim() || !variations.trim()) {
      setError('Unit name and variations are required');
      return;
    }

    const variationsArray = variations.split('\n').map(v => v.trim()).filter(v => v);
    
    if (variationsArray.length === 0) {
      setError('At least one variation is required');
      return;
    }

    const payload = {
      unitName: unitName.trim(),
      variations: variationsArray,
      category
    };

    axios.post("https://itrack-web-backend.onrender.com/api/vehicle-models/create", payload)
      .then((response) => {
        if (response.data.success) {
          setSuccess('Vehicle model added successfully');
          setShowAddModal(false);
          setFormData({ unitName: '', variations: '', category: 'Commercial' });
          fetchVehicleModels();
        } else {
          setError(response.data.message || 'Failed to add vehicle model');
        }
      })
      .catch((err) => {
        console.error('Error adding vehicle model:', err);
        setError('Failed to add vehicle model');
      });
  };

  const handleEditModel = () => {
    if (!editingModel) return;

    const { unitName, variations, category } = formData;
    
    if (!unitName.trim() || !variations.trim()) {
      setError('Unit name and variations are required');
      return;
    }

    const variationsArray = variations.split('\n').map(v => v.trim()).filter(v => v);
    
    if (variationsArray.length === 0) {
      setError('At least one variation is required');
      return;
    }

    const payload = {
      unitName: unitName.trim(),
      variations: variationsArray,
      category
    };

    axios.put(`https://itrack-web-backend.onrender.com/api/vehicle-models/${editingModel._id}`, payload)
      .then((response) => {
        if (response.data.success) {
          setSuccess('Vehicle model updated successfully');
          setShowEditModal(false);
          setEditingModel(null);
          setFormData({ unitName: '', variations: '', category: 'Commercial' });
          fetchVehicleModels();
        } else {
          setError(response.data.message || 'Failed to update vehicle model');
        }
      })
      .catch((err) => {
        console.error('Error updating vehicle model:', err);
        setError('Failed to update vehicle model');
      });
  };

  const handleDeleteModel = (modelId) => {
    if (!window.confirm('Are you sure you want to delete this vehicle model?')) {
      return;
    }

    axios.delete(`https://itrack-web-backend.onrender.com/api/vehicle-models/${modelId}`)
      .then((response) => {
        if (response.data.success) {
          setSuccess('Vehicle model deleted successfully');
          fetchVehicleModels();
        } else {
          setError(response.data.message || 'Failed to delete vehicle model');
        }
      })
      .catch((err) => {
        console.error('Error deleting vehicle model:', err);
        setError('Failed to delete vehicle model');
      });
  };

  const openEditModal = (model) => {
    setEditingModel(model);
    setFormData({
      unitName: model.unitName,
      variations: model.variations.join('\n'),
      category: model.category || 'Commercial'
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingModel(null);
    setFormData({ unitName: '', variations: '', category: 'Commercial' });
    setError('');
    setSuccess('');
  };

  return (
    <div className="vehicle-models-container">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="vehicle-models-header">
          <h2>Vehicle Models Management</h2>
          <div className="header-actions">
            <button 
              className="btn btn-secondary"
              onClick={initializeVehicleModels}
              disabled={loading}
            >
              {loading ? 'Initializing...' : 'Initialize Default Models'}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Add Vehicle Model
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
            <button className="alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button className="alert-close" onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        <div className="vehicle-models-content">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Loading vehicle models...</p>
            </div>
          ) : (
            <div className="models-grid">
              {vehicleModels.map((model) => (
                <div key={model._id} className="model-card">
                  <div className="model-header">
                    <h3>{model.unitName}</h3>
                    <span className={`category-badge ${model.category?.toLowerCase()}`}>
                      {model.category || 'Commercial'}
                    </span>
                  </div>
                  
                  <div className="variations-list">
                    <h4>Variations ({model.variations?.length || 0})</h4>
                    {model.variations?.slice(0, 3).map((variation, index) => (
                      <div key={index} className="variation-item">
                        {variation}
                      </div>
                    ))}
                    {model.variations?.length > 3 && (
                      <div className="more-variations">
                        +{model.variations.length - 3} more variations
                      </div>
                    )}
                  </div>

                  <div className="model-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => openEditModal(model)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteModel(model._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {vehicleModels.length === 0 && !loading && (
                <div className="empty-state">
                  <div className="empty-icon">🚗</div>
                  <h3>No Vehicle Models Found</h3>
                  <p>Click "Initialize Default Models" to load the default Isuzu models or "Add Vehicle Model" to create a custom model.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Model Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add Vehicle Model</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Unit Name *</label>
                <input
                  type="text"
                  value={formData.unitName}
                  onChange={(e) => setFormData({...formData, unitName: e.target.value})}
                  placeholder="e.g., Isuzu D-Max"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Pickup">Pickup</option>
                  <option value="SUV">SUV</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Truck">Truck</option>
                  <option value="Heavy Duty">Heavy Duty</option>
                </select>
              </div>

              <div className="form-group">
                <label>Variations * (one per line)</label>
                <textarea
                  value={formData.variations}
                  onChange={(e) => setFormData({...formData, variations: e.target.value})}
                  placeholder="4x2 LS-A AT&#10;4x4 LS-A MT&#10;Cab and Chassis"
                  rows="8"
                  required
                />
                <small>Enter each variation on a new line</small>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModals}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddModel}>
                Add Model
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Model Modal */}
      {showEditModal && editingModel && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit Vehicle Model</h3>
              <button className="modal-close" onClick={closeModals}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Unit Name *</label>
                <input
                  type="text"
                  value={formData.unitName}
                  onChange={(e) => setFormData({...formData, unitName: e.target.value})}
                  placeholder="e.g., Isuzu D-Max"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Pickup">Pickup</option>
                  <option value="SUV">SUV</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Truck">Truck</option>
                  <option value="Heavy Duty">Heavy Duty</option>
                </select>
              </div>

              <div className="form-group">
                <label>Variations * (one per line)</label>
                <textarea
                  value={formData.variations}
                  onChange={(e) => setFormData({...formData, variations: e.target.value})}
                  placeholder="4x2 LS-A AT&#10;4x4 LS-A MT&#10;Cab and Chassis"
                  rows="8"
                  required
                />
                <small>Enter each variation on a new line</small>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModals}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleEditModel}>
                Update Model
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleModels;