const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Friend = require('../models/FriendModel');
const User = require('../models/user');
const authenticateJWT = require('../middlewares/authMiddleware');
const Invite = require('../models/inviteModel');
const Playlist = require('../models/playlist');

router.post('/send-invite', authenticateJWT, async (req, res) => {
    try {
        const fromId = req.user._id;
        const toName = req.body.toName;
        console.log('Invite request received:', { fromId, toName });
        if (!toName) {
            console.error('toName is required');
            return res.status(400).send('toName is required');
        }
        const toUser = await User.findOne({ username: toName });
        if (!toUser) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }
        const toId = toUser._id;
        const fromUser = await User.findById(fromId).populate('playlists');
        const playlistOptions = fromUser.playlists;
        if (playlistOptions.length == 0) {
            console.error('User has no playlists');
            return res.status(400).send('User has no playlists');
        }
        console.log('Creating invite:', { fromId, toId, playlistOptions });
        const invitePresent = await Invite.findOne({ from: fromId, to: toId });
        if (!invitePresent) {
            const invite = new Invite({
                from: fromId,
                to: toId,
                status: 0,
                selectedPlaylists: [],
            });
            await invite.save();
            console.log('Invite created:', invite);
            res.status(201).json({ inviteId: invite._id, playlists: playlistOptions });
        }
        else {
            console.log('Invite already exists:', invitePresent);
            return res.status(409).send('Invite already exists');
        }
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).send('Internal Server Error');
    }
});

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

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
            invite.status = 1;
            const playlist1 = await Playlist.findById(invite.selectedPlaylists[0]).populate('songs');
            const playlist2 = await Playlist.findById(invite.selectedPlaylists[1]).populate('songs');
            const combinedSongs = shuffle([...playlist1.songs, ...playlist2.songs]);
            const fromUser = await User.findById(invite.from);
            const toUser = await User.findById(invite.to);
            const tempPlaylist = new Playlist({
                name: `${toUser.username} x ${fromUser.username}`,
                songs: combinedSongs,
                user: null, //Not specific to a single user
                usersTemp: [toUser._id, fromUser._id],
                temporary: true,
                createdAt: Date.now()
            });
            await tempPlaylist.save();
            fromUser.playlists.push(tempPlaylist._id);
            toUser.playlists.push(tempPlaylist._id);
            fromUser.partyMode = true;
            toUser.partyMode = true;
            await fromUser.save();
            await toUser.save();
        }
        await invite.save();
        res.status(200).send('Playlist selected');
    } catch (error) {
        console.error('Error selecting playlist:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/accept-invite', authenticateJWT, async (req, res) => {
    try {
        const inviteId = req.body.inviteId;
        console.log(inviteId, 'accept invite Id');
        if (!inviteId) {
            console.error('inviteId is required');
            return res.status(400).send('inviteId is required');
        }
        const invite = await Invite.findById(inviteId);
        const toId = invite.to;
        const toUser = await User.findById(toId).populate('playlists');
        const playlistOptions = toUser.playlists;
        if (playlistOptions.length == 0) {
            console.error('User has no playlists');
            return res.status(400).send('User has no playlists..Create playlist to accept invite request');
        }
        invite.status = 1;
        await invite.save();
        console.log('Invite accepted:', invite);
        res.status(201).json({ playlists: playlistOptions });
    } catch (error) {
        console.error('Error accepting invite:', error);
        res.status(500).send('Internal Server Error');
    }
})

router.post('/decline-invite', authenticateJWT, async (req, res) => {
    try {
        const inviteId = req.body.inviteId;
        console.log(inviteId, 'accept invite Id');
        if (!inviteId) {
            console.error('inviteId is required');
            return res.status(400).send('inviteId is required');
        }
        const invite = await Invite.findByIdAndDelete(inviteId);
        console.log('Invite declined:', invite);
        res.status(201).send('Invite declined');
    } catch (error) {
        console.error('Error declining invite:', error);
        res.status(500).send('Internal Server Error');
    }
})

module.exports = router;