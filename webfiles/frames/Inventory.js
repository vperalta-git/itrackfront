import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ✅ for table export
import searchIcon from '../icons/search.png';
import addIcon from '../icons/add.png'; 
import logo from '../icons/I-track logo.png'; 
import downloadIcon from '../icons/download2.png';
import { getCurrentUser } from '../getCurrentUser';

const Inventory = () => {
  const [stock, setStock] = useState([]);
  const [newStock, setNewStock] = useState({
    unitName: '',
    unitId: '',
    bodyColor: '',
    variation: '',
    quantity: 1 // Added quantity field
  });

  const [editStock, setEditStock] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [changeLogs, setChangeLogs] = useState([]);
const [isLogModalOpen, setIsLogModalOpen] = useState(false);
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


  useEffect(() => {
    fetchStock();
    getCurrentUser().then(user => {
      setUserRole(user ? user.role : null);
      setCurrentUser(user);
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

  const fetchStock = () => {
  axios.get("https://itrack-web-backend.onrender.com/api/getStock")
      .then((response) => {
        setStock(response.data);
      })
      .catch((error) => console.log(error));
  };

  const handleCreateStock = () => {
    const { unitName, unitId, bodyColor, variation} = newStock;

    const conductionError = validateConductionNumber(unitId);
  if (conductionError) {
    alert(conductionError);
    return;
  }

  
    if (!unitName || !unitId || !bodyColor || !variation) {
      alert('All fields are required!');
      return;
    }
  
  axios.post("https://itrack-web-backend.onrender.com/api/createStock", newStock)
      .then(() => {
        fetchStock();
        setNewStock({ unitName: '', unitId: '', bodyColor: '', variation: '', quantity: 1 }); // Reset quantity to 1
        setIsCreateModalOpen(false);
      })
      .catch((error) => console.log(error));
  };

  const handleUpdateStock = (id) => {
  const { unitName, unitId, bodyColor, variation } = editStock;


  const conductionError = validateConductionNumber(unitId);
  if (conductionError) {
    alert(conductionError);
    return;
  }
  if (!unitName || !unitId || !bodyColor || !variation) {
    alert('All fields are required!');
    return;
  }

  const oldStock = stock.find(item => item._id === id);

  axios.put(`https://itrack-web-backend.onrender.com/api/updateStock/${id}`, editStock)
    .then(() => {
      setChangeLogs(prev => [
        ...prev,
        {
          type: 'Edit',
          timestamp: new Date().toLocaleString(),
          before: oldStock,
          after: editStock
        }
      ]);
      fetchStock();
      setEditStock(null);
    })
    .catch((error) => console.log(error));
};


  const handleDeleteStock = (id) => {
  const deletedStock = stock.find(item => item._id === id);

  axios.delete(`https://itrack-web-backend.onrender.com/api/deleteStock/${id}`)
    .then(() => {
      setChangeLogs(prev => [
        ...prev,
        {
          type: 'Delete',
          timestamp: new Date().toLocaleString(),
          before: deletedStock,
          after: null
        }
      ]);
      fetchStock();
    })
    .catch((error) => console.log(error));
};



 const getAgeString = (createdAt) => {
  if (!createdAt) return 'N/A';

  const created = new Date(createdAt);
  if (isNaN(created)) return 'Invalid date';

  const now = new Date();
  const diffMs = now - created;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const displayHours = hours % 24;
  const displayMinutes = minutes % 60;
  const displaySeconds = seconds % 60;

  let result = '';
  if (days > 0) result += `${days}d `;
  result += `${displayHours}h`;
  // result += `${displayHours}h ${displayMinutes}m`;

  return result;
};

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  // Strict filter for dropdowns (body color or variation)
  const bodyColors = ["Black", "White", "Gray", "Blue", "Orange"];
  const variations = ["4x2 LSA", "4x4", "LS-E", "LS"];
  const unitNames = ["Isuzu MU-X", "Isuzu D-MAX", "Isuzu Traviz"];

  let strictlyFilteredStock = stock;
if (bodyColors.includes(filterTerm)) {
  strictlyFilteredStock = strictlyFilteredStock.filter(req => req.bodyColor === filterTerm);
} else if (variations.includes(filterTerm)) {
  strictlyFilteredStock = strictlyFilteredStock.filter(req => req.variation === filterTerm);
} else if (unitNames.includes(filterTerm)) {
  strictlyFilteredStock = strictlyFilteredStock.filter(req => req.unitName === filterTerm);
}


  // Original search logic (broad search)
  const filteredStock = stock.filter((req) => {
    const searchValue = searchTerm.toLowerCase();
    return (
      String(req.unitName).toLowerCase().includes(searchValue) ||
      String(req.unitId).toLowerCase().includes(searchValue) ||
      String(req.bodyColor).toLowerCase().includes(searchValue) ||
      String(req.variation).toLowerCase().includes(searchValue) ||
      getAgeString(req.createdAt).toLowerCase().includes(searchValue)
    );
  });

const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 6; // You can change this number if needed

const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentStock = filteredStock.slice(indexOfFirstItem, indexOfLastItem);

const totalPages = Math.ceil(filteredStock.length / itemsPerPage);

const handleDownloadInventoryPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('Inventory Report', 14, 15);

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

    doc.save('Inventory.pdf');
  };







  return (
    <div className="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="main">
        <header className="header">
         <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h3 className="header-title1">Inventory</h3>
           
          {fullUser && fullUser.name && (
            <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15 }}>
              Welcome, {fullUser.name}
            </div>
          )}
        </header>
        <div className="user-management-header" style={{ gap: 0 }}>
          <button 
            onClick={handleDownloadInventoryPDF} 
            className="printbtn" style={{  fontSize: '10px', display: 'flex', alignItems: 'center',marginRight:5 ,gap:3}}
            tabIndex={0}
          ><img src={downloadIcon} alt="Download" className="button-icon2" />
          Print PDF
          </button>
          {/* Filter Dropdown Button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              className="filterbtn"
              style={{  fontSize: '11px', display: 'flex', alignItems: 'center',marginRight:5 ,gap:3}}
              tabIndex={0}
              onClick={e => {
                const dropdown = document.getElementById('filter-dropdown-panel');
                if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
              }}
            >
              <img src={require('../icons/sort.png')}  style={{ width: 12, height: 12,marginLeft: 4 , }} />Filter
             
            </button>
            
            <div id="filter-dropdown-panel" style={{ display: 'none', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', borderRadius: 6, padding: '12px 16px', minWidth: 180, zIndex: 10, position: 'absolute', marginTop: 38 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block',textAlign:"left" }}>Body Color</label>
                <select
                  className="filter-dropdown"
                  onChange={e => setFilterTerm(e.target.value)}
                  value={filterTerm && ["Black","White","Gray","Blue","Orange"].includes(filterTerm) ? filterTerm : ""}
                  style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
                >
                  <option value="">All</option>
                  <option value="Black">Black</option>
                  <option value="White">White</option>
                  <option value="Gray">Gray</option>
                  <option value="Blue">Blue</option>
                  <option value="Orange">Orange</option>
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block',textAlign:"left" }}>Variation</label>
                <select
                  className="filter-dropdown"
                  onChange={e => setFilterTerm(e.target.value)}
                  value={filterTerm && ["4x2 LSA","4x4","LS-E","LS"].includes(filterTerm) ? filterTerm : ""}
                  style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
                >
                  <option value="">All</option>
                  <option value="4x2 LSA">4x2 LSA</option>
                  <option value="4x4">4x4</option>
                  <option value="LS-E">LS-E</option>
                  <option value="LS">LS</option>
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
  <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block', textAlign: "left" }}>
    Unit Name
  </label>
  <select
    className="filter-dropdown"
    onChange={e => setFilterTerm(e.target.value)}
    value={filterTerm && ["Isuzu MU-X", "Isuzu D-MAX", "Isuzu Traviz"].includes(filterTerm) ? filterTerm : ""}
    style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
  >
    <option value="">All</option>
    <option value="Isuzu MU-X">Isuzu MU-X</option>
    <option value="Isuzu D-MAX">Isuzu D-MAX</option>
    <option value="Isuzu Traviz">Isuzu Traviz</option>
  </select>
</div>

            </div>

            
          </div>
          
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
  <button className="create-btn" onClick={() => setIsCreateModalOpen(true)} style={{ marginLeft:4}} >
    <img src={addIcon} alt="Add" className="add-icon" />
    Add Stock
  </button>
)}
        </div>

        {isCreateModalOpen && (
  <div className="modal-overlay">
    <div className="modal">
        <p className='modaltitle'>Add Stock</p>

            <div className='modalline'> 
            </div>

      <div className="modal-content">
        <div className="modal-form">
          <div className="modal-form-group">
            <label>Unit Name <span style={{color: 'red'}}>*</span></label>
            <select value={newStock.unitName} onChange={(e) => setNewStock({ ...newStock, unitName: e.target.value })} required>
              <option value="">Select Unit Name</option>
              <option value="Isuzu MU-X">Isuzu MU-X</option>
              <option value="Isuzu D-MAX">Isuzu D-MAX</option>
              <option value="Isuzu Traviz">Isuzu Traviz</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label>Conduction Number <span style={{color: 'red'}}>*</span></label>
            <input type="text" value={newStock.unitId} onChange={(e) => setNewStock({ ...newStock, unitId: e.target.value })} required />
          </div>

          <div className="modal-form-group">
            <label>Body Color <span style={{color: 'red'}}>*</span></label>
            <select value={newStock.bodyColor} onChange={(e) => setNewStock({ ...newStock, bodyColor: e.target.value })} required>
              <option value="">Select Body Color</option>
              <option value="Black">Black</option>
              <option value="White">White</option>
              <option value="Gray">Gray</option>
              <option value="Blue">Blue</option>
              <option value="Orange">Orange</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label>Variation <span style={{color: 'red'}}>*</span></label>
            <select value={newStock.variation} onChange={(e) => setNewStock({ ...newStock, variation: e.target.value })} required>
              <option value="">Select Variation</option>
               <option value="4x2 LSA">4x2 LSA</option>
               <option value="4x4">4x4</option>
               <option value="LS-E">LS-E</option>
               <option value="LS">LS</option>
              </select>

          </div>

          <div className="modal-form-group">
            <label>Quantity</label>
            <input
              type="number"
              value={newStock.quantity}
              onChange={(e) => setNewStock({ ...newStock, quantity: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
        </div>
        <div className="modal-buttons">
          <button className="create-btn1" onClick={handleCreateStock}>Add</button>
          <button className="cancel-btn1" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
        </div>
      </div>
    </div>
  </div>
)}


{editStock && (
  <div className="modal-overlay">
    <div className="modal">
      <p className='modaltitle'>Edit Stock</p>
      <div className='modalline'> 
      <div className="modal-content">
        <div className="modal-form">
          <div className="modal-form-group">
            <label>Unit Name <span style={{color: 'red'}}>*</span></label>
            <select value={editStock.unitName} onChange={(e) => setEditStock({ ...editStock, unitName: e.target.value })} required>
              <option value="">Select Unit Name</option>
              <option value="Isuzu MU-X">Isuzu MU-X</option>
              <option value="Isuzu D-MAX">Isuzu D-MAX</option>
              <option value="Isuzu Traviz">Isuzu Traviz</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label>Conduction Number <span style={{color: 'red'}}>*</span></label>
            <input type="text" value={editStock.unitId} onChange={(e) => setEditStock({ ...editStock, unitId: e.target.value })} required />
          </div>

          <div className="modal-form-group">
            <label>Body Color <span style={{color: 'red'}}>*</span></label>
            <select value={editStock.bodyColor} onChange={(e) => setEditStock({ ...editStock, bodyColor: e.target.value })} required>
              <option value="">Select Body Color</option>
              <option value="Black">Black</option>
              <option value="White">White</option>
              <option value="Gray">Gray</option>
              <option value="Blue">Blue</option>
              <option value="Orange">Orange</option>
            </select>
          </div>

          <div className="modal-form-group">
            <label>Variation <span style={{color: 'red'}}>*</span></label>
            <select value={editStock.variation} onChange={(e) => setEditStock({ ...editStock, variation: e.target.value })} required>
              <option value="">Select Variation</option>
               <option value="4x2 LSA">4x2 LSA</option>
               <option value="4x4">4x4</option>
               <option value="LS-E">LS-E</option>
               <option value="LS">LS</option>

            </select>

          </div>

          <div className="modal-form-group">
            <label>Quantity</label>
            <input
              type="number"
              value={editStock.quantity}
              disabled // Make quantity not editable in edit modal
            />
          </div>
        </div>
        <div className="modal-buttons">
          <button className="create-btn1" onClick={() => handleUpdateStock(editStock._id)}>Save</button>
          <button className="cancel-btn1" onClick={() => setEditStock(null)}>Cancel</button>
        </div>
      </div>
      </div>
    </div>
  </div>
)}

        
        <div className="content">
        

          


          <div className="table-container">

        
        <table >
          <thead>
            <tr>
              <th>Unit Name</th>
              <th>Conduction Number</th>
              <th>Body Color</th>
              <th>Variation</th>
              <th>Age (In Storage)</th>
              <th>Quantity</th> {/* Added Quantity column header */}
              {!['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
              <tr class="header-spacer-row"><td ></td></tr>
            {(filterTerm ? strictlyFilteredStock : currentStock).map((stockItem) => (


              <tr key={stockItem._id}>
                <td>{stockItem.unitName}</td>
                <td>{stockItem.unitId}</td>
                <td>{stockItem.bodyColor}</td>
                <td>{stockItem.variation}</td>
                <td>{getAgeString(stockItem.createdAt)}</td> 
                <td>{stockItem.quantity}</td> {/* Display quantity in the table */}
                {!['Sales Agent', 'Manager', 'Supervisor'].includes(userRole) && (
                  <td>
                    <button className="action-btn" onClick={() => setEditStock(stockItem)}>Edit</button>{' '}
                    <button className="action-btn" onClick={() => handleDeleteStock(stockItem._id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
  <div className="pagination-wrapper">
    <div className="pagination-info">
      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStock.length)} of {filteredStock.length} results
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


{isLogModalOpen && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>Change Logs</h3>
      <div className="modal-content" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {changeLogs.length === 0 ? (
          <p>No changes yet.</p>
        ) : (
          <ul>
            {changeLogs.map((log, index) => (
              <li key={index} style={{ marginBottom: '10px' }}>
                <strong>{log.type}</strong> on <em>{log.timestamp}</em><br />
                {log.before && (
                  <>
                    <strong>Before:</strong> {log.before.unitName}, {log.before.unitId}, {log.before.bodyColor}, {log.before.variation}<br />
                  </>
                )}
                {log.after && (
                  <>
                    <strong>After:</strong> {log.after.unitName}, {log.after.unitId}, {log.after.bodyColor}, {log.after.variation}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="modal-buttons">
        <button className="cancel-btn" onClick={() => setIsLogModalOpen(false)}>Close</button>
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

export default Inventory;
