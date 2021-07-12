import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';

const ERROR = (err) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }
};

export const signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    const error = new Error('Validation failed');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  bcrypt
    .hash(password, 12)
    .then((hashedPw) => {
      const user = new User({
        email: email,
        password: hashedPw,
        name: name,
      });
      return user.save();
    })
    .then((result) => {
      res.status(201).json({ message: 'user Created', userId: result._id });
    })
    .catch((err) => {
      ERROR(err);
      next(err);
    });
};

export const login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error('A user with this email cant be found');
        error.statusCode = 401;
        throw error;
      }

      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error('Wrong password');
        error.statusCode = 401;
        throw error;
      }

      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        'supersecret',
        { expiresIn: '1h' },
      );

      res.status(200).json({
        message: 'Login Success',
        token: token,
        userId: loadedUser._id.toString(),
      });
    })
    .catch((err) => {
      ERROR(err);
      next(err);
    });
};

export const getUserStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error('user not found');
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ status: user.status });
    })
    .catch((err) => {
      ERROR(err);
      next(err);
    });
};

export const updateUserStatus = (req, res, next) => {
  const newStatus = req.body.status;
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error('user not found');
        error.statusCode = 404;
        throw error;
      }

      user.status = newStatus;
      return user.save();
    })
    .then((result) => {
      res.status(200).json({ message: 'user status updated' });
    })
    .catch((err) => {
      ERROR(err);
      next(err);
    });
};
