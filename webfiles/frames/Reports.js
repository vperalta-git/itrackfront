import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../css/ServiceRequest.css'; 
import '../css/Reports.css'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // 
import clearIcon from '../icons/clear.png';
import filterIcon from '../icons/filter.png';
import downloadIcon from '../icons/download.png';
import logo from '../icons/I-track logo.png'; 
import { getCurrentUser } from '../getCurrentUser';



const Reports = () => {
  const [requests, setRequests] = useState([]);
  const [inProgressRequests, setInProgressRequests] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [stock, setStock] = useState([]);
  const [unitSummary, setUnitSummary] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [profileImage, setProfileImage] = useState('');
const [profileData, setProfileData] = useState({ name: '', phoneno: '', picture: '' });
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCompletedRequests();
    // fetchInProgressRequests();
  }, []);

  

const fetchCompletedRequests = async () => {
  try {
    const res = await axios.get("https://itrack-web-backend.onrender.com/api/getCompletedRequests", { withCredentials: true });
     console.log("Completed Requests:", res.data); 
    setRequests(res.data); // Duration is already included

  } catch (err) {
    console.log(err);
  }
};


  // const fetchInProgressRequests = () => {
  //   axios.get("http://localhost:8000/api/getInProgressRequests")
  //     .then((res) => setInProgressRequests(res.data))
  //     .catch((err) => console.log(err));
  // };


 
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [isFilterActive, setIsFilterActive] = useState(false);
const [filteredRequests, setFilteredRequests] = useState([]);
const [filteredAllocations, setFilteredAllocations] = useState([]); // New state for filtered allocations


const isWithinDateRange = (dateString) => {
  const date = new Date(dateString);
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const handleFilter = () => {
  const combinedRequests = [...inProgressRequests, ...requests];
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const filtered = combinedRequests.filter((req) => {
    const reqDate = new Date(req.dateCreated);
    if (start && reqDate < start) return false;
    if (end && reqDate > end) return false;
    return true;
  });

  // Filter completedAllocations as well
  const filteredAllocations = completedAllocations.filter((item) => {
    const dateStr = item.date || item.createdAt;
    if (!dateStr) return false;
    const allocDate = new Date(dateStr);
    if (start && allocDate < start) return false;
    if (end && allocDate > end) return false;
    return true;
  });

  setFilteredRequests(filtered);
  setFilteredAllocations(filteredAllocations);
  setIsFilterActive(true);
};


const handleClearFilter = () => {
  setStartDate('');
  setEndDate('');
  setFilteredRequests([]);
  setFilteredAllocations([]); // Clear filtered allocations
  setIsFilterActive(false);
};


const [completedAllocations, setCompletedAllocations] = useState([]);

  const fetchCompletedAllocations = () => {
  axios.get("https://itrack-web-backend.onrender.com/api/getCompletedAllocations", { withCredentials: true }) // ✅ corrected endpoint
    .then((res) => {
      setCompletedAllocations(res.data);
    })
    .catch((err) => console.log(err));
};


useEffect(() => {
  fetchCompletedRequests();
  fetchCompletedAllocations();
}, []);


useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      const response = await axios.get("https://itrack-web-backend.onrender.com/api/getStock", { withCredentials: true });
      setStock(response.data);

      // Group by unitName and count occurrences
      const summary = response.data.reduce((acc, item) => {
        acc[item.unitName] = (acc[item.unitName] || 0) + 1;
        return acc;
      }, {});

      // Convert object to array for easier mapping
      const summaryArray = Object.entries(summary).map(([unitName, quantity]) => ({
        unitName,
        quantity
      }));

      setUnitSummary(summaryArray);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  };

 
