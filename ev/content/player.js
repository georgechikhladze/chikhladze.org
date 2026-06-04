/* ===== player.js ===== */

(function () {
	'use strict';

	/* ---- State ---- */
	window.songs      = [];
	window.len        = 0;
	window.current    = -1;
	window.currentSong = { albumId: null, order: -1 };

	let audio        = null;
	let duration     = 0;
	let isPlaying    = false;
	let repeatOn     = false;
	let shuffleOn    = false;
	let isSeeking    = false;

	/* ---- DOM ---- */
	const btnPlay    = document.getElementById('btn-play');
	const btnNext    = document.getElementById('btn-next');
	const btnPrev    = document.getElementById('btn-prev');
	const btnRepeat  = document.getElementById('btn-repeat');
	const btnShuffle = document.getElementById('btn-shuffle');
	const playIcon   = document.getElementById('play-icon');
	const tlTrack    = document.getElementById('tl-track');
	const tlFill     = document.getElementById('tl-fill');
	const tlThumb    = document.getElementById('tl-thumb');
	const tCur       = document.getElementById('t-cur');
	const tDur       = document.getElementById('t-dur');
	const npTitle    = document.getElementById('np-title');
	const npArtist   = document.getElementById('np-artist');
	const npCover    = document.getElementById('np-cover');
	const volSlider  = document.getElementById('vol-slider');

	/* ---- Init ---- */
	window.initPlayer = function () {
		audio = document.createElement('audio');
		audio.preload = 'metadata';
		document.body.appendChild(audio);

		audio.volume = volSlider.value / 100;

		audio.addEventListener('ended', onEnded);
		audio.addEventListener('timeupdate', onTimeUpdate);
		audio.addEventListener('loadedmetadata', () => { duration = audio.duration; updateTimeDisplay(); });
		audio.addEventListener('canplay', () => { duration = audio.duration; });

		btnPlay.addEventListener('click', () => { window.playPause(); });
		btnNext.addEventListener('click', playNext);
		btnPrev.addEventListener('click', playPrev);
		btnRepeat.addEventListener('click', toggleRepeat);
		btnShuffle.addEventListener('click', toggleShuffle);

		volSlider.addEventListener('input', () => {
			audio.volume = volSlider.value / 100;
		});

		/* Timeline seek */
		tlTrack.addEventListener('mousedown', startSeek);
		tlTrack.addEventListener('touchstart', startSeekTouch, { passive: true });

		/* Keyboard shortcuts */
		document.addEventListener('keydown', onKeyDown);

		/* Load first song */
		window.loadSongs(null, false);
		if (songs.length > 0) {
			window.load(songs[0]);
		}
	};

	/* ---- loadSongs ---- */
	window.loadSongs = function (albumId, needShuffle) {
		const allTracks = data.flatMap(album =>
			album.songs.map((s, i) => ({
				...s,
				albumId:   album.id,
				albumName: album.name,
				path:      album.path,
				format:    album.format,
				date:      album.date,
				order:     s.order ?? (i + 1),
			}))
		);

		if (albumId) {
			songs = allTracks.filter(s => s.albumId == albumId).sort((a, b) => a.order - b.order);
		} else {
			songs = allTracks;
		}

		if (needShuffle) shuffle(songs);

		len     = songs.length - 1;
		current = -1;
	};

	/* ---- load (song object or index) ---- */
	window.load = function (song) {
		if (!song) return;

		/* Resolve the album either from the song object or from data */
		const album = data.find(a => a.id == song.albumId) || song;
		const basePath = song.path || album?.path || '';
		const fmt      = song.format || album?.format || 'mp3';

		audio.src = `${basePath}${song.name}.${fmt}`;
		audio.load();

		window.currentSong = song;

		/* Update now-playing UI */
		npTitle.textContent  = song.name;
		npTitle.title        = song.name;
		npArtist.textContent = `${song.albumName || album?.name || ''} · ${song.date || album?.date || ''}`;

		/* Cover image */
		const coverSrc = `${basePath}cover.webp`;
		npCover.innerHTML = '';
		const img = document.createElement('img');
		img.alt = song.albumName || '';
		img.src = coverSrc;
		img.onerror = () => {
			npCover.innerHTML = svgMusicNote();
		};
		npCover.appendChild(img);

		document.title = `Evanescence — ${song.name}`;

		/* Reset timeline */
		duration = 0;
		updateTimeDisplay();
		setTimeline(0);
	};

	/* ---- playPause ---- */
	window.playPause = function () {
		if (!audio.src || audio.src === window.location.href) {
			if (songs.length > 0) {
				current = 0;
				window.load(songs[0]);
				playAudio();
			}
			return;
		}

		if (audio.paused) {
			playAudio();
		} else {
			pauseAudio();
		}
	};

	function playAudio() {
		audio.play().then(() => {
			isPlaying = true;
			window._isPlaying = true;
			setPlayIcon(true);
			setBarsPaused(false);
		}).catch(() => {});
	}

	function pauseAudio() {
		audio.pause();
		isPlaying = false;
		window._isPlaying = false;
		setPlayIcon(false);
		setBarsPaused(true);
	}

	function setBarsPaused(paused) {
		const active = document.querySelector('.track-row.active');
		if (active) active.classList.toggle('paused', paused);
	}

	/* ---- Next / Prev ---- */
	function playNext() {
		pauseAudio();
		if (songs.length === 0) return;

		if (shuffleOn) {
			current = Math.floor(Math.random() * songs.length);
		} else {
			current = (current + 1) > len ? 0 : current + 1;
		}

		const song = songs[current];
		selectSong(song.order);
		window.load(song);
		playAudio();
	}

	function playPrev() {
		pauseAudio();
		if (songs.length === 0) return;

		if (audio.currentTime > 3) {
			audio.currentTime = 0;
			playAudio();
			return;
		}

		current = (current - 1) < 0 ? len : current - 1;
		const song = songs[current];
		selectSong(song.order);
		window.load(song);
		playAudio();
	}

	function onEnded() {
		if (repeatOn) {
			audio.currentTime = 0;
			playAudio();
			return;
		}
		playNext();
	}

	/* ---- Repeat / Shuffle ---- */
	function toggleRepeat() {
		repeatOn = !repeatOn;
		btnRepeat.classList.toggle('on', repeatOn);
	}

	function toggleShuffle() {
		shuffleOn = !shuffleOn;
		btnShuffle.classList.toggle('on', shuffleOn);
	}

	/* ---- Timeline ---- */
	function onTimeUpdate() {
		if (isSeeking) return;
		const pct = duration > 0 ? audio.currentTime / duration : 0;
		setTimeline(pct);
		tCur.textContent = formatTime(audio.currentTime);
	}

	function setTimeline(pct) {
		const p = Math.max(0, Math.min(1, pct)) * 100;
		tlFill.style.width  = p.toFixed(2) + '%';
		tlThumb.style.left  = p.toFixed(2) + '%';
	}

	function updateTimeDisplay() {
		tCur.textContent = formatTime(audio.currentTime || 0);
		tDur.textContent = formatTime(duration || 0);
	}

	function startSeek(e) {
		isSeeking = true;
		tlTrack.classList.add('seeking');
		seek(e.clientX);

		const onMove = (e) => seek(e.clientX);
		const onUp   = (e) => {
			seek(e.clientX, true);
			isSeeking = false;
			tlTrack.classList.remove('seeking');
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	function startSeekTouch(e) {
		if (!e.touches.length) return;
		isSeeking = true;
		seek(e.touches[0].clientX);

		const onMove = (e) => { if (e.touches.length) seek(e.touches[0].clientX); };
		const onEnd  = (e) => {
			if (e.changedTouches.length) seek(e.changedTouches[0].clientX, true);
			isSeeking = false;
			tlTrack.removeEventListener('touchmove', onMove);
			tlTrack.removeEventListener('touchend', onEnd);
		};
		tlTrack.addEventListener('touchmove', onMove, { passive: true });
		tlTrack.addEventListener('touchend', onEnd);
	}

	function seek(clientX, commit) {
		const rect = tlTrack.getBoundingClientRect();
		const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		setTimeline(pct);
		tCur.textContent = formatTime((duration || 0) * pct);
		if (commit && duration > 0) {
			audio.currentTime = duration * pct;
		}
	}

	/* ---- Volume ---- */
	window.setVolume = function (v) {
		audio.volume = Math.max(0, Math.min(1, v));
		volSlider.value = Math.round(audio.volume * 100);
	};

	/* ---- Keyboard ---- */
	function onKeyDown(e) {
		if (e.target.tagName === 'INPUT') return;
		if (e.code === 'Space') { e.preventDefault(); window.playPause(); }
		if (e.code === 'ArrowRight') { audio.currentTime = Math.min(audio.currentTime + 5, duration || 0); }
		if (e.code === 'ArrowLeft')  { audio.currentTime = Math.max(audio.currentTime - 5, 0); }
	}

	/* ---- Helpers ---- */
	function setPlayIcon(playing) {
		playIcon.innerHTML = playing
			? '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>'
			: '<polygon points="5 3 19 12 5 21 5 3"/>';
	}

	function formatTime(secs) {
		secs = Math.floor(secs || 0);
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${s < 10 ? '0' : ''}${s}`;
	}

	function shuffle(arr) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
	}

	function svgMusicNote() {
		return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
			<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>
		</svg>`;
	}

})();
