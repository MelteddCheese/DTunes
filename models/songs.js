const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
    name: String,
    artist_name: String,
    audio: String,
    image: String,
    jamendoId: { type: String, unique: true }
});

module.exports = mongoose.model('Song', SongSchema);
