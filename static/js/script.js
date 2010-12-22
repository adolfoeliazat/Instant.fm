var controller;
var ytplayer;

var pressedKeys = [];

//var sample = {title: 'Feross\'s Running Playlist', description: 'This is my favorite running playlist. You see, life is rough and complicated. But, when you\'re running, that all goes away. When I run with this playlist, I feel like a well-oiled machine. Everything just falls into place and all my problems disappear.', songs: [{t:"Through the Fire and Flames", a:"DragonForce"}, {t:"Poker Face", a:"Lady Gaga"}, {t:"Hello, Dolly", a:"Frank Sinatra"}, {t:"Replay", a:"Iyaz"}, {t:"Buddy Holly", a:"Weezer"}, {t:"Walid Toufic", a:"La T'awedny Aleik"}, {t:"Stylo", a:"Gorillaz"}, {t:"Smells Like Teen Spirit", a:"Nirvana"}, {t:"Eenie Meenie", a:"Justin Bieber"}, {t:"Sweet Talking Woman", a:"Electric Light Orchestra"}, {t:"Evil Woman", a:"ELO"}, {t:"Wavin Flag", a:"K'naan"}, {t:"Still Alive", a:"Glados"}]};

/* Onload Event */
$(function() {
    controller = new Controller(initial_playlist);
    controller.playlist.render();
    controller.playlist.playSong(0); // Auto-play
    
    setupScrollingListeners();
    setupKeyboardListeners();
    
    $('#keyboardShortcutsAvailable').click(controller.showHelpDialog);
    
    new uploader('container', null, '/upload', null, controller.updatePlaylist);    
});

function setupScrollingListeners() {
    var videoDiv = $('#videoDiv');
    var videoDivOffset = $('#outerVideoDiv').offset().top;
    $(window).scroll(function(){
        if ($(window).scrollTop() > videoDivOffset) {
            videoDiv.css('top', 0);
        } else {
            videoDiv.css('top', videoDivOffset - $(window).scrollTop());
        }        
    });
}

function setupKeyboardListeners() {
    var SHIFT = 16;
    $(window).keydown(function(e) {
        var k = e.keyCode;
        pressedKeys.push(k);
        
        
        if (k == 39 || k == 40) { // down, right
            controller.playlist.playNextSong();
        } else if (k == 37 || k == 38) { // up, left
            controller.playlist.playPrevSong();
        } else if (k == 32) { // space
            playPause();
        } else if (k == 191 && $.inArray(SHIFT, pressedKeys) > -1) { // ?
            controller.showHelpDialog();
        } else {
            return true; // default event
        }
        return false; // prevent default event
    });
    $(window).keyup(function(e) {
        jQuery.grep(pressedKeys, function(value) {
            return value != e.keyCode;
        });
    });
}

/**
 * Instant.fm Controller
 */
var Controller = function(playlist) {
    this.isPlayerInitialized = false; // have we called initPlayer?
    this.playlist = new Playlist(playlist);
    
    var cache = new LastFMCache();
	this.lastfm = new LastFM({
		apiKey    : '414cf82dc17438b8c880f237a13e5c09',
		apiSecret : '02cf123c38342b2d0b9d3472b65baf82',
		cache     : cache
	});
}
/**
 * Controller.initPlayer() - Initialize the YouTube player
 */
Controller.prototype.initPlayer = function(firstVideoId) {
    this.isPlayerInitialized = true;
    var params = {
        allowScriptAccess: "always",
        wmode : 'opaque' // Allow JQuery dialog to cover YT player
    };
    var atts = {
        id: "ytPlayer",
        allowFullScreen: "true"
    };
    swfobject.embedSWF("http://www.youtube.com/v/" + firstVideoId +
    "&enablejsapi=1&playerapiid=ytplayer&rel=0&autoplay=1&egm=0&loop=0" +
    "&fs=1&hd=0&showsearch=0&showinfo=0&iv_load_policy=3&cc_load_policy=1",
    "player", "480", "274", "8", null, null, params, atts);
}

/**
 * Controller.playVideoBySearch(q) - Play top video for given search query
 * @q - search query
 */
Controller.prototype.playVideoBySearch = function(q) {
    // Restrict search to embeddable videos with &format=5.
    var the_url = 'http://gdata.youtube.com/feeds/api/videos?q=' + encodeURIComponent(q) + '&format=5&max-results=1&v=2&alt=jsonc';

    $.ajax({
        type: "GET",
        url: the_url,
        dataType: "jsonp",
        success: function(responseData, textStatus, XMLHttpRequest) {
            if (responseData.data.items) {
                var videos = responseData.data.items;
                controller.playVideoById(videos[0].id);
            } else {
                log('No results for "' + q + '"');
            }
        }
    });
}

