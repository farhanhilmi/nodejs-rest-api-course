import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';

const ERROR = (err) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }
};

export const signup = async (req, res, next) => {
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

  try {
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      password: hashedPw,
      name: name,
    });
    const result = await user.save();

    res.status(201).json({ message: 'user Created', userId: result._id });
  } catch (err) {
    ERROR(err);
    next(err);
  }
};

export const login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  // let loadedUser;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error('A user with this email cant be found');
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error('Wrong password');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      'supersecret',
      { expiresIn: '1h' },
    );

    res.status(200).json({
      message: 'Login Success',
      token: token,
      userId: user._id.toString(),
    });
    return;
  } catch (err) {
    ERROR(err);
    next(err);
    return err;
  }
};

export const getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('user not found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  } catch (err) {
    ERROR(err);
    next(err);
  }
};

export const updateUserStatus = async (req, res, next) => {
  const newStatus = req.body.status;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('user not found');
      error.statusCode = 404;
      throw error;
    }

    user.status = newStatus;
    await user.save();
    res.status(200).json({ message: 'user status updated' });
  } catch (err) {
    ERROR(err);
    next(err);
  }
};
