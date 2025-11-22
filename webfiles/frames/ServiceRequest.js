import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../css/ServiceRequest.css';
import searchIcon from '../icons/search.png';
import logo from '../icons/I-track logo.png'; 
import addIcon from '../icons/add.png'; 
import dropdownIcon from '../icons/drop-down-arrow.png'; 
import { getCurrentUser } from '../getCurrentUser';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import downloadIcon from '../icons/download2.png';



const ServiceRequest = () => {
  const [requests, setRequests] = useState([]);
  const [newRequest, setNewRequest] = useState({
    dateCreated: '',
    vehicleRegNo: '',
    service: [],
    status: 'Pending'
  });
  const [editRequest, setEditRequest] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [editServiceDropdownOpen, setEditServiceDropdownOpen] = useState(false); // New state for edit modal
 
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);

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


  const filteredRequests = requests.filter((req) => {
    const searchValue = searchTerm.toLowerCase();
    return (
      req.dateCreated.toLowerCase().includes(searchValue) ||
      req.vehicleRegNo.toLowerCase().includes(searchValue) ||
      req.service.join(', ').toLowerCase().includes(searchValue) ||
      req.status.toLowerCase().includes(searchValue)
    );
  });

 const [currentPage, setCurrentPage] = useState(1);
 const [itemsPerPage] = useState(6); // Change to your desired items per page

 const indexOfLastRequest = currentPage * itemsPerPage;
 const indexOfFirstRequest = indexOfLastRequest - itemsPerPage;
 const currentRequests = filteredRequests.slice(indexOfFirstRequest, indexOfLastRequest);

 const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  // Live countdown state
  const [countdowns, setCountdowns] = useState({});
  const countdownInterval = useRef(null);

  useEffect(() => {
    fetchRequests();
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

  // Setup live countdowns for in-progress requests
  useEffect(() => {
    // Clear previous interval
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    // Initialize countdowns
    const newCountdowns = {};
    currentRequests.forEach(req => {
      if (
        req.status === 'In Progress' &&
        req.serviceTime &&
        req.inProgressAt
      ) {
        // Calculate end time
        const start = new Date(req.inProgressAt).getTime();
        const end = start + req.serviceTime * 60 * 1000;
        newCountdowns[req._id] = Math.max(0, Math.floor((end - Date.now()) / 1000));
      }
    });
    setCountdowns(newCountdowns);

    // Start interval to update countdowns every second
    countdownInterval.current = setInterval(() => {
      setCountdowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          updated[id] = Math.max(0, updated[id] - 1);
        });
        return updated;
      });
    }, 1000);

    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRequests]);

  const fetchRequests = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getRequest", { withCredentials: true })
      .then((res) => setRequests(res.data))
      .catch((err) => console.log(err));
  };

  const handleCreateRequest = () => {
  const { dateCreated, vehicleRegNo, service, unitName } = newRequest;

  const conductionError = validateConductionNumber(vehicleRegNo);
  if (conductionError) {
    alert(conductionError);
    return;
  }

  if (!dateCreated || !vehicleRegNo || service.length === 0 || !unitName) {
    alert("All fields are required.");
    return;
  }

  axios.post("https://itrack-web-backend.onrender.com/api/createRequest", newRequest, { withCredentials: true })
    .then(() => {
      fetchRequests();
      setNewRequest({
        dateCreated: '',
        vehicleRegNo: '',
        unitName: '',
        service: [],
        status: 'Pending'
      });
      setIsCreateModalOpen(false);
    })
    .catch((err) => console.log(err));
};

  
  const handleUpdateRequest = (id) => {
  const { dateCreated, vehicleRegNo, service, unitName } = editRequest;

  const conductionError = validateConductionNumber(vehicleRegNo);
  if (conductionError) {
    alert(conductionError);
    return;
  }

  if (!dateCreated || !vehicleRegNo || service.length === 0 || !unitName) {
    alert("All fields are required.");
    return;
  }

  axios.put(`https://itrack-web-backend.onrender.com/api/updateRequest/${id}`, editRequest, { withCredentials: true })
    .then(() => {
      fetchRequests();
      setEditRequest(null);
    })
    .catch((err) => console.log(err));
};

  

  const handleDeleteRequest = (id) => {
    axios.delete(`https://itrack-web-backend.onrender.com/api/deleteRequest/${id}`, { withCredentials: true })
      .then(() => fetchRequests())
      .catch((err) => console.log(err));
  };

  const handleDownloadRequestsPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text('Vehicle Preparation Requests', 14, 15);

  const requestData = filteredRequests.map(req => [
    new Date(req.dateCreated).toLocaleDateString('en-CA'),
    req.vehicleRegNo,
    req.unitName,
    Array.isArray(req.service) ? req.service.join(', ') : req.service,
    req.status,
    req.serviceTime ? `${req.serviceTime} min` : '—'
  ]);

  autoTable(doc, {
    head: [['Date Created', 'Conduction No.', 'Unit Name', 'Service', 'Status', 'Estimated Time']],
    body: requestData,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });

  doc.save('ServiceRequests.pdf');
};


  return (
    <div className="app">
      {/* Create Modal */}
      {isCreateModalOpen && !['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && (
        <div className="modal-overlay">
          <div className="modal">
            <p className='modaltitle'>Create Vehicle Preparation</p>

            <div className='modalline'> 
            </div>

            <div className="modal-content">
              <div className="modal-form">
              <div className="modal-form-group">
  <label>Date Created <span style={{color: 'red'}}>*</span></label>
  <input
    type="date"
    value={newRequest.dateCreated}
    onChange={(e) =>
      setNewRequest({ ...newRequest, dateCreated: e.target.value })
    }
    required
  />
</div>

<div className="modal-form-group">
  <label>Conduction Number <span style={{color: 'red'}}>*</span></label>
  <input
    type="text"
    value={newRequest.vehicleRegNo}
    onChange={(e) =>
      setNewRequest({ ...newRequest, vehicleRegNo: e.target.value })
    }
    required
  />
</div>

<div className="modal-form-group">
  <label>Service <span style={{color: 'red'}}>*</span></label>
  <div className="dropdown">
    <button
      type="button"
      className="dropdown-btn"
      onClick={() => setServiceDropdownOpen(!serviceDropdownOpen)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
    >
      <span>
        {newRequest.service.length > 0
          ? newRequest.service.join(', ')
          : 'Select Services'}
      </span>
      <img src={dropdownIcon} alt="Dropdown" style={{ width: 7, height: 7, marginRight: 4 }} />
    </button>
    {serviceDropdownOpen && (
      <div className="dropdown-menu">
        {['Carwash', 'Tinting', 'Ceramic Coating', 'Accessories', 'Rust Proof'].map((service) => (
          <label key={service} className="dropdown-item">
            <input
              type="checkbox"
              value={service}
              checked={newRequest.service.includes(service)}
              onChange={(e) => {
                const value = e.target.value;
                setNewRequest((prev) => ({
                  ...prev,
                  service: prev.service.includes(value)
                    ? prev.service.filter((s) => s !== value)
                    : [...prev.service, value]
                }));
              }}
              required={newRequest.service.length === 0}
            />
            {service}
          </label>
        ))}
      </div>
    )}
  </div>
</div>

<div className="modal-form-group">
  <label>Unit Name <span style={{color: 'red'}}>*</span></label>
  <select
    value={newRequest.unitName || ''}
    onChange={e => setNewRequest({ ...newRequest, unitName: e.target.value })}
    required
  >
    <option value="">Select Unit Name</option>
    <option value="Isuzu MU-X">Isuzu MU-X</option>
    <option value="Isuzu D-MAX">Isuzu D-MAX</option>
    <option value="Isuzu Traviz">Isuzu Traviz</option>
  </select>
</div>

                <div className="modal-form-group">
                  <label>Status</label>
                  <select
                    value={newRequest.status}
                    onChange={(e) => setNewRequest({ ...newRequest, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    
                  </select>
                </div>
              </div>
              <div className="modal-buttons">
                <button className="create-btn1" onClick={handleCreateRequest}>Submit</button>
                <button className="cancel-btn1" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editRequest && !['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && (
  <div className="modal-overlay">
    <div className="modal">
      <p className='modaltitle'>Edit Vehicle Preparation</p>
       <div className='modalline'> 
      <div className="modal-content">
        <div className="modal-form">
          <div className="modal-form-group">
            <label>Date Created <span style={{color: 'red'}}>*</span></label>
            <input
              type="date"
              value={editRequest.dateCreated}
              onChange={(e) =>
                setEditRequest({ ...editRequest, dateCreated: e.target.value })
              }
              required
            />
          </div>

          <div className="modal-form-group">
        <label>Conduction Number <span style={{color: 'red'}}>*</span></label>
            <input
              type="text"
              value={editRequest.vehicleRegNo}
              onChange={(e) =>
                setEditRequest({ ...editRequest, vehicleRegNo: e.target.value })
              }
              required
            />
          </div>

         <div className="modal-form-group">
  <label>Service <span style={{color: 'red'}}>*</span></label>
  <input
    type="text"
    value={editRequest.service && Array.isArray(editRequest.service) ? editRequest.service.join(', ') : ''}
    disabled
    style={{}}
  />
</div>

<div className="modal-form-group">
  <label>Unit Name <span style={{color: 'red'}}>*</span></label>
  <select
    value={editRequest.unitName || ''}
    onChange={e => setEditRequest({ ...editRequest, unitName: e.target.value })}
    required
  >
    <option value="">Select Unit Name</option>
    <option value="Isuzu MU-X">Isuzu MU-X</option>
    <option value="Isuzu D-MAX">Isuzu D-MAX</option>
    <option value="Isuzu Traviz">Isuzu Traviz</option>
  </select>
</div>

          <div className="modal-form-group">
            <label>Status</label>
          <select
  value={editRequest.status}
  onChange={(e) =>
    setEditRequest({ ...editRequest, status: e.target.value })
  }
>
  <option value="Pending" disabled>Pending</option>
  <option value="In Progress">In Progress</option>
  <option value="Completed">Completed</option>
</select>


          </div>
        </div>

        <div className="modal-buttons">
          <button className="create-btn1" onClick={() => handleUpdateRequest(editRequest._id)}>
            Save
          </button>
          <button className="cancel-btn1" onClick={() => setEditRequest(null)}>
            Cancel
          </button>
        </div>
      </div>
       </div>
    </div>
  </div>
)}


      {/* Main UI */}
   
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main">
         <header className="header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h3 className="header-title1">Vehicle Preparation</h3>
          {fullUser && fullUser.name && (
            <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15 }}>
              Welcome, {fullUser.name}
            </div>
          )}
        </header>
      

      <div className="user-management-header" >
        <button 
                    onClick={handleDownloadRequestsPDF} 
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
       {!['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && (
         <button className="create-btn" onClick={() => setIsCreateModalOpen(true)}>
         <img src={addIcon} alt="Add" className="add-icon" />
         Create New
       </button>
       )}
     </div>


        <div className="content">
        

          <div className="table-container">
            <table>

            <thead >
              <tr >
                <th>Date Created</th>
                <th>Conduction Number</th>
                <th>Unit Name</th>
                <th>Service</th>
                <th>Status</th>
                <th>Estimated Time (min)</th>
                {!['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
                <tr className="header-spacer-row"><td ></td></tr>
             {currentRequests.map((req) => (

                <tr key={req._id}>
                  <td>{new Date(req.dateCreated).toLocaleDateString('en-CA')}</td>
                  <td>{req.vehicleRegNo}</td>
                  <td>{req.unitName}</td>
                   <td>
                      {Array.isArray(req.service)? req.service.length > 2? `${req.service.slice(0, 2).join(', ')}...`: req.service.join(', ')
                      : req.service}
                      </td>
                  <td>
  <span
    className={`status-badge ${
      req.status === 'Pending'
        ? 'status-pending'
        : req.status === 'In Progress'
        ? 'status-progress'
        : 'status-completed'
    }`}
  >
    {req.status}
  </span>
</td>
<td>
  :
  {req.status === 'In Progress' && req.serviceTime !== undefined && req.serviceTime !== null && req.inProgressAt
    ? (() => {
      const totalSeconds = countdowns[req._id] || 0;
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${String(seconds).padStart(2, '0')}s`;
      return result.trim();
    })()
    : ''}
</td>
{!['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && (
        <td>
          <button className="action-btn" onClick={() => setEditRequest(req)}>Edit</button> 
          {' '}
          <button className="action-btn" onClick={() => handleDeleteRequest(req._id)}>Delete</button>
        </td>
      )}
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
  <div className="pagination-wrapper">
    <div className="pagination-info">
      Showing {indexOfFirstRequest + 1} to {Math.min(indexOfLastRequest, filteredRequests.length)} of {filteredRequests.length} results
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
      </div>
    </div>
  
  );
};

export default ServiceRequest;
