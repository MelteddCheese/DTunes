const mongoose = require("mongoose");

const InviteSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
    },
    to: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
    },
    selectedPlaylists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    status: {
        type: Number,
    },
    updatedAt: { type: Date, default: Date.now }
});

InviteSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

InviteSchema.index(
    { updatedAt: 1 },
    { expireAfterSeconds: 3600, partialFilterExpression: { status: 1 } }
);

InviteSchema.pre('find', function (next) {
    this.populate('from');
    this.populate('to');
    this.populate('selectedPlaylists');
    next();
});

module.exports = mongoose.model('Invite', InviteSchema);