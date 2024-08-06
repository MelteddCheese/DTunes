const express = require("express");
const axios = require('axios');
const path = require('path');
const mongoose = require("mongoose");
const passport = require("passport");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bodyParser = require("body-parser");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const qs = require('querystring');

//models
const User = require("./models/user");
const Playlist = require('./models/playlist');
const Song = require('./models/songs');
const Friend = require('./models/FriendModel');
const Invite = require('./models/inviteModel');


const multer = require('multer');
const fs = require('fs');

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 7000;
const JAMENDO_CLIENT_ID = process.env.JAMENDO_CLIENT_ID;

mongoose.connect(process.env.MONGO_URI);

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(express.json());

passport.use(new LocalStrategy(User.authenticate()));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            //console.log('...', accessToken, '...', refreshToken, '...', profile);
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                user = new User({
                    googleId: profile.id,
                    username: profile.emails[0].value,
                    //profile.emails[0].value
                });
                await user.save();
            }

            return done(null, user);
        } catch (err) {
            return done(err, false);
        }
    }
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const authRoutes = require('./routes/auth');
const friendRequests = require('./routes/friendRequest');
const friendInvites = require('./routes/friendInvite');
const errorHand = require('./middlewares/error'); //middlewares

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.use('/auth', authRoutes);
app.use('/friendRequests', friendRequests);
app.use('/partyInvites', friendInvites);

app.use(errorHand);

const authenticateJWT = async (req, res, next) => {
    // const token = req.query.token || req.headers.authorization.split(' ')[1];
    // const authHeader = req.headers.authorization;
    // const token = req.query.token || (authHeader && authHeader.split(' ')[1]);
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.send('User not found');
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).send('Unauthorized');
    }
};

const addTracksToDatabase = async (tracks) => {
    for (const track of tracks) {
        try {
            const existingSong = await Song.findOne({ jamendoId: track.jamendoId });
            if (!existingSong) {
                const newSong = new Song(track);
                await newSong.save();
                console.log(`Added track: ${track.name}`);
            } else {
                console.log(`Track already exists: ${track.name}`);
            }
        } catch (error) {
            console.error('Error adding track to database:', error);
        }
    }
};

