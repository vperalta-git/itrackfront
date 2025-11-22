import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../css/ServiceRequest.css';
import logo from '../icons/I-track logo.png'; 
import addIcon from '../icons/add.png'; 
import searchIcon from '../icons/search.png';
import { getCurrentUser } from '../getCurrentUser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import downloadIcon from '../icons/download2.png';
import ViewShipment from "./ViewShipment"; // <-- add this


const DriverAllocation = () => {
  const [allocation, setAllocations] = useState([]);
  const [isViewShipmentOpen, setIsViewShipmentOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [newAllocation, setNewAllocation] = useState({
    
    unitName: '',
    unitId: '',
    bodyColor: '',
    variation: '',
    assignedDriver: '',
    status: 'Pending',
    date: '' // Added date field

  });
  const [editAllocation, setEditAllocation] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [isRowModalOpen, setIsRowModalOpen] = useState(false); // NEW STATE
  

  const validateConductionNumber = (value) => {
  const regex = /^[A-Za-z0-9]+$/; // only letters and numbers
  if (!value) {
    return "Conduction Number is required.";
  }
  if (!regex.test(value)) {
    return "Conduction Number must be alphanumeric (letters and numbers only).";
  }
  if (value.length < 6 || value.length > 8) {
    return "Conduction Number must be 6 to 8 characters.";
  }
  return null;
};


  useEffect(() => {
    fetchAllocations();
    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user && user.email) {
    axios.get("https://itrack-web-backend.onrender.com/api/getUsers", { withCredentials: true })
          .then(res => {
            const found = res.data.find(u => u.email === user.email);
            setFullUser(found);
          })
          .catch(() => setFullUser(null));
      }
    });
  }, []);

  const fetchAllocations = () => {
  axios.get("https://itrack-web-backend.onrender.com/api/getAllocation", { withCredentials: true })
      .then((res) => setAllocations(res.data))
      .catch((err) => console.log(err));
  };

  const handleCreate = () => {
  const { unitName, unitId, bodyColor, variation, assignedDriver } = newAllocation;

  const conductionError = validateConductionNumber(unitId);
  if (conductionError) {
    alert(conductionError);
    return;
  }

  if (!unitName || !unitId || !bodyColor || !variation || !assignedDriver) {
    alert("All fields are required.");
    return;
  }

  // Check if driver already has a pending or in transit vehicle
  const driverActiveAllocations = allocation.filter(alloc => {
    const allocationDriver = alloc.assignedDriver || '';
    const status = (alloc.status || '').toLowerCase();
    
    // Match by driver name
    const isMatchingDriver = allocationDriver === assignedDriver;
    
    // Check if status is pending or in transit
    const hasActiveAllocation = status === 'pending' || status === 'in transit';
    
    return isMatchingDriver && hasActiveAllocation;
  });

  if (driverActiveAllocations.length > 0) {
    const alloc = driverActiveAllocations[0];
    const statusText = alloc.status?.toLowerCase() === 'pending' ? 'Pending' : 'In Transit';
    alert(`${assignedDriver} already has a vehicle (${alloc.unitName} ${alloc.unitId}) with status "${statusText}". The driver must complete the current delivery and press "Ready for Next Delivery" before being assigned another vehicle.`);
    return;
  }

  axios.post("https://itrack-web-backend.onrender.com/api/createAllocation", newAllocation, { withCredentials: true })
    .then(() => {
      fetchAllocations();
      setNewAllocation({
        unitName: '',
        unitId: '',
        bodyColor: '',
        variation: '',
        assignedDriver: '',
        status: 'Pending',
        date: ''
      });
      setIsCreateModalOpen(false);
    })
    .catch((err) => console.log(err));
};


  const handleUpdate = (id) => {
  const { unitName, unitId, bodyColor, variation, assignedDriver } = editAllocation;

  const conductionError = validateConductionNumber(unitId);
  if (conductionError) {
    alert(conductionError);
    return;
  }

  if (!unitName || !unitId || !bodyColor || !variation || !assignedDriver) {
    alert("All fields are required.");
    return;
  }

  // Get the original allocation to check if driver is being changed
  const originalAllocation = allocation.find(a => a._id === id);
  
  // If driver is being changed, validate the new driver
  if (originalAllocation && assignedDriver !== originalAllocation.assignedDriver) {
    // Check if the new driver already has a pending or in transit vehicle
    const driverActiveAllocations = allocation.filter(alloc => {
      // Skip the current allocation being edited
      if (alloc._id === id) return false;
      
      const allocationDriver = alloc.assignedDriver || '';
      const status = (alloc.status || '').toLowerCase();
      
      // Match by driver name
      const isMatchingDriver = allocationDriver === assignedDriver;
      
      // Check if status is pending or in transit
      const hasActiveAllocation = status === 'pending' || status === 'in transit';
      
      return isMatchingDriver && hasActiveAllocation;
    });

    if (driverActiveAllocations.length > 0) {
      const alloc = driverActiveAllocations[0];
      const statusText = alloc.status?.toLowerCase() === 'pending' ? 'Pending' : 'In Transit';
      alert(`${assignedDriver} already has a vehicle (${alloc.unitName} ${alloc.unitId}) with status "${statusText}". The driver must complete the current delivery and press "Ready for Next Delivery" before being assigned another vehicle.`);
      return;
    }
  }

  axios.put(`https://itrack-web-backend.onrender.com/api/updateAllocation/${id}`, editAllocation, { withCredentials: true })
    .then(() => {
      fetchAllocations();
      setEditAllocation(null);
    })
    .catch((err) => console.log(err));
};


  const handleDelete = (id) => {
  axios.delete(`https://itrack-web-backend.onrender.com/api/deleteAllocation/${id}`, { withCredentials: true })
      .then(() => fetchAllocations())
      .catch((err) => console.log(err));
  };

  const [drivers, setDrivers] = useState([]);

