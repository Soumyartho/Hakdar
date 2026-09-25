// Must run after authMiddleware('officer'), which populates req.user from the JWT. Closes a real
// gap: today any officer with a valid token can hit any officer route regardless of role/department
// (confirmed by audit - role/department are signed into the JWT but never checked again anywhere).

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient role for this action' });
  }
  next();
};

// Admins (department = 'All') bypass the department check; a department-scoped officer may only
// act on records whose department matches their own. `getResourceDepartment` is given the request
// and must return the department string of the thing being acted on (may be async).
export const requireDepartment = (getResourceDepartment) => async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ success: false, message: 'Not authenticated' });
  }
  if (req.user.role === 'admin' || req.user.department === 'All') {
    return next();
  }
  try {
    const resourceDepartment = await getResourceDepartment(req);
    if (resourceDepartment && resourceDepartment !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Not authorized for this department' });
    }
    next();
  } catch (error) {
    console.error('requireDepartment check failed:', error.message);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
