import jwt from 'jsonwebtoken';

export default (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'supersecret');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }

  if (!decodedToken) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw err;
  }

  req.userId = decodedToken.userId;
  next();
};
