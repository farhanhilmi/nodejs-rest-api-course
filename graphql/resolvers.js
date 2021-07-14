import bcrypt from 'bcryptjs';

import User from '../models/user.js';

export default {
  createUser: async function ({ userInput }, req) {
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
  },
};
