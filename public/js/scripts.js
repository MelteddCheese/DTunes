let playlist = [];
let currentTrackIndex = 0;

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.innerText = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

async function playTrack(audioSrc, trackName, artistName, lyrics, jamendoId) {
    console.log(lyrics, '=lyrics');
    console.log(artistName, jamendoId);
    const audio = document.getElementById('audio');
    const nowPlayingTrack = document.getElementById('now-playing-track');
    const nowPlayingArtist = document.getElementById('now-playing-artist');
    const lyricsModal = document.getElementById('lyrics-modal');
    const lyricsTitle = document.getElementById('lyrics-title');
    const lyricsText = document.getElementById('lyrics-text');
    let id = '';

    lyricsTitle.innerText = trackName + ' - ' + artistName;
    for (i = 0; i < playlist.length; i++) {
        if (playlist[i].name == trackName && playlist[i].artist_name == artistName) {
            lyricsText.innerText = playlist[i].lyrics;
            id = playlist[i].jamendoId;
        }
    }
    //lyricsText.innerText = lyrics;
    console.log('id', id);

    console.log(lyricsText.innerText, 'innertext');

    audio.src = audioSrc;
    nowPlayingTrack.textContent = `Track: ${trackName}`;
    nowPlayingArtist.textContent = `Artist: ${artistName}`;

    // Send the update to the server
    await fetch('/update-current-playing', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            trackName,
            artistName,
            audioSrc,
            jamendoId: id,
        })
    });

    audio.play();

    audio.addEventListener('ended', () => {
        playNextTrack();
    });
}

function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    const nextTrack = playlist[currentTrackIndex];
    playTrack(nextTrack.audio, nextTrack.name, nextTrack.artist_name, nextTrack.lyrics, nextTrack.jamendoId);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("started");
    const trackElements = document.querySelectorAll('.track');
    trackElements.forEach((trackElement, index) => {
        const audioSrc = trackElement.getAttribute('data-audio');
        const lyrics = trackElement.getAttribute('data-lyrics');
        const trackName = trackElement.querySelector('.track-info h2').textContent;
        const artistName = trackElement.getAttribute('data-artist');
        const imageSrc = trackElement.querySelector('img').src;
        const jamendoId = trackElement.getAttribute('data-id');
        //console.log(lyrics);

        playlist.push({ audio: audioSrc, name: trackName, artist_name: artistName, image: imageSrc, lyrics, jamendoId });

        trackElement.addEventListener('click', () => {
            console.log("Play");
            currentTrackIndex = index;
            playTrack(audioSrc, trackName, artistName);
            console.log("played");
        });
    });
    console.log(playlist);
});

function togglePlaylist() {
    const playlists = document.getElementById('playlists');
    const createPlaylistForm = document.getElementById('createPlaylistForm');
    playlists.classList.toggle('hidden');
    createPlaylistForm.classList.toggle('hidden');

    const likedSongs = document.getElementById('liked-songs');
    if (playlists.classList.contains('hidden')) {
        likedSongs.style.marginTop = '20px';
    } else {
        likedSongs.style.marginTop = (playlists.clientHeight + 40) + 'px';
    }
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

// document.getElementById('homepageForm').addEventListener('submit', function (event) {
//     event.preventDefault(); // Prevent the default form submission

//     const token = getTokenFromURL(); // Function to get the token from the URL
//     const genre = document.getElementById('genre').value;

//     const url = new URL('/homepage', window.location.origin);
//     url.searchParams.append('genre', genre);
//     console.log(url);
//     fetch(url.href, {
//         method: 'GET',
//         headers: {
//             'Authorization': `Bearer ${token}`
//         }
//         // // Convert form data to query parameters
//         // body: JSON.stringify({ genre: genre })
//     })
//         // .then(response => {
//         //     if (!response.ok) {
//         //         throw new Error('Network response was not ok ' + response.statusText);
//         //     }
//         //     return response.json(); // If response is successful, parse it as JSON
//         // })
//         // .then(html => {
//         //     // Handle the HTML response
//         //     console.log(html);
//         //     // Update the main content with the new HTML
//         //     document.getElementById('main-content').innerHTML = html;
//         // })
//         .then(response => {
//             if (response.ok) {
//                 return response.text();
//             } else {
//                 throw new Error('Network response was not ok.');
//             }
//         })
//         .then(html => {
//             document.open();
//             document.write(html);
//             document.close();
//         })
//         .catch(error => {
//             console.error('Error:', error);
//         });
// });

// function handleFormSubmission(event) {
//     event.preventDefault(); // Prevent the default form submission

//     const token = getTokenFromURL(); // Function to get the token from the URL

//     if (!token) {
//         console.error('Token is missing');
//         return;
//     }
//     const genre = document.getElementById('genre').value;

//     const url = new URL('/homepage', window.location.origin);
//     url.searchParams.append('genre', genre);

//     fetch(url.href, {
//         method: 'GET',
//         credentials: 'include',
//         headers: {
//             'Authorization': `Bearer ${token}`
//         }
//     })
//         .then(response => {
//             if (response.ok) {
//                 return response.text();
//             } else {
//                 throw new Error('Network response was not ok.');
//             }
//         })
//         .then(html => {
//             // Update the browser history
//             history.pushState(null, '', url.href);
//             // Replace the page content
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(html, 'text/html');
//             document.body.innerHTML = doc.body.innerHTML;
//             // Reattach the event listener
//             document.getElementById('homepageForm').addEventListener('submit', handleFormSubmission);
//         })
//         .catch(error => {
//             console.error('Error:', error);
//         });
// }

// document.getElementById('homepageForm').addEventListener('submit', handleFormSubmission);

document.addEventListener('submit', function (event) {
    if (event.target && event.target.matches('#homepageForm')) {
        handleFormSubmission(event);
    }
    else if (event.target && event.target.matches('#createPlaylistForm')) {
        createPlaylist(event);
    }
});

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
        .then(message => showNotification(message))
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
        .then(message => showNotification(message))
        .catch(error => console.error('Error disliking song:', error));
}

