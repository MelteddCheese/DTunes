const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('../models/user');
require('dotenv').config();

const router = express.Router();

// Register Route
router.post('/register', async (req, res, next) => {
    try {
        if (req.body.password === req.body.confirmPassword) {
            const user = await User.register(new User({ username: req.body.username }), req.body.password);
            res.redirect('/');
        }
        else {
            const err = new Error('Passwords must be the same');
            err.status = 401;
            return next(err);
        }
    } catch (error) {
        const err = new Error(error);
        err.status = error.status || 404;
        return next(err);
    }
});

//router.use(cookieParser());

// Login Route
router.post('/login', passport.authenticate('local', { session: false, failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.redirect(`/auth/profile?token=${token}`);
});

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.redirect(`/auth/profile?token=${token}`);
});

router.get('/delta', passport.authenticate('delta', { scope: ['user'] }));

router.get('/delta/callback', passport.authenticate('delta', { failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.redirect(`/auth/profile?token=${token}`);
});

router.get('/profile', async (req, res) => {
    //const token = req.query.token || req.headers.authorization.split(' ')[1];
    const token = req.cookies.token;
    if (!token) return res.redirect('/');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.error('No user found with ID:', decoded.userId);
            return res.redirect('/');
        }
        res.cookie('token', token, { httpOnly: true, secure: true });
        res.redirect(`/homepage?token=${token}`);
        //res.render('profile', { user });
    } catch (err) {
        console.error('Error fetching user or verifying token:', err);
        return res.redirect('/');
    }
});

module.exports = router;
