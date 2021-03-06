const bodyParser = require('body-parser');
// Salting
// const bcrypt = require('bcrypt');
// const saltRounds = 12;
const ejs = require('ejs');
const express = require('express');
// Hashing
// const md5 = require('md5');
const mongoose = require('mongoose');
// const mongooseEncryption = require('mongoose-encryption');
// Cookies and Session
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
// Google Auth
const googleStrategy = require('passport-google-oauth20').Strategy;
// findOrCreate
const findOrCreate = require('mongoose-findorcreate');


// Environment
require('dotenv').config();

// Setup App
const app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(session({
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false
}))
app.use(passport.initialize());
app.use(passport.session());

// Config Database 
const mongoURL = 'mongodb+srv://Matthew1906:'+ process.env.PASSWORD +'@udemywebdevdb.9fggl.mongodb.net/authUdemyDB?retryWrites=true&w=majority';
mongoose.connect(mongoURL, { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define Schema
const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});

// Encryption
// const secret = process.env.SECRET;
// userSchema.plugin(mongooseEncryption, {secret:secret, encryptedFields:['password']});

// Cookies and schema
userSchema.plugin(passportLocalMongoose);

// findOrCreate
userSchema.plugin(findOrCreate);

// Define Model
const User = mongoose.model('User', userSchema);

// Use passport to configure stuff
passport.use(User.createStrategy());
passport.serializeUser((user, done)=>{
    done(null, user.id);
});
passport.deserializeUser((id, done)=>{
    User.findById(id, (err,user)=>{
        done(err, user);
    })
});

// Config Open Authentication
passport.use(
    new googleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret:process.env.CLIENT_SECRET,
            callbackURL:"http://localhost:3000/auth/google/secrets"
            // userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
        }, (accessToken, refreshToken, profile, cb)=>{
            User.findOrCreate({googleId:profile.id}, (err,user)=>{
                return cb(err,user);
            })
        }
    )
);

// Routes
app.get('/',(req, res)=>{
    res.render('home');
});

app.get("/auth/google", passport.authenticate('google', {
    scope: ['profile']
}));

app.get("/auth/google/secrets", passport.authenticate('google', {failureRedirect:'/login'}),
    (req, res)=>{
        res.redirect('/secrets');
    }
);

app.get('/login', (req, res)=>{
    res.render('login');
});

app.post('/login', (req, res)=>{
    const user = new User({
        username:req.body.username,
        password:req.body.passport
    })
    req.login(user, (err)=>{
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect('/secrets');
            });
        }
    })
});

app.get('/register', (req, res)=>{
    res.render('register');
});

app.post('/register', (req,res)=>{
    User.register(
        {username:req.body.username},
        req.body.password, 
        (err,user)=>{
            if(err){
                console.log(err);
                res.redirect('/register');
            }else{
                passport.authenticate("local")(req, res, ()=>{
                    res.redirect('/secrets');
                });
            }
        }
    )
});

app.get('/secrets', (req, res)=>{
    User.find({'secret':{$ne:null}}, (err, arr)=>{
        if(err){
            console.log(err)
        }else{
            if(arr!=null){
                res.render('secrets',{userWithSecrets:arr});
            }
        }
    })
});

app.get('/submit', (req, res)=>{
    if(req.isAuthenticated()){
        res.render('submit');
    }else{
        res.redirect("/login");
    }
});

app.post('/submit', (req, res)=>{
    const submittedSecret = req.body.secret;
    User.findById(req.user.id, (err, user)=>{
        user.secret = submittedSecret;
        user.save(()=>{
            res.redirect('/secrets');
        })
    })
});

app.get('/logout', (req, res)=>{
    req.logout();
    res.redirect('/');
})

// Listen to port
app.listen(3000, ()=>{
    console.log('Server started at port 3000...');
});