/**
 * Controller.playVideoById(q) - Play video with given Id
 * @id - video id
 */
Controller.prototype.playVideoById = function(id) {
    if (ytplayer) {
        ytplayer.loadVideoById(id);
    } else {
        if (!this.isPlayerInitialized) {
            this.initPlayer(id);
        }
    }
}

/**
 * Controller.showAlbumArt(s) - Update album art to point to given src url
 * @src - Image src url. Pass nothing for missing album art image.
 * @alt - Image alt text
 */
Controller.prototype.showAlbumArt = function(src, alt) {
    var imgSrc = src || '/images/unknown.png';
    var imgAlt = alt || 'Album art';
    
    $('#curAlbumArt')
        .replaceWith($('<img alt="'+imgAlt+'" id="curAlbumArt" src="'+imgSrc+'" />'));
}

/**
 * Controller.showHelpDialog() - Open dialog that shows keyboard shortcuts
 */
Controller.prototype.showHelpDialog = function() {
    var dialog = $('#help').dialog({
        autoOpen: false,
        draggable: false,
        resizable: false,
        title: 'Keyboard Shortcuts',
    });
    dialog.dialog('open');
}

/**
 * Controller.updatePlaylist() - Change the playlist based on the xhr response in response
 * @response - response body
 */
Controller.prototype.updatePlaylist = function(response) {
    var responseJSON = JSON.parse(response);
    
    if(responseJSON.status != 'ok') {
        alert(responseJSON.status);
        return;
    }
    
    console.log(responseJSON.id)

    controller.playlist = new Playlist(responseJSON);
    controller.playlist.render();
    controller.playlist.playSong(0);
}


/**
 * Instant.fm Playlist
 */
var Playlist = function(playlist) {
    if (!playlist) {
        return;
    }
    this.id          = playlist.id || -1;
    this.title       = playlist.title;
    this.description = playlist.description;
    this.songs       = playlist.songs || [];
}

/**
 * Playlist.playSong(i) - Play a song by index
 * @i - song index
 */
Playlist.prototype.playSong = function(i) {
    if (i < 0 || i >= this.songs.length) {
        return;
    }
    this.curSongIndex = i;
    var s = this.songs[i];
    var q = s.t + ' ' + s.a;
    controller.playVideoBySearch(q);
 
    $('.playing').removeClass('playing');
    $('#song' + i).addClass('playing');
    
    $('#curSong').text(s.t);
    $('#curArtist').text(s.a);
	controller.lastfm.track.getInfo({track: s.t, artist: s.a, autocorrect: 1}, {success: function(data){
		var t = data.track;
		if (t && t.album && t.album.image) {
		    imgSrc = t.album.image[t.album.image.length - 1]['#text'];
		    controller.showAlbumArt(imgSrc, t.album.title);
		} else {
		    controller.showAlbumArt(null);
		}
	}, error: function(code, message){
		controller.showAlbumArt(null);
	}});
}

Playlist.prototype.playNextSong = function() {
    this.playSong(++this.curSongIndex);
}

Playlist.prototype.playPrevSong = function() {
    this.playSong(--this.curSongIndex);
}


/**
 * Playlist.render() - Updates the playlist table
 */
Playlist.prototype.render = function() {
    $('#curPlaylistTitle').text(this.title);
    $('#curPlaylistDesc').text(this.description);
    
    $('.song').remove();
    $.each(this.songs, function(i, v) {
        $('<tr class="song pointer" id="song'+i+'"><td class="icon">&nbsp;</td> <td class="title">'+v.t+'</td><td class="artist">'+v.a+'</td></tr>').appendTo('#playlist');
    });
    
    $('.song:odd').addClass('odd');
    
    $('.song').click(function(e) {
        controller.playlist.playSong(parseInt(e.currentTarget.id.substring(4)));
    });
}


/* Misc YouTube Functions */

// Automatically called when player is ready
function onYouTubePlayerReady(playerId) {
    ytplayer = document.getElementById("ytPlayer");
    ytplayer.addEventListener("onStateChange", "onPlayerStateChange");
}

function onPlayerStateChange(newState) {
    controller.playerState = newState;
    if (newState == 0) { // finished a video
        controller.playlist.playNextSong();
    }
}

function playVideo() {
    if (ytplayer) {
        ytplayer.playVideo();
    }
}

function pauseVideo() {
    if (ytplayer) {
        ytplayer.pauseVideo();
    }
}

function playPause() {
    if (ytplayer) {
        if (controller.playerState == 1) { // playing
            pauseVideo();
            // $('#playlistWrapper').removeClass('pauseButton').addClass('playButton');
        } else if (controller.playerState == 2) { // paused
            playVideo();
            // $('#playlistWrapper').removeClass('playButton').addClass('pauseButton');
        }
    }
}