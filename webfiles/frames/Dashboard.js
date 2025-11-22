import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import '../css/Dashboard.css';
import logo from '../icons/I-track logo.png'; 
import Sidebar from './Sidebar'; 
import { getCurrentUser } from '../getCurrentUser';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stockCount, setStockCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [stockData, setStockData] = useState([]);
  const [allocation, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);



  // Enhanced color palette for the pie chart
  const CHART_COLORS = [
    '#e50914', // Red (customized from blue)
    '#005d9bff', // 
    '#231f20', // 
    '#234a5cff', 
    '#709cb7', // 
    '#00aaffff', 
   
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / stockData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
      
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '12px 16px',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          <p style={{ margin: 0, color: '#374151', fontWeight: '600' }}>{data.name}</p>
          <p style={{ margin: '4px 0 0 0', color: '#6B7280' }}>
            Quantity: <span style={{ color: '#111827', fontWeight: '600' }}>{data.value}</span>
          </p>
          {/* <p style={{ margin: '2px 0 0 0', color: '#6B7280' }}>
            Percentage: <span style={{ color: '#111827', fontWeight: '600' }}>{percentage}%</span>
          </p> */}
        </div>
      );
    }
    return null;
  };

  // Custom label function
  // Remove percentage label from pie chart
  const renderCustomLabel = () => null;

  useEffect(() => {
  // axios.get("http://localhost:8000/api/getStock")
  axios.get("https://itrack-web-backend.onrender.com/api/getStock")
      .then((response) => {
        setStockCount(response.data.length);
        // Aggregate quantity by unitName
        const unitMap = {};
        response.data.forEach(item => {
          if (item.unitName) {
            unitMap[item.unitName] = (unitMap[item.unitName] || 0) + (item.quantity || 1);
          }
        });
        const pieData = Object.entries(unitMap).map(([name, value]) => ({ name, value }));
        setStockData(pieData);
      })
      .catch((error) => console.log(error));
  }, []);

  useEffect(() => {
    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user && user.email) {
  // axios.get("http://localhost:8000/api/getUsers")
  axios.get("https://itrack-web-backend.onrender.com/api/getUsers")
          .then(res => {
            const found = res.data.find(u => u.email === user.email);
            setFullUser(found);
          })
          .catch(() => setFullUser(null));
      }
    });
  }, []);

  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
  // axios.get("http://localhost:8000/api/getCompletedRequests", { withCredentials: true })
  axios.get("https://itrack-web-backend.onrender.com/api/getCompletedRequests", { withCredentials: true })
      .then((res) => {
        setCompletedCount(res.data.length);
      })
      .catch((err) => console.log(err));
  }, []);

const [ongoingCount, setOngoingCount] = useState(0);
const [inTransitCount, setInTransitCount] = useState(0);

   const cards = [
    { title: "Total Stocks", value: stockCount, route: "/inventory" },
    { title: "Finished Vehicle Preparation", value: completedCount, dark: true, route: "/reports" },
    { title: "Ongoing Shipment", value: inTransitCount, route: "/shipments" },
    { title: "Ongoing Vehicle Preparation", value: ongoingCount, route: "/servicerequest" },
  ];

const [recentPreparations, setRecentPreparations] = useState([]);

useEffect(() => {
  // Step 1: Fetch all requests
  // axios.get("http://localhost:8000/api/getRequest", { withCredentials: true })
  axios.get("https://itrack-web-backend.onrender.com/api/getRequest", { withCredentials: true })
    .then(async (res) => {
      console.log('All service requests:', res.data); // Debug log
      // Step 2: Filter and sort for the 5 most recent 'In Progress' requests
      const inProgress = res.data.filter(req => req.status === 'In Progress');
      console.log('Filtered in progress:', inProgress); // Debug log
      const sortedInProgress = inProgress.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated);
        const dateB = new Date(b.createdAt || b.dateCreated);
        return dateB - dateA;
      });
      const top5 = sortedInProgress.slice(0, 5);
      setOngoingCount(inProgress.length);
      // Step 3: Fetch each request one by one by ID
      const fetched = [];
      for (let req of top5) {
        try {
          // const resp = await axios.get(`http://localhost:8000/api/getRequest/${req._id}`, { withCredentials: true });
          const resp = await axios.get(`https://itrack-web-backend.onrender.com/api/getRequest/${req._id}`, { withCredentials: true });
          if (resp.data) fetched.push(resp.data);
        } catch (e) {
          console.log('Error fetching by ID:', req._id, e); // Debug log
        }
      }
      console.log('Fetched recentPreparations:', fetched); // Debug log
      setRecentPreparations(fetched);
    })
    .catch((err) => console.log(err));
}, []);

