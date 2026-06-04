/* ===== main.js ===== */

(function () {
	'use strict';

	let currentFilterType = null;
	let favourites = new Set();

	/* ---- DOM refs ---- */
	const appContent  = document.getElementById('app-content');
	const albumsRow   = document.getElementById('albums-row');
	const tracklistEl = document.getElementById('tracklist');
	const mainTitle   = document.getElementById('main-title');
	const mainSub     = document.getElementById('main-sub');
	const searchInput = document.getElementById('search-input');
	const menuBtn     = document.getElementById('menu-btn');
	const sidebar     = document.getElementById('sidebar');
	const overlay     = document.getElementById('sidebar-overlay');
	const npLike      = document.getElementById('np-like');

	/* ---- Init ---- */
	document.addEventListener('DOMContentLoaded', () => {
		initPlayer();
		render();
		bindEvents();
		initTheme();
	});

	/* ---- Theme ---- */
	function initTheme() {
		const saved = localStorage.getItem('evmusic-theme') || 'dark';
		applyTheme(saved);

		document.getElementById('theme-btn').addEventListener('click', () => {
			const current = document.documentElement.getAttribute('data-theme') || 'dark';
			const next = current === 'dark' ? 'light' : 'dark';
			applyTheme(next);
			localStorage.setItem('evmusic-theme', next);
		});
	}

	function applyTheme(theme) {
		document.documentElement.setAttribute('data-theme', theme);
		const btn  = document.getElementById('theme-btn');
		const moon = btn.querySelector('.icon-moon');
		const sun  = btn.querySelector('.icon-sun');
		if (theme === 'light') {
			moon.style.display = 'none';
			sun.style.display  = 'block';
			btn.title = 'Switch to dark theme';
		} else {
			moon.style.display = 'block';
			sun.style.display  = 'none';
			btn.title = 'Switch to light theme';
		}
	}

	function bindEvents() {
		/* Sidebar filter nav */
		document.querySelectorAll('.filter-item').forEach(el => {
			el.addEventListener('click', () => {
				const type = el.dataset.type;
				if (currentFilterType === type) {
					currentFilterType = null;
				} else {
					currentFilterType = type;
				}
				updateNavActive();
				render();
			});
		});

		/* "Library" nav clears filter */
		document.querySelector('[data-view="all"]')?.addEventListener('click', () => {
			currentFilterType = null;
			updateNavActive();
			render();
		});

		/* Search */
		searchInput.addEventListener('input', renderTracklist);

		/* Mobile sidebar toggle */
		menuBtn.addEventListener('click', () => {
			sidebar.classList.toggle('open');
			overlay.classList.toggle('open');
		});
		overlay.addEventListener('click', closeSidebar);

		/* Like button in player */
		npLike.addEventListener('click', () => {
			if (!currentSong) return;
			const key = `${currentSong.albumId}_${currentSong.order}`;
			if (favourites.has(key)) {
				favourites.delete(key);
				npLike.classList.remove('liked');
			} else {
				favourites.add(key);
				npLike.classList.add('liked');
			}
			/* Update heart in tracklist if visible */
			renderTracklist();
		});
	}

	function closeSidebar() {
		sidebar.classList.remove('open');
		overlay.classList.remove('open');
	}

	function updateNavActive() {
		document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
		if (currentFilterType) {
			document.querySelector(`[data-type="${currentFilterType}"]`)?.classList.add('active');
		} else {
			document.querySelector('[data-view="all"]')?.classList.add('active');
		}
	}

	/* ---- Render ---- */
	function render() {
		renderAlbums();
		renderTracklist();
		updateHeader();
	}

	function getVisibleAlbums() {
		let albums = data;
		if (currentFilterType) albums = albums.filter(a => a.type === currentFilterType);
		return [...albums].sort((a, b) => b.date - a.date);
	}

	function getAllTracks() {
		return data.flatMap(album =>
			album.songs.map(s => ({ ...s, albumName: album.name, albumDate: album.date, albumType: album.type, path: album.path, format: album.format }))
		);
	}

	function getFilteredTracks() {
		let tracks = getAllTracks();
		if (currentFilterType) tracks = tracks.filter(t => t.albumType === currentFilterType);
		return tracks;
	}

	function renderAlbums() {
		const albums = getVisibleAlbums();
		albumsRow.innerHTML = albums.map(album => {
			const year = album.date > 0 ? album.date : '';
			return `<div class="album-card" data-id="${album.id}">
				<div class="album-card-cover">
					<img src="${album.path}cover.webp" alt="${escHtml(album.name)}" loading="lazy"
						onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
					<div class="cover-placeholder" style="display:none">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>
					</div>
				</div>
				<div class="a-name">${escHtml(album.name)}</div>
				<div class="a-meta">${year}${year && album.type ? ' · ' : ''}${album.type}</div>
			</div>`;
		}).join('');

		albumsRow.querySelectorAll('.album-card').forEach(el => {
			el.addEventListener('click', () => {
				const album = data.find(a => a.id == el.dataset.id);
				if (album) openAlbum(album);
			});
		});
	}

	function openAlbum(album) {
		currentFilterType = album.type;
		updateNavActive();
		renderAlbums();

		/* Filter tracks to this album and load into player queue */
		loadSongs(album.id);

		mainTitle.textContent = album.name;
		mainSub.textContent = `${album.date > 0 ? album.date + ' · ' : ''}${album.songs.length} tracks`;
		renderTracklist(album.id);
	}

	function renderTracklist(filterAlbumId) {
		const query = searchInput.value.trim().toLowerCase();
		let tracks = getFilteredTracks();

		if (filterAlbumId) {
			tracks = data.find(a => a.id == filterAlbumId)?.songs
				.map(s => {
					const a = data.find(a => a.id == filterAlbumId);
					return { ...s, albumName: a.name, albumDate: a.date, albumType: a.type, path: a.path, format: a.format };
				}) || tracks;
		}

		if (query) {
			tracks = tracks.filter(t =>
				t.name.toLowerCase().includes(query) ||
				t.albumName.toLowerCase().includes(query)
			);
		}

		if (tracks.length === 0) {
			tracklistEl.innerHTML = `<div class="no-results">No tracks found</div>`;
			return;
		}

		tracklistEl.innerHTML = tracks.map((t, i) => {
			const isActive = currentSong && currentSong.albumId === t.albumId && currentSong.order === t.order;
			const isPaused = isActive && !window._isPlaying;
			return `<div class="track-row${isActive ? ' active' : ''}${isPaused ? ' paused' : ''}" data-albumid="${t.albumId}" data-order="${t.order}">
				<div class="t-num">${i + 1}</div>
				<div class="t-playing-icon">
					<div class="playing-bars"><span></span><span></span><span></span></div>
				</div>
				<div class="t-name">${escHtml(t.name)}</div>
				<div class="t-album">${escHtml(t.albumName)}</div>
				<div class="t-dur">${t.duration}</div>
			</div>`;
		}).join('');

		tracklistEl.querySelectorAll('.track-row').forEach(el => {
			el.addEventListener('click', () => {
				const albumId = +el.dataset.albumid;
				const order   = +el.dataset.order;

				/* Rebuild the songs queue for the current view */
				const queueTracks = tracks;
				songs = queueTracks.map((t, i) => ({ ...t, order: i + 1, _origOrder: t.order, _albumId: t.albumId }));
				len   = songs.length - 1;

				const clicked = songs.find(s => s._albumId === albumId && s._origOrder === order);
				if (!clicked) return;

				current = songs.indexOf(clicked);
				selectCurrentSong(el);
				load(clicked);
				playPause();
			});
		});
	}

	function updateHeader() {
		if (currentFilterType) {
			mainTitle.textContent = currentFilterType;
			const count = getFilteredTracks().length;
			mainSub.textContent = `${count} track${count !== 1 ? 's' : ''}`;
		} else {
			mainTitle.textContent = 'All tracks';
			const count = getAllTracks().length;
			mainSub.textContent = `${count} track${count !== 1 ? 's' : ''}`;
		}
	}

	/* ---- Helpers ---- */
	function escHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/* ---- Public API for player.js ---- */
	window.selectSong = function (id) {
		const rows = Array.from(document.querySelectorAll('.track-row'));
		const target = rows.find(r => {
			const order = +r.dataset.order;
			return order === id;
		});
		selectCurrentSong(target);
	};

	window.selectCurrentSong = function (songItem) {
		document.querySelectorAll('.track-row').forEach(el => el.classList.remove('active', 'paused'));
		if (songItem) songItem.classList.add('active');
	};

	window.getAlbumById = function (id) {
		return data.find(a => a.id == id);
	};

})();
