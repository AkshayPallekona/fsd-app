const ROLES = {
  SEEKER: 'seeker',
  OWNER: 'owner',
  ADMIN: 'admin'
};

const ALLOWED_REGISTER_ROLES = [ROLES.SEEKER, ROLES.OWNER];

module.exports = {
  ROLES,
  ALLOWED_REGISTER_ROLES
};
