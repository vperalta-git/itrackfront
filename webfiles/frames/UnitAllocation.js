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

const UnitAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [salesAgents, setSalesAgents] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [filterAgent, setFilterAgent] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest' or 'oldest'
  
  const [newAllocation, setNewAllocation] = useState({
    unitId: '',
    unitName: '',
    bodyColor: '',
    variation: '',
    assignedAgent: '',
    allocatedBy: '',
    allocationDate: new Date().toISOString().split('T')[0],
  });

  const validateConductionNumber = (value) => {
    const regex = /^[A-Za-z0-9]+$/;
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
    fetchStock();
    fetchSalesAgents();
    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user && user.email) {
        axios.get("https://itrack-web-backend.onrender.com/api/getUsers", { withCredentials: true })
          .then(res => {
            const found = res.data.find(u => u.email === user.email);
            setFullUser(found);
            if (found && found.name) {
              setNewAllocation(prev => ({ ...prev, allocatedBy: found.name }));
            }
          })
          .catch(() => setFullUser(null));
      }
    });
  }, []);

  const fetchAllocations = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getUnitAllocations", { withCredentials: true })
      .then((res) => setAllocations(res.data))
      .catch((err) => console.log(err));
  };

  const fetchStock = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getStock")
      .then((response) => {
        // Filter only available stock (not already allocated)
        const availableStock = response.data.filter(item => !item.assignedAgent);
        setStock(availableStock);
      })
      .catch((error) => console.log(error));
  };

  const fetchSalesAgents = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getUsers", { withCredentials: true })
      .then(res => {
        const agents = res.data.filter(user => 
          user.role === 'Sales Agent' || user.role === 'Manager'
        );
        setSalesAgents(agents);
      })
      .catch(err => console.log(err));
  };

  const handleCreate = () => {
    const { unitId, unitName, assignedAgent } = newAllocation;

    const conductionError = validateConductionNumber(unitId);
    if (conductionError) {
      alert(conductionError);
      return;
    }

    if (!unitId || !assignedAgent) {
      alert("Please select a unit and a sales agent.");
      return;
    }

    // Check if unit is already allocated
    const isAlreadyAllocated = allocations.some(alloc => alloc.unitId === unitId);
    if (isAlreadyAllocated) {
      alert("This unit is already allocated to a sales agent.");
      return;
    }

    axios.post("https://itrack-web-backend.onrender.com/api/createUnitAllocation", newAllocation, { withCredentials: true })
      .then(() => {
        fetchAllocations();
        fetchStock(); // Refresh stock list
        setIsCreateModalOpen(false);
        setNewAllocation({
          unitId: '',
          unitName: '',
          bodyColor: '',
          variation: '',
          assignedAgent: '',
          allocatedBy: fullUser?.name || '',
          allocationDate: new Date().toISOString().split('T')[0],
        });
      })
      .catch((error) => {
        console.log(error);
        alert("Failed to create allocation.");
      });
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this allocation?")) {
      axios.delete(`https://itrack-web-backend.onrender.com/api/deleteUnitAllocation/${id}`, { withCredentials: true })
        .then(() => {
          fetchAllocations();
          fetchStock(); // Refresh stock list
        })
        .catch((error) => console.log(error));
    }
  };

  const handleUnitSelect = (e) => {
    const selectedUnitId = e.target.value;
    const selectedUnit = stock.find(s => s.unitId === selectedUnitId);
    
    if (selectedUnit) {
      setNewAllocation({
        ...newAllocation,
        unitId: selectedUnit.unitId,
        unitName: selectedUnit.unitName,
        bodyColor: selectedUnit.bodyColor,
        variation: selectedUnit.variation,
      });
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.addImage(logo, 'PNG', 14, 10, 30, 30);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Unit Allocation Report', 50, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString('en-CA')}`, 50, 32);

    const tableData = filteredAllocations.map(item => [
      item.unitName || 'N/A',
      item.unitId || 'N/A',
      item.bodyColor || 'N/A',
      item.variation || 'N/A',
      item.assignedAgent || 'N/A',
      item.allocatedBy || 'N/A',
      item.allocationDate ? new Date(item.allocationDate).toLocaleDateString('en-CA') : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Unit Name', 'Conduction #', 'Body Color', 'Variation', 'Sales Agent', 'Allocated By', 'Date']],
      body: tableData,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 14, right: 14 },
    });

    doc.save('Unit_Allocation_Report.pdf');
  };

  // Filtering and sorting logic
  const filteredAllocations = allocations
    .filter(alloc => {
      const matchesSearch = searchTerm === '' || 
        String(alloc.unitName).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(alloc.unitId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(alloc.assignedAgent).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAgent = filterAgent === '' || alloc.assignedAgent === filterAgent;
      const matchesManager = filterManager === '' || alloc.allocatedBy === filterManager;
      
      return matchesSearch && matchesAgent && matchesManager;
    })
    .sort((a, b) => {
      const dateA = new Date(a.allocationDate || a.createdAt);
      const dateB = new Date(b.allocationDate || b.createdAt);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

  const handleSearchClick = () => {
    setSearchTerm(searchInput);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const getAgeString = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAllocations = filteredAllocations.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage);

  return (
    <div className="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="main">
        <header className="header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <h3 className="header-title1">Unit Allocation</h3>
           
          {fullUser && fullUser.name && (
            <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15 }}>
              Welcome, {fullUser.name}
            </div>
          )}
        </header>

        {/* Summary Cards */}
        <div style={{ display: 'flex', gap: 16, padding: '20px', flexWrap: 'wrap' }}>
          <div style={{ 
            flex: '1 1 200px', 
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)', 
            borderRadius: 12, 
            padding: 20, 
            color: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
              {allocations.length}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Total Allocations</div>
          </div>

          <div style={{ 
            flex: '1 1 200px', 
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', 
            borderRadius: 12, 
            padding: 20, 
            color: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
              {stock.length}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Available Units</div>
          </div>

          <div style={{ 
            flex: '1 1 200px', 
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', 
            borderRadius: 12, 
            padding: 20, 
            color: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
              {salesAgents.length}
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>Active Agents</div>
          </div>
        </div>

        <div className="user-management-header" style={{ gap: 0 }}>
          <button 
            onClick={handleDownloadPDF} 
            className="printbtn" 
            style={{ fontSize: '10px', display: 'flex', alignItems: 'center', marginRight: 5, gap: 3 }}
            tabIndex={0}
          >
            <img src={downloadIcon} alt="Download" className="button-icon2" />
            Print PDF
          </button>

          {/* Filter Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              className="filterbtn"
              style={{ fontSize: '11px', display: 'flex', alignItems: 'center', marginRight: 5, gap: 3 }}
              tabIndex={0}
              onClick={e => {
                const dropdown = document.getElementById('filter-dropdown-panel');
                if (dropdown) dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
              }}
            >
              <img src={require('../icons/sort.png')} style={{ width: 12, height: 12, marginLeft: 4 }} />
              Filter
            </button>
            
            <div id="filter-dropdown-panel" style={{ 
              display: 'none', 
              background: '#fff', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', 
              borderRadius: 6, 
              padding: '12px 16px', 
              minWidth: 200, 
              zIndex: 10, 
              position: 'absolute', 
              marginTop: 38 
            }}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block', textAlign: "left" }}>
                  Sort By Date
                </label>
                <select
                  className="filter-dropdown"
                  onChange={e => setSortOrder(e.target.value)}
                  value={sortOrder}
                  style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
                >
                  <option value="latest">Latest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block', textAlign: "left" }}>
                  Sales Agent
                </label>
                <select
                  className="filter-dropdown"
                  onChange={e => setFilterAgent(e.target.value)}
                  value={filterAgent}
                  style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
                >
                  <option value="">All Agents</option>
                  {[...new Set(allocations.map(a => a.assignedAgent))].map((agent, idx) => (
                    <option key={idx} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, display: 'block', textAlign: "left" }}>
                  Allocated By
                </label>
                <select
                  className="filter-dropdown"
                  onChange={e => setFilterManager(e.target.value)}
                  value={filterManager}
                  style={{ width: '100%', fontSize: 12, padding: '6px 10px', borderRadius: 4 }}
                >
                  <option value="">All Managers</option>
                  {[...new Set(allocations.map(a => a.allocatedBy))].map((manager, idx) => (
                    <option key={idx} value={manager}>{manager}</option>
                  ))}
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
                onKeyPress={handleKeyPress}
              />
              <img 
                src={searchIcon} 
                alt="Search" 
                className="search-icon" 
                onClick={handleSearchClick}
                style={{ cursor: 'pointer' }}
              />
            </div>
          </div>

          <button className="add-btn" onClick={() => setIsCreateModalOpen(true)}>
            <img src={addIcon} alt="Add" className="button-icon" />
            Allocate Unit
          </button>
        </div>

        {/* Allocation Table */}
        <div style={{ padding: '0 20px 20px' }}>
          <table className="user-table">
            <thead>
              <tr>
                <th>UNIT NAME</th>
                <th>CONDUCTION NUMBER</th>
                <th>BODY COLOR</th>
                <th>VARIATION</th>
                <th>ASSIGNED TO</th>
                <th>ALLOCATED BY</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {currentAllocations.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                    No allocations found
                  </td>
                </tr>
              ) : (
                currentAllocations.map((allocation) => (
                  <tr key={allocation._id}>
                    <td>{allocation.unitName}</td>
                    <td>{allocation.unitId}</td>
                    <td>{allocation.bodyColor}</td>
                    <td>{allocation.variation}</td>
                    <td>{allocation.assignedAgent}</td>
                    <td>{allocation.allocatedBy}</td>
                    <td>{getAgeString(allocation.allocationDate || allocation.createdAt)}</td>
                    <td>
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDelete(allocation._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 6, 
                  border: '1px solid #ddd',
                  background: currentPage === 1 ? '#f5f5f5' : '#fff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontWeight: 500 }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: 6, 
                  border: '1px solid #ddd',
                  background: currentPage === totalPages ? '#f5f5f5' : '#fff',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Allocate Unit Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Allocate Unit</h2>
            
            <label className="modal-label">
              Unit <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              className="modal-input"
              value={newAllocation.unitId}
              onChange={handleUnitSelect}
              required
            >
              <option value="">Select Unit</option>
              {stock.map((item) => (
                <option key={item._id} value={item.unitId}>
                  {item.unitName} - {item.unitId} ({item.bodyColor}, {item.variation})
                </option>
              ))}
            </select>

            <label className="modal-label">
              Assign To <span style={{ color: 'red' }}>*</span>
            </label>
            <select
              className="modal-input"
              value={newAllocation.assignedAgent}
              onChange={(e) => setNewAllocation({ ...newAllocation, assignedAgent: e.target.value })}
              required
            >
              <option value="">Select Sales Agent</option>
              {salesAgents.map((agent) => (
                <option key={agent._id} value={agent.name}>
                  {agent.name} - {agent.role}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="modal-btn allocate-btn" onClick={handleCreate}>
                Allocate
              </button>
              <button className="modal-btn cancel-btn" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitAllocation;