useEffect(() => {
  fetchAllocations();
  fetchDrivers(); // <-- Fetch drivers when component loads
}, []);

const fetchDrivers = () => {
  axios.get("https://itrack-web-backend.onrender.com/api/getUsers", { withCredentials: true })
    .then((res) => {
      const driverList = res.data.filter(user => user.role === "Driver");
      setDrivers(driverList);
    })
    .catch((err) => console.log(err));
};

const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 6; // Adjust how many items per page

const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentAllocations = allocation.slice(indexOfFirstItem, indexOfLastItem);

const totalPages = Math.ceil(allocation.length / itemsPerPage);


const handleDownloadAllocationsPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text('Driver Allocations', 14, 15);

  const allocationData = allocation.map(item => [
    new Date(item.date).toLocaleDateString('en-CA'),
    item.unitName,
    item.unitId,
    item.bodyColor,
    item.variation,
    item.assignedDriver,
    item.status
  ]);

  autoTable(doc, {
    head: [['Date', 'Unit Name', 'Conduction No.', 'Body Color', 'Variation', 'Assigned Driver', 'Status']],
    body: allocationData,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  doc.save('DriverAllocations.pdf');
};




  return (
    <div className="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main">
        <header className="header">
  <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
  <h3 className="header-title1">Driver Allocation</h3>
  {fullUser && fullUser.name && (
    <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15 }}>
      Welcome, {fullUser.name}
    </div>
  )}
