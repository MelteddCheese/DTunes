const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Friend = require('../models/FriendModel');
const User = require('../models/user');
const authenticateJWT = require('../middlewares/authMiddleware');
const Invite = require('../models/inviteModel');
const Playlist = require('../models/playlist');

// Send invite
router.post('/send-invite', authenticateJWT, async (req, res) => {
    try {
        const fromId = req.user._id;
        const toId = req.body.toId;

        if (!mongoose.Types.ObjectId.isValid(toId)) {
            return res.status(400).send('Invalid user ID');
        }

        const invite = new Invite({
            from: fromId,
            to: toId,
            status: 0,
            selectedPlaylists: [],
        });

        await invite.save();
        res.status(201).send('Invite sent');
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Select playlist
router.post('/select-playlist', authenticateJWT, async (req, res) => {
    try {
        const inviteId = req.body.inviteId;
        const playlistId = req.body.playlistId;

        if (!mongoose.Types.ObjectId.isValid(inviteId) || !mongoose.Types.ObjectId.isValid(playlistId)) {
            return res.status(400).send('Invalid ID');
        }

        const invite = await Invite.findById(inviteId);
        if (!invite) {
            return res.status(404).send('Invite not found');
        }

        invite.selectedPlaylists.push(playlistId);
        if (invite.selectedPlaylists.length === 2) {
            invite.status = 1; // Mark as accepted
            // Here you can create the temporary playlist with songs from both playlists
        }

        await invite.save();
        res.status(200).send('Playlist selected');
    } catch (error) {
        console.error('Error selecting playlist:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;