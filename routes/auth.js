const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const qs = require('qs');
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

//Login Route
router.post('/login', passport.authenticate('local', { session: false, failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.redirect(`/auth/profile?token=${token}`);
});

//Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
    const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: true });
    res.redirect(`/auth/profile?token=${token}`);
});

// Route to get the Delta OAuth URL and redirect the user
router.get('/delta', (req, res) => {
    const rootUrl = "https://auth.delta.nitt.edu/authorize";
    const options = {
        redirect_uri: process.env.DELTA_REDIRECT_URL,
        client_id: process.env.CLIENT_ID_DELTA_OAUTH,
        response_type: "code",
        scope: "user",
    };
    const qs = new URLSearchParams(options);
    res.redirect(`${rootUrl}?${qs.toString()}`);
});

// Callback route after user authorizes the application
router.get('/delta/callback', async (req, res) => {
    try {
        const code = req.query.code;
        const { access_token } = await getDauthToken(code);
        const deltaUser = await getDeltaUser({ access_token });

        // let user = await findAndUpdateUser(
        //     { deltaId: deltaUser.id },
        //     {
        //         deltaId: deltaUser.id,
        //         username: deltaUser.email.split("@")[0],
        //         email: deltaUser.email,
        //         displayName: deltaUser.name,
        //     },
        //     { upsert: true, new: true }
        // );

        let user = await User.findOne({ dauthId: deltaUser.id });
        if (!user) {
            user = new User({
                dauthId: deltaUser.id,
                username: deltaUser.email.split("@")[0],
            });
            await user.save();
        }

        const token = CreateAndSendToken(user, 200, res);
        res.redirect(`/auth/profile?token=${token}`);
    } catch (err) {
        console.error(err);

        res.status(404).json({
            status: "fail",
            message: err.message || 'Error during Delta OAuth process',
        });
    }
});

const getDauthToken = async (code) => {
    try {
        const url = "https://auth.delta.nitt.edu/api/oauth/token";
        const value = {
            code,
            redirect_uri: process.env.DELTA_REDIRECT_URL,
            client_secret: process.env.CLIENT_SECRET_DELTA_OAUTH,
            client_id: process.env.CLIENT_ID_DELTA_OAUTH,
            grant_type: "authorization_code",
        };
        const res = await axios.post(url, qs.stringify(value), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        return res.data;
    } catch (err) {
        console.error('Error getting Delta OAuth tokens:', err);
        throw err;
    }
};

const getDeltaUser = async ({ access_token }) => {
    try {
        const res = await axios.post(
            'https://auth.delta.nitt.edu/api/resources/user',
            {},
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );
        return res.data;
    } catch (err) {
        console.error('Error getting Delta user profile:', err);
        throw err;
    }
};

const CreateAndSendToken = (user, statusCode, res) => {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, { httpOnly: true, secure: true });
    return token;

    // res.redirect(`/auth/profile?token=${token}`);
};


// router.get('/delta', passport.authenticate('delta', { scope: ['user'] }));

// router.get('/delta/callback', passport.authenticate('delta', { failureRedirect: '/' }), (req, res) => {
//     const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
//     res.cookie('token', token, { httpOnly: true, secure: true });
//     res.redirect(`/auth/profile?token=${token}`);
// });

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
