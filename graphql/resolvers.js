import bcrypt from 'bcryptjs';
import validator from 'validator';
import jwt from 'jsonwebtoken';

import User from '../models/user.js';
import Post from '../models/post.js';

import { clearImage } from '../util/file.js';

const createUser = async ({ userInput }, req) => {
  // VALIDATOR
  const errors = [];
  if (!validator.isEmail(userInput.email)) {
    errors.push({ message: 'E-mail is invalid.' });
  }
  if (
    validator.isEmpty(userInput.password) ||
    !validator.isLength(userInput.password, { min: 5 })
  ) {
    errors.push({ message: 'Password too short!' });
  }

  if (errors.length > 0) {
    const error = new Error('Invalid Input.');
    error.data = errors;
    error.code = 422;
    throw error;
  }

  // const email = args.UserInput.email;
  const existingUser = await User.findOne({ email: userInput.email });
  if (existingUser) {
    const error = new Error('User existss already!');
    throw error;
  }

  const hashedPw = await bcrypt.hash(userInput.password, 12);
  const user = new User({
    email: userInput.email,
    password: hashedPw,
    name: userInput.name,
  });
  const createdUser = await user.save();
  return { ...createdUser._doc, _id: createdUser._id.toString() };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email });
  if (!user) {
    const error = new Error('User not found!');
    error.code = 401;
    throw error;
  }

  const isEqual = await bcrypt.compare(password, user.password);
  if (!isEqual) {
    const error = new Error('Password is incorrect!');
    error.code = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    process.env.SECRET_KEY,
    { expiresIn: '1h' },
  );

  return { token: token, userId: user._id.toString() };
};

const createPost = async ({ postInput }, req) => {
  // if not authenticated
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const errors = [];
  if (
    validator.isEmpty(postInput.title) ||
    !validator.isLength(postInput.title, { min: 5 })
  ) {
    errors.push({ message: 'Title is invalid.' });
  }
  if (
    validator.isEmpty(postInput.content) ||
    !validator.isLength(postInput.content, { min: 5 })
  ) {
    errors.push({ message: 'content is invalid.' });
  }

  if (errors.length > 0) {
    const error = new Error('Invalid Input.');
    error.data = errors;
    error.code = 422;
    throw error;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error('Invalid User.');
    error.code = 401;
    throw error;
  }

  const post = new Post({
    title: postInput.title,
    content: postInput.content,
    imageUrl: postInput.imageUrl,
    creator: user,
  });

  const createdPost = await post.save();

  user.posts.push(createdPost);
  await user.save();
  return {
    ...createdPost._doc,
    _id: createdPost._id.toString(),
    createdAt: createdPost.createdAt.toISOString(),
    updatedAt: createdPost.updatedAt.toISOString(),
  };
};

const posts = async ({ page }, req) => {
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  if (!page) {
    page = 1;
  }

  const perPage = 2;
  const totalPosts = await Post.find().countDocuments();
  const posts = await Post.find()
    .populate('creator')
    .sort({ createdAt: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);

  return {
    posts: posts.map((p) => {
      return {
        ...p._doc,
        _id: p._id.toString(),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    }),
    totalPosts: totalPosts,
  };
};

const post = async ({ id }, req) => {
  // if not authenticated
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const post = await Post.findById(id).populate('creator');

  if (!post) {
    const error = new Error('No post found!');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...post._doc,
    _id: post._id.toString(),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
};

const updatePost = async ({ id, postInput }, req) => {
  // if not authenticated
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const post = await Post.findById(id).populate('creator');
  if (!post) {
    const error = new Error('No post found!');
    error.statusCode = 404;
    throw error;
  }

  if (post.creator._id.toString() !== req.userId.toString()) {
    const error = new Error('not authorized');
    error.statusCode = 403;
    throw error;
  }

  const errors = [];
  if (
    validator.isEmpty(postInput.title) ||
    !validator.isLength(postInput.title, { min: 5 })
  ) {
    errors.push({ message: 'Title is invalid.' });
  }
  if (
    validator.isEmpty(postInput.content) ||
    !validator.isLength(postInput.content, { min: 5 })
  ) {
    errors.push({ message: 'content is invalid.' });
  }

  if (errors.length > 0) {
    const error = new Error('Invalid Input.');
    error.data = errors;
    error.code = 422;
    throw error;
  }

  post.title = postInput.title;
  post.content = postInput.content;
  if (post.imageUrl === 'undefined') {
    post.imageUrl = postInput.imageUrl;
  }

  const updatedPost = await post.save();
  return {
    ...updatedPost._doc,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
};

const deletePost = async ({ id }, req) => {
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const post = await Post.findById(id);
  if (!post) {
    const error = new Error('No post found!');
    error.statusCode = 404;
    throw error;
  }

  if (post.creator.toString() !== req.userId.toString()) {
    const error = new Error('not authorized');
    error.statusCode = 403;
    throw error;
  }

  clearImage(post.imageUrl);

  await Post.findByIdAndRemove(id);

  const user = await User.findById(req.userId);
  user.posts.pull(id);
  console.log('adkiajfeai');
  await user.save();

  return true;
};

const user = async (args, req) => {
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error('No user found!');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...user._doc,
    _id: user._id.toString(),
  };
};

const updateStatus = async ({ status }, req) => {
  if (!req.isAuth) {
    const error = new Error('not authenticated');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(req.userId);
  if (!user) {
    const error = new Error('No user found!');
    error.statusCode = 404;
    throw error;
  }

  user.status = status;
  await user.save();
  return {
    ...user._doc,
    _id: user._id.toString(),
  };
};

export default {
  createUser: createUser,
  login: login,
  createPost: createPost,
  posts: posts,
  post: post,
  updatePost: updatePost,
  deletePost: deletePost,
  user: user,
  updateStatus: updateStatus,
};
