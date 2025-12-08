import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import dashboardIcon from '../icons/dashboard.png';
import reportsIcon from '../icons/reports.png';
import stocksIcon from '../icons/stocks.png';
import requestIcon from '../icons/request.png';
import shipmentsIcon from '../icons/shipments.png';
import usersIcon from '../icons/users.png';
import signOutIcon from '../icons/signout.png'; 
import driverIcon from '../icons/driverallocation.png';
import axios from 'axios';
import logo from '../icons/itrackwhite.png'; 
import { getCurrentUser } from '../getCurrentUser';
import testDriveIcon from '../icons/testdrive.png'; // <--
import allocationIcon from '../icons/users.png'; // Using users icon for agent allocation
import releaseIcon from '../icons/release.png';

import '../css/Sidebar.css';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    getCurrentUser().then(user => {
      setUserRole(user ? user.role : null);
    });
  }, []);

  const menuItems = [
  { name: "Dashboard", icon: dashboardIcon, path: "/dashboard" },
  { name: "Vehicle Stocks", icon: stocksIcon, path: "/inventory" },
  { name: "Vehicle Preperation", icon: requestIcon, path: "/servicerequest" },
  { name: "Driver Allocation", icon: driverIcon, path: "/driverallocation" },
  { name: "Release", icon: releaseIcon, path: "/release" },
  { name: "Test Drive", icon: testDriveIcon, path: "/testdrive" },
  { name: "User Management", icon: usersIcon, path: "/users" },
  { name: "Reports", icon: reportsIcon, path: "/reports" },
];

  // Filter menu for Sales Agent, Manager, and Supervisor
  const filteredMenu = ['Sales Agent', 'Manager', 'Supervisor'].includes(userRole)
    ? menuItems.filter(item => [
        'Dashboard',
        'Reports',
        'Vehicle Stocks',
        'Vehicle Preperation',
        'Driver Allocation',
        'Release',
        'Test Drive',
      ].includes(item.name))
    : menuItems;

  const handleSignOut = async () => {
  const confirmLogout = window.confirm("Are you sure you want to log out?");
  if (!confirmLogout) return;

  try {
    await axios.post('https://itrack-web-backend.onrender.com/api/logout', {}, { withCredentials: true });
    navigate("/");
  } catch (err) {
    console.error("Logout failed:", err);
  }
};

  
  

  return (
    <div className="app">
      <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Add logo and title to the sidebar */}
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <h3 className="sidebar-title">I-TRACK</h3>
        </div>
        <ul>
          {(userRole ? filteredMenu : menuItems).map(({ name, icon, path }) => (
            <li key={name}>
              <Link to={path} className="menu-link">
                <img src={icon} alt={`${name} icon`} className="menu-icon" />
                <span>{name}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Sign Out button with icon at the bottom */}
        <div style={{ flexGrow: 1 }} />
        <div className="sign-out-container">
          <button className="sign-out-button" style={{ marginBottom: '30px' }} onClick={handleSignOut}>
            <img src={signOutIcon} alt="Sign Out" className="signouticon"  />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
