// Generic request-body validator. No validation library existed anywhere in the backend before
// this - every controller trusted req.body directly - so this is applied to the new citizen/
// application endpoints, which is where untrusted PII (Aadhaar, phone, income) now enters the system.
export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    });
  }
  req.body = result.data;
  next();
};
