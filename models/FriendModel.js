const mongoose = require("mongoose");

const friendRequest = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId, ref: 'User',
    },
    status: {
        type: Number,
    },
});

friendRequest.pre('find', function (next) {
    this.populate('requester');
    this.populate('receiver');
    next();
});

module.exports = mongoose.model('Friend', friendRequest);