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
const { Strategy: OAuth2Strategy } = require('passport-oauth2');
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
    callbackURL: '/auth/google/callback' // Replace with your callback URL
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists in your database based on profile.id or create a new user
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
                user = new User({
                    googleId: profile.id,
                    username: profile.displayName, // or other profile data you want to save
                    // other fields   profile.emails[0].value
                });
                await user.save();
            }

            return done(null, user);
        } catch (err) {
            return done(err, false);
        }
    }
));

class DeltaStrategy extends OAuth2Strategy {
    constructor(options, verify) {
        options = options || {};
        // this._oauth2._authorizeUrl = 'https://auth.delta.nitt.edu/authorize';
        // this._oauth2._accessTokenUrl = 'https://auth.delta.nitt.edu/api/oauth/token';
        options.authorizationURL = options.authorizationURL || 'https://auth.delta.nitt.edu/authorize';
        options.tokenURL = options.tokenURL || 'https://auth.delta.nitt.edu/api/oauth/token';
        super(options, verify);
        this.name = 'delta';
    }

    // userProfile(accessToken, done) {
    //     axios.post('https://auth.delta.nitt.edu/api/resources/user', {}, {
    //         headers: {
    //             Authorization: `Bearer ${accessToken}`
    //         }
    //     })
    //         .then(response => {
    //             const profile = {
    //                 provider: 'delta',
    //                 id: response.data.id,
    //                 username: response.data.email.split('@')[0],
    //                 displayName: response.data.name,
    //                 emails: [{ value: response.data.email }]
    //             };
    //             done(null, profile);
    //         })
    //         .catch(err => done(err));
    // }
    userProfile(accessToken, done) {
        this._oauth2.get('https://auth.delta.nitt.edu/api/resources/user', accessToken, (err, body) => {
            if (err) {
                return done(err);
            }

            try {
                const json = JSON.parse(body);
                const profile = {
                    id: json.id,
                    username: json.username,
                    emails: [{ value: json.email }],
                    displayName: json.name,
                    provider: 'delta'
                };
                done(null, profile);
            } catch (err) {
                console.error('Error during delta OAuth handler:', err);

                res.status(404).json({
                    status: "fail",
                    message: err.message || 'Unknown error',
                });
            }
        });
    }
}

passport.use(new DeltaStrategy({
    clientID: process.env.CLIENT_ID_DELTA_OAUTH,
    clientSecret: process.env.CLIENT_SECRET_DELTA_OAUTH,
    callbackURL: '/auth/delta/callback',
    passReqToCallback: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ deltaId: profile.id });

        if (!user) {
            user = new User({
                deltaId: profile.id,
                username: profile.username,
                // email: profile.emails[0].value,
                // name: profile.displayName,
                // photo: '/img/users/default-photo.png'
            });
            await user.save();
        }

        return done(null, user);
    } catch (err) {
        return done(err, false);
    }
}));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads/playlist-image');
    },
    filename: function (req, file, cb) {
        const playlistName = req.body.playlistName;
        console.log(req.body, 'mdjmd');
        console.log(playlistName, req.body.playlistName, 'playlistName');
        const ext = path.extname(file.originalname);
        cb(null, `${playlistName}${ext}`);
    }
});

