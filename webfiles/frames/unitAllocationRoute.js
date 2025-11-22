// unitAllocationRoute.js
// Import this in your main React Router configuration

import UnitAllocation from './frames/UnitAllocation';

// Add this route to your React Router:
// <Route path="/unitallocation" element={<UnitAllocation />} />

export const unitAllocationRoute = {
  path: "/unitallocation",
  component: UnitAllocation,
  name: "Unit Allocation",
  requiresAuth: true,
  allowedRoles: ['Admin', 'Manager', 'Sales Agent', 'Supervisor']
};

export default unitAllocationRoute;
