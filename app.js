require('dotenv').config()
const ejs =  require("ejs");
const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;


const app = express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname + '/public'));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false, 
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/usersDB");

const userScehma = new mongoose.Schema({
    email:{
        type: String,
    },
    password:{
        type: String,
    },
    googleId:String,
    facebookId:String,
    secret:String
})

userScehma.plugin(passportLocalMongoose);
userScehma.plugin(findOrCreate);

const User = new mongoose.model("User",userScehma);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
  passport.deserializeUser(function(id, done) {
    User.findById(id)
    .then(user => {
        if (user) {
        // User found
        console.log(user);
        } else {
        // User not found
        console.log("User not found");
    }
        done(err, user);
    })
    .catch(error => {
        // Error handling
        console.error(error);
    });
});
  

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",(req,res)=>{
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.get("/register",(req,res)=>{
    res.render("register");
});

app.get("/secrets",(req,res)=>{
   User.find({"secret": {$ne:null}},)
   .then(foundUsers =>{
        if(foundUsers){
            res.render("secrets", {usersWithSecrets: foundUsers});
        }
   })
   .catch(err => console.log(err))
});

app.get("/submit",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit",async (req,res)=>{
    const submittedSecret = req.body.secret;
    console.log(req.user.id);
    try {
        const foundUser = await User.findById(req.user.id);
        console.log("User found "+ foundUser);
        
        if (foundUser) {
          // User found
          foundUser.secret = submittedSecret;
          await foundUser.save();
          res.redirect("/secrets");
        } else {
          // User not found
          console.log("User not found");
          res.redirect("/secrets");
        }
      } catch (error) {
        // Specific error handling
        console.error(error);
        res.status(500).send("An error occurred.");
      }
    
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      // Handle error
      console.error(err);
    }
    // Redirect to the desired page after successful logout
    res.redirect("/");
  });
});


app.post("/register",(req,res)=>{

    User.register({username: req.body.username}, req.body.password, (err,user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,() => res.redirect("/secrets"));
        }
    })   
});

app.post("/login",(req,res)=>{

    const user = new User({
       username: req.body.username,
       password: req.body.password,  
    });

    req.login(user,(err)=>{
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,() => res.redirect("/secrets"));
        }
    })
   
});

app.listen(3000,()=>{
    console.log("Server is running on port 3000");
});