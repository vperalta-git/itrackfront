import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import '../css/ServiceRequest.css';
import searchIcon from '../icons/search.png';
import addIcon from '../icons/add.png'; 
import hideIcon from '../icons/hide.png';
import showIcon from '../icons/show.png';
import { getCurrentUser } from '../getCurrentUser';
import AuditTrailTab from './AuditTrailTab';

const ManageUser = () => {
  const [user, setUser] = useState([]);
  const [newUser, setNewUser] = useState({
    name: '',
    phoneno: '',
    email: '',
    password: '',
    role: '' // default role
  });
  
  const [editUser, setEditUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  useEffect(() => {
    getCurrentUser().then(user => {
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getUsers")
      .then((response) => {
        setUser(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  const handleDeleteUser = (id) => {
    axios.delete(`https://itrack-web-backend.onrender.com/api/deleteUser/${id}`)
      .then(() => fetchUsers())
      .catch((error) => console.log(error));
  };

  const handleCreateUser = () => {
  if (!newUser.name || !newUser.phoneno || !newUser.email || !newUser.password || !newUser.role) {
    alert("All fields are required!");
    return;
  }

  // Password validation
  if (newUser.password.length < 8) {
    alert("Password must be at least 8 characters long.");
    return;
  }

  // Check for duplicate email or phone number
  const duplicateEmail = user.find(u => u.email === newUser.email);
  const duplicatePhone = user.find(u => u.phoneno === newUser.phoneno);

  if (duplicateEmail) {
    alert("Email already exists. Please use a different email.");
    return;
  }

  if (duplicatePhone) {
    alert("Phone number already exists. Please use a different phone number.");
    return;
  }

  axios.post("https://itrack-web-backend.onrender.com/api/createUser", newUser)
    .then(() => {
      fetchUsers();
      setNewUser({ name: '', phoneno: '', email: '', password: '', role: '' });
      setIsCreateModalOpen(false); 
    })
    .catch((error) => {
      alert("Failed to create user. Please check your input and try again.");
      console.log(error);
    });
};


  
  const handleUpdateUser = (id) => {
  if (!editUser.name || !editUser.phoneno || !editUser.email || !editUser.password || !editUser.role) {
    alert("All fields are required!");
    return;
  }

  // Password validation
  if (editUser.password.length < 8) {
    alert("Password must be at least 8 characters long.");
    return;
  }

  // Check for duplicates excluding the current user
  const duplicateEmail = user.find(u => u.email === editUser.email && u._id !== id);
  const duplicatePhone = user.find(u => u.phoneno === editUser.phoneno && u._id !== id);

  if (duplicateEmail) {
    alert("Email already exists. Please use a different email.");
    return;
  }

  if (duplicatePhone) {
    alert("Phone number already exists. Please use a different phone number.");
    return;
  }

  axios.put(`https://itrack-web-backend.onrender.com/api/updateUser/${id}`, editUser)
    .then(() => {
      fetchUsers();
      setEditUser(null);
    })
    .catch((error) => console.log(error));
};



   const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
  
  const filteredStock = user.filter((req) => {
  const searchValue = searchTerm.toLowerCase(); // or searchTerm if you're using that
  return (
    String(req.name).toLowerCase().includes(searchValue) ||
    String(req.phoneno).toLowerCase().includes(searchValue) ||
    String(req.email).toLowerCase().includes(searchValue) ||
    String(req.password).toLowerCase().includes(searchValue) ||
    String(req.role).toLowerCase().includes(searchValue)
  );
});

const [currentPage, setCurrentPage] = useState(1);
const usersPerPage = 6; // change this number if needed

const indexOfLastUser = currentPage * usersPerPage;
const indexOfFirstUser = indexOfLastUser - usersPerPage;
const currentUsers = filteredStock.slice(indexOfFirstUser, indexOfLastUser);

const totalPages = Math.ceil(filteredStock.length / usersPerPage);


  return (
    <>
      <div className="app">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="main">
          <header className="header">
            <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <h3 className="header-title1">User Management</h3>
            {fullUser && fullUser.name && (
              <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15 }}>
                Welcome, {fullUser.name}
              </div>
            )}
          </header>
          
          {activeTab === 'users' && (
            <div className="content">
              <div className="user-management-header" >
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
                  Add User
                </button>
              </div>
              {isCreateModalOpen && (
                <div className="modal-overlay">
                  <div className="modal">
                    <p className='modaltitle'>Create New User</p>
                      <div className='modalline'> 
                    <div className="modal-content">
                      <div className="modal-form">
                        <div className="modal-form-group">
                          <label>Name</label>
                          <input
                            type="text"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                          />
                        </div>
                        <div className="modal-form-group">
                          <label>Phone No.</label>
                          <input
                            type="text"
                            value={newUser.phoneno}
                            onChange={(e) => setNewUser({ ...newUser, phoneno: e.target.value })}
                          />
                        </div>
                        <div className="modal-form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          />
                        </div>
                        <div className="modal-form-group">
                          <label>Password</label>
                          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <input
                              type={showPassword ? "text" : "password"}
                              value={newUser.password}
                              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                              style={{ flex: 1 }}
                            />
                            <img
                              src={showPassword ? hideIcon : showIcon}
                              alt={showPassword ? 'Hide' : 'Show'}
                              onClick={() => setShowPassword(!showPassword)}
                              style={{ position: 'absolute', right: '10px', cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </div>
                        </div>
                        <div className="modal-form-group">
                          <label>Role</label>
                          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="Sales Agent">Sales Agent</option>
                            <option value="Driver">Driver</option>
                            <option value="Manager">Manager</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Dispatch">Dispatch</option>
                          </select>
                        </div>
                      </div>
                      <div className="modal-buttons">
                        <button className="create-btn1" onClick={handleCreateUser}>Create</button>
                        <button className="cancel-btn1" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              )}
              {editUser && (
                <div className="modal-overlay">
                  <div className="modal">
                    <p className='modaltitle'>Edit User</p>
                     <div className='modalline'> 
                    <div className="modal-content">
                      <div className="modal-form">
                        <div className="modal-form-group">
                          <label>Name</label>
                          <input
                            type="text"
                            value={editUser.name}
                            onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                          />
                        </div>
                        <div className="modal-form-group">
                          <label>Phone No.</label>
                          <input
                            type="text"
                            value={editUser.phoneno}
                            onChange={(e) => setEditUser({ ...editUser, phoneno: e.target.value })}
                          />
                        </div>
                        <div className="modal-form-group">
                          <label>Email</label>
                          <input
                            type="email"
                            value={editUser.email}
                            onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                          />
                        </div>
                        <div className="modal-form-group">
                          <label>Password</label>
                          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                            <input
                              type={showEditPassword ? "text" : "password"}
                              value={editUser.password}
                              onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                              style={{ flex: 1 }}
                            />
                            <img
                              src={showEditPassword ? hideIcon : showIcon}
                              alt={showEditPassword ? 'Hide' : 'Show'}
                              onClick={() => setShowEditPassword(!showEditPassword)}
                              style={{ position: 'absolute', right: '10px', cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                          </div>
                        </div>
                        <div className="modal-form-group">
                          <label>Role</label>
                          <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                            <option value="">Select Role</option>
                            <option value="Admin">Admin</option>
                            <option value="Sales Agent">Sales Agent</option>
                            <option value="Driver">Driver</option>
                            <option value="Manager">Manager</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Dispatch">Dispatch</option>
                          </select>
                        </div>
                      </div>
                      <div className="modal-buttons">
                        <button className="create-btn1" onClick={() => { handleUpdateUser(editUser._id); setEditUser(null); }}>Save</button>
                        <button className="cancel-btn1" onClick={() => setEditUser(null)}>Cancel</button>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Phone No.</th>
                      <th>Email</th>
                      <th>Password</th>
                      <th>Role</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="header-spacer-row"><td></td></tr>
                    {currentUsers.map((userItem) => (
                      <tr key={userItem._id}>
                        <td>{userItem.name}</td>
                        <td>{userItem.phoneno}</td>
                        <td>{userItem.email}</td>
                        <td>{'********'}</td>
                        <td>{userItem.role}</td>
                        <td>
                          <button className="action-btn" onClick={() => setEditUser(userItem)}>Edit</button>{' '}
                          <button className="action-btn" onClick={() => handleDeleteUser(userItem._id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="pagination-wrapper">
                    <div className="pagination-info">
                      Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredStock.length)} of {filteredStock.length} results
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
                          className={"pagination-btn" + (currentPage === i + 1 ? " active-page" : "")}
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
              <button onClick={() => setIsAuditModalOpen(true)} style={{ color:'black',fontSize:'10px', margin: '16px 0', padding: '6px 12px', background: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                Audit Trail
              </button>
              {isAuditModalOpen && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: '#fff',
                    borderRadius: 8,
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    padding: 24,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
                    position: 'relative'
                  }}>
                    <button onClick={() => setIsAuditModalOpen(false)} style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 24,
                      cursor: 'pointer',
                      color: '#888'
                    }}>&times;</button>
                    <AuditTrailTab />
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'audit' && (
            <div className="content">
              <AuditTrailTab />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ManageUser;
