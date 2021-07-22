import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import sinon from 'sinon';

import authMiddleware from '../middleware/is-auth.js';

describe('Auth middleware', function () {
  it('should throw an error if no authorization header is present', function () {
    const req = {
      get: function () {
        return null;
      },
    };

    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw(
      'not authenticated',
    );
  });

  it('should throw an error if the authorization header is only one string', function () {
    const req = {
      get: function () {
        return 'dddd';
      },
    };
    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
  });

  it('should throw an error if the token cannot be verified', function () {
    const req = {
      get: function () {
        return 'Bearer dddd';
      },
    };
    expect(authMiddleware.bind(this, req, {}, () => {})).to.throw();
  });

  it('should yield a userId after decoding the token', function () {
    const req = {
      get: function () {
        return 'dddd';
      },
    };

    sinon.stub(jwt, 'verify');
    jwt.verify.returns({ userId: 'abc' });

    authMiddleware(req, {}, () => {});
    expect(req).to.have.property('userId');
    expect(req).to.have.property('userId', 'abc');
    expect(jwt.verify.called).to.be.true;
    jwt.verify.restore();
  });
});