const handleDownloadPDF = () => {
  const doc = new jsPDF();
  let y = 15;
  doc.setFontSize(16);
  doc.text('Reports', 14, y);
  y += 8;

  // Vehicle Preparation Table
  doc.setFontSize(13);
  doc.text('Vehicle Preparation', 14, y);
  y += 4;
  const prepData = (filteredRequests.length > 0 ? filteredRequests : [...inProgressRequests, ...requests]).map(req => [
    req.completedAt
      ? new Date(req.completedAt).toLocaleDateString('en-CA')
      : req.createdAt
        ? new Date(req.createdAt).toLocaleDateString('en-CA')
        : req.dateCreated
          ? new Date(req.dateCreated).toLocaleDateString('en-CA')
          : '',
    req.completedAt
      ? new Date(req.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : req.createdAt
        ? new Date(req.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : req.dateCreated
          ? new Date(req.dateCreated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '',
    req.preparedBy || 'N/A',
    req.vehicleRegNo,
    Array.isArray(req.service) ? req.service.join(', ') : req.service,
    req.serviceTime !== null && req.serviceTime !== undefined ? `${req.serviceTime} mins` : 'N/A',
    req.status
  ]);
  autoTable(doc, {
    head: [['Date', 'Time', 'Prepared By', 'Conduction Number', 'Service', 'Service Time', 'Status']],
    body: prepData,
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Vehicle Shipment Table
  doc.setFontSize(13);
  doc.text('Vehicle Shipment', 14, y);
  y += 4;
  const shipmentData = completedAllocations.map(item => [
    item.date ? new Date(item.date).toLocaleDateString('en-CA') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-CA') : ''),
    item.date ? new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''),
    item.allocatedBy || 'N/A',
    item.unitId,
    item.assignedDriver,
    item.status
  ]);
  autoTable(doc, {
    head: [['Date', 'Time', 'Allocated By', 'Conduction Number', 'Assigned Driver', 'Status']],
    body: shipmentData,
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Stocks Summary Table
  doc.setFontSize(13);
  doc.text('Stocks Summary', 14, y);
  y += 4;
  const stockData = unitSummary.map(item => [item.unitName, item.quantity]);
  autoTable(doc, {
    head: [['Unit Name', 'Quantity']],
    body: stockData,
    startY: y + 2,
    theme: 'grid',
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
    
  });

  // Full Inventory Table
doc.addPage();
doc.setFontSize(13);
doc.text('Full Inventory', 14, 15);

const inventoryData = stock.map(item => [
  item.unitName,
  item.unitId,
  item.bodyColor,
  item.variation,
  item.quantity,
  item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-CA') : 'N/A'
]);

autoTable(doc, {
  head: [['Unit Name', 'Conduction Number', 'Body Color', 'Variation', 'Quantity', 'Date Added']],
  body: inventoryData,
  startY: 20,
  theme: 'grid',
  styles: { fontSize: 10 },
  margin: { left: 14, right: 14 },
});


  doc.save('Reports.pdf');
};



  useEffect(() => {
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



  const handleProfileClick = () => {
  fileInputRef.current.click();
};

const handleProfileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const newImage = reader.result;
      setProfileData(prev => ({ ...prev, picture: newImage }));
      setProfileImage(newImage);

      if (fullUser && fullUser.email) {
        localStorage.setItem(`profileImage_${fullUser.email}`, newImage);
      }

      // Audit log
      try {
        await axios.post(
          "https://itrack-web-backend.onrender.com/api/audit-trail",
          {
            action: "Update",
            resource: "Profile Image",
            performedBy: fullUser.email || fullUser.name,
            details: "Profile picture changed",
            timestamp: new Date().toISOString(),
          },
          { withCredentials: true }
        );
      } catch (err) {
        console.log("Audit log error:", err);
      }
    };
    reader.readAsDataURL(file);
  }
};


const handleUpdateProfile = () => {
  if (!profileData.name || !profileData.phoneno) {
    alert("Name and phone number are required.");
    return;
  }

  const updatedData = {
    name: profileData.name,
    phoneno: profileData.phoneno,
    picture: profileData.picture,
  };

  axios.put(`https://itrack-web-backend.onrender.com/api/updateUser/${fullUser._id}`, updatedData)
    .then(() => {
      alert("Profile updated successfully!");
      setFullUser({ ...fullUser, ...updatedData });
      if (fullUser && fullUser.email) {
        localStorage.setItem(`profileImage_${fullUser.email}`, profileData.picture || "");
      }
      setIsProfileModalOpen(false);
    })
    .catch((error) => {
      console.error("Update failed:", error);
      alert("Failed to update profile.");
    });
};



useEffect(() => {
  if (fullUser && fullUser.email) {
    const savedImage = localStorage.getItem(`profileImage_${fullUser.email}`);
    if (savedImage) {
      setProfileImage(savedImage);
      setProfileData(prev => ({ ...prev, picture: savedImage }));
    }
  }
}, [fullUser]);



useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest(".profile-wrapper")) {
      setIsDropdownOpen(false);
    }
  };
  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, []);






  return (
    <div className="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main">
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <div style={{ display: 'flex', alignItems: 'center' }}>
    <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
    <h3 className="header-title1" style={{ marginLeft: 10 }}>Reports</h3>
  </div>

  {/* Profile section on the right */}
  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
    {fullUser && fullUser.name && (
      <div
        className="loggedinuser"
        onClick={() => {
          setProfileData({
            name: fullUser.name,
            phoneno: fullUser.phoneno,
            picture: fullUser.picture || ''
          });
          setIsProfileModalOpen(true);
        }}
        style={{
          fontWeight: 500,
          fontSize: 15,
          cursor: 'pointer',
        }}
      >
        Welcome, {fullUser.name}
      </div>
    )}

    <div
      className="profile-wrapper"
      style={{ cursor: 'pointer' }}
    >
      <img
        src={fullUser?.picture || profileImage || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}
        alt=""
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "2px solid #ffffff",
          objectFit: "cover",
        }}
      />

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleProfileChange}
        style={{ display: "none" }}
      />

      {isDropdownOpen && (
        <div
          className="profile-dropdown"
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            width: "150px",
          }}
        >
          <div
            onClick={() => {
              setIsDropdownOpen(false);
              setProfileData({
                name: fullUser.name,
                phoneno: fullUser.phoneno,
                picture: fullUser.picture || "",
              });
              setIsProfileModalOpen(true);
            }}
            style={{
              padding: "10px 12px",
              cursor: "pointer",
              color: "#393939ff",
              fontSize: "13px",
              borderBottom: "1px solid #eee",
            }}
          >
            Edit Profile
          </div>
        </div>
      )}
    </div>
  </div>
