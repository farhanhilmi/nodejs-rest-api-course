import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';

import User from '../models/user.js';
import { login, getUserStatus } from '../controllers/auth.js';

describe('Auth Controller', function () {
  before(function (done) {
    mongoose
      .connect(
        'mongodb+srv://farhanh:UH4udQV8YCO6vT06@cluster0.vstco.mongodb.net/test-messages?retryWrites=true&w=majority',
        { useNewUrlParser: true },
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

  it('should throw an error with code 500 if accessing the database fails', function (done) {
    sinon.stub(User, 'findOne');
    User.findOne.throws();
    const req = {
      body: {
        email: 'test@test.com',
        password: '12345',
      },
    };

    login(req, {}, () => {}).then((result) => {
      expect(result).to.be.an('error');
      expect(result).to.have.property('statusCode', 500);
      done();
    });

    User.findOne.restore();
  });

  it('should send a response with valid user status for an existing user', function (done) {
    const req = { userId: '5c0f66b979af55031b34728a' };
    const res = {
      statusCode: 500,
      userStatus: null,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        this.userStatus = data.status;
      },
    };

    getUserStatus(req, res, () => {}).then(() => {
      expect(res.statusCode).to.be.equal(200);
      expect(res.userStatus).to.be.equal('I am new');
      done();
    });
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
