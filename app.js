require('dotenv').config()
const ejs =  require("ejs");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const encrypt = require("mongoose-encryption");

const app = express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://127.0.0.1:27017/usersDB");

const userScehma = new mongoose.Schema({
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    }
});

userScehma.plugin(encrypt,{secret:process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User",userScehma);

app.get("/",(req,res)=>{
    res.render("home");
});

app.get("/login",(req,res)=>{
    res.render("login");
});

app.get("/register",(req,res)=>{
    res.render("register");
});

app.post("/register",(req,res)=>{
    const email = req.body.username;
    const password = req.body.password;

    const newUser = new User({email: email,password: password});

    newUser.save()
    .then(()=>{
        res.render("secrets");
    })
    .catch((err)=>{
        console.log(err);
    })
});

app.post("/login",(req,res)=>{
    const email = req.body.username;
    const password = req.body.password;

    User.findOne({email: email})
    .then((user)=>{
        if(user.password === password){
            res.render("secrets");
        }
    })
    .catch((err)=>{
        console.log(err);
    });
});

app.listen(3000,()=>{
    console.log("Server is running on port 3000");
});