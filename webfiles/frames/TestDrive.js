import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../css/TestDrive.css';
import { getCurrentUser } from '../getCurrentUser';

const TestDrive = () => {
  const [vehicles, setVehicles] = useState([]);
  const [testDrives, setTestDrives] = useState([]);
  const [formData, setFormData] = useState({
    vehicleId: '',
    date: '',
    time: '',
    name: '',
    contact: '',
  });
  const [success, setSuccess] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullUser, setFullUser] = useState(null);

  // FETCH INVENTORY VEHICLES + TEST DRIVE LIST
  useEffect(() => {
    fetchVehicles();
    fetchTestDrives();
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
  }, []);

  const fetchVehicles = () => {
    axios.get('https://itrack-web-backend.onrender.com/api/getStock')
      .then(res => {
        console.log(res.data); // 
        console.log(vehicles);

        const availableVehicles = res.data.filter(v => v.quantity > 0);
        setVehicles(availableVehicles);
      })
      .catch(err => console.error(err));
  };

  const fetchTestDrives = () => {
    axios.get('https://itrack-web-backend.onrender.com/api/getAllTestDrives')
      .then(res => setTestDrives(res.data))
      .catch(err => console.error(err));
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://itrack-web-backend.onrender.com/api/createTestDrive', formData);

      setSuccess('Test drive scheduled successfully!');
      setFormData({ vehicleId: '', date: '', time: '', name: '', contact: '' });
      fetchTestDrives(); // Refresh schedule list
    } catch (error) {
      console.error(error);
      setSuccess('Failed to schedule test drive.');
    }
  };

  const getVehicleInfo = (vehicleId) => {
    const vehicle = vehicles.find(v => v._id === vehicleId);
    return vehicle ? `${vehicle.unitName} - ${vehicle.variation} (${vehicle.bodyColor})` : 'Vehicle Info';
  };

  const handleDelete = (id) => {
  if (window.confirm('Are you sure you want to delete this test drive?')) {
    axios
      .delete(`https://itrack-web-backend.onrender.com/api/deleteTestDrive/${id}`)
      .then(() => {
        setSuccess('Test drive deleted successfully.');
        fetchTestDrives(); // refresh the list
      })
      .catch(() => {
        setSuccess('Failed to delete test drive.');
      });
  }
};

const [openDropdownId, setOpenDropdownId] = useState(null);
const toggleDropdown = (id) => {
  setOpenDropdownId(prevId => (prevId === id ? null : id));
};





  return (
    <div className="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main">
        <header className="header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h3 className="header-title1">Test Drive</h3>
         {fullUser && fullUser.name && (
            <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15 }}>
              Welcome, {fullUser.name}
            </div>
          )}
        </header>

        <div className="testdrive-content">
  <h3>Schedule a Test Drive</h3>

  <div className="testdrive-modal">
    <form onSubmit={handleSubmit} className="testdrive-form">
      <div className="testdrive-form-group">
        <label>Available Vehicle <span style={{color: 'red'}}>*</span></label>
        <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} required>
          <option value="">Select a Vehicle</option>
          {vehicles.filter(vehicle => !testDrives.some(td => td.vehicleId === vehicle._id))
            .map(vehicle => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.unitName} - {vehicle.variation} ({vehicle.bodyColor}) | Available: {vehicle.quantity}
              </option>
            ))}
        </select>
      </div>

      <div className="testdrive-form-group">
        <label>Date *</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required />
      </div>

      <div className="testdrive-form-group">
        <label>Time *</label>
        <input type="time" name="time" value={formData.time} onChange={handleChange} required />
      </div>

      <div className="testdrive-form-group">
        <label>Name *</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
      </div>

      <div className="testdrive-form-group">
        <label>Contact Number *</label>
        <input type="text" name="contact" value={formData.contact} onChange={handleChange} required />
      </div>
    </form>

    <div>
      <button type="button" className="testdrive-btn" onClick={handleSubmit}>Schedule</button>
    </div>

    {success && (
      <p className={success.includes('successfully') ? 'testdrive-success' : 'testdrive-error'}>
        {success}
      </p>
    )}
  </div>

  <div className="testdrive-spacer"></div>

  <h3>Scheduled Test Drives</h3>
  <div className="testdrive-table-container">
    <table>
      <thead>
        <tr>
          <th>Vehicle</th>
          <th>Date</th>
          <th>Time</th>
          <th>Name</th>
          <th>Contact</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {testDrives.length === 0 ? (
          <tr>
            <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
              No test drives scheduled yet.
            </td>
          </tr>
        ) : (
          testDrives.map(schedule => (
            <tr key={schedule._id}>
              <td>{getVehicleInfo(schedule.vehicleId)}</td>
              <td>{schedule.date}</td>
              <td>{new Date(`1970-01-01T${schedule.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</td>
              <td>{schedule.name}</td>
              <td>{schedule.contact}</td>
              <td>
                <div className="testdrive-dropdown">
                  <button className="testdrive-dropbtn" onClick={() => toggleDropdown(schedule._id)}>⋮</button>
                  {openDropdownId === schedule._id && (
                    <div className="testdrive-dropdown-menu">
                      <button onClick={() => handleDelete(schedule._id)}>Delete</button>
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</div>

      </div>
    </div>
  );
};

export default TestDrive;