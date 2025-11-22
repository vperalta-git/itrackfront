const os = require('os');

// Get local IP addresses for network flexibility
function getLocalIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push(interface.address);
      }
    }
  }
  
  return addresses.length > 0 ? addresses : ['localhost'];
}

// Get primary IP address (first non-internal IPv4)
function getPrimaryIPAddress() {
  const addresses = getLocalIPAddresses();
  return addresses[0] || 'localhost';
}

// Health check endpoint
exports.healthCheck = (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json(healthStatus);
};

// Test endpoint
exports.testEndpoint = (req, res) => {
  res.json({ 
    message: 'I-Track Backend API is working!',
    timestamp: new Date(),
    version: '5.0.0'
  });
};

// Root endpoint
exports.rootEndpoint = (req, res) => {
  const primaryIP = getPrimaryIPAddress();
  const networkIPs = getLocalIPAddresses();
  
  res.json({
    message: '🚀 I-Track Mobile Backend Server',
    version: '5.0.0',
    status: 'Running',
    timestamp: new Date(),
    network: {
      primary: `http://${primaryIP}:${process.env.PORT || 5000}`,
      localhost: `http://localhost:${process.env.PORT || 5000}`,
      allIPs: networkIPs.map(ip => `http://${ip}:${process.env.PORT || 5000}`)
    },
    endpoints: {
      health: '/health',
      test: '/test',
      login: '/login',
      users: '/getUsers',
      admin: {
        users: '/admin/users',
        createDriver: '/admin/create-driver',
        assignVehicle: '/admin/assign-vehicle'
      },
      inventory: {
        get: '/getStock',
        create: '/createStock'
      },
      allocations: {
        get: '/getAllocation',
        create: '/createAllocation'
      },
      requests: {
        get: '/getRequest',
        create: '/createRequest',
        completed: '/getCompletedRequests'
      },
      dispatch: {
        assignments: '/api/dispatch/assignments'
      },
      dashboard: '/dashboard/stats'
    }
  });
};

// API configuration endpoint
exports.getApiConfig = (req, res) => {
  const primaryIP = getPrimaryIPAddress();
  
  res.json({
    baseURL: `http://${primaryIP}:${process.env.PORT || 5000}`,
    version: '5.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: true,
      userManagement: true,
      inventoryTracking: true,
      vehicleAllocation: true,
      serviceRequests: true,
      dispatchManagement: true,
      mapsIntegration: false, // Disable maps for now
      emailNotifications: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
    },
    endpoints: {
      auth: '/login',
      users: '/getUsers',
      inventory: '/getStock',
      allocations: '/getAllocation',
      requests: '/getRequest',
      dashboard: '/dashboard/stats'
    }
  });
};

// Mobile app configuration
exports.getMobileConfig = (req, res) => {
  const primaryIP = getPrimaryIPAddress();
  const networkIPs = getLocalIPAddresses();
  
  res.json({
    apiBaseUrl: `http://${primaryIP}:${process.env.PORT || 5000}`,
    alternativeUrls: networkIPs.map(ip => `http://${ip}:${process.env.PORT || 5000}`),
    appVersion: '5.0.0',
    apiVersion: '1.0',
    features: {
      offlineMode: false,
      pushNotifications: false,
      mapIntegration: false,
      cameraUpload: true
    },
    settings: {
      requestTimeout: 30000,
      maxRetries: 3,
      cacheExpiration: 300000
    }
  });
};