function showPlaylistOptions(songId) {
    event.stopPropagation();
    console.log(`Showing playlist options for Jamendo ID: ${songId}`);
    const dropdown = document.getElementById(`playlist-options-${songId}`);
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function addToPlaylist(songId) {
    const token = getTokenFromURL();
    const playlistSelect = document.getElementById(`playlist-select-${songId}`);
    const selectedPlaylistId = playlistSelect.value;
    const jamId = songId;
    const dropdown = document.getElementById(`playlist-options-${songId}`);
    dropdown.style.display = dropdown.style.display = 'none';
    console.log(`Adding song with Jamendo ID: ${jamId} to playlist ID: ${selectedPlaylistId}`);
    fetch('/add-to-playlist', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ playlistId: selectedPlaylistId, songId: jamId })
    }).then(response => response.text())
        .then(message => showNotification(message))
        .catch(error => console.error('Error adding to playlist:', error));
}

function createPlaylist(event) {
    event.preventDefault();
    const token = getTokenFromURL();
    const playlistName = document.getElementById('newPlaylistName').value;

    if (playlistName) {
        fetch('/create-playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ playlistName })
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    const playlistList = document.getElementById('playlists');
                    const newPlaylist = document.createElement('div');
                    newPlaylist.classList.add('playlist');
                    newPlaylist.setAttribute('data-id', data.playlist._id);
                    newPlaylist.textContent = data.playlist.name;
                    newPlaylist.addEventListener('click', function () {
                        console.log('Playlist clicked:', data.playlist.name);
                    });
                    playlistList.appendChild(newPlaylist);

                    document.getElementById('newPlaylistName').value = '';
                    showNotification('New Playlist created successfully');
                } else {
                    showNotification('Error creating playlist');
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        console.log('Please enter playlist name');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', function (event) {
        //console.log('Playlist clicked:', event.target);
        if (event.target && event.target.matches('.playlist')) {
            const playlistId = event.target.getAttribute('data-id');
            const token = getTokenFromURL();

            fetch(`/playlistSelect?playlistId=${playlistId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    document.body.innerHTML = doc.body.innerHTML;

                    history.pushState(null, '', `/playlistSelect?playlistId=${playlistId}`);
                    // document.addEventListener('click', function (event) {
                    //     if (event.target && event.target.matches('.playlist')) {
                    //         handlePlaylistClick(event);
                    //     }
                    // });
                    document.getElementById('homepageForm').addEventListener('submit', handleFormSubmission);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
        else if (event.target && event.target.matches('#history')) {
            const token = getTokenFromURL();
            fetch('/songsHistory', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => response.text())
                .then(html => {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    document.body.innerHTML = doc.body.innerHTML;

                    history.pushState(null, '', '/songsHistory');

                    // document.getElementById('homepageForm').addEventListener('submit', handleFormSubmission);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
        else if (event.target && event.target.matches('.likedSongs-Button')) {
            console.log(event.target);
            const token = getTokenFromURL();
            fetch('/likedSongs', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(response => response.text())
                .then(html => {
                    console.log('page retrieved', html);
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    document.body.innerHTML = doc.body.innerHTML;

                    history.pushState(null, '', '/likedSongs');

                    // Reattach event listeners
                    // document.addEventListener('click', function (event) {
                    //     if (event.target && event.target.matches('.playlist')) {
                    //         handlePlaylistClick(event);
                    //     }
                    // });
                    // document.getElementById('homepageForm').addEventListener('submit', handleFormSubmission);
                    // Attach other necessary event listeners
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        }
        else if (event.target && event.target.matches('#toggleSearch')) {
            console.log("entered", event.target);
            let toggleSearch = event.target;
            let search = document.getElementById('search');
            let searchType = document.getElementById('searchType');
            console.log(toggleSearch.classList);
            if (toggleSearch.classList.contains("fa-toggle-off")) {
                console.log('off');
                try {
                    console.log("2nd entering");
                    toggleSearch.classList.remove("fa-toggle-off");
                    toggleSearch.classList.add("fa-toggle-on");
                    search.placeholder = "Search for users";
                    searchType.value = "users";
                } catch (error) {
                    console.log(error);
                }

            }
            else {
                console.log('on');
                toggleSearch.classList.remove("fa-toggle-on");
                toggleSearch.classList.add("fa-toggle-off");
                search.placeholder = "Search for tracks";
                searchType.value = "tracks";
            }
            console.log(toggleSearch.classList, "afterSearch");
        }
        else {
            console.log('Clicked on:', event.target.id);
        }
    })
})

function toggleNotifications() {
    const notifications = document.getElementById('notifications');
    notifications.classList.toggle('hidden');
    console.log(notifications.classList);
}

function toggleFriendsList() {
    const friendDisplay = document.getElementById('friendDisplay');
    friendDisplay.classList.toggle('hidden');
    console.log(friendDisplay.classList);
}

async function sendFriendRequest(receiverId) {
    try {
        const response = await fetch('/friendRequests/send-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiverId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.text();
        showNotification(result);
        const trackElement = document.querySelector(`.track[data-id='${receiverId}']`);
        const button = trackElement.querySelector('.friend-button[data-status="none"]');
        button.textContent = 'Request Sent';
        button.disabled = true;
        button.removeAttribute('onclick');
        button.setAttribute('data-status', 'pending');
    } catch (error) {
        console.error('Error sending friend request:', error);
        showNotification('Failed to send friend request');
    }
}

async function declineFriendRequest(friendRequestId, notification = false) {
    try {
        const response = await fetch('/friendRequests/decline-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendRequestId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.text();
        showNotification(result);

        if (!notification) {
            const trackElement = document.querySelector(`.track[data-id='${friendRequestId}']`);
            const buttons = trackElement.querySelectorAll('.friend-button[data-status="received"]');
            buttons.forEach(button => button.remove());

            const newButton = document.createElement('button');
            newButton.textContent = 'Send Request';
            newButton.setAttribute('onclick', `sendFriendRequest('${friendRequestId}')`);
            newButton.classList.add('friend-button');
            newButton.setAttribute('data-status', 'none');
            trackElement.appendChild(newButton);
        }
        else {
            const requestElement = document.querySelector(`.requests[data-id='${friendRequestId}']`);
            requestElement.innerHTML = `<h2>${requestElement.querySelector('h2').textContent} - Request Rejected</h2>`;

            // Optionally, remove the request element after a delay
            setTimeout(() => {
                requestElement.remove();
            }, 2000);
        }

    } catch (error) {
        console.error('Error declining friend request:', error);
        showNotification('Failed to decline friend request');
    }
}

async function acceptFriendRequest(friendRequestId, notification = false) {
    try {
        const response = await fetch('/friendRequests/accept-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ friendRequestId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.text();
        showNotification(result);

        if (!notification) {
            const trackElement = document.querySelector(`.track[data-id='${friendRequestId}']`);
            const buttons = trackElement.querySelectorAll('.friend-button[data-status="received"]');
            buttons.forEach(button => button.remove());

            const newButton = document.createElement('button');
            newButton.textContent = 'Is a friend';
            newButton.disabled = true;
            newButton.classList.add('friend-button');
            newButton.setAttribute('data-status', 'friend');
            trackElement.appendChild(newButton);
        }
        else {
            const requestElement = document.querySelector(`.requests[data-id='${friendRequestId}']`);
            requestElement.innerHTML = `<h2>${requestElement.querySelector('h2').textContent} - Request Accepted</h2>`;
            setTimeout(() => {
                requestElement.remove();
            }, 2000);
        }

    } catch (error) {
        console.error('Error accepting friend request:', error);
        showNotification('Failed to accept friend request');
    }
}

async function showFriendsToInvite(users, user) {
    const friends = users.filter(friend => friend.username !== user.username);
    const friendsList = document.getElementById('friendsList');
    friendsList.innerHTML = '';

    if (friends.length === 0) {
        friendsList.innerHTML = '<p>No friends to invite</p>';
    } else {
        friends.forEach(friend => {
            const friendDiv = document.createElement('div');
            friendDiv.innerHTML = `<p>${friend.username}</p>
                                   <button onclick="sendInvite('${friend._id}')">Invite</button>`;
            friendsList.appendChild(friendDiv);
        });
    }

    document.getElementById('friendInviteModal').classList.remove('hidden');
}

async function inviteToParty(friendName) {
    try {
        console.log(friendName, 'friendname');
        const response = await fetch('/partyInvites/send-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ toName: friendName })
        });

        if (!response.ok) {
            const errorText = await response.text();
            showNotification(errorText);
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        showNotification('Invite sent successfully');
        showPlaylistsToSelect(result.inviteId, result.playlists);
    } catch (error) {
        console.error('Error sending invite:', error);
        showNotification('Failed to send invite');
        //showNotification('Failed to send invite');
    }
}

async function showPlaylistsToSelect(inviteId, playlists) {
    console.log(playlists, inviteId);
    const playlistsList = document.getElementById('playlistsList');
    playlistsList.innerHTML = '';

    playlists.forEach(playlist => {
        const playlistDiv = document.createElement('div');
        playlistDiv.innerHTML = `<p>${playlist.name}</p>
                                 <button onclick="selectPlaylist('${inviteId}', '${playlist._id}')">Select</button>`;
        playlistsList.appendChild(playlistDiv);
    });

    document.getElementById('playlistSelectModal').classList.remove('hidden');
    console.log(document.getElementById('playlistSelectModal').classList);
}

function closePlaylistModal() {
    document.getElementById('playlistSelectModal').classList.add('hidden');
}
function closeInviteModal() {
    document.getElementById('friendInviteModal').classList.add('hidden');
}

async function selectPlaylist(inviteId, playlistId) {
    try {
        const response = await fetch('/partyInvites/select-playlist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inviteId, playlistId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        showNotification('Playlist selected');
        closePlaylistModal();
    } catch (error) {
        console.error('Error selecting playlist:', error);
        showNotification('Failed to select playlist');
    }
}

async function acceptPartyInvite(inviteId) {
    try {
        console.log(inviteId, 'inviteId');
        const response = await fetch('/partyInvites/accept-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inviteId })
        });

        if (!response.ok) {
            const errorText = await response.text();
            showNotification(errorText);
            throw new Error('Network response was not ok');
        }

        //showNotification('Invite accepted');
        showNotification('Invite accepted');
        const result = await response.json();
        showPlaylistsToSelect(inviteId, result.playlists);
    }
    catch (error) {
        console.error('Error accepting invite:', error);
        showNotification('Failed to accept invite');
    }
}

async function declinePartyInvite(inviteId) {
    try {
        console.log(inviteId, 'inviteId');
        const response = await fetch('/partyInvites/decline-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inviteId })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        showNotification('Invite declined');
    }
    catch (error) {
        console.error('Error declining invite:', error);
        showNotification('Failed to decline invite');
    }
}
function showLyrics() {
    const lyricsModal = document.getElementById('lyrics-modal');
    const lyricsTitle = document.getElementById('lyrics-title');
    const lyricsText = document.getElementById('lyrics-text');
    console.log(lyricsText);

    // lyricsTitle.innerText = currentTrack.name + ' - ' + currentTrack.artist_name;
    // lyricsText.innerText = currentTrack.lyrics;

    lyricsModal.style.display = 'block';
}

function closeLyrics() {
    const lyricsModal = document.getElementById('lyrics-modal');
    lyricsModal.style.display = 'none';
}