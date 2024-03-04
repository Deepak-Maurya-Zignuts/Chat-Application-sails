/**
 * UserController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv').config();


module.exports = {
  signupAction: async function (req, res) {
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password;
    let hashedPassword = await bcrypt.hash(password, 10);

    try {
      let existingUser = await User.findOne({ email: email });

      if (existingUser) {
        return res.badRequest("Email already exists");
      }

      let user = await User.create({
        name: name,
        email: email,
        password: hashedPassword,
        isActive: false,
      }).fetch();

      return res.redirect('/login');

    } catch (error) {
      return res.serverError(error).redirect('/signup');
    }
  },

  loginAction: async function (req, res) {
    let email = req.body.email;
    let password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      User.find({ email: email }).exec(async (error, users) => {
        if (error) {
          console.log(error.message);
          return res.status(500).json({ error: "Error finding user" });
        }
        if (users.length < 1) {
          console.log("No user found");
          return res.status(400).json({ error: "No user found" });
        }
        let user = users[0];
        let isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          console.log("Password is incorrect");
          return res.status(400).json({ error: "Password is incorrect" });
        }
        console.log("User logged in");

        req.session.username = user.name;

        let token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

        req.session.token = token;

        res.cookie('token', token, { maxAge: 900000, httpOnly: true });
        const filter = { name: user.name }; // Your filter criteria
        const update = { isActive: true, authToken: token }; // Update fields
        await User.update(filter, update);
        
        return res.redirect('/chats');
      })
    } catch (error) {
      return res.serverError(error).redirect('/login');
    }
  
  },

  logoutAction: async function (req, res) {
    try {
      const name = req.body.username;
      const user = await User.findOne({ name: name });
  
      const filter = { name: user.name };
      const update = { isActive: false, authToken: ""};
  
      await User.update(filter, update);
  
      res.clearCookie('token');
      console.log('User logged out');
  
      return res.redirect('/');
    } catch (error) {
      console.log('Logout error:', error.message);
      return res.serverError();
    }

  },

  getAllUsers: async function (req, res) {
    console.log('showAllUsers');
    try {
      const allUsers = await User.find({});
      const allUserList = allUsers.map(user => user.name);

      return res.json(allUserList);
    } catch (error) {
      console.error("Error fetching users:", err);
      return res.serverError("Error fetching users");
    }
  },

  getAllCurrentUsers: async function (req, res) {
    try {
      const filter = {isActive: true};
      const result = await User.find(filter);
      const currentUsers = result.map(user => user.name);
      return res.json(currentUsers);
    } catch (error) {
      console.log(error);
    }
  }
};
