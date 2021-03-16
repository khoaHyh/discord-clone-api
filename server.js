"use strict";
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const connectDB = require("./utilities/db");
const auth = require("./auth");
const handleRegister = require("./controllers/register");
const sessionStore = MongoStore.create({ mongoUrl: process.env.MONGO_URI });

/** START OF MIDDLEWARE **/
// Middleware to check if a user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  }
  res.redirect("/");
};
// Implement a Root-Level Request Logger Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    // Equals 1 day (1 day * 1000 ms/1 sec * 60 sec/1 min * 60 min/1 hr * 24 hr/1 day)
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    store: sessionStore,
  })
);
/** END OF MIDDLEWARE **/

connectDB();
auth(passport);

// Listen for error events on the database connection
mongoose.connection.on("error", (err) => {
  // Will not log if database disconnects, need to listen for disconnection for that
  logError(err);
});
app.get("/", (req, res) => {
  res.status(200).json("woot");
});
app.get("/chat", ensureAuthenticated, (req, res) => {
  res.status(200).json({ message: "in chat" });
});
app.get("/logout", (req, res) => {
  req.logout();
  res.status(200).json({ message: "logout" });
});
app.post(
  "/login",
  passport.authenticate("local", { failureRedirect: "/" }),
  (req, res) => {
    req.session.user = req.user._id;
    res.status(200).json(req.user.username);
  }
);
app.post("/register", (req, res, next) => {
  handleRegister(req, res, next);
});
app.get("/auth/github", passport.authenticate("github"));
app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
  (req, res) => {
    req.session.user_id = req.user.id;
    res.status(200).json(req.session.user_id);
  }
);
const PORT = process.env.PORT || 3080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});