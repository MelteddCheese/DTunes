const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
    name: { type: String, required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usersTemp: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }],
    image: { type: String },
    temporary: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

PlaylistSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 3600, partialFilterExpression: { temporary: true } }
);

PlaylistSchema.post('remove', async function (doc) {
    await mongoose.model('User').updateMany(
        { playlists: doc._id },
        { $pull: { playlists: doc._id } }
    );
});

module.exports = mongoose.model('Playlist', PlaylistSchema);
