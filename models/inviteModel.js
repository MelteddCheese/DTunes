const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
    },
    to: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
    },
    selectedPlaylists: {
        type: mongoose.Schema.Types.ObjectId, ref: 'Playlist',
    },
    status: {
        type: Number,
    },
});

InviteSchema.pre('find', function (next) {
    this.populate('from');
    this.populate('to');
    this.populate('selectedPlaylists');
    next();
});

module.exports = mongoose.model('Invite', InviteSchema);