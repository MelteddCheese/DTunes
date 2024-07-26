const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: String,
    googleId: String,
    dauthId: String,
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    friends: [{ type: String }],
    accType: { type: String, default: 'user' },
    partyMode: { type: Boolean, default: false },
    currentPlaying: {
        trackName: String,
        artistName: String,
        audioSrc: String
    },
    listenedSongs: [{
        song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song' },
        listenedAt: { type: Date, default: Date.now }
        // genre: String,
        // artist: String,
    }]
});

UserSchema.plugin(passportLocalMongoose);

UserSchema.pre('find', function (next) {
    this.populate('playlists');
    next();
});

UserSchema.pre('findOne', function (next) {
    this.populate('playlists');
    next();
});

module.exports = mongoose.model('User', UserSchema);
