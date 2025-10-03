let current = 0,
	track = document.getElementById("track"),
	duration = track.duration, // Duration of audio clip (NaN here as the track is not loaded)
	playhead = document.getElementById("playhead"), // playhead
	timeline = document.getElementById("timeline"), // timeline
	timelineWidth = timeline.offsetWidth - playhead.offsetWidth,
	playPauseBtn = document.getElementById("play-pause"),
	playNextBtn = document.getElementById("play-next"),
	playPrevBtn = document.getElementById("play-prev"),
	repeatBtn = document.getElementById("repeat");

// First Init
function initPlayer() {
	audio = document.getElementById('track');
	audio.volume = 0.5;

	audio.addEventListener('ended', function (e) {
		// Let's check if the repeat button is on, then play the track again.
		let times = repeatBtn.getAttribute("repeat");
		if (times > 0) {
			playPauseBtn.className = "";
			playPauseBtn.className = "pause";
			track.play();
			return;
		}
		playNext();
	});

	// Update the track duration when the track is loaded.
	audio.addEventListener("canplaythrough", function () {
		duration = track.duration;
		timeUpdate();
	}, false);

	// Timeupdate event listener
	audio.addEventListener("timeupdate", timeUpdate, false);

	// Make timeline clickable
	timeline.addEventListener("click", function (event) {
		moveplayhead(event);
		track.currentTime = duration * clickPercent(event);
	}, false);

	// PreLoad first song
	load(songs[0]);

	playPauseBtn.addEventListener("click", playPause);
	playNextBtn.addEventListener("click", playNext);
	playPrevBtn.addEventListener("click", playPrev);
	repeatBtn.addEventListener("click", repeat);
}

// Load Songs
function loadSongs(albumId, needShuffle) {
	songs = data.map(m => m.songs).flat();

	if (albumId) {
		songs = songs
			.filter(s => s.albumId == albumId)
			.sort((a, b) => a.order - b.order);
	}

	if (needShuffle) {
		shuffle(songs);
	}

	len = songs.length - 1;
	current = -1;
}

// Load Next Song
function load(song) {
	var album = data.find(f => f.id == song.albumId);

	audioSource = document.getElementById('track-source');
	audioSource.src = `${album.path}${song.name}.${album.format}`;
	audio.load(); // Call this to just preload the audio without playing

	playerCover = document.getElementById('thumb');
	playerCover.src = `${album.path}cover.webp`;

	trackName = document.getElementById('track-name');
	trackName.innerText = song.name;
	trackName.title = song.name;

	currentSong = song;
}

// Randomize Songs List
function shuffle(array) {
	let currentIndex = array.length;
	while (currentIndex != 0) {
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
}

// PlayPause Button Click
function playPause() {
	document.title = `Evanescence - ${currentSong.name}`;

	if (audio.paused) {
		audio.play();
		playPauseBtn.className = "pause";
	} else {
		audio.pause();
		playPauseBtn.className = "play";
	}
}

// PlayNext Button Click
function playNext() {
	forcePause();

	current++;
	if (current > len) {
		current = 0;
		load(songs[current]);
	}
	else {
		var song = songs[current];
		selectSong(song.order);
		load(song);
		playPause();
	}
}

// PlayPrev Button Click
function playPrev() {
	if (audio) {
		audio.pause();
	}

	current--;
	if (current <= 0) {
		current = 0;
	}

	var song = songs[current];
	selectSong(song.order);
	load(song);
	playPause();
}

// Force Pause
function forcePause() {
	if (audio) {
		audio.pause();
		playPauseBtn.className = "play";
	}
}

// Repeat
function repeat() {
	repeatBtn.setAttribute("repeat", 0);
	repeatBtn.classList.toggle("icon-repeat-again");

	if (repeatBtn.classList.contains("icon-repeat-again")) {
		repeatBtn.setAttribute("repeat", 1);
	}
}

// Time update
function timeUpdate() {
	let playPercent = timelineWidth * (track.currentTime / duration);
	playhead.style.marginLeft = playPercent + "px";
	scrub.style.width = playPercent + "px";

	// Current time
	document.getElementById("duration-time").innerHTML = formatSecondsAsTime(duration > 0 ? duration : 0);
	document.getElementById("current-time").innerHTML = formatSecondsAsTime(Math.floor(track.currentTime));
}

// Synchronizes playhead position with current point in audio
function formatSecondsAsTime(secs) {
	let hr = Math.floor(secs / 3600);
	let min = Math.floor((secs - hr * 3600) / 60);
	let sec = Math.floor(secs - hr * 3600 - min * 60);

	if (min < 10) {
		min = "0" + min;
	}
	if (sec < 10) {
		sec = "0" + sec;
	}
	return min + ":" + sec;
}

// Moves playhead as user clicks
function moveplayhead(event) {
	let newMargLeft = event.clientX - getPosition(timeline);

	if (newMargLeft >= 0 && newMargLeft <= timelineWidth) {
		playhead.style.marginLeft = newMargLeft + "px";
	}
	if (newMargLeft < 0) {
		playhead.style.marginLeft = "0px";
	}
	if (newMargLeft > timelineWidth) {
		playhead.style.marginLeft = timelineWidth + "px";
	}
}

// Position
function getPosition(el) {
	return el.getBoundingClientRect().left;
}

// Returns decimal number of the total timelineWidth
function clickPercent(event) {
	return (event.clientX - getPosition(timeline)) / timelineWidth;
}

function selectSong(id) {
	var songsList = Array.from(document.getElementsByClassName('song'));
	if (songsList) {
		var nextSongItem = songsList.find(s => s.getAttribute("data-id") == id);
		selectCurrentSong(nextSongItem);
	}
}

// Select current song from playlist
function selectCurrentSong(songItem) {
	if (songItem) {
		[].forEach.call(document.querySelectorAll('.song'), function (el) {
			el.classList.remove("active");
		});
		songItem.classList.add('active');
	}
}