useEffect(() => {
  // axios.get("http://localhost:8000/api/getAllocation", { withCredentials: true })
  axios.get("https://itrack-web-backend.onrender.com/api/getAllocation", { withCredentials: true })
    .then((res) => {
      const inTransit = res.data.filter(item => item.status === 'In Transit');
      setInTransitCount(inTransit.length);
    })
    .catch((err) => console.log(err));
}, []);


  // Fetch allocations
  useEffect(() => {
    const fetchAllocations = async () => {
      try {
        const res = await axios.get("https://itrack-web-backend.onrender.com/api/getAllocation"); 
        setAllocations(res.data);
      } catch (error) {
        console.error("Error fetching allocations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllocations();
  }, []);

  return (
    <div className="app">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="main">
        <header className="header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <h3 className="header-title1">Dashboard</h3>
          {fullUser && fullUser.name && (
            <div className="loggedinuser" style={{ marginLeft: 'auto', fontWeight: 500, fontSize: 15
             }}>
              Welcome, {fullUser.name}
            </div>
          )}
        </header>
        <div className="dashboard-content">
          <div className="cards">
            {cards.map(({ title, value, dark, route }) => (
              <div 
                key={title} 
                className="card-link"
                onClick={() => {
                  if (route) {
                    window.location.href = route;
                  }
                }}
              >
                <div className={`card ${dark ? "dark" : ""}`}>
                  <h3 className="card-title">{title}</h3>
                  <p className="card-number">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-sections" style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ 
            width: '500px', 
            minWidth: '320px',
            padding: '24px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            marginBottom: '2px'
          }}>
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '2px',
             
              paddingBottom: '1px'
            }}>
              <h5 style={{ 
                margin: 0, 
                fontSize: '15px',
                fontWeight: '700',
                color: '#111827',
                letterSpacing: '-0.025em'
              }}>
                Stocks
              </h5>
              <p style={{ 
                margin: '8px 0 0 0', 
                fontSize: '14px',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {/* Total Items: {stockData.reduce((sum, item) => sum + item.value, 0)} */}
              </p>
            </div>
            
            {stockData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={stockData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={30}
                        paddingAngle={2}
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {stockData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div style={{ 
                  marginLeft: '40px',
                  marginRight: '20px',
                  minWidth: '200px'
                }}>
                  <div style={{
                  
                    paddingBottom: '8px',
                    marginBottom: '40px',
                  
                  }}>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom:'40px',
                   
                    }}>
                      
                      
                    </span>
                  </div>
                  {stockData.map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px',
                      fontSize: '14px'
                    }}>
                      
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                        marginRight: '12px'
                      }}></div>
                      <span style={{
                        flex: 1,
                        color: '#374151',
                        fontWeight: '500'
                      }}>
                        {item.name}
                      </span>
                    
                      <span style={{
                        color: '#111827',
                        fontWeight: '600'
                      }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                height: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                No stock data available
              </div>
            )}
          </div>
          
          <div className="recent-section" style={{ flex: 1, minWidth: '320px', maxWidth: '600px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '24px', marginBottom: '10px' }}>
            <h4 className="section-title">Recent In Progress Vehicle Preparation</h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Conduction Number</th>
                    <th>Service</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPreparations.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: '#888' }}>No recent in progress vehicle preparations found.</td>
                    </tr>
                  ) : (
                    recentPreparations.map((prep, index) => (
                      <tr key={index}>
                        <td className="vehicle-reg">{prep.vehicleRegNo || prep.unitId || '-'}</td>
                        <td className="service-cell">
                          {Array.isArray(prep.service)
                            ? prep.service.length > 2
                              ? `${prep.service.slice(0, 2).join(', ')}...`
                              : prep.service.join(', ')
                            : (prep.service || '-')}
                        </td>
                        <td>
                          <span className={`status-badge ${prep.status ? prep.status.toLowerCase().replace(' ', '-') : ''}`}>
                            {prep.status || 'In Progress'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

 {/* Pending & In Transit Shipments Table */}
<div className="table-container" style={{ marginTop: "10px" }}>
  <h4 className="section-title">Recent Assigned Shipments</h4>
  <table>
    <thead>
      <tr>
       
        <th>Unit Name</th>
        
    
        <th>Variation</th>
        <th>Assigned Driver</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {allocation.filter(item => item.status === "Pending" || item.status === "In Transit").length === 0 ? (
        <tr>
          <td colSpan="7" style={{ textAlign: "center", color: "#888" }}>
            No pending or in transit shipments found.
          </td>
        </tr>
      ) : (
        allocation
          .filter(item => item.status === "Pending" || item.status === "In Transit")
          .sort((a, b) => new Date(b.date) - new Date(a.date)) // ✅ newest first
          .slice(0, 3) // ✅ only top 3
          .map(item => (
            <tr key={item._id}>
              
              <td>{item.unitName}</td>
             
    
              <td>{item.variation}</td>
              <td>{item.assignedDriver}</td>
              <td>
                <span className={`status-badge ${item.status.toLowerCase().replace(" ", "-")}`}>
                  {item.status}
                </span>
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
    </div>
  );
};

export default Dashboard;