</header>

        <div className="user-management-header" >
          <button 
            onClick={handleDownloadAllocationsPDF} 
            className="printbtn" style={{  fontSize: '10px', display: 'flex', alignItems: 'center',marginRight:3 ,gap:3}}
            tabIndex={0}
          ><img src={downloadIcon} alt="Download" className="button-icon2" />
          Print PDF
          </button>
               <div className="search-container">
                 <div className="search-input-wrapper">
                   <input
                     id="searchInput"
                     type="text"
                     placeholder="Search..."
                     value={searchInput}
                     onChange={(e) => setSearchInput(e.target.value)}
                   />
                   {searchInput && (
                     <button
                       type="button"
                       className="clear-button"
                       onClick={() => { setSearchInput(''); setSearchTerm(''); }}
                     >
                       ✕
                     </button>
                   )}
                 </div>
                 <button
                   className="search-button-icon-button"
                   onClick={() => setSearchTerm(searchInput)}
                   aria-label="Search"
                 >
                   <img src={searchIcon} alt="Search" className="search-icon" />
                 </button>
               </div>
               <button className="create-btn" onClick={() => setIsCreateModalOpen(true)}>
                 <img src={addIcon} alt="Add" className="add-icon" />
                 Allocate Driver
               </button>
             </div>


        <div className="content">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                <th>Date</th>
                  <th>Unit Name</th>
                  <th>Conduction Number</th>
                  <th>Body Color</th>
                  <th>Variation</th>
                  <th>Assigned Driver</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
               <tbody>
    {currentAllocations.map((item) => (
      <tr 
        key={item._id} 
        onClick={() => {
          setSelectedRow(item);
          setIsViewShipmentOpen(true);
        }}
        style={{ cursor: "pointer" }}
      >
        <td>{new Date(item.date).toLocaleDateString('en-CA')}</td>
        <td>{item.unitName}</td>
        <td>{item.unitId}</td>
        <td>{item.bodyColor}</td>
        <td>{item.variation}</td>
        <td>{item.assignedDriver}</td>
        <td>
          <span className={`status-badge ${item.status.toLowerCase().replace(' ', '-')}`}>
            {item.status}
          </span>
        </td>
        <td>
          <button 
            className="action-btn" 
            onClick={(e) => { e.stopPropagation(); setEditAllocation(item); }}
          >
            Edit
          </button>
          {" "}
          <button 
            className="action-btn" 
            onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }}
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
            </table>


{/* View Shipments Modal */}
  <ViewShipment
    isOpen={isViewShipmentOpen}
    onClose={() => setIsViewShipmentOpen(false)}
    data={selectedRow}
  />

            

            {totalPages > 1 && (
  <div className="pagination-wrapper">
    <div className="pagination-info">
      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, allocation.length)} of {allocation.length} results
    </div>

    <div className="pagination">
      <button
        className="pagination-btn"
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
      >
        &#171;
      </button>

      {Array.from({ length: totalPages }, (_, i) => (
        <button
          key={i + 1}
          onClick={() => setCurrentPage(i + 1)}
          className={`pagination-btn ${currentPage === i + 1 ? 'active-page' : ''}`}
        >
          {i + 1}
        </button>
      ))}

      <button
        className="pagination-btn"
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
      >
        &#187;
      </button>
    </div>
  </div>
)}


          </div>

          
        </div>


        {isCreateModalOpen && (
  <div className="modal-overlay">
    <div className="modal">
        <p className='modaltitle'>Allocate Driver</p>

            <div className='modalline'> 
            </div>

      <div className="modal-content">
        <div className="modal-form">
          <div className="modal-form-group">
            <label>Unit Name</label>
            <input
              type="text"
              value={newAllocation.unitName}
              onChange={(e) =>
                setNewAllocation({ ...newAllocation, unitName: e.target.value })
              }
            />
          </div>

          <div className="modal-form-group">
            <label>Conduction Number</label>
            <input
              type="text"
              value={newAllocation.unitId}
              onChange={(e) =>
                setNewAllocation({ ...newAllocation, unitId: e.target.value })
              }
            />
          </div>

          <div className="modal-form-group">
            <label>Body Color</label>
            <input
              type="text"
              value={newAllocation.bodyColor}
              onChange={(e) =>
                setNewAllocation({ ...newAllocation, bodyColor: e.target.value })
              }
            />
          </div>

          <div className="modal-form-group">
            <label>Variation</label>
            <select value={newAllocation.variation}onChange={(e) => setNewAllocation({ ...newAllocation, variation: e.target.value }) }>
               <option value="">Select Variation</option>
               <option value="4x2 LSA">4x2 LSA</option>
               <option value="4x4">4x4</option>
               <option value="LS-E">LS-E</option>
               <option value="LS">LS</option>
               </select>
               </div>

          <div className="modal-form-group">
            <label>Assigned Driver</label>
            <select value={newAllocation.assignedDriver} onChange={(e) => setNewAllocation({ ...newAllocation, assignedDriver: e.target.value }) }>
               <option value="">Select Driver</option>
               {drivers.map((driver) => (
                <option key={driver._id} value={driver.name}>{driver.name}
                </option>
               ))}
               </select>

          </div>

          <div className="modal-form-group">
            <label>Status</label>
            <select
              value={newAllocation.status}
              onChange={(e) =>
                setNewAllocation({ ...newAllocation, status: e.target.value })
              }
            >
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label>Date</label>
            <input
              type="date"
              value={newAllocation.date}
              onChange={(e) =>
                setNewAllocation({ ...newAllocation, date: e.target.value })
              }
            />
          </div>
        </div>

        <div className="modal-buttons">
          <button className="create-btn3" onClick={handleCreate}>Confirm</button>
          <button className="cancel-btn3" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
)}

