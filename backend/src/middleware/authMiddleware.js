import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hakdar_jwt_secret_key_123';

// A single JWT_SECRET signs both officer and citizen tokens, so without an explicit type claim a
// citizen's token would pass signature verification on an officer-only route (and vice versa) -
// the signature alone doesn't say who a token is FOR. Every token now carries `type: 'officer'` or
// `type: 'citizen'`, and this factory returns a middleware pinned to exactly one of those.
export const authMiddleware = (requiredType = 'officer') => (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== requiredType) {
      return res.status(403).json({ success: false, message: 'Token is not valid for this resource' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
