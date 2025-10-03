document.addEventListener("DOMContentLoaded", (event) => {
	const app = document.getElementById("app");
	renderMainScreen();
	initPlayer();
	
	function renderMainScreen() {
		app.innerHTML = "<h1>EvMusic</h1>";
		loadSongs(null, true);

		const albums = data.filter((item) => item.type == "Studio");
		renderAlbums(albums, "Studio");

		const demos = data.filter((item) => item.type == "Demo");
		renderAlbums(demos, "Demo");

		const compilations = data.filter((item) => item.type == "Compilation");
		renderAlbums(compilations, "Compilation");

		const lives = data.filter((item) => item.type == "Live");
		renderAlbums(lives, "Live");

		const amylee = data.filter((item) => item.type == "Amy Lee");
		renderAlbums(amylee, "Amy Lee");

		var albumsElements = Array.from(document.getElementsByClassName('album'));
		albumsElements.forEach(el => {
			el.addEventListener("click", function (event) {
				var album = data.find(f => f.id == event.currentTarget.getAttribute("data-id"));
				renderAlbumScreen(album);
			}, false);
		});
	}

	function renderAlbums(array, title) {
		app.innerHTML += `<h4>${title}</h4>`;

		var albumContainerHtml = "";
		array.sort((a, b) => b.date - a.date)
			.forEach(el => {
				albumContainerHtml += renderAlbum(el);
			});

		app.innerHTML += `<div class="album-container">
			<div class="album-container-block">
				${albumContainerHtml}
			</div>
		</div>`;
	}

	function renderAlbum(album, isFull) {
		var date = album.date > 0 ? album.date : "";
		var classname = isFull ? "album album-full" : "album";

		return `<div class="${classname}" data-id="${album.id}">
			<img src="${album.path}cover.webp" title="${album.name}" async />
			<p>${album.name}</p>
			<p class="date">${date}</p>
		</div>`;
	}

	function renderAlbumScreen(album) {
		app.innerHTML = `<h1>EvMusic</h1><h4 class="active"><span></span>Library</h4>`;

		app.innerHTML += renderAlbum(album, true);
		app.innerHTML += renderSongsList(album);

		var h4 = document.getElementsByTagName('h4')[0];
		h4.addEventListener("click", function (event) {
			renderMainScreen();
		}, false);

		var songsList = Array.from(document.getElementsByClassName('song'));
		songsList.forEach(s => {
			s.addEventListener("click", function (event) {
				selectCurrentSong(event.currentTarget);

				var thisSong = songs.find(f => f.order == event.currentTarget.getAttribute("data-id"));
				current = thisSong.order - 1;

				load(songs[current]);
				playPause();
			}, false);
		});
	}

	function renderSongsList(album) {
		loadSongs(album.id);

		var albumSongsHtml = "";
		songs.forEach(s => {
			albumSongsHtml += `<div class="song" data-id="${s.order}">
				<span class="number">${s.order}</span>
				${s.name}
				<span class="duration">${s.duration}</span>
			</div>`;
		});

		if (currentSong.albumId == album.id) {
			selectSong(currentSong.order);
		}

		return `<div class="song-list">${albumSongsHtml}</div>`;
	}
});
