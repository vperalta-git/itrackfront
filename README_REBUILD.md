# I-Track Mobile App - Rebuilt v48.0

**Clean Architecture | Role-Based Navigation | Production Ready**

## 📱 Overview

I-Track is a vehicle tracking and management system for Isuzu Pasig. This is a complete rebuild focusing on clean architecture, maintainability, and core functionality.

## 🏗️ Project Structure

```
itrack/
├── src/
│   ├── config/           # Configuration files
│   │   └── api.js       # API endpoints and base URL
│   ├── constants/        # App constants
│   │   ├── roles.js     # User roles and permissions
│   │   └── theme.js     # Colors, spacing, fonts
│   ├── context/          # React Context
│   │   └── AuthContext.js  # Authentication state management
│   ├── navigation/       # Navigation setup
│   │   └── AppNavigator.js  # Main navigation container
│   ├── screens/          # All screen components
│   │   ├── auth/        # Authentication screens
│   │   │   └── LoginScreen.js
│   │   ├── dashboard/   # Role-specific dashboards
│   │   │   ├── AdminDashboard.js
│   │   │   ├── DriverDashboard.js
│   │   │   ├── SalesAgentDashboard.js
│   │   │   └── DispatchDashboard.js
│   │   └── common/      # Shared screens
│   │       └── PlaceholderScreen.js
│   └── utils/            # Utility functions
│       └── api.js       # API fetch utilities
├── App.js               # Main app entry point
└── package.json         # Dependencies
```

## 🎯 User Roles

1. **Admin** - Full system access
2. **Manager** - User & inventory management
3. **Sales Agent** - View assigned vehicles
4. **Driver** - View assignments, GPS tracking
5. **Dispatch** - Vehicle preparation tasks
6. **Supervisor** - Oversight and reporting

## 🔑 Key Features

### ✅ Implemented

- Email-based authentication
- Role-based navigation and dashboards
- Forgot password functionality
- Clean, modern UI with Isuzu branding
- Session management with AsyncStorage
- API integration with backend

### 🚧 To Be Implemented

- User management screens
- Inventory management
- Driver allocation
- GPS tracking
- Dispatch checklist
- Real-time updates
- Reports and analytics

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

```bash
cd itrack
npm install
```

### Running the App

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🔗 Backend Connection

The app connects to the itrack-backend server:

- **Development**: `http://192.168.254.147:5000`
- **Production**: `https://itrack-backend-1.onrender.com`

Update the API base URL in `src/config/api.js` if needed.

## 📝 Test Credentials

### Admin

- Email: `admin@isuzupasig.com`
- Username: `isuzupasigadmin`
- Password: `Isuzu_Pasig1`

### Other Users

Contact your system administrator for test accounts.

## 🎨 Design System

### Colors

- **Primary**: `#DC2626` (Isuzu Red)
- **Secondary**: `#1E40AF` (Blue)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Orange)
- **Error**: `#EF4444` (Red)

### Typography

- Small: 12px
- Medium: 16px
- Large: 20px
- XL: 24px

## 📦 Dependencies

Key packages:

- `react-native` - Core framework
- `expo` - Development platform
- `@react-navigation/*` - Navigation
- `@react-native-async-storage/async-storage` - Local storage
- `axios` - HTTP client
- `react-native-maps` - Map integration
- `expo-location` - GPS tracking

## 🛠️ Development Notes

### Adding New Screens

1. Create screen component in `src/screens/`
2. Add route in `src/navigation/AppNavigator.js`
3. Add navigation link in dashboard

### API Calls

Use the utilities in `src/utils/api.js`:

```javascript
import { apiGet, apiPost } from "../utils/api";

// GET request
const data = await apiGet("/getUsers");

// POST request
const result = await apiPost("/createUser", { username, password });
```

### Authentication

Use the AuthContext:

```javascript
import { useAuth } from "../context/AuthContext";

const { user, login, logout } = useAuth();
```

## 📄 License

© 2025 Isuzu Pasig. All rights reserved.

## 🤝 Support

For technical support, contact the development team.

---

**Version**: 48.0  
**Last Updated**: November 21, 2025  
**Status**: In Development
