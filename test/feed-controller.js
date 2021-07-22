import { expect } from 'chai';
import mongoose from 'mongoose';

import User from '../models/user.js';
import { createPost } from '../controllers/feed.js';

describe('Feed Controller', function () {
  before(function (done) {
    mongoose
      .connect(
        'mongodb+srv://farhanh:UH4udQV8YCO6vT06@cluster0.vstco.mongodb.net/test-messages?retryWrites=true&w=majority',
      )
      .then((result) => {
        const user = new User({
          email: 'test@test.com',
          name: 'testing',
          password: '12345',
          posts: [],
          _id: '5c0f66b979af55031b34728a',
        });
        return user.save();
      })
      .then(() => {
        done();
      });
  });

  it('should add a created post to the posts of the creator', function (done) {
    const req = {
      body: {
        tile: 'test post',
        content: 'a test post',
      },
      file: {
        path: 'adaca',
      },
      userId: '5c0f66b979af55031b34728a',
    };

    const res = {
      status: function () {
        return this;
      },
      json: function () {},
    };

    createPost(req, res, () => {}).then((result) => {
      expect(result).to.have.property('posts');
      expect(result.posts).to.have.length(1);
    });
    done();
  });

  after(function (done) {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      });
  });
});