app.post('/homepage', authenticateJWT, async (req, res) => {
    try {
        console.log('Loading');
        const genre = req.body.genre || '';
        const search = req.body.search || '';
        const searchType = req.body.searchType || 'tracks';
        console.log(`Genre: ${genre}, Search: ${search}`);
        const users = await User.find().populate('playlists');
        for (const user of users) {
            user.playlists = user.playlists.filter(playlist => playlist !== null);
            await user.save();
        }
        const user = await User.findById(req.user._id)
            .populate('playlists')
            .populate('likedSongs');
        const friendsData = [];
        for (const friendUsername of user.friends) {
            const friend = await User.findOne({ username: friendUsername });
            if (friend) {
                friendsData.push({
                    username: friend.username,
                    currentPlaying: friend.currentPlaying
                });
            }
        }
        let receivedRequests = [];
        let pendingRequests = [];
        let receivedInvites = [];
        receivedRequests = await Friend.find({ receiver: user, status: 0 }).populate('requester');
        pendingRequests = await Friend.find({ requester: user, status: 0 }).populate('receiver');
        receivedInvites = await Invite.find({ to: user, status: 0 }).populate('from');
        console.log(receivedRequests, 'received requests');
        console.log(pendingRequests, 'pending requests');
        console.log(receivedInvites, 'receivedInvites');
        if (searchType === 'tracks') {
            const users = await User.find({});
            const params = {
                client_id: JAMENDO_CLIENT_ID,
                limit: 10,
                format: 'json',
                include: 'lyrics+musicinfo',
            };
            if (genre) {
                params.tags = genre;
            }
            if (search) {
                params.namesearch = search;
            }
            const response = await axios.get('https://api.jamendo.com/v3.0/tracks', { params });
            const tracks = response.data.results.map(track => ({
                id: track.id,
                name: track.name,
                artist_name: track.artist_name,
                audio: track.audio,
                image: track.album_image,
                lyrics: track.lyrics,
                duration: track.duration,
                jamendoId: track.id,
                genre: track.musicinfo.tags.genres[0]
            }));
            await addTracksToDatabase(tracks);
            // console.log(tracks);
            res.render('homepage', {
                users,
                tracks,
                selectedQuery: search,
                selectedGenre: genre,
                user: user,
                receivedRequests,
                pendingRequests,
                receivedInvites,
                friendsData
            });
        }
        else if (searchType === 'users') {
            const users = await User.find({
                username: { $regex: new RegExp(search, 'i') }
            }).sort({ username: 1 });

            // console.log(users);

            res.render('homepage', {
                users,
                selectedQuery: search,
                selectedGenre: genre,
                user: user,
                tracks: null,
                receivedRequests,
                pendingRequests,
                receivedInvites,
                friendsData
            });
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

app.get('/homepage', authenticateJWT, async (req, res) => {
    try {
        console.log('Loading');
        const genre = req.body.genre || '';
        console.log(genre);
        const userss = await User.find().populate('playlists');
        for (const user of userss) {
            user.playlists = user.playlists.filter(playlist => playlist !== null);
            await user.save();
        }
        const user = await User.findById(req.user._id)
            .populate('playlists')
            .populate('likedSongs');

        const friendsData = [];
        for (const friendUsername of user.friends) {
            const friend = await User.findOne({ username: friendUsername });
            if (friend) {
                friendsData.push({
                    username: friend.username,
                    currentPlaying: friend.currentPlaying
                });
            }
        }
        //console.log(friendsData);
        const users = await User.find({});
        const receivedRequests = await Friend.find({ receiver: user, status: 0 });
        const pendingRequests = await Friend.find({ requester: user, status: 0 });
        const receivedInvites = await Invite.find({ to: user, status: 0 });

        const response = await axios.get('https://api.jamendo.com/v3.0/tracks', {
            params: {
                client_id: JAMENDO_CLIENT_ID,
                limit: 10,
                format: 'json',
                tags: genre,
                include: 'lyrics+musicinfo',
                random: true,
            }
        });

        console.log('API Response:', response.data);

        const tracks = response.data.results.map(track => ({
            id: track.id,
            name: track.name,
            artist_name: track.artist_name,
            audio: track.audio,
            image: track.album_image,
            lyrics: track.lyrics,
            duration: track.duration,
            jamendoId: track.id,
            genre: track.musicinfo.tags.genres[0]
        }));
        //track.musicinfo.tags.genres[0]
        await addTracksToDatabase(tracks);

        console.log(tracks);

        res.render('homepage', {
            users,
            tracks,
            selectedGenre: genre,
            user: user,
            receivedRequests,
            pendingRequests,
            receivedInvites,
            friendsData
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

async function getSongDetails(jamendoId) {
    const url = `https://api.jamendo.com/v3.0/tracks?client_id=${JAMENDO_CLIENT_ID}&id=${jamendoId}`;
    try {
        const response = await axios.get(url);
        // console.log(response.data);
        const track = response.data.results[0];
        return {
            name: track.name,
            artist_name: track.artist_name,
            audio: track.audio,
            image: track.album_image
        };
    } catch (error) {
        console.error('Error fetching song details from Jamendo API:', error);
        return null;
    }
}

app.post('/like-song', authenticateJWT, async (req, res) => {
    const { songId } = req.body;
    console.log('Received songId:', songId);

    if (!songId) {
        return res.status(400).send('songId is required');
    }

    try {
        const user = req.user;
        if (!user) {
            return res.status(401).send('User not found');
        }

        let song = await Song.findOne({ jamendoId: songId });
        const numberID = parseInt(songId, 10);

        if (!song && !isNaN(numberID)) {
            console.log('Fetching song details from Jamendo API for:', numberID);
            const details = await getSongDetails(numberID);
            song = new Song({
                name: details.name,
                artist_name: details.artist_name,
                audio: details.audio,
                image: details.image,
                jamendoId: songId
            });
            await song.save();
        }

        user.likedSongs.push(song._id);
        await user.save();

        res.send('Song liked successfully!');
    } catch (error) {
        console.error('Error liking song:', error);
        res.status(500).send('An error occurred while liking the song');
    }
});

app.post('/dislike-song', authenticateJWT, async (req, res) => {
    const { songId } = req.body;
    console.log('Received songId for dislike:', songId);
    if (!songId) {
        return res.status(400).send('songId is required');
    }
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).send('User not found');
        }
        let song = await Song.findOne({ jamendoId: songId });

        const initialLikedSongsCount = user.likedSongs.length;

        if (song) {
            // Remove song from user's likedSongs array if it exists
            user.likedSongs = user.likedSongs.filter(id => id.toString() !== song._id.toString());
        }
        else {
            console.log(song._id);
        }

        if (initialLikedSongsCount === user.likedSongs.length) {
            console.log(song._id);
            return res.status(404).send('Song not found in liked songs');
        }

        await user.save();

        res.send('Song disliked successfully!');
    } catch (error) {
        console.error('Error disliking song:', error);
        res.status(500).send('An error occurred while disliking the song');
    }
});

app.post('/create-playlist', authenticateJWT, async (req, res) => {
    const { playlistName } = req.body;
    const user = req.user;
    //const user = await User.findById(req.userId);
    const newPlaylist = new Playlist({
        name: playlistName,
        user: user._id
    });
    await newPlaylist.save();
    user.playlists.push(newPlaylist._id);
    await user.save();
    res.json({ success: true, playlist: newPlaylist });
});

app.post('/add-to-playlist', authenticateJWT, async (req, res) => {
    try {
        const { playlistId, songId } = req.body;
        const user = req.user;
        const playlist = await Playlist.findById(playlistId).populate('songs');

        let song = await Song.findOne({ jamendoId: songId });
        const numberID = parseInt(songId, 10);

        //console.log('Current playlist songs:', playlist.songs.map(s => s.jamendoId));

        const presentSong = playlist.songs.find(song => song.jamendoId === songId.toString());
        console.log(presentSong);
        if (!song && !isNaN(numberID)) {
            console.log('Fetching song details from Jamendo API for:', numberID);
            const details = await getSongDetails(numberID);
            song = new Song({
                name: details.name,
                artist_name: details.artist_name,
                audio: details.audio,
                image: details.image,
                jamendoId: songId.toString()
            });
            await song.save();
            playlist.songs.push(song._id);
        } else {
            if (!presentSong) {
                playlist.songs.push(song._id);
            }
        }

        if (!presentSong) {
            await playlist.save();
            res.send('Song added to playlist successfully!');
        } else {
            console.log(presentSong, 'fuckkk');
            res.status(400).send('Song already in playlist');
        }
    } catch (error) {
        console.error('Error adding song to playlist:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});

app.get('/playlistSelect', authenticateJWT, async (req, res) => {
    try {
        const user = req.user;
        const playlistId = req.query.playlistId;
        const playlist = await Playlist.findById(playlistId).populate('songs');
        //const message = req.query.message;
        res.render('playlistSelect', {
            user: user,
            playlistTracks: playlist.songs,
            playlist
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
});

app.get('/likedSongs', authenticateJWT, async (req, res) => {
    try {
        console.log('reached route');
        const user = await req.user.populate('likedSongs');
        console.log('reached route', user);
        res.render('likedSongs', {
            user: user,
            likedTracks: user.likedSongs
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Error fetching data');
    }
})

app.post('/update-current-playing', authenticateJWT, async (req, res) => {
    try {
        const { trackName, artistName, audioSrc, jamendoId } = req.body;
        const userId = req.user._id;
        const user = req.user;
        console.log(trackName, artistName, 'jamendoId', jamendoId);
        await User.findByIdAndUpdate(userId, {
            currentPlaying: { trackName, artistName, audioSrc }
        });
        const song = await Song.findOne({ jamendoId: jamendoId });
        console.log(song);
        console.log(song._id);
        //const user = await User.findById(userId);
        if (song) {
            user.listenedSongs.push(song._id);
            await user.save();
        }
        // await User.findByIdAndUpdate(req.user._id, {
        //     $push: {
        //         listenedSongs: { songId }
        //     }
        // });
        res.status(200).json({ message: 'Current playing song updated successfully.' });
    } catch (err) {
        console.error('Error updating current playing song:', err);
        res.status(500).json({ message: 'Error updating current playing song' });
    }
});

app.get('/songsHistory', authenticateJWT, async (req, res) => {
    const user = await User.findById(req.user._id).populate('listenedSongs'
        // path: 'listenedSongs.song',
        // populate: { path: 'name artist genre' }
    );
    console.log(user);
    const totalSongs = user.listenedSongs.length;
    const genreCounts = {};
    const artistCounts = {};

    user.listenedSongs.forEach(song => {
        const genre = song.genre;
        const artist = song.artist_name;
        //const language = song.language.name;
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });

    const genreDistribution = Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        percentage: (count / totalSongs) * 100
    }));

    const artistDistribution = Object.entries(artistCounts).map(([artist, count]) => ({
        artist,
        percentage: (count / totalSongs) * 100
    }));

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
    res.setHeader('Pragma', 'no-cache'); // HTTP 1.0.
    res.setHeader('Expires', '0'); // Proxies.

    console.log(user.listenedSongs);
    res.render('songHistory', {
        listenedSongs: user.listenedSongs,
        genreDistribution,
        artistDistribution
    });
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/playlist-image');
    },
    filename: function (req, file, cb) {
        const playlistName = req.body.playlistName;
        // console.log(req.body, 'mdjmd');
        // console.log(playlistName, req.body.playlistName, 'playlistName');
        const ext = path.extname(file.originalname);
        cb(null, `${playlistName}${ext}`);
    }
});

const upload = multer({ storage: storage });

app.post('/upload', authenticateJWT, upload.single('profileImage'), async (req, res) => {
    try {
        const user = req.user;
        const playlistName = req.body.playlistName;
        const playlistId = req.body.playlistId;
        const oldPath = req.file.path;
        const newFilename = `${playlistName}${path.extname(req.file.originalname)}`;
        const newPath = path.join(req.file.destination, newFilename);

        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Error renaming file:', err);
                return res.status(500).send('Error renaming file'); // internal server error
            }

            const imagePath = `/uploads/playlist-image/${newFilename}`;

            Playlist.findOneAndUpdate({ name: playlistName, user: user._id }, { image: imagePath }, { new: true })
                .then(updatedPlaylist => {
                    if (!updatedPlaylist) {
                        return res.status(404).send('Playlist not found');
                    }
                    res.redirect(`/playlistSelect?message=Updated playlist image&playlistId=${playlistId}`);
                })
                .catch(err => {
                    console.error('Error updating playlist image:', err);
                    res.redirect(`/playlistSelect?message=Error updating playlist image&playlistId=${playlistId}`);
                });
        });
    } catch (err) {
        console.error('Error processing upload:', err);
        res.status(500).send('Error processing upload');
    }
});