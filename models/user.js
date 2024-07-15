const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: String,
    googleId: String,
    deltaId: String,
    playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    friends: [{ type: String }],
    accType: { type: String, default: 'user' }
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
