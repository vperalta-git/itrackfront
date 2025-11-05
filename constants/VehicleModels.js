// I-Track Vehicle Models and Variations Database
// Structured data for Isuzu vehicle inventory management

export const VEHICLE_MODELS = {
  "Isuzu D-Max": [
    "Cab and Chassis",
    "CC Utility Van Dual AC",
    "4x2 LT MT",
    "4x4 LT MT",
    "4x2 LS-A MT",
    "4x2 LS-A MT Plus",
    "4x2 LS-A AT",
    "4x2 LS-A AT Plus",
    "4x4 LS-A MT",
    "4x4 LS-A MT Plus",
    "4x2 LS-E AT",
    "4x4 LS-E AT",
    "4x4 Single Cab MT"
  ],
  "Isuzu MU-X": [
    "1.9L MU-X 4x2 LS AT",
    "3.0L MU-X 4x2 LS-A AT",
    "3.0L MU-X 4x2 LS-E AT",
    "3.0L MU-X 4x4 LS-E AT"
  ],
  "Isuzu Traviz": [
    "SWB 2.5L 4W 9FT Cab & Chassis",
    "SWB 2.5L 4W 9FT Utility Van Dual AC",
    "LWB 2.5L 4W 10FT Cab & Chassis",
    "LWB 2.5L 4W 10FT Utility Van Dual AC",
    "LWB 2.5L 4W 10FT Aluminum Van",
    "LWB 2.5L 4W 10FT Aluminum Van w/ Single AC",
    "LWB 2.5L 4W 10FT Dropside Body",
    "LWB 2.5L 4W 10FT Dropside Body w/ Single AC"
  ],
  "Isuzu QLR Series": [
    "QLR77 E Tilt 3.0L 4W 10ft 60A Cab & Chassis",
    "QLR77 E Tilt Utility Van w/o AC",
    "QLR77 E Non-Tilt 3.0L 4W 10ft 60A Cab & Chassis",
    "QLR77 E Non-Tilt Utility Van w/o AC",
    "QLR77 E Non-Tilt Utility Van Dual AC"
  ],
  "Isuzu NLR Series": [
    "NLR77 H Tilt 3.0L 4W 14ft 60A",
    "NLR77 H Jeepney Chassis (135A)",
    "NLR85 Tilt 3.0L 4W 10ft 90A",
    "NLR85E Smoother"
  ],
  "Isuzu NMR Series": [
    "NMR85H Smoother",
    "NMR85 H Tilt 3.0L 6W 14ft 80A Non-AC"
  ],
  "Isuzu NPR Series": [
    "NPR85 Tilt 3.0L 6W 16ft 90A",
    "NPR85 Cabless for Armored"
  ],
  "Isuzu NPS Series": [
    "NPS75 H 3.0L 6W 16ft 90A"
  ],
  "Isuzu NQR Series": [
    "NQR75L Smoother",
    "NQR75 Tilt 5.2L 6W 18ft 90A"
  ],
  "Isuzu FRR Series": [
    "FRR90M 6W 20ft 5.2L",
    "FRR90M Smoother"
  ],
  "Isuzu FTR Series": [
    "FTR90M 6W 19ft 5.2L"
  ],
  "Isuzu FVR Series": [
    "FVR34Q Smoother",
    "FVR 34Q 6W 24ft 7.8L w/ ABS"
  ],
  "Isuzu FTS Series": [
    "FTS34 J",
    "FTS34L"
  ],
  "Isuzu FVM Series": [
    "FVM34T 10W 26ft 7.8L w/ ABS",
    "FVM34W 10W 32ft 7.8L w/ ABS"
  ],
  "Isuzu FXM Series": [
    "FXM60W"
  ],
  "Isuzu GXZ Series": [
    "GXZ60N"
  ],
  "Isuzu EXR Series": [
    "EXR77H 380PS 6W Tractor Head"
  ]
};

// Helper functions for vehicle data management
export const getUnitNames = () => {
  return Object.keys(VEHICLE_MODELS);
};

export const getVariationsForUnit = (unitName) => {
  return VEHICLE_MODELS[unitName] || [];
};

export const isValidUnitVariationPair = (unitName, variation) => {
  const validVariations = getVariationsForUnit(unitName);
  return validVariations.includes(variation);
};

export const getAllVariations = () => {
  return Object.values(VEHICLE_MODELS).flat();
};

export const findUnitByVariation = (variation) => {
  for (const [unitName, variations] of Object.entries(VEHICLE_MODELS)) {
    if (variations.includes(variation)) {
      return unitName;
    }
  }
  return null;
};

// Vehicle status options
export const VEHICLE_STATUS_OPTIONS = [
  'Available',
  'Sold', 
  'Reserved',
  'In Transit',
  'Service',
  'Damaged',
  'Test Drive'
];

// Body color options
export const BODY_COLOR_OPTIONS = [
  'White',
  'Black',
  'Silver',
  'Red',
  'Blue',
  'Gray',
  'Green',
  'Yellow',
  'Orange',
  'Brown',
  'Other'
];

export default VEHICLE_MODELS;