</header>



        {isProfileModalOpen && (
  <div className="profile-modal-overlay">
    <div className="profile-modal-container">
      <h2 className="profile-modal-title">Edit Profile</h2>

      <div className="profile-modal-content">
        {/* Profile Image Section */}
        <div className="profile-modal-image-section">
          <img
            src={
              fullUser?.picture ||
              profileImage ||
              "https://via.placeholder.com/120"
            }
            alt="Profile"
            className="profile-modal-image"
            onClick={() =>
              document.getElementById("profilePicInput").click()
            }
          />
          <input
            type="file"
            id="profilePicInput"
            style={{ display: "none" }}
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setProfileData({ ...profileData, picture: reader.result });
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <small className="profile-modal-image-note">
            Click image to change
          </small>
        </div>

        {/* Form Section */}
        <div className="profile-modal-form">
          <div className="profile-modal-field">
            <label className="profile-modal-label">Name</label>
            <input
              type="text"
              className="profile-modal-input"
              value={profileData.name}
              onChange={(e) =>
                setProfileData({ ...profileData, name: e.target.value })
              }
            />
          </div>

          <div className="profile-modal-field">
            <label className="profile-modal-label">Phone Number</label>
            <input
              type="text"
              className="profile-modal-input"
              value={profileData.phoneno}
              onChange={(e) =>
                setProfileData({ ...profileData, phoneno: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="profile-modal-actions">
        <button
          className="profile-modal-btn profile-modal-btn-save"
          onClick={handleUpdateProfile}
        >
          Save Changes
        </button>
        <button
          className="profile-modal-btn profile-modal-btn-cancel"
          onClick={() => setIsProfileModalOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}






        <div className="content">

          <div className='reportstitle'></div>

<div className="filter-controls">
  <label>
    Start Date
    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
    />
  </label>

  <label>
    End Date
    <input
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
    />
  </label>

  <button className="clear-btn" onClick={handleClearFilter}>
    Clear
    <img src={clearIcon} alt="Clear" className="button-icon" />
  </button>

  <button className="filter-btn" onClick={handleFilter}>
    Filter
    <img src={filterIcon} alt="Filter" className="button-icon1" />
  </button>

  <button className="pdf-btn" onClick={handleDownloadPDF}>Print PDF<img src={downloadIcon} alt="Download" className="button-icon" />
    
  </button>
</div>


          <div className="table-container">
            {/* Download PDF Button Only */}
            
            <div className="table-wrapper">
              {/* Service Requests Table */}
              <div className="single-table">
                <h4 className="table-label">Vehicle Preparation</h4>
                <div className="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Prepared By</th>
                        <th>Conduction Number</th>
                        <th>Service</th>
                        <th>Service Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(filteredRequests.length > 0 ? filteredRequests : [...inProgressRequests, ...requests]).length === 0 ? (
                        <tr><td colSpan="7" style={{textAlign:'center',color:'#888'}}>No records found.</td></tr>
                      ) : (
                        <tr className="header-spacer-row"><td colSpan="7"></td></tr>
                      )}
                      {(filteredRequests.length > 0 ? filteredRequests : [...inProgressRequests, ...requests])
                        .map((req) => (
                          <tr key={req._id}>
                            <td>{req.completedAt ? new Date(req.completedAt).toLocaleDateString('en-CA') : (req.createdAt ? new Date(req.createdAt).toLocaleDateString('en-CA') : '')}</td>
                            <td>{req.completedAt ? new Date(req.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (req.createdAt ? new Date(req.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '')}</td>
                            <td>{req.preparedBy || 'N/A'}</td>
                            <td>{req.vehicleRegNo}</td>
                            <td>{Array.isArray(req.service) ? req.service.join(', ') : req.service}</td>
                            <td>{req.serviceTime !== null && req.serviceTime !== undefined
                              ? `${req.serviceTime} mins`
                              : 'N/A'}</td>
                            <td>
                              <span className={`status-badge ${
                                req.status === 'Pending' ? 'status-pending'
                                : req.status === 'In Progress' ? 'status-progress'
                                : 'status-completed'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                
                <div className="single-table" style={{marginTop: '32px'}}>
                  <h4 className="table-label">Vehicle Shipment</h4>
                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Allocated By</th>
                          <th>Conduction Number</th>
                          <th>Assigned Driver</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isFilterActive ? filteredAllocations : completedAllocations).length === 0 ? (
                          <tr><td colSpan="6" style={{textAlign:'center',color:'#888'}}>No records found.</td></tr>
                        ) : (
                          <tr className="header-spacer-row"><td colSpan="6"></td></tr>
                        )}
                        {(isFilterActive ? filteredAllocations : completedAllocations).map((item) => (
                          <tr key={item._id}>
                            <td>{item.completedAt ? new Date(item.completedAt).toLocaleDateString('en-CA') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-CA') : (item.date ? new Date(item.date).toLocaleDateString('en-CA') : ''))}</td>
                            <td>{item.completedAt ? new Date(item.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (item.createdAt ? new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : (item.date ? new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''))}</td>
                            <td>{item.allocatedBy || 'N/A'}</td>
                            <td>{item.unitId}</td>
                            <td>{item.assignedDriver}</td>
                            <td>
                              <span className="status-badge status-completed">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>


              
            </div>

            <div className="single-table">
  <h4 className="table-label">Inventory</h4>
  <div className="table-responsive">
    <table>
      <thead>
        <tr>
          <th>Unit Name</th>
          <th>Conduction Number</th>
          <th>Body Color</th>
          <th>Variation</th>
          <th>Quantity</th>
          <th>Date Added</th>
        </tr>
      </thead>
      <tbody>
        {stock.map((item) => (
          <tr key={item._id}>
            <td>{item.unitName}</td>
            <td>{item.unitId}</td>
            <td>{item.bodyColor}</td>
            <td>{item.variation}</td>
            <td>{item.quantity}</td>
            <td>{new Date(item.createdAt).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>




          </div>
         
        </div>
      </div>
    </div>
  );
};

export default Reports;