{editAllocation && (
  <div className="modal-overlay">
    <div className="modal">
      <p className='modaltitle'>Edit Allocation</p>
      <div className='modalline'> 
      <div className="modal-content">
        <div className="modal-form">
          <div className="modal-form-group">
            <label>Unit Name</label>
            <input
              type="text"
              value={editAllocation.unitName}
              onChange={(e) =>
                setEditAllocation({ ...editAllocation, unitName: e.target.value })
              }
            />
          </div>

          <div className="modal-form-group">
            <label>Conduction Number</label>
            <input
              type="text"
              value={editAllocation.unitId}
              onChange={(e) =>
                setEditAllocation({ ...editAllocation, unitId: e.target.value })
              }
            />
          </div>

          <div className="modal-form-group">
            <label>Body Color</label>
            <input
              type="text"
              value={editAllocation.bodyColor}
              onChange={(e) =>
                setEditAllocation({ ...editAllocation, bodyColor: e.target.value })
              }
            />
          </div>

          <div className="modal-form-group">
            <label>Variation</label>
            <select value={editAllocation.variation}
            onChange={(e) =>setEditAllocation({ ...editAllocation, variation: e.target.value })}>
               <option value="">Select Variation</option>
               <option value="4x2 LSA">4x2 LSA</option>
               <option value="4x4">4x4</option>
               <option value="LS-E">LS-E</option>
               <option value="LS">LS</option>
              </select>
              </div>


          <div className="modal-form-group">
            <label>Assigned Driver</label>
            <select value={editAllocation.assignedDriver} onChange={(e) =>setEditAllocation({ ...editAllocation, assignedDriver: e.target.value })}>
              <option value="">Select Driver</option>
              {drivers.map((driver) => (
                <option key={driver._id} value={driver.name}> {driver.name}
                </option>
              ))}
              </select>

          </div>

          <div className="modal-form-group">
            <label>Status</label>
            <select
              value={editAllocation.status}
              onChange={(e) =>
                setEditAllocation({ ...editAllocation, status: e.target.value })
              }
            >
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="create-btn1" onClick={() => handleUpdate(editAllocation._id)}>Save</button>
          <button className="cancel-btn1" onClick={() => setEditAllocation(null)}>Cancel</button>
        </div>
      </div>
      </div>
    </div>
  </div>
)}


      </div>
    </div>
  );
};

export default DriverAllocation;
