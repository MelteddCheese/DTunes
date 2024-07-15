const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    image: { type: String }
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
