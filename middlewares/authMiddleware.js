const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Adjust the path as needed

const authenticateJWT = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.send('User not found');
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).send('Unauthorized');
    }
};

module.exports = authenticateJWT;