const upload = multer({ storage: storage });

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
        const user = await User.findById(req.user._id)
            .populate('playlists')
            .populate('likedSongs');
        const receivedRequests = await Friend.find({ receiver: user, status: 0 });
        const pendingRequests = await Friend.find({ requester: user, status: 0 });
        console.log(receivedRequests, 'received requests');
        console.log(pendingRequests, 'pending requests');
        if (searchType === 'tracks') {
            const users = await User.find({});
            const params = {
                client_id: JAMENDO_CLIENT_ID,
                limit: 10,
                format: 'json'
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
                jamendoId: track.id
            }));
            await addTracksToDatabase(tracks);
            console.log(tracks);
            res.render('homepage', {
                users,
                tracks,
                selectedQuery: search,
                selectedGenre: genre,
                user: user,
                receivedRequests,
                pendingRequests
            });
        }
        else if (searchType === 'users') {
            const users = await User.find({
                username: { $regex: new RegExp(search, 'i') }
            }).sort({ username: 1 });

            console.log(users);

            res.render('homepage', {
                users,
                selectedQuery: search,
                selectedGenre: genre,
                user: user,
                tracks: null,
                receivedRequests,
                pendingRequests
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
        //const genre = req.query.genre || '';
        //const user = req.user;
        // const user = req.user.populate('playlists');
        console.log(genre);
        const user = await User.findById(req.user._id)
            .populate('playlists')
            .populate('likedSongs');

        const users = await User.find({});
        const receivedRequests = await Friend.find({ receiver: user, status: 0 });
        const pendingRequests = await Friend.find({ requester: user, status: 0 });

        const response = await axios.get('https://api.jamendo.com/v3.0/tracks', {
            params: {
                client_id: JAMENDO_CLIENT_ID,
                limit: 10,
                format: 'json',
                tags: genre
            }
        });

        //console.log(response);

        const tracks = response.data.results.map(track => ({
            id: track.id,
            name: track.name,
            artist_name: track.artist_name,
            audio: track.audio,
            image: track.album_image,
            jamendoId: track.id
        }));

        await addTracksToDatabase(tracks);

        console.log(tracks);

        res.render('homepage', {
            users,
            tracks,
            selectedGenre: genre,
            user: user,
            receivedRequests,
            pendingRequests
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
        console.log(response.data);
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

        // Log current playlist songs and their jamendoIds
        console.log('Current playlist songs:', playlist.songs.map(s => s.jamendoId));

        // Ensure the comparison uses the same type
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
        const playlistId = req.query.playlistId; // Use query to get playlistId
        const playlist = await Playlist.findById(playlistId).populate('songs'); // Populate tracks
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

// app.post('/upload', upload.single('profileImage'), authenticateJWT, (req, res) => {
//     console.log('Request Body:', req.body);
//     const user = req.user;
//     const playlistName = req.body.playlistName;
//     const imagePath = `/uploads/playlist-image/${playlistName}${path.extname(req.file.originalname)}`;

//     Playlist.findOneAndUpdate({ name: playlistName, user: user._id }, { image: imagePath }, { new: true })
//         .then(updatedPlaylist => {
//             if (!updatedPlaylist) {
//                 return res.status(404).send('Playlist not found');
//             }
//             res.send('Updated playlist image');
//         })
//         .catch(err => {
//             console.error('Error updating playlist image:', err);
//             res.status(500).send('Error updating playlist image');
//         });
// });

app.post('/upload', authenticateJWT, upload.single('profileImage'), async (req, res) => {
    try {
        const user = req.user;
        const playlistName = req.body.playlistName;
        const oldPath = req.file.path;
        const newFilename = `${playlistName}${path.extname(req.file.originalname)}`;
        const newPath = path.join(req.file.destination, newFilename);

        // Rename the file to include the playlist name
        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error('Error renaming file:', err);
                return res.status(500).send('Error renaming file');
            }

            const imagePath = `/uploads/playlist-image/${newFilename}`;

            // Update the playlist image path in the database
            Playlist.findOneAndUpdate({ name: playlistName, user: user._id }, { image: imagePath }, { new: true })
                .then(updatedPlaylist => {
                    if (!updatedPlaylist) {
                        return res.status(404).send('Playlist not found');
                    }
                    res.send('Updated playlist image');
                })
                .catch(err => {
                    console.error('Error updating playlist image:', err);
                    res.status(500).send('Error updating playlist image');
                });
        });
    } catch (err) {
        console.error('Error processing upload:', err);
        res.status(500).send('Error processing upload');
    }
});