import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';

// const express = require('express');
import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Prod
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Graphql
import { graphqlHTTP } from 'express-graphql';
import graphqlSchema from './graphql/schema.js';
import graphqlResolver from './graphql/resolvers.js';
import auth from './middleware/auth.js';

import { clearImage } from './util/file.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images');
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4());
  },
});

const fileFilter = (req, file, callback) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

app.use(express.json());

// Secure Response Header
app.use(helmet());

// compression
app.use(compression());

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' },
);

// Logging with morgan
app.use(morgan('combined', { stream: accessLogStream }));

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'),
);

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Auth GraphQL
app.use(auth);

// IMAGES REQ
app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw new Error('NOt authenticated');
  }

  if (!req.file) {
    return res.status(200).json({ message: 'no file provided!' });
  }
  const imageUrl = req.file.path.replace('\\', '/');

  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }

  return res
    .status(201)
    .json({ message: 'Success Stored', filePath: imageUrl });
});

// GraphQL
app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || 'An error occurred';
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  }),
);

app.use((error, req, res, nest) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

try {
  await mongoose.connect(
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.vstco.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`,
  );
  app.listen(process.env.PORT || 3000);
  console.log('Server Started');
} catch (err) {
  console.log(err);
}
