const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Friend = require('../models/FriendModel');
const User = require('../models/user');
const authenticateJWT = require('../middlewares/authMiddleware');

router.post('/send-request', authenticateJWT, async (req, res) => {
    try {
        const requesterId = req.user._id;
        const receiverId = req.body.receiverId;

        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            return res.status(400).send('Invalid user ID'); //user or client side error
        }

        console.log(`Requester ID: ${requesterId}`);
        console.log(`Receiver ID: ${receiverId}`);

        const presentRequest = await Friend.findOne({ receiver: receiverId, requester: requesterId });

        if (!presentRequest) {
            console.log('No existing request, creating new request...');
            const friendRequest = new Friend({
                requester: requesterId,
                receiver: receiverId,
                status: 0  // 0-pending
            });

            await friendRequest.save();
            res.status(201).send('Friend request sent');
        } else {
            console.log('Friend request already sent');
            res.status(400).send('Friend request already sent');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/decline-request', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendRequestId = req.body.friendRequestId;
        if (!mongoose.Types.ObjectId.isValid(friendRequestId)) {
            return res.status(400).send('Invalid friend request ID');
        }

        const friendRequest = await Friend.findOneAndDelete({
            _id: friendRequestId,
            receiver: userId
        });

        if (!friendRequest) {
            return res.status(404).send('Friend request not found');
        }

        res.status(200).send('Friend request declined');
    } catch (error) {
        console.log('error decining request', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/accept-request', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user._id;
        const friendRequestId = req.body.friendRequestId;
        if (!mongoose.Types.ObjectId.isValid(friendRequestId)) {
            return res.status(400).send('Invalid friend request ID');
        }

        const friendRequest = await Friend.findOneAndUpdate({
            _id: friendRequestId,
            receiver: userId
        }, { status: 1 }, { new: true });

        if (!friendRequest) {
            return res.status(404).send('Friend request not found');
        }
        const requesterId = friendRequest.requester;
        const requester = await User.findById(requesterId);
        const receiver = await User.findById(userId);
        if (!requester || !receiver) {
            return res.status(404).send('User not found');
        }

        if (!requester.friends.includes(receiver.username)) {
            requester.friends.push(receiver.username);
            await requester.save();
        }

        if (!receiver.friends.includes(requester.username)) {
            receiver.friends.push(requester.username);
            await receiver.save();
        }

        res.status(200).send('Friend request accepted and friends updated');
    } catch (error) {
        console.log('error accepting request', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
