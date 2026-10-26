const PROPERTY_TYPES = [
  'apartment',
  'house',
  'villa',
  'pg',
  'studio',
  'commercial',
  'plot'
];

const PROPERTY_PURPOSES = ['rent', 'sale'];

const PROPERTY_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'unpublished',
  'rented',
  'sold',
  'archived'
];

const FURNISHING_TYPES = ['fully_furnished', 'semi_furnished', 'unfurnished'];

const AREA_UNITS = ['sqft', 'sqm'];

const ALLOWED_AMENITIES = [
  'parking',
  'gym',
  'swimming_pool',
  'elevator',
  'security',
  'power_backup',
  'wifi',
  'air_conditioning',
  'balcony',
  'garden',
  'clubhouse',
  'cctv',
  'water_supply',
  'gated_community'
];

module.exports = {
  PROPERTY_TYPES,
  PROPERTY_PURPOSES,
  PROPERTY_STATUSES,
  FURNISHING_TYPES,
  AREA_UNITS,
  ALLOWED_AMENITIES
};
