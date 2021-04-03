//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');
//const md5 = require('md5');
//const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.use(session({
  secret: 'Sly does not like walks.',
  resave:false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB_URL, {useNewUrlParser:true, useUnifiedTopology:true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/', (req, res) => {
  res.render('home');
});

app.route('/auth/google')

  .get(passport.authenticate('google', {

    scope: ['profile']

  }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');

});

app.get('/secrets', (req, res) => {
  if(req.isAuthenticated()){
    res.render('secrets');
  }else{
    res.redirect('/login');
  }

});

app.get('/logout', (req, res) => {
  req.logout();
  res.render('home');

});

/*
app.post('/register', (req, res) =>{

  bcrypt.hash(req.body.password, parseInt(process.env.SALT_ROUNDS), function(err, hash) {
    if(err){
      console.log(err);
    }else{
      const newUser = new User({
        email: req.body.username,
        password: hash
      });

      newUser.save(function(err){
        if(err){
          console.log(err);
        }else{
          res.render('secrets');
        }
      });
    }

  });
});

app.post('/login', (req, res) =>{
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email:username}, (err,foundUser)=>{
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        bcrypt.compare(password, foundUser.password, function(err, result) {
          if(result === true){
            res.render("secrets");
          }else{
            res.render("login");
          }
        });
      }

    }
  });
});
*/


app.post('/register', (req, res) =>{

  User.register({username: req.body.username}, req.body.password, (err, user)=>{
    if(err){
      console.log(err);
      res.redirect('/register');
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect('/secrets');
      });
    }
  });

});

app.post('/login', (req, res) =>{

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, (err) =>{
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(port, () => console.log(`Server started at port: ${port}`)
);
