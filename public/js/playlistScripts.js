document.addEventListener('DOMContentLoaded', function () {
    const uploadIcon = document.getElementById('uploadIcon');
    const profileImageInput = document.getElementById('profileImageInput');

    uploadIcon.addEventListener('click', function () {
        profileImageInput.click();
    });

    profileImageInput.addEventListener('change', function () {
        document.getElementById('uploadForm').submit();
    });
});

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.innerText = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

let currentTrackIndex = 0;
let tracks = [];

function sequencePlaylist(playlistTracks) {
    if (!playlistTracks || playlistTracks.length === 0) {
        console.error("No tracks available to play.");
        return;
    }
    tracks = playlistTracks;
    currentTrackIndex = 0;
    playCurrentTrack();
}

function playCurrentTrack() {
    if (currentTrackIndex >= tracks.length) {
        console.log("Reached the end of the playlist.");
        return;
    }

    const track = tracks[currentTrackIndex];
    const audioElement = document.getElementById('audio');
    console.log(track);

    // Update the now-playing information
    document.getElementById('now-playing-track').textContent = `Track: ${track.name}`;
    document.getElementById('now-playing-artist').textContent = `Artist: ${track.artist_name}`;

    // Set the audio source and play
    audioElement.src = track.audio;
    audioElement.play();

    // Move to the next track when the current track ends
    audioElement.onended = () => {
        currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
        playCurrentTrack();
    };
}

function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    console.log(params);
    return params.get('token');
    // const name = 'token=';
    // const decodedCookie = decodeURIComponent(document.cookie);
    // console.log(decodedCookie);
    // const ca = decodedCookie.split(';');
    // for (let i = 0; i < ca.length; i++) {
    //     let c = ca[i].trim();
    //     if (c.indexOf(name) === 0) {
    //         return c.substring(name.length, c.length);
    //     }
    // }
    // return '';
}

function likeSong(songId) {
    console.log(songId, 'hhhhhhhhhhhh');
    const token = getTokenFromURL();

    fetch('/like-song', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ songId })
    }).then(response => response.text())
        .then(message => alert(message))
        .catch(error => console.error('Error liking song:', error));
}

function dislikeSong(songId) {
    const token = getTokenFromURL();
    fetch('/dislike-song', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ songId })
    }).then(response => response.text())
        .then(message => alert(message))
        .catch(error => console.error('Error disliking song:', error));
}

document.addEventListener('click', function (event) {
    console.log('Playlist clicked:', this.textContent);
    if (event.target && event.target.matches('#homepageContainer')) {
        document.getElementById('homepageForm').submit();
    }
})

