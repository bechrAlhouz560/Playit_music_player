const $ = require('jquery');
const React = require('react');
const reactDOM = require('react-dom');
const electron = require('electron');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const videojs = require('video.js');
var lodash = require('lodash');

const remote = electron.remote,
    app = remote.app,
    curWindow = remote.getCurrentWindow(),
    webContents = curWindow.webContents,
    session = remote.session.defaultSession,
    cookies = remote.session.defaultSession.cookies;
const unicodes = ['.mp3', ".m4a", ".mpeg", ".wav", ".aac"]
const allowedImages = [".png", ".jpg", ".jpeg", ]
// some paths to user media
const downloads = app.getPath('downloads');
const music = app.getPath('music');
const appData = app.getPath('appData') + '/Playit';
const appPath = app.getAppPath();
const databases = appData + "/databases";
const appCaches = appData + "/Cache";
// Main playlist loaded
var _playlist = [];
// Main Music List (all the music in the database)
var musicList = [];
var musicFolders = [];
var recPath = downloads + "/Voice Records";
var selections = [];
// create records folder
if (!fs.existsSync(recPath)) {
    fs.mkdirSync(recPath);
}
const delay = time => new Promise(resolve => setTimeout(resolve, time));


// here will be the global player for any music and playlists and favorites 
var NodeID3 = require('node-id3');
// infos
var song_name = $('.infos-options .infos .song-infos .song-name');
var artist = $('.infos-options .infos .song-infos .song-artist');
var songCover = $(".infos-options .infos .song-cover");
var pauseModel = '<i class="fa fa-pause" aria-hidden="true"></i>';
var playModel = '<i class="fa fa-play" aria-hidden="true"></i>';
// mainControls
var mainControls = $('.infos-options .controls .controls-main')
var playBtn = mainControls.find('.controls--play');
var previusBtn = mainControls.find('.controls-previus');
var nextBtn = mainControls.find('.controls-next');
// Time Range
var timeRange = $('.time-range span');


// options buttons
var loopBtn = $('.infos-options .controls .controls--loop');
var volumeBtn = $('.infos-options .controls .options--volume');
// drop Down options
var dropdown = $('#more-options-dropdown');
var dbAddToFav = dropdown.find('#add-to-favorites');
var dbAddToPl = dropdown.find("#add-to-a-playlist");
var dbEdit = dropdown.find('#edit');
var dbDel = dropdown.find('#delete');
var editInfosBtn = dropdown.find('#reveal-in-file-exp');

function musicPaths(_path) {
    var music_paths = [];
    var files = fs.readdirSync(_path);
    for (const file of files) {
        var joined = _path + "/" + file;
        var parsed = path.parse(joined);
        if (parsed.ext != "") {
            if (unicodes.indexOf(parsed.ext)) {
                music_paths.push(joined);
            }
        }
    }
    return music_paths;
}



function showTags(url) {
    var tags = ID3.getAllTags(url);
    return tags;
}

function toBase64(blob) {
    var base64String = "";
    for (var i = 0; i < blob.data.length; i++) {
        base64String += String.fromCharCode(blob.data[i]);
    }
    var base64 = "data:" + blob.format + ";base64," +
        window.btoa(base64String);
    return base64;
}

function getInfos(src, callback) {

    fetch(src).then((val) => {
        val.blob().then((blob) => {
            ID3.loadTags(src, function () {
                var tags = showTags(src);
                if (tags) {
                    callback(tags)
                } else {
                    callback(null)
                }

            }, {
                tags: ["title", "artist", "album", "picture"],
                dataReader: ID3.FileAPIReader(blob)

            });
        });
    })
}

var player = {
    isMinPlayerActive: false,
    curIndex: 0,
    rangeInterval: false,
    playerDOM: document.getElementById('player'),
    currentPlaying: null,
    song: false,
    isRandom: false,
    curPlaylist: null,
    play: (_new = false) => {

        if (!player.song) {
            var aud = new Audio(path.resolve(player.currentPlaying))

            player.song = aud;

        } else {
            if (_new) {
                player.song.src = player.currentPlaying;

            }

        }
        $(".controls--play, .min-play-btn div").html(pauseModel)
        $(".controls--play, .min-play-btn").addClass('playing');

        player.rangeInterval = setInterval(() => {
            if ($("#prog")) {
                var curTime = player.song.currentTime;
                var duration = player.song.duration;
                player.setTimeRange(curTime, duration)
                var percent = (curTime * 100) / duration;
                $('#range').val(percent);
                var val = $('#range').val()

                $("#prog").width(val.toString() + "%");
            }
        }, 1000)
        $('.song-name').replaceWith('<span class="song-name" id="song-name"><div class="title-loading mb-3"></div></span>');
        $('#br-song').hide()
        $('#song-artist').html('<div class="artist-loading"></div>');
        player.setInfos();
        $('#range').on('input', () => {
            var val = $('#range').val()
            var duration = player.song.duration;

            var curTime = (duration * val) / 100;
            player.song.currentTime = curTime;
            player.setTimeRange(curTime, duration);
            $("#prog").width(val.toString() + "%");
        });
        player.song.play().then(() => {
            var resolvedPath = path.resolve(player.currentPlaying);
            insertIntoLatestListened(resolvedPath);
            getFriquent(resolvedPath, (freqs) => {
                if (freqs) {
                    for (freq of freqs) {
                        var freq_num = freq.frequent_num + 1;
                        console.log('', freq_num)
                        playlistsDb.all(`UPDATE musicList SET frequent_num = ${freq_num} 
                            WHERE src like "${resolvedPath}";`, (err) => {
                            if (err) {
                                alert(err);
                            }
                        });
                    }
                }

            });

        }).catch((err) => {
            console.log(err)
        });
        getFavorite(player.currentPlaying, 'song', (exists) => {
            if (exists.length == 0) {
                dbAddToFav.html('<span><i class="fa fa-heart mr-2" aria-hidden="true"></i> add to favorites</span>')
            } else {
                dbAddToFav.html('<span><i class="fa fa-heart mr-2" aria-hidden="true"></i> remove to favs</span>')
            }
        })
    },
    pause: () => {
        player.song.pause()
        clearInterval(player.rangeInterval);
        $(".controls--play, .min-play-btn div").html(playModel);
    },
    loop: () => {

        if (!player.song.loop) {
            player.song.loop = true;
            $('.controls--loop,.min-loop-btn').addClass('controls-active');
        } else {
            player.song.loop = false;
            $('.controls--loop,.min-loop-btn').removeClass('controls-active');
        }
    },


    setInfos: () => {
        NodeID3.read(player.currentPlaying, (err, tags) => {
            if (!err) {
                if (tags) {
                    if (tags.title) {
                        player.setTitle(tags.title)
                    } else {
                        player.setTitle()
                    }
                    if (tags.image) {
                        var base64String = "";
                        for (var i = 0; i < tags.image.imageBuffer.length; i++) {
                            base64String += String.fromCharCode(tags.image.imageBuffer[i]);
                        }
                        var base64 = "data:" + tags.image.mime.format + ";base64," +
                            window.btoa(base64String);

                        
                        var img = React.createElement('img', {
                            src: base64
                        });
                        reactDOM.render(img, document.querySelector(".song-cover"))
                    } else {
                        player.setCover();
                    }
                    if (tags.artist) {
                        artist.text(tags.artist)
                    } else {
                        artist.text('Unknown')
                    }
                    playlistsDb.all('SELECT * FROM musicList WHERE src like ?', [player.currentPlaying], (err, rows) => {
                        if (!err) {
                            if (rows[0]) {
                                if (rows[0].title !== tags.title || rows[0].artist !== tags.artist) {
                                    console.log('Not Modified yet !')
                                    playlistsDb.all('UPDATE musicList  SET title = ? , artist = ? WHERE src like ?', [
                                            tags.title || path.parse(player.song.src).name,
                                            tags.artist || "Unknown",
                                            player.currentPlaying
                                        ],
                                        (err) => {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });
                                }
                            }
                        }
                    });
                } else {
                    player.setTitle();
                    player.setCover();
                    artist.text('Unknown')
                }
            } else {
                alert(err);
            }
        });

    },
    setCover: (blob = null) => {
        if (blob) {
            var base64String = "";
            for (var i = 0; i < blob.data.length; i++) {
                base64String += String.fromCharCode(blob.data[i]);
            }
            var base64 = "data:" + blob.format + ";base64," +
                window.btoa(base64String);
            var base64 = new Blob(blob);
            var url = webkitURL.createObjectURL(base64);
            $(".song-cover").find('img').attr('src', url);
        } else {
            var img = React.createElement('img', {
                src: './assets/images/cover.png'
            });
            reactDOM.render(img, document.querySelector(".song-cover"))
        }


    },
    getCover: (blob) => {
        var urlCreator = window.webkitURL;
        var imageUrl = urlCreator.createObjectURL(blob);
        return imageUrl;
    },
    setTimeRange: (time, duration) => {
        var curRange = videojs.formatTime(time, 600);
        var dur = videojs.formatTime(duration, 600);
        var model = curRange.toString() + " / " + dur.toString();
        timeRange.text(model);
        return model;
    },
    setTitle: (title = null) => {

        var parsed;
        if (!title) {
            parsed = path.parse(player.song.src)

        } else {
            parsed = title;
        }
        var length;
        if (parsed.name) {
            length = parsed.name.length;
        } else {
            length = parsed.length;
        }
        if (length > 30) {

            var marquee = document.createElement('marquee');
            marquee.direction = "right";
            var name = parsed.name || parsed;
            var split = name.split('%20')
            var text = "";
            for (let i of split) {

                text += i + ' ';
            }


            marquee.innerHTML = text;
            marquee.style.fontSize = "19px";
            marquee.style.marginRight = "15px";
            $('#br-song').toggle()
            marquee.classList = "song-name";
            $('.song-name').replaceWith(marquee);


        } else {
            var name = parsed.name || parsed;
            var split = name.split('%20')
            var text = "";
            for (let i of split) {

                text += i + ' ';
            }

            var span = document.createElement('span');
            span.innerText = text;
            span.classList += "song-name";
            var name = text;
            $('#br-song').show()
            $('.song-name').replaceWith(span);

        }
    },
    playlistPlayer: (playlist) => {
        if (!player.isRandom) {
            player.song.onended = (ev) => {
                ev.preventDefault()

                if ((playlist.length - 1) == player.curIndex) {
                    player.curIndex = 0;
                } else {
                    player.curIndex = player.curIndex + 1;
                }
                player.currentPlaying = playlist[player.curIndex];
                player.play(true)

            };
        } else {
            player.randomly();
        }

    },
    setPlaylist: (playlist, index) => {


        console.log('setPlaylist param playlist = ', playlist);
        if (playlist != "musicList") {
            _playlist = playlists[playlist];
            player.curIndex = index;
            player.currentPlaying = playlists[playlist][player.curIndex];
        } else {
            _playlist = musicList;
            player.curIndex = index;
            player.currentPlaying = _playlist[player.curIndex];

        }

        player.play(true)
        player.playlistPlayer(_playlist);
        player.curPlaylist = playlist;

    },
    next: () => {
        if (!player.isRandom) {
            if ((_playlist.length - 1) == player.curIndex) {
                player.curIndex = 0;
            } else {
                player.curIndex = player.curIndex + 1;
            }
            player.currentPlaying = _playlist[player.curIndex];
            player.play(true);
        } else {
            var randIndex = randomIndex(_playlist.length - 1)
            player.curIndex = randIndex;
            player.currentPlaying = _playlist[player.curIndex];
            player.play(true)
        }


    },
    backward: () => {
        if (player.curIndex !== 0) {
            player.curIndex = player.curIndex - 1;

        } else {
            player.curIndex = _playlist.length - 1;
        }
        player.currentPlaying = _playlist[player.curIndex];
        player.play(true);
    },
    randomly: () => {
        player.isRandom = true;
        player.song.onended = (ev) => {
            ev.preventDefault()

            var randIndex = randomIndex(_playlist.length - 1)
            player.curIndex = randIndex;
            player.currentPlaying = _playlist[player.curIndex];
            player.play(true)

        };
    }
}




function playSong(index) {
    console.log('_playlist[index] = ', _playlist[index])
    if (player.song) {
        if (player.currentPlaying == _playlist[index]) {
            if (player.currentPlaying == _playlist[index]) {
                player.play();

            } else {
                player.pause()
            }
        } else {
            player.currentPlaying = _playlist[index];

            player.play(true);
        }
        player.playlistPlayer(_playlist)
    } else {

        player.currentPlaying = _playlist[index];
        player.play(true);
        player.playlistPlayer(_playlist)
    }
}
$(".controls--play, .min-play-btn").click(function (ev) {
    ev.preventDefault();
    if (player.song) {
        if (player.song.paused) {

            player.play();

        } else {
            player.pause()
        }
        player.playlistPlayer(_playlist)
    } else {
        player.currentPlaying = _playlist[0];

        player.play(true);
        player.playlistPlayer(_playlist)
    }

});

function getFileInfos(url, callback) {
    fetch(url).then((blob) => {
        blob.blob().then((value) => {
            ID3.loadTags(url, function () {
                var tags = showTags(url);
                if (tags) {
                    callback(tags)
                } else {
                    callback(null);
                }
            }, {
                tags: ["title", "artist", "album", "picture"],
                dataReader: ID3.FileAPIReader(value)
            });
        })
    });
}








function toInteger(number) {
    var string = number.toString();
    var spliter = string.split('.')
    var end = spliter[0];
    return Number(end);
}

function randomIndex(length) {
    var num = Math.floor(Math.random() * length + 1);
    return num
}

async function deleteSong(src) {
    await delay(500);
    await fs.unlinkSync(src);
    return src;
}
$(document).ready(function () {
    // drop down of more option button
    var dd = document.getElementById("more-options-dropdown");
    dd.onmouseleave = () => {
        document.onclick = () => {
            $("#more-options-dropdown").slideUp();
            $('#more-options').removeClass('controls-active');
            document.onclick = null;
        }

    }
    // add functionality to player buttons and sliders
    $('.controls--loop,.min-loop-btn').click((ev) => {
        ev.preventDefault();
        player.loop()
    });

    $('.controls-next,.min-next-btn').click((ev) => {
        ev.preventDefault();
        player.next();
    })
    $('.controls-previus,.min-previus-btn').click((ev) => {
        ev.preventDefault();
        player.backward();
    })

    $('.options--volume span').click((ev) => {

        $('.volume-range').toggle();
        $(".options--volume span").toggleClass('controls-active')
    });

    $('#volume-inp').on('input', (ev) => {
        if (player.song) {
            player.song.volume = $('#volume-inp').val() / 100;
        }
    });
    $('.options-minimize').click(() => {
        setMinPlayer(player.currentPlaying,0, 0);
    });
    $('#more-options').click((ev) => {
        $("#more-options-dropdown").slideToggle();
        $('#more-options').toggleClass('controls-active');
    });
    $('.controls--random').click((ev) => {
        if (player.isRandom) {
            player.isRandom = false;
        } else {
            player.isRandom = true;
            player.randomly();
        }
        $('.controls--random').toggleClass('controls-active');

    })
    // for dropdown options
    dbAddToFav.click(() => {
        getFavorite(player.currentPlaying, "song", (exists) => {
            if (exists.length == 0) {
                addToFavorites(player.currentPlaying, "song", (success) => {
                    if (success) {
                        dbAddToFav.html('<i class="fa fa-heart mr-2" aria-hidden="true"></i> Remove From Favs');
                    }
                })
            } else {
                deleteFav(player.currentPlaying, 'song', (success) => {
                    if (success) {
                        dbAddToFav.html('<i class="fa fa-heart mr-2" aria-hidden="true"></i> Add to Favorites');
                    }
                });
            }
        })
    });
    dbAddToPl.click(() => {
        getTemplate(templatesUrl.modals.addToPlaylist, {}, (temp) => {
            $("#main").append(temp).ready(() => {

                playlistsDb.all('select * from playlists order by _created DESC', (err, rows) => {
                    if (err) {
                        alert(err)
                    } else {
                        var src = player.currentPlaying;
                        for (let row of rows) {
                            playlistsDb.all('select * from `' + row.title + '`', (err, res) => {
                                var minPl = Playlist.minPl(row.title, res.length, row['cover_src'], (name) => {
                                    insertIntoPlaylist(name, [src]);
                                    playlists[name].push(src);
                                    var song_name = path.parse(src).name;
                                    alert(song_name + " added successfuly");
                                });
                                $('.pl-list').append(minPl)
                            });

                        }
                    }
                })


            });
        })
    })
    dbDel.click(() => {
        remote.dialog.showMessageBox(curWindow, {
            title: "Message",
            message: "are you sure you want to delete this song ?",
            buttons: ["yes", "no"]
        }).then((val) => {
            var last = player.currentPlaying;
            var index = player.curIndex;
            var curPl = player.curPlaylist
            if (val.response == 0) {
                player.next();
                deleteSong(last).then((val) => {
                    delete playlists[curPl][index];
                    $('.music[src="'+last+'"').remove();
                    var newList = [];
                    for (let song of plalists[curPl])
                    {
                        if (song !== undefined)
                        {
                            newList.push(song);
                        }
                    }
                    playlists[curPl] = newList;

                }).catch((err) => {
                    console.log(err)
                });
            }
        })

    });

    editInfosBtn.click(() => {
        var src = player.currentPlaying;
        var cover = "./assets/images/placeholder.png";
        NodeID3.read(src, (err, tags) => {
            if (!err) {
                if (tags.image) {
                    var base64String = "";
                    for (var i = 0; i < tags.image.imageBuffer.length; i++) {
                        base64String += String.fromCharCode(tags.image.imageBuffer[i]);
                    }
                    cover = "data:" + tags.image.mime + ";base64," + window.btoa(base64String);
                }
                getTemplate(templatesUrl.modals.editInfos, {
                    title: tags.title || path.parse(src).name,
                    artist: tags.artist || "Unknown",
                    cover: cover
                }, (temp) => {
                    $("#main").append(temp).ready(() => {
                        $('#close').click((ev) => {
                            $('.edit-infos-cont').fadeToggle('fast', () => {
                                $('.edit-infos-cont').remove();
                            });
                        });
                        $('.div-img').click(() => {
                            remote.dialog.showOpenDialog(curWindow, {
                                title: "Select a cover for song",
                                properties: ["openFile"],
                                filters: ["png", "jpg", "jpeg"]
                            }).then((val) => {
                                if (val.filePaths) {
                                    $('.div-img #cover-img').attr("src", val.filePaths[0])
                                }
                            })
                        });
                        $("#save").click((ev) => {
                            $("#save").attr('disabled', true);
                            setTimeout(() => {
                                var title = $('#edit-infos-title').val()
                                var artist = $('#edit-infos-artist').val()
                                var cover_src = $('.div-img #cover-img').attr("src");
                                fetch(cover_src).then((value) => {

                                    value.arrayBuffer().then((arrayBuffer) => {
                                        var imageBuffer = Buffer.from(arrayBuffer);
                                        NodeID3.update({
                                            title: title,
                                            artist: artist,
                                            image: {
                                                mime: "image/png",
                                                imageBuffer: imageBuffer
                                            }
                                        }, src, (err) => {
                                            if (err) {
                                                console.log(err)
                                                $("#save").attr('disabled', false);
                                            } else {
                                                playlistsDb.all("UPDATE musicList SET title = ? , artist = ? WHERE src like ?", [title, artist, src], (err) => {
                                                    if (err) {
                                                        alert(err)
                                                    } else {
                                                        $('.edit-infos-cont').fadeToggle('fast', () => {
                                                            $('.edit-infos-cont').remove();
                                                        });
                                                    }
                                                });

                                            }
                                        });
                                    });
                                });
                            }, 500);
                        });
                    });
                });
            }
        });


    });

});



// shortcuts
document.onkeydown = (ev) => {


    if (!player.isMinPlayerActive) {
        var key = ev.key.toLowerCase();
        if (key == "arrowright") {
            player.next()
        }
        if (key == "arrowleft") {
            player.backward();
        }


        if (ev.ctrlKey) {
            var key = ev.key.toLowerCase();
            if (key == "f") {
                // start search
            }
            if (key == "s") {

                // switch between min-player and player
                if (!player.isMinPlayerActive) {
                    setMinPlayer(songCover.find('img').attr('src'), setTitle(player.currentPlaying, 15).innerHTML, 0, 0);
                } else {
                    Maximize()
                }
            }
            if (!player.isMinPlayerActive) {
                if (key == "Space") {
                    if (player.song) {
                        if (player.song.paused) {

                            player.play();

                        } else {
                            player.pause()
                        }
                        player.playlistPlayer(_playlist)
                    } else {

                        player.setPlaylist("musicList", 0)
                    }
                }

                if (key == "y") {
                    if (player.isRandom) {
                        player.isRandom = false;
                    } else {
                        player.randomly();
                    }
                    $('.controls--random').toggleClass('controls-active');
                }
                if (key == "l") {
                    player.loop()
                }
            }
        }
    }

}

function setTitle(title, _length) {
    /* infos are : cover,title,artist **/

    var el;
    var parsed = title;
    var length = parsed.length;

    if (length > _length) {

        var marquee = document.createElement('marquee');
        marquee.direction = "right";
        var name = parsed.name || parsed;
        var split = name.split('%20')
        var text = "";
        for (let i of split) {

            text += i + ' ';
        }


        marquee.innerHTML = text;
        marquee.style.fontSize = "19px";
        marquee.style.marginRight = "15px";

        marquee.classList = "song-title";
        el = marquee;
    } else {
        var name = parsed.name || parsed;
        var split = name.split('%20')
        var text = "";
        for (let i of split) {

            text += i + ' ';
        }

        var span = document.createElement('span');
        span.innerText = text;
        span.classList += "song-title";
        var name = text;
        el = span;

    }
    return el;
}

document.getElementById('player').addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playlists.dropped = [];
    for (const f of e.dataTransfer.files) {
        if (unicodes.indexOf(path.parse(f.path).ext) != -1) {
            playlists.dropped.push(f.path);
        }
    }
    if (playlists.dropped != 0) {
        player.setPlaylist("dropped", 0);
    }
});
document.getElementById('player').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

remote.app.on('play-song', (ev) => {
    if (player.song) {
        if (player.song.paused) {

            player.play();

        } else {
            player.pause();
        }
        player.playlistPlayer(_playlist)
    } else {

        player.setPlaylist("musicList", 0);
    }
});
remote.app.on('next-song', (ev) => {
    player.next();
});
remote.app.on('previous-song', (ev) => {
    player.backward();
});


// initializing the files and function to work with
const sqlite3 = require('sqlite3').verbose();

//  1) Initializing The player
let lastIndex = Number(localStorage.getItem('lastIndex'));
let autoplay = localStorage.getItem('autoplay');
let paused = localStorage.getItem('paused');
let lastTime = localStorage.getItem('lastTime');
let lastPl = localStorage.getItem('last-playlist');
// playlists initializing
let playlists = {}

fs.watchFile('dist/css/style.css', {
    persistent: false,
    interval: 1
}, async function (curr, prev) {
    var content = fs.readFileSync('dist/css/style.css').toString();

    electron.remote.getCurrentWindow().webContents.insertCSS(content).then(function () {
        console.log('style sheets updated !');
    }).catch(function (reason) {
        console.log(reason)
    });
});

function musicPaths(_path) {
    let music_paths = [];
    let files = fs.readdirSync(_path);
    for (const file of files) {
        let joined = _path + "/" + file;
        let parsed = path.parse(joined);
        if (parsed.ext != "") {
            if (unicodes.indexOf(parsed.ext) != -1) {
                music_paths.push(joined);
            }

        }
    }
    return music_paths;
}

function musicPathsSync(_path) {
    return new Promise((resolve) => {
        let music_paths = [];
        let files = fs.readdirSync(_path);
        for (let file of files) {
            let joined = _path + "/" + file;
            let parsed = path.parse(joined);
            if (parsed.ext != "") {
                if (unicodes.indexOf(parsed.ext) != -1) {
                    music_paths.push(joined);
                }

            }
        }
        resolve(music_paths);
    });
}
// 2) initializing databases

// databases
let playlistsDb;
let latestListenedDb;
let favoritesDb;
let settingsDb;
let areDatabasesCreated;
// create databases if not exists
let exists = fs.existsSync(databases);

if (!exists) {
    fs.mkdirSync(databases);
}

playlistsDb = new sqlite3.Database(databases + '/playlists.db', (err) => {
    if (err) {
        remote.dialog.showErrorBox('Database Error', 'error creating a database...it will be errors in the future')
        areDatabasesCreated = false;
    } else {
        areDatabasesCreated = true;
        // create musicList database for musics
        playlistsDb.run('CREATE TABLE IF NOT EXISTS playlists (title text,cover_src text,_created timestamp DEFAULT current_timestamp)', (err) => {
            if (err) {
                alert(err);
            }
        });
    }
});

latestListenedDb = new sqlite3.Database(databases + '/latestListened.db', (err) => {
    if (err) {
        remote.dialog.showErrorBox('Database Error', 'error creating a database...it will be errors in the future')
        areDatabasesCreated = false;
    } else {
        latestListenedDb.run('CREATE TABLE IF NOT EXISTS latest_listened (src text,listened_date timestamp DEFAULT current_timestamp)', (err) => {
            if (err) {
                alert(err);
            }
        })
    }
});
favoritesDb = new sqlite3.Database(databases + '/favorites.db', (err) => {
    if (err) {
        remote.dialog.showErrorBox('Database Error', 'error creating a database...it will be errors in the future')
        areDatabasesCreated = false;
    } else {
        areDatabasesCreated = true;
        console.log('areCreatedDatabases' + areDatabasesCreated)
        favoritesDb.run('CREATE TABLE IF NOT EXISTS favorite_songs (src text,added_time timestamp DEFAULT current_timestamp)', (err) => {
            if (err) {
                alert('error creating favorite_songs table')
            } else {
                console.log('favorite_songs table created')
            }
        })
        favoritesDb.run('CREATE TABLE IF NOT EXISTS favorite_playlists (name text,added_time timestamp DEFAULT current_timestamp)', (err) => {
            if (err) {
                alert('error creating favorite_playlists table')
            } else {
                console.log('favorite_playlists table created')

            }
        })

    }
});
settingsDb = new sqlite3.Database(databases + '/settings.db', (err) => {
    if (err) {
        remote.dialog.showErrorBox('Database Error', 'error creating a database...it will be errors in the future')
        areDatabasesCreated = false;
    } else {
        areDatabasesCreated = true;
        console.log(areDatabasesCreated)
    }
});

function closeAllDbs() {
    playlistsDb.close();
    latestListenedDb.close();
    favoritesDb.close();
    settingsDb.close();
}
// initializing settings database




playlistsDb.all('select * from musicList order by artist', (err, rows) => {

    if (rows) {
        for (let row of rows) {
            if (fs.existsSync(row.src)) {
                if (musicList.indexOf(row.src) == -1) {
                    musicList.push(row.src)
                }
            }
        }
    }
});

function getMusic(src, callback) {
    playlistsDb.all('select * from musicList where src = ?', [src], (err, rows) => {
        if (!err) {
            console.log(rows);
            callback(rows);
        } else {
            console.log(err);
            callback(false);
        }
    });
}

/**
 * 
 * @param {string} title the title of the playlist 
 * @param {string} cover  the cover of the playlist
 * @param {Function} callback the callback accepts one parameter 
 */
function createPlaylist(title, cover, callback) {
    playlistsDb.run("INSERT INTO  playlists (title,cover_src) VALUES ('" + title + "','" + cover + "')",
        (err) => {
            if (err) {
                alert(err);
                callback(null);
            } else {
                playlistsDb.run("CREATE TABLE IF NOT EXISTS `" + title + "` (song_src text,added_time timestamp DEFAULT current_timestamp)", (err) => {
                    if (err) {
                        alert(err);
                        callback(null);
                    } else {
                        callback(true);
                    }
                })
            }
        })
}

// functions for adding more music into database
function insertIntoPlaylist(title, paths) {
    for (let _path of paths) {
        getPlaylistSong(title, _path, (rows) => {
            if (rows) {
                if (rows.length == 0) {
                    playlistsDb.all("INSERT INTO `" + title + "` (song_src) VALUES (?)", [_path], (err) => {
                        if (err) {
                            alert(err);
                        }
                    });
                } else {
                    remote.dialog.showMessageBox(curWindow, {
                        title: "Message",
                        message: path.parse(_path).name + "already exists in this playlist"
                    })
                }
            } else {
                playlistsDb.all("INSERT INTO `" + title + "` (song_src) VALUES (?)", [_path], (err) => {
                    if (err) {
                        alert(err)
                    }
                });
            }
        })

    }

}

function insertMusicFolders(folders) {
    return new Promise((resolve, reject) => {
        let error;

        for (let _path of folders) {

            settingsDb.run('INSERT INTO music_folders (folder_name,path) VALUES (?,?)',
                [path.parse(_path).name, _path], (err) => {
                    if (err) {
                        alert(err)
                        error = err
                    }
                })
        }
        if (error) {
            reject(err)
        } else {
            resolve(true);
        }

    })
}

function insertIntoMusicList(_path, paths, resolved) {
    function getFileInfos(url) {
        return new Promise((resolve, reject) => {
            try {
                fetch(url).then((blob) => {
                    blob.blob().then((value) => {
                        ID3.loadTags(url, function () {
                            let tags = showTags(url);
                            if (tags) {
                                resolve(tags)
                            } else {
                                resolve(null)
                            }
                        }, {
                            tags: ["title", "artist", "album", "picture"],
                            dataReader: ID3.FileAPIReader(value)
                        });
                    })
                })
            } catch (error) {
                alert(error)
            }
        })
    }
    return new Promise((resolve, reject) => {
        getFileInfos(_path).then((tags) => {
            let title = tags.title || path.parse(_path).name;
            let artist = tags.artist || 'Unknown';
            let cover;
            if (tags.length != 0) {

                if (tags.picture) {
                    if (tags.picture.data) {
                        let base64String = "";
                        for (let i = 0; i < tags.picture.data.length; i++) {
                            base64String += String.fromCharCode(tags.picture.data[i]);
                        }
                        let base64 = "data:" + tags.picture.format + ";base64," +
                            window.btoa(base64String);
                        cover = base64;
                    } else {
                        cover = './assets/images/cover.png';
                    }

                } else {
                    cover = './assets/images/cover.png';
                }

            }
            playlistsDb.all('INSERT INTO musicList  (src ,title ,artist,img ) VALUES (?,?,?,?)', [_path, title, artist, cover],
                (err) => {
                    if (err) {
                        console.log(err)
                        reject(err)
                    } else {
                        resolve(title + "inserted to list");
                        if (paths.length == resolved.length) {
                            console.log('finished...')
                            $('.find-song-modal').remove();
                        }
                    }
                })
        })
    })
}

function finishing(folders, resolved) {
    return new Promise((resolve, reject) => {
        for (let _path of folders) {
            let music = musicPaths(_path);
            for (music_path of music) {
                resolved.push(music_path);
                insertIntoMusicList(music_path, music, resolved).then((val) => {
                    console.log(val)
                }).catch((res) => {
                    alert(res);
                })
            }

        }
        resolve('finished')
    })

}
// end of functions of adding more music into database
function getPlaylistMusic(name, callback) {
    playlistsDb.all('SELECT * FROM `' + name + '`', (err, rows) => {
        if (err) {
            alert(err)
        } else {
            callback(rows)
        }
    });
}

function getPlaylistSong(name, src, callback) {
    playlistsDb.all('SELECT song_src FROM `' + name + '` where song_src like ?', [src], (err, rows) => {
        if (err) {
            alert(err)
            callback(false)
        } else {
            callback(rows)
        }
    })
}

function insertIntoLatestListened(src, _from) {
    latestListenedDb.all("SELECT src FROM latest_listened WHERE src like ?", [src], (err, exists) => {
        if (err) {
            alert(err)
        } else {
            if (exists.length == 0) {
                latestListenedDb.run("INSERT INTO latest_listened (src) VALUES (?)", [src], (err) => {
                    if (err) {
                        alert(err)
                    }
                })
            } else {
                latestListenedDb.run("DELETE FROM latest_listened  where src = ?", [src], (err) => {
                    if (err) {
                        alert(err)
                    } else {
                        latestListenedDb.run("INSERT INTO latest_listened (src) VALUES (?)", [src], (err) => {
                            if (err) {
                                alert(err)
                            }
                        })
                    }
                })
            }
        }
    });

}

function getLatestListened(limit, callback) {
    latestListenedDb.all('SELECT * FROM latest_listened order by listened_date DESC limit ?', [limit], (err, rows) => {
        if (err) {
            console.log('there are an error: ' + err)
            callback(null)
        } else {
            callback(rows)
        }
    });
}

function delLatestListened(src, callback) {
    latestListenedDb.all('DELETE FROM latest_listened WHERE src LIKE ?', [src], (err, rows) => {
        if (err) {
            console.log('there are an error: ', err)
            callback(null)
        } else {
            callback(true)
        }
    });
}

/** get song infos from database ! */
function getSongInfos(src, callback) {
    playlistsDb.all('select * from musicList where src like ?', [src], (err, rows) => {
        if (err) {
            console.log(err)
        } else {
            if (rows.length != 0) {

                callback(rows)
            } else {
                getFileInfos(src, (tags) => {

                    callback(tags)
                });
            }


        }
    })
}
//  functions for favorites database

/**
 * 
 * @param {string} name must be a source of a music file or name of playlist
 * @param {string} kind must be song or playlist
 * @param {function} callback
 */
function addToFavorites(name, kind, callback) {
    if (kind == "playlist") {
        favoritesDb.run("INSERT INTO favorite_playlists (name) VALUES (?)", [name], (err) => {
            if (err) {
                callback(false)
            } else {
                callback(true)
            }
        })
    } else if (kind == "song") {
        favoritesDb.run("INSERT INTO favorite_songs (src) VALUES (?)", [path.resolve(name)], (err) => {
            if (err) {
                callback(false)
            } else {
                callback(true)
            }
        })
    }

}

function getFavorite(name, kind, callback) {
    if (kind == "playlist") {
        favoritesDb.all("SELECT * FROM favorite_playlists where name like ?", [name], (err, rows) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {

                callback(rows)
            }
        })
    }
    if (kind == "song") {
        favoritesDb.all("SELECT src FROM favorite_songs where src like ?", [name], (err, rows) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {
                callback(rows)
            }
        })
    }
}

function deleteFav(name, kind, callback) {
    if (kind == "playlist") {
        favoritesDb.all("DELETE FROM favorite_playlists where name = ?", [name], (err) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {

                callback(true)
            }
        })
    }
    if (kind == "song") {
        favoritesDb.all("DELETE FROM favorite_songs where src = ?", [name], (err) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {
                callback(true)
            }
        })
    }
}

function getFavorites(kind, limit, callback) {
    if (kind == "playlist") {
        favoritesDb.all("SELECT * FROM favorite_playlists limit ?", [limit], (err, rows) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {

                callback(rows)
            }
        })
    }
    if (kind == "song") {
        favoritesDb.all("SELECT * FROM favorite_songs ORDER BY added_time DESC LIMIT ?", [limit], (err, rows) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {
                callback(rows)
            }
        })
    }
}

function getAllFavorites(kind, callback) {
    if (kind == "playlist") {
        favoritesDb.all("SELECT * FROM favorite_playlists ORDER BY added_time", (err, rows) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {
                console.log(rows)
                callback(rows)
            }
        })
    }
    if (kind == "song") {
        favoritesDb.all("SELECT * FROM favorite_songs ORDER BY added_time", (err, rows) => {
            if (err) {
                console.log(err)
                callback(false)
            } else {
                callback(rows)
            }
        })
    }
}
getAllFavorites('song', (songs) => {
    playlists['favorites'] = [];
    if (songs) {
        for (let song of songs) {
            playlists['favorites'].push(path.resolve(song.src));
        }
    }
});


// initializing playlists
playlistsDb.all('SELECT * FROM playlists', (err, rows) => {
    if (err) {
        console.log(err)
    } else {
        if (rows.length != 0) {
            for (let row of rows) {
                playlistsDb.all('SELECT song_src FROM `' + row.title + '`', (err, src) => {
                    let pls = [];
                    for (source of src) {
                        pls.push(path.resolve(source.song_src));
                    }
                    playlists[row.title] = pls;
                })
            }

        }
    }
});

function deletePl(name) {
    playlistsDb.run("DELETE FROM playlists WHERE title = ?", [name], (err) => {
        if (!err) {
            playlistsDb.run(`DROP TABLE IF EXISTS "${name}"`, (errs) => {
                if (!errs) {
                    try {
                        delete playlists[name]
                        deleteFav(name, 'playlist', (success) => {
                            if (success) {
                                alert(name + ' deleted successfully !')
                            } else {
                                alert('error !')
                            }
                        })
                    } catch (error) {
                        console.log(error)
                        alert(error)
                    }
                } else {
                    alert(errs)
                }
            })
        }
    })
}


function getFriquent(src, callback) {
    playlistsDb.all('SELECT frequent_num FROM musicList WHERE src LIKE ?', [src], (err, res) => {
        if (!err) {
            callback(res)
        } else {
            console.log(err)
            callback(false)
        }
    });
}


function getMostFriquentSongs(callback) {
    playlistsDb.all('SELECT * FROM musicList order by frequent_num DESC limit 10', (err, res) => {
        if (!err) {
            callback(res)
        } else {
            console.log(err)
            callback(false)
        }
    });
}


curWindow.on('close', (ev) => {
    ev.preventDefault();
    localStorage.setItem('last-playlist', player.curPlaylist)
    localStorage.setItem('lastIndex', player.curIndex);
    localStorage.setItem('lastTime', player.song.currentTime);
    localStorage.setItem('paused', player.song.paused);
    // close all databases
    closeAllDbs()
});


function getFolders() {
    return new Promise((resolve, reject) => {
        // rows =  [{folder_name,path}]
        settingsDb.all('SELECT * FROM music_folders', (err, rows) => {
            if (!err) {
                resolve(rows);
            } else {
                reject(err);
            }
        });
    });
}
async function _getNewList() {
    let newList = [];
    let folders = await getFolders();
    for await (let folder of folders) {
        if (fs.existsSync(folder.path)) {
            let files = await fs.readdirSync(folder.path);
            for (let file of files) {
                var unicode = path.extname(file);
                if (unicodes.indexOf(unicode) !== -1) {
                    let _path = path.resolve(folder.path, file)
                    newList.push(_path);
                }
            }
        }
    }
    return newList;
}

function getUnknowns() {
    return new Promise((resolve, reject) => {
        playlistsDb.all('SELECT * FROM musicList where artist like "Unknown"', (err, rows) => {
            if (!err) {
                resolve(rows);
            } else {
                reject(err);
            }
        });
    });
}
async function analyseFolders() {
    let list = await _getNewList();
    for await (let _song of list) {
        let song = path.resolve(_song);
        let isSong = path.extname(song);
        if (unicodes.indexOf(isSong) !== -1) {
            console.log('song ', song, ' exists');
            await new Promise((resolve, reject) => {

                playlistsDb.all('SELECT * from  musicList WHERE src like ?', [song], (err, rows) => {
                    if (!err) {
                        console.log('rows length = ', rows.length);
                        if (rows.length === 0) {
                            playlistsDb.all('INSERT INTO musicList (src,title,artist) values (?,?,?)', [song, path.parse(song).name, "Unknown"], (err) => {
                                if (!err) {
                                    console.log('not exists !')
                                    resolve(true);
                                } else {
                                    reject(err);
                                }
                            });

                        }
                    } else {
                        reject(err);
                    }
                });
            });

        } else {
            console.log(song, " doesn't exists");
        }

    }
}
async function _analyseFolders() {
    var list = await _getNewList();
    console.log('searching for a new songs is running...')
    let number = 0;
    let msg = $('body > div.loading > div.msg');
    msg.text('searching for new songs...')
    for await (let _song of list) {
        console.log(_song, ' is running now...')

        getMusic(_song, function (rows) {

            if (rows.length === 0) {

                let name = path.parse(_song).name;
                console.log(name, ' not exists !')
                playlistsDb.all('INSERT INTO musicList (src,title,artist) values (?,?,?)', [_song, name, "Unknown"], (err) => {
                    if (!err) {
                        console.log(name, ' added to music list !')
                        number = number + 1;
                        msg.text(number + ' new songs found...')
                    } else {
                        console.log(err);
                    }
                });


            }
        });

    }

}


function updateInfos(infos) {
    return new Promise((resolve, reject) => {
        playlistsDb.all('UPDATE musicList  SET title = ? , artist = ? WHERE src like ?', [
                infos.title || path.parse(infos.src).name,
                infos.artist || "Unknown",
                infos.src
            ],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(1);
                }
            });
    });

}



async function* initMusicSync() {
    let list = await getUnknowns();
    for await (let song of list) {
        let exists = await fs.existsSync(song.src);
        let tags = {};
        if (exists) {
            tags = await NodeID3.read(song.src);
            tags.src = song.src;
            await updateInfos(tags);
            await delay(600);
        }
        yield tags;
    }
}

$(document).ready(() => {

    $('.loading').fadeToggle(async () => {
        Home.render()
        await _analyseFolders();
        // await analyseFolders();
        if (currentPage === ".nav-music") {
            Music.showMusicList();
        }
        // player.setPlaylist(lastPl || "musicList", lastIndex);
        // player.song.currentTime = Number(lastTime);
        // if (paused) {
        //     player.song.pause();
        // }

        $('.loading').remove();
    });
})
// Components
var songCard = (index, title, duration, artist, cover, playlist) => {
    // pl = playlist
    // Cont = container
    var playIcon = '<i class="fa fa-play" aria-hidden="true"></i>'
    var deleteIcon = '<i class="fa fa-plus" aria-hidden="true"></i>'
    var infosIcon = '<i class="fa fa-ellipsis-v" aria-hidden="true"></i>'
    var plCont = document.createElement('div');
    plCont.classList = "playlist-card mb-2";
    var plImgDiv = document.createElement('div');
    plImgDiv.classList = "playlist-img";
    var plImg = document.createElement('img');
    plImg.src = cover;
    plImgDiv.appendChild(plImg)
    
    var plOverlay = document.createElement('div');
    plOverlay.classList = 'playlist-overlay'
    var buttons = document.createElement('div');
    buttons.classList = 'buttons';
    var playBtn = document.createElement('div');
    playBtn.innerHTML = playIcon;
    playBtn.classList = 'play';
    var deleteBtn = document.createElement('div');
    deleteBtn.innerHTML = deleteIcon;
    deleteBtn.classList = 'play';
    var infosBtn = document.createElement('div');
    infosBtn.innerHTML = infosIcon;
    infosBtn.classList = 'play';
    buttons.appendChild(playBtn);
    buttons.appendChild(deleteBtn);
    buttons.appendChild(infosBtn);
    plOverlay.appendChild(buttons);
    plImgDiv.appendChild(plOverlay);
    var plInfosDiv = document.createElement('div');
    plInfosDiv.classList = 'playlist-infos';
    plInfosDiv.innerHTML = `<div class="date">
                             <span>${artist}</span>
                         </div>
                         <div class="title">
                            
                        </div>`;
    plInfosDiv.children[1].appendChild(title);
    plInfosDiv.setAttribute('index', index);
    playBtn.onclick = (ev) => {
        player.setPlaylist(playlist, index);
    }
    plCont.appendChild(plImgDiv);
    plCont.appendChild(plInfosDiv);
    $(plImgDiv).hover((ev) => {
        $(ev.currentTarget).find('.playlist-overlay').fadeToggle();
    });
    return plCont;
}
var MinSongCard = (index, title, duration, artist, playlist) => {
    var heart = '<i class="fa fa-heart" aria-hidden="true"></i>';
    var ellipsisH = '<i class="fas fa-trash    "></i>';
    var musicCont = document.createElement('div');
    var musicDiv = document.createElement('div');
    musicDiv.classList = "w-100 h-100 d-inline-flex align-items-center";
    musicCont.classList = "music";
    musicCont.setAttribute('index', index);

    var playDiv = document.createElement('div');
    playDiv.classList = "play";
    playDiv.innerHTML = '<i class="fa fa-play-circle mt-2" aria-hidden="true"></i>';
    musicDiv.appendChild(playDiv);
    var titleDiv = document.createElement('div');
    titleDiv.classList = "title";
    var titleSpan = setTitle(title, 100);
    titleDiv.appendChild(titleSpan);
    musicDiv.appendChild(titleDiv);
    musicDiv.innerHTML += `<div class="artist">
                    <h5 class="p-0 m-0">${artist}</h5>
                </div>`;
    musicDiv.innerHTML += ` <div class="duration">
                    <h5 class="p-0 m-0">${duration}</h5>
                </div>`;
    var optionsDiv = document.createElement('div');
    optionsDiv.classList = "options";
    var addTofavoritesSpan = document.createElement('span');
    addTofavoritesSpan.classList = "pr-3 add-to-favorites";
    addTofavoritesSpan.innerHTML = heart;
    addTofavoritesSpan.onclick = (ev) => {
        var src;
        if (playlist != "musicList") {
            src = playlists[playlist][index];
        } else {
            src = musicList[index];
        }
        getFavorite(src, kind, (exists) => {
            if (exists.length == 0) {
                addToFavorites(src, "song", (success) => {
                    if (success) {
                        playlists['favorites'].push(src);
                        addTofavoritesSpan.style.color = "#e83c70";
                        addTofavoritesSpan.setAttribute('added-favorite', "true");
                    }
                })
            } else {
                deleteFav(src, 'song', (success) => {
                    if (success) {
                        var index = playlists['favorites'].indexOf(src);
                        if (index != -1) {
                            delete playlists['favorites'][index];
                        }
                        addTofavoritesSpan.style.color = "rgba(216, 216, 216, 0.637)";
                        addTofavoritesSpan.setAttribute('added-favorite', "false");
                    }
                })
            }
        })

    }
    var src;
    var kind = "song";
    if (playlist != "musicList") {
        src = playlists[playlist][index];

    } else {
        src = musicList[index];
    }

    musicCont.setAttribute('src', src);
    getFavorite(src, kind, (exists) => {
        if (exists.length != 0) {
            addTofavoritesSpan.style.color = "#e83c70";
            addTofavoritesSpan.setAttribute('added-favorite', "true");
        }
    })
    var addToPlaylistSpan = document.createElement('span');
    addToPlaylistSpan.classList = "pr-3 add-to-playlist";
    addToPlaylistSpan.innerHTML = '<i class="fa fa-plus" aria-hidden="true"></i>';
    addToPlaylistSpan.onclick = () => {
        getTemplate(templatesUrl.modals.addToPlaylist, {}, (temp) => {
            $("#main").append(temp).ready(() => {

                playlistsDb.all('select * from playlists order by _created DESC', (err, rows) => {
                    if (err) {
                        alert(err)
                    } else {
                        for (let row of rows) {

                            playlistsDb.all('select * from `' + row.title + '`', (err, res) => {
                                var minPl = Playlist.minPl(row.title, res.length, row['cover_src'], (name) => {
                                    insertIntoPlaylist(name, [src]);
                                    playlists[name].push(src);
                                    var song_name = path.parse(src).name;
                                    alert(song_name + " added successfuly");
                                });
                                $('.pl-list').append(minPl)
                            });

                        }
                    }
                })


            });
        })
    }

    var moreOptionsSpan = document.createElement('span');
    moreOptionsSpan.classList = "pr-3 add-to-favorites";
    moreOptionsSpan.innerHTML = ellipsisH;
    moreOptionsSpan.onclick = () => {
        var curPlaying = player.currentPlaying;
        remote.dialog.showMessageBox(curWindow, {
            title: "Message",
            message: "are you sure you want to delete this song ?",
            buttons: ["yes", "no"]
        }).then((val) => {
            if (val.response == 0) {
                deleteFav(src, "song", (success) => {
                    if (success) {
                        delLatestListened(src, (success) => {
                            if (success) {
                                if (src === curPlaying) {
                                    player.next()

                                }
                                deleteSong(src).then(() => {
                                    delete playlists[playlist][index];
                                    musicCont.remove();
                                    var newList = [];
                                    for (let song of playlists[curPl]) {
                                        if (song !== undefined) {
                                            newList.push(song);
                                        }
                                    }
                                    playlists[curPl] = newList;
                                });
                            }
                        });
                    }
                })
            }

        });

        // if (playlist != "musicList") {

        //     remote.dialog.showMessageBox(curWindow, {
        //         title: "Message",
        //         message: "are you sure you want to delete this song ?",
        //         buttons: ["yes", "no"]
        //     }).then((val) => {

        //         if (val.response == 0) {
        //             var curPl = player.currentPlaying;
        //             if (src == curPl) {
        //                 player.next();
        //                 musicCont.remove();
        //                 if (playlist != "latestListened" && playlist != "favorites") {
        //                     playlistsDb.all('DELETE FROM  `' + playlist + '` where song_src like ?', [src], (err) => {
        //                         if (err) {
        //                             alert(err)
        //                         } else {
        //                             alert(src + ' removed successfuly!');
        //                         }
        //                     });
        //                 } else {
        //                     alert(src + ' removed successfuly!');
        //                 }


        //             } else {

        //             }



        //         }
        //     })

        // } else {
        //     remote.dialog.showMessageBox(curWindow, {
        //         title: "Message",
        //         message: "are you sure you want to delete this song ?",
        //         buttons: ["yes", "no"]
        //     }).then((val) => {
        //         console.log(val)
        //         if (val.response == 0) {
        //             if (src == player.currentPlaying) {
        //                 player.next();
        //                 setTimeout(() => {
        //                     try {
        //                         fs.unlinkSync(src);
        //                         delete musicList[index];

        //                         musicCont.remove();
        //                         var index = Music.listDOM.indexOf(musicCont);
        //                         if (Music.listDOM.indexOf(musicCont) != -1) {
        //                             delete Music.listDOM[index];

        //                         }


        //                         alert(title + ' removed successfuly !')
        //                     } catch (err) {
        //                         alert(err);
        //                     }


        //                 }, 500)

        //             } else {
        //                 try {
        //                     fs.unlinkSync(src);
        //                     delete musicList[index];
        //                     var index = Music.listDOM.indexOf(musicCont);
        //                     if (Music.listDOM.indexOf(musicCont) != -1) {
        //                         delete Music.listDOM[index];


        //                     }
        //                     alert(title + ' removed successfuly !')
        //                     musicCont.remove();
        //                 } catch (err) {
        //                     alert(err);
        //                 }
        //             }
        //         }

        //     })
        // }
    }
    optionsDiv.appendChild(addTofavoritesSpan)
    optionsDiv.appendChild(addToPlaylistSpan)
    optionsDiv.appendChild(moreOptionsSpan)
    musicDiv.appendChild(optionsDiv);
    musicCont.appendChild(musicDiv);
    musicCont.draggable = true
    musicCont.ondragstart = (ev) => {
        ev.preventDefault();
        electron.ipcRenderer.send('ondragstart', path.resolve(src));
    }
    musicCont.onmouseup = (ev) => {
        ev.preventDefault()
        if (ev.button == 0 && !ev.ctrlKey) {
            var cls = ev.target.classList;
            if (cls == "title" || cls == "song-title") {

                if (fs.existsSync(src)) {
                    player.setPlaylist(playlist, index);
                } else {
                    musicCont.remove();
                    delete playlists[playlist][index];
                    var lodash = require('lodash');
                    lodash.sortBy()
                    alert('this song is not exists in your directory. maybe removed or replaced.');

                }
            }
        }
        if (ev.button == 0 && ev.ctrlKey) {
            if (selections.indexOf(musicCont) == -1) {
                selections.push(musicCont);
                $(musicCont).toggleClass('music-selected');
                console.log("selected !")
            } else {
                delete selections[selections.indexOf(musicCont)];
                var newList = [];
                for (i of selections) {
                    if (i !== undefined) {
                        newList.push(i)
                    }
                }
                selections = newList;
                $(musicCont).toggleClass('music-selected');
                console.log("unselected !");
            }


        }

    }

    $(musicCont).ready((ev)=>{
        
        var exists = fs.existsSync(src);
        if (!exists)
        {
            let song = playlists[playlist][index];
            delete song;
            musicCont.remove();
            playlistsDb.all(`DELETE FROM \`${playlist}\`  where src = ?`,[song],(err)=>{
                if (err)
                {
                    console.error(err);
                }
            });
        }
        console.log(src," loaded from ",playlist," with number",index)
    })
    musicCont.artist = duration;
    return musicCont;
}
var playlistCard = (title, date, img = null) => {
    // pl = playlist
    // Cont = container
    var playIcon = '<i class="fa fa-play" aria-hidden="true"></i>'
    var deleteIcon = '<i class="fa fa-plus" aria-hidden="true"></i>'
    var infosIcon = '<i class="fa fa-trash" aria-hidden="true"></i>'
    var plCont = document.createElement('div');
    plCont.classList = "playlist-card";
    var plImgDiv = document.createElement('div');
    plImgDiv.classList = "playlist-img";
    var plImg = document.createElement('img');
    var existsImg = fs.existsSync(img);
    if (existsImg) {
        plImg.src = img;
    } else {
        plImg.src = "./assets/images/placeholder.png"
    }
    plImgDiv.appendChild(plImg)
    var plOverlay = document.createElement('div');
    plOverlay.classList = 'playlist-overlay'
    var buttons = document.createElement('div');
    buttons.classList = 'buttons';
    var playBtn = document.createElement('div');
    playBtn.innerHTML = playIcon;
    playBtn.classList = 'play';
    playBtn.onclick = () => {
        if (playlists[title] != 0) {
            player.setPlaylist(title, 0);
        }
    }
    var deleteBtn = document.createElement('div');
    deleteBtn.innerHTML = deleteIcon;
    deleteBtn.onclick = () => {
        remote.dialog.showOpenDialog(curWindow, {
            properties: ['multiSelections']
        }).then((ev) => {
            if (ev.filePaths) {
                insertIntoPlaylist(title, ev.filePaths);
                for (let _path of ev.filePaths) {
                    if (!playlists[title].indexOf(_path)) {
                        playlists[title].push(_path);
                    }
                }

                console.log('done...playlist');
            }
        })
    }
    deleteBtn.classList = 'play';
    var infosBtn = document.createElement('div');
    infosBtn.innerHTML = infosIcon;
    infosBtn.classList = 'play';
    infosBtn.onclick = () => {
        deletePl(title)
        Playlist.render();
    }
    buttons.appendChild(playBtn);
    buttons.appendChild(deleteBtn);
    buttons.appendChild(infosBtn);
    plOverlay.appendChild(buttons);
    plImgDiv.appendChild(plOverlay);
    var plInfosDiv = document.createElement('div');
    plInfosDiv.classList = 'playlist-infos';
    plInfosDiv.innerHTML = `<div class="date">
                             <span>${date}</span>
                         </div>
                         <div class="title">
                             ${title}
                        </div>`;
    plInfosDiv.onclick = (ev) => {
        Playlist.showPlaylist(title, date, img);
    }
    plCont.appendChild(plImgDiv);
    plCont.appendChild(plInfosDiv);
    $(plImgDiv).hover((ev) => {
        $(ev.currentTarget).find('.playlist-overlay').fadeToggle();
    });
    return plCont;
}
var musicFolderModel = (name, _path, onCLick) => {
    var musicFolderCont = document.createElement('div');
    musicFolderCont.classList = "music-folder";
    var icon = document.createElement('div');
    icon.innerHTML = '<span class="folder-icon"><i class="fa fa-folder" aria-hidden="true"></i></span>';
    var infos = document.createElement('div');
    infos.classList = "infos";
    var folderName = `<h4 class="m-0 p-0 folder-name">${name}</h4>`;
    var folderPath = `<h4 class="folder-path">${_path}</h4>`;
    infos.innerHTML = folderName + "\n" + folderPath;
    musicFolderCont.appendChild(icon);
    musicFolderCont.appendChild(infos);
    musicFolderCont.onclick = () => {
        onCLick();
    }
    return musicFolderCont;
}
// mouse right click
// home by default



// variables for controlling visiting pages
var currentPage = 'home' || localStorage.getItem('currentPage');
var lastVisitedPage = 'home' || localStorage.getItem('lastVisitedPage');
// templates to use
var templatesUrl = {
    home: appPath + "/dist/templates/home.html",
    playlist: appPath + "/dist/templates/playlists.html",
    music: appPath + "/dist/templates/music.html",
    recorder: appPath + "/dist/templates/recorder.html",
    favorites: appPath + "/dist/templates/favorites.html",
    modals: {
        findMusic: appPath + "/dist/templates/modals/find-music.html",
        createPlaylist: appPath + "/dist/templates/modals/create-playlist.html",
        playlist: appPath + "/dist/templates/modals/playlist.html",
        addToPlaylist: appPath + "/dist/templates/modals/add-to-playlist.html",
        viewMore: appPath + "/dist/templates/modals/view-more.html",
        search: appPath + "/dist/templates/modals/search.html",
        editInfos: appPath + "/dist/templates/modals/edit-info.html"
    },
    mini: {
        noMusic: appPath + "/dist/templates/mini/no-music.html",
        folder: appPath + "/dist/templates/mini/folder.html",
        dialogBox: appPath + "/dist/templates/mini/dialog-box.html",
        min_player: appPath + "/dist/templates/mini/min-player.html"
    }
}


function getTemplate(url, data = {}, callback) {
    ejs.renderFile(url, data, (err, str) => {
        if (err) {
            alert(err)
            callback(false)
        } else {
            callback(str)
        }
    });
}
var navItems = {
    home: $('.nav-home'),
    playlists: $('.nav-playlists'),
    recorder: $('.nav-recorder'),
    favorites: $('.nav-favorites'),
    music: $('.nav-music'),
    radio: $('.nav-radio'),
    youtube: $('.nav-youtube')
}

function setActive(className, name) {
    $(currentPage).removeClass("pi-nav-active");
    currentPage = className;
    navItems[name].addClass('pi-nav-active');
}
// Routes
var Home = {
    render: function () {
        $(currentPage).removeClass("pi-nav-active")
        currentPage = ".nav-home";
        getTemplate(templatesUrl.home, {
            message: "you have no music found ! please find your music"
        }, (template) => {
            $("#main").html(template).ready(() => {
                $('.view-more-btn').on('click',() => {
                    latestListenedDb.all("SELECT * FROM latest_listened limit 50", (err, result) => {
                        if (!err) {
                            getTemplate(templatesUrl.modals.viewMore, {
                                title: "Recently listened"
                            }, (temp) => {
                                $('#main').append(temp).ready(() => {
                                    $(".close-btn").on('click',() => {
                                        $('.view-more-cont').remove();
                                    });
                                    var musicListDiv = document.querySelector('.view-more-body .music-cont');
                                    if (result.length != 0) {
                                        var name = 'latestListened';
                                        playlists[name] = [];
                                        for (let song of result) {
                                            // we stopped here

                                            getSongInfos(song.src, (infos) => {
                                                playlists[name].push(song.src)

                                                var artist;
                                                var title;
                                                if (infos) {

                                                    if (infos.title) {
                                                        title = infos.title
                                                    } else {
                                                        title = path.parse(song.src).name
                                                    }
                                                    artist = infos.artist || "Unknown";

                                                } else {
                                                    title = path.parse(song.src).name
                                                    artist = "Unknown";

                                                }

                                                var musicDiv = MinSongCard(playlists[name].indexOf(song.src),
                                                    title, song.listened_date, artist, name)
                                                musicListDiv.appendChild(musicDiv)

                                            })
                                        }
                                    } else {
                                        getTemplate(templatesUrl.mini.noMusic, {
                                            message: "you didn't play any song yet"
                                        }, (temp) => {
                                            musicListDiv.innerHTML = temp;
                                        })
                                    }
                                });
                            })
                        }
                    })
                });
                getLatestListened(10, (result) => {

                    var listDiv = document.getElementById('list-music');

                    var musicListDiv = document.createElement('div');
                    musicListDiv.classList = "music-cont";
                    listDiv.appendChild(musicListDiv)
                    musicListDiv.innerHTML = `
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>`;
                    if (result.length != 0) {
                        var name = 'latestListened';
                        playlists[name] = [];
                        for (let song of result) {
                            // we stopped here
                            if (fs.existsSync(song.src)) {
                                NodeID3.read(song.src, (err, infos) => {
                                    playlists[name].push(song.src)

                                    var artist;
                                    var title;
                                    if (infos) {

                                        if (infos.title) {
                                            title = infos.title
                                        } else {
                                            title = path.parse(song.src).name
                                        }
                                        artist = infos.artist || "Unknown";
                                        if (song.duration) {

                                        }
                                    } else {
                                        title = path.parse(song.src).name
                                        artist = "Unknown";

                                    }
                                    if (musicListDiv.getElementsByClassName('_music-loading').length != 0) {
                                        musicListDiv.innerHTML = '';
                                    }
                                    var musicDiv = MinSongCard(playlists[name].indexOf(song.src),
                                        title, song.listened_date, artist, name)
                                    musicListDiv.appendChild(musicDiv)

                                });
                            }
                        }
                    } else {
                        getTemplate(templatesUrl.mini.noMusic, {
                            message: "you didn't play any song yet"
                        }, (temp) => {
                            musicListDiv.innerHTML = temp;
                        })
                    }
                });
                getMostFriquentSongs((result) => {
                    var listDiv = document.getElementById('list-music-2');

                    var musicListDiv = document.createElement('div');
                    musicListDiv.classList = "music-cont";
                    listDiv.appendChild(musicListDiv)
                    musicListDiv.innerHTML = `
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>
                        <div class="_music-loading"></div>`;
                    if (result.length != 0) {
                        var name = 'mostFriquent';
                        playlists[name] = [];
                        for (let song of result) {
                            // we stopped here

                            if (fs.existsSync(song.src)) {
                                playlists[name].push(song.src)
                                if (musicListDiv.getElementsByClassName('_music-loading').length != 0) {
                                    musicListDiv.innerHTML = '';
                                }

                                var musicDiv = MinSongCard(playlists[name].indexOf(song.src),
                                    song.title || path.parse(song.src).name, song.frequent_num, song.artist, name)
                                musicListDiv.appendChild(musicDiv);
                            }
                        }
                    } else {
                        getTemplate(templatesUrl.mini.noMusic, {
                            message: "you didn't play any song yet"
                        }, (temp) => {
                            musicListDiv.innerHTML = temp;
                        })
                    }
                })
            });

        })
        navItems.home.addClass('pi-nav-active');

    }

}
var Music = {
    isInitRun: false,
    showSongs: async function (songs) {
        for await (let list of songs) {
            for await (song of list) {
                if (fs.existsSync(song.src)) {
                    if (musicList.indexOf(song.src) == -1) {
                        musicList.push(song.src)
                    }
                    if (currentPage == ".nav-music") {
                        var card = MinSongCard(musicList.indexOf(song.src), song.title || path.parse(song.src).name, song.artist,
                        song.added_time.split(" ")[0], "musicList");
                        await card.onload;
                        card.setAttribute('playlist', 'musicList');
                        Music.listDOM.push(card);
                        document.getElementsByName(song.artist)[0].appendChild(card);
                    }

                } else {
                    delete _playlist[_playlist.indexOf(song.src)];
                }
            }
            await delay(200);
        }

    },
    initMusic: async () => {

        if (Music.isInitRun == false) {
            Music.isInitRun = true;
            for await (tag of initMusicSync()) {
                for await (dom of Music.listDOM) {
                    if (dom.getAttribute('src') === tag.src) {

                        $(dom).find("div .duration h5").text(tag.artist || "Unknown")
                        if (tag.title) {
                            $(dom).find("div .title").html(setTitle(tag.title, 100));
                        }
                    }
                }
                await delay(200);
            }

        } else {
            console.log("initializing is already started");
        }
    },
    search: function () {
        getTemplate(templatesUrl.modals.search, {
                placeholder: "Search for Song..."
            },
            (temp) => {
                $('.main').append(temp).ready(() => {
                    getTemplate(templatesUrl.mini.noMusic, {
                        message: "type what you want to search..."
                    }, (temp) => {
                        $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                    });
                    $('.srch-input').on('input', (ev) => {
                        $(".srch-result").html('')
                        var srch_txt = ev.currentTarget.value;
                        if (srch_txt != "" && srch_txt.length >= 4) {
                            new Promise((resolve, reject) => {
                                playlistsDb.all("SELECT * FROM `musicList` WHERE title LIKE '%" + srch_txt + "%' OR artist LIKE '%" + srch_txt + "%' AND artist NOT LIKE 'Unknown'", (err, rows) => {
                                    if (!err) {
                                        resolve(rows)
                                    } else {
                                        reject(err)
                                    }
                                });
                            }).then((results) => {
                                var col = document.createElement('div')
                                col.classList = "music-cont";
                                $('.srch-result').append(col)
                                if (results.length != 0) {
                                    for (result of results) {
                                        if (fs.existsSync(result.src)) {
                                            var cardAsync = new Promise((resolve) => {
                                                var _card = MinSongCard(musicList.indexOf(result.src), result.title, "", result.artist, "musicList");
                                                resolve(_card);
                                            });
                                            cardAsync.then((card) => {
                                                col.append(card);
                                            });
                                        }
                                    }
                                } else {
                                    getTemplate(templatesUrl.mini.noMusic, {
                                        message: "Sorry...we can't find your search"
                                    }, (temp) => {
                                        $(".srch-result").html(temp);
                                    });
                                }
                            })
                        } else {

                            if (srch_txt != "") {
                                getTemplate(templatesUrl.mini.noMusic, {
                                    message: "type what you want to search..."
                                }, (temp) => {
                                    $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                                });
                            } else {
                                getTemplate(templatesUrl.mini.noMusic, {
                                    message: "Sorry...we can't find your search"
                                }, (temp) => {
                                    $(".srch-result").html(temp);
                                });
                            }
                        }
                    });
                    $('.srch-form .close-btn').on('click',() => {
                        $('.srch-modal-cont').fadeToggle('fast', () => {
                            $('.srch-modal-cont').remove();
                        })
                    })
                });
            })
    },
    listDOM: [],
    Songs: [],
    Artists: [],
    showMusicList: () => {
        $(currentPage).removeClass("pi-nav-active")
        currentPage = ".nav-music";
        navItems.music.addClass('pi-nav-active');
        getTemplate(templatesUrl.music, {}, (template) => {
            $("#main").html(template).ready((hand) => {
                $('.srch-btn').on('click',() => {
                    Music.search();
                });
                $('.img-overlay').hide()
                $('.song-card').hover((ev) => {
                    $(ev.currentTarget).find('.img-overlay').toggle()
                });
                $('.find-btn').on('click',(ev) => {
                    createFindMusicWindow()
                });
                if (Music.listDOM.length != musicList.length) {
                    Music.listDOM = [];
                    playlistsDb.all('select * from musicList order by artist', (err, results) => {
                        if (!err) {
                            if (results.length != 0) {
                                console.log("results.length = ", results.length)
                                var num = 10;
                                var length = results.length;
                                if (length <= 500) {
                                    num = 20;
                                    millisc = 200;
                                }
                                if (length > 500 && length <= 1000) {
                                    num = 50;

                                }
                                if (length > 1000) {
                                    num = 100;
                                }
                                var rowsNum = results.length / num;
                                if (Music.Songs == 0) {
                                    var counter = 0;
                                    for (let i = 0; i <= num; i++) {
                                        var listDom = [];
                                        for (let b = 0; b <= rowsNum; b++) {
                                            if (results[counter] !== undefined) {
                                                listDom.push(results[counter]);
                                                counter = counter + 1;


                                            }

                                        }
                                        if (listDom != 0) {
                                            Music.Songs.push(listDom);
                                        }
                                    }
                                }
                                var col = document.createElement('div')
                                col.classList = "music-cont";
                                $('.row').append(col);


                                for (let song of results) {
                                    if (Music.Artists.indexOf(song.artist) == -1) {
                                        Music.Artists.push(song.artist);
                                    }
                                }
                                for (let artist of Music.Artists) {
                                    var artistHeader = Music.ArtistHeaders(artist);
                                    if (document.getElementsByName(artist).length == 0) {
                                        $('.playlist-list .row').append(artistHeader);
                                    }
                                    
                                }
                                console.log("Artists = ", Music.Artists)
                                Music.showSongs(Music.Songs).then(async () => {
                                    await Music.initMusic();
                                    await delay(300);
                                    Music.listDOM.length = 0;
                                });
                            } else {
                                getTemplate(templatesUrl.mini.noMusic, {
                                        message: "Sorry...there are no music to show here. please find your music from your desktop folders"
                                    },
                                    (temp) => {
                                        if (temp) {
                                            var col = document.createElement('div')
                                            col.classList = "music-cont";
                                            col.innerHTML = temp;
                                            $('.row').ready(() => {
                                                $('.row').append(col)
                                            });
                                        }
                                    });
                            }
                        } else {
                            alert(err);

                        }

                    });
                } else {
                    var col = document.createElement('div')
                    col.classList = "music-cont";
                    $('.row').append(col);
                    for (let artist of Music.Artists) {
                        var artistHeader = Music.ArtistHeaders(artist);
                        
                        if (document.getElementsByName(artist).length == 0) {
                            $('.playlist-list .row').append(artistHeader);
                        }
                    }
                    for (let dom of Music.listDOM) {
                        if (dom) {
                            console.log(dom.artist)
                            $(dom).ready(() => {
                                let artistEl = document.getElementsByName(dom.artist)[0];

                               if(artistEl)
                               {   
                                    artistEl.append(dom);
                               }
                               
                            });

                        }
                    }
                    navItems.music.addClass('pi-nav-active');
                }
            })

        });

    },
    ArtistHeaders: (name) => {
        var contDiv = document.createElement('div');
        contDiv.setAttribute("name", name);
        contDiv.classList = "music-cont";
        var headerDiv = document.createElement('div');
        headerDiv.classList = "artist-name";
        headerDiv.innerHTML = name;
        contDiv.appendChild(headerDiv);
        return contDiv;
    },


}
var Playlist = {
    removePlaylist: ()=>{

    },
    search: function () {
        getTemplate(templatesUrl.modals.search, {
                placeholder: "Search for Playlists..."
            },
            (temp) => {
                getTemplate(templatesUrl.mini.noMusic, {
                    message: "type what you want to search..."
                }, (temp) => {
                    $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                })
                $('.main').append(temp).ready(() => {

                    $('.srch-input').on('input', (ev) => {
                        $(".srch-result").html('');
                        var srch_txt = ev.currentTarget.value;
                        if (srch_txt != "") {
                            playlistsDb.all('SELECT * FROM playlists WHERE title like "%' + srch_txt + '%"', (err, results) => {
                                if (!err) {
                                    if (results.length != 0) {
                                        for (result of results) {
                                            playlistsDb.all('SELECT * FROM `' + result.title + '`', (err, rows) => {
                                                if (!err) {

                                                    var pl = Playlist.minPl(result.title, rows.length, result.cover_src, () => {
                                                        $('.srch-modal-cont').fadeToggle('fast', () => {
                                                            $('.srch-modal-cont').remove();
                                                            Playlist.showPlaylist(result.title, result._created, result.cover_src);
                                                        });
                                                    });
                                                    $(".srch-result").append(pl);
                                                } else {
                                                    console.log(err);
                                                }
                                            });
                                        }
                                    } else {
                                        getTemplate(templatesUrl.mini.noMusic, {
                                            message: "Sorry...We don't find what you search..."
                                        }, (temp) => {
                                            $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                                        });
                                    }

                                } else {
                                    alert(err)
                                }
                            });
                        } else {
                            getTemplate(templatesUrl.mini.noMusic, {
                                message: "type what you want to search..."
                            }, (temp) => {
                                $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                            });
                        }
                    });
                    $('.srch-form .close-btn').on('click',() => {
                        $('.srch-modal-cont').fadeToggle('fast', () => {
                            $('.srch-modal-cont').remove();
                        })
                    })
                });
            })
    },
    minPl: function (name, song_count, cover, onClick) {
        var minPlCont = document.createElement('div');
        minPlCont.classList = "min-pl mb-3";
        var minPlImgDiv = document.createElement('div');
        minPlImgDiv.classList = "min-pl-img";
        var minPlImg = document.createElement('img');
        minPlImg.src = cover;
        minPlImgDiv.appendChild(minPlImg);
        var minPlInfos = document.createElement('div');
        minPlInfos.classList = "min-pl-infos";
        minPlInfos.innerHTML = `<h4 class="m-0" id="pl-title">${setTitle(name,50).innerHTML}</h4>
                       <span id="pl-song-count">${song_count} songs</span>`;
        minPlCont.appendChild(minPlImgDiv);
        minPlCont.appendChild(minPlInfos);
        minPlCont.onclick = () => {
            onClick(name);
        }
        return minPlCont;

    },
    refrechMusic: function (plTitle) {
        getPlaylistMusic(plTitle, (result) => {

            var listDiv = document.createElement('div');
            listDiv.classList = "list";
            var musicListDiv = document.createElement('div');
            musicListDiv.classList = "music-cont";
            listDiv.appendChild(musicListDiv)
            document.getElementsByClassName('pl-body')[0].appendChild(listDiv)

            if (result) {

                for (let song of result) {
                    var loading = document.createElement('div');
                    loading.classList = "_music-loading";
                    musicListDiv.appendChild(loading)
                    getSongInfos(song.song_src, (infos) => {
                        var duration = "0:00";
                        var artist;
                        var title;
                        if (infos) {

                            if (infos.title) {
                                title = infos.title
                            } else {
                                title = path.parse(song.song_src).name
                            }
                            artist = infos.artist || "Unknown";
                            if (song.duration) {
                                duration = "0:00";
                            }
                        } else {
                            title = path.parse(song.song_src).name
                            artist = "Unknown";
                            duration = "0:00";
                        }
                        console.log('current active playlist = ', playlists[name])
                        console.log("index is = ", playlists[name].indexOf(song.song_src))
                        var musicDiv = MinSongCard(playlists[name].indexOf(song.song_src),
                            title, duration, artist, name)
                        loading.replaceWith(musicDiv)
                    })
                }
            }
        })
    },
    showPlaylist: function (name, date, cover) {
        getTemplate(templatesUrl.modals.playlist, {
            name: name,
            date: date,
            cover: cover
        }, (template) => {
            $("#main").html(template).ready(() => {
                $('.pl-img-overlay').hover(() => {
                    $('.pl-img-overlay span').fadeToggle(300);
                })
                $('.pl-img-overlay img').on('click',() => {
                    remote.dialog.showOpenDialog(curWindow, {
                        properties: ["openFile", "createDirectory"]
                    }).then((value) => {
                        if (!value.canceled) {
                            var src_img = value.filePaths[0];
                            if (allowedImages.indexOf(path.parse(src_img).ext) != -1) {
                                playlistsDb.run('UPDATE playlists SET cover_src = ? where cover_src = ? ', [src_img, cover],
                                    (err) => {
                                        if (err) {
                                            alert('oops ! there are an error please try again later');
                                        } else {
                                            alert(name + '\'s cover updated successfuly !');
                                            Playlist.showPlaylist(name, date, src_img);
                                        }
                                    });
                            } else {
                                alert('This file is not an Image file.');
                            }

                        }
                    })
                })
                $('#add-song').on('click',(ev) => {
                    remote.dialog.showOpenDialog(curWindow, {
                        properties: ['multiSelections']
                    }).then((ev) => {
                        var lastList = [];
                        var length = Number($('.song-count').text().split(" ")[0]);
                        if (length <= 50) {
                            for (_path of ev.filePaths) {
                                if (unicodes.indexOf(path.parse(_path)) != -1) {
                                    lastList.push(_path);
                                }
                            }
                            if (lastList != 0) {
                                insertIntoPlaylist(name, lastList)
                                for (let _path of lastList) {
                                    if ((length + lastList.length) <= 50) {
                                        playlists[name].push(_path);
                                    } else {
                                        alert('a playlist should have 50 songs maximum');
                                        break;
                                    }
                                }
                                Playlist.showPlaylist(name, date, cover);
                                console.log('done...playlist');
                            }
                        } else {
                            alert('a playlist should have 50 songs maximum');
                        }

                    })

                })
                getFavorite(name, "playlist", (pl) => {
                    console.log('pl.length is = ', pl.length);
                    if (pl.length != 0) {
                        $("#add-to-favorite").css({
                            backgroundColor: "#e83c70",
                            color: "white"
                        });
                        $("#add-to-favorite").attr('added-to-favorites', 'true')
                    } else {
                        $("#add-to-favorite").css({
                            backgroundColor: "white",
                            color: "#e83c70"
                        });
                        $("#add-to-favorite").attr('added-to-favorites', 'false')
                    }
                });
                $("#add-to-favorite").on('click',(ev) => {
                    if ($("#add-to-favorite").attr('added-to-favorites') != 'true') {
                        addToFavorites(name, "playlist", (success) => {

                            if (success) {
                                $("#add-to-favorite").css({
                                    backgroundColor: "#e83c70",
                                    color: "white"
                                })
                                $("#add-to-favorite").attr('added-to-favorites', 'true')
                            }
                        });
                    } else {
                        favoritesDb.all('DELETE FROM favorite_playlists WHERE name LIKE ?', [name],
                            (err) => {
                                if (!err) {
                                    $("#add-to-favorite").css({
                                        backgroundColor: "white",
                                        color: "#e83c70"
                                    });
                                } else {
                                    console.log(err);
                                    alert('oops ! There are an Error... try again later.')
                                }
                            })
                    }

                })
                $('#play-all').on('click',() => {
                    player.setPlaylist(name, 0);
                })
                getPlaylistMusic(name, (result) => {
                    var listDiv = document.createElement('div');
                    listDiv.classList = "list";
                    var musicListDiv = document.createElement('div');
                    musicListDiv.classList = "music-cont";
                    listDiv.appendChild(musicListDiv)
                    document.getElementsByClassName('pl-body')[0].appendChild(listDiv)
                    playlists[name] = [];
                    if (result) {
                        if (result.length == 1) {
                            $('.song-count').text(result.length + " song")
                        } else {
                            $('.song-count').text(result.length + " songs")
                        }
                        Playlist.setSongs(name, result, musicListDiv)
                    }
                })
            })
        })
    },
    setSongs: async function (name, songs, where) {
         playlists[name] = [];
        for await (let song of songs) {
            console.log(name," song = ",song);
            var exists = await fs.existsSync(song.song_src);
            
            if (exists) {
                playlists[name].push(song.song_src);
                if (currentPage === ".nav-playlists")
                {
                    var loading = document.createElement('div');
                    loading.classList = "_music-loading";
                    where.appendChild(loading);
                    await delay(200);
                    var tags = await NodeID3.read(song.song_src);
                    var title = tags.title || path.parse(song.song_src).name;
                    var artist = tags.artist || "Unknown";

                    var songDOM = MinSongCard(playlists[name].indexOf(song.song_src), title, "", artist, name);
                    loading.remove();
                    where.appendChild(songDOM);
                }
                

            }

        }
    },
    render: function () {
        $(currentPage).removeClass("pi-nav-active")
        currentPage = ".nav-playlists";
        getTemplate(templatesUrl.playlist, {}, (template) => {
            $("#main").html(template).ready((pl) => {
                $(".playlist-card .playlist-img").hover((ev) => {
                    $(ev.currentTarget).find('.playlist-overlay').fadeToggle();
                });
                $('.create-playlist').on('click',() => {
                    showCreatePlaylist()
                });
                $('.srch-btn').on('click',() => {
                    Playlist.search()
                });
                // initializing playlists
                playlistsDb.all('select * from playlists order by _created DESC', (err, rows) => {
                    if (err) {
                        alert(err)
                    } else {
                        if (rows.length != 0) {
                            for (let row of rows) {
                                var time = row._created.split(' ')[0].replace('-', '/')
                                var plModel = playlistCard(row.title, time, row['cover_src']);
                                var plList = document.getElementById('pl-list');
                                var col = document.createElement('div')
                                col.classList = 'col-3 pl-0 mt-3';
                                col.appendChild(plModel);
                                plList.appendChild(col);
                            }
                        } else {

                        }
                    }
                })
            })

        })
        navItems.playlists.addClass('pi-nav-active')
    }
}
var Favorites = {
    search: function () {
        getTemplate(templatesUrl.modals.search, {
                placeholder: "Search for Favorites..."
            },
            (temp) => {
                $('.main').append(temp).ready(() => {
                    getTemplate(templatesUrl.mini.noMusic, {
                        message: "type what you want to search..."
                    }, (temp) => {
                        $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                    });
                    $('.srch-input').on('input', (ev) => {
                        $(".srch-result").html('');
                        var musicListDiv = document.createElement('div');
                        musicListDiv.classList += "music-cont";
                        $('.srch-result').append(musicListDiv)
                        var srch_txt = ev.currentTarget.value;
                        if (srch_txt != "" && srch_txt.length >= 3) {
                            playlistsDb.all('SELECT * FROM musicList where title like "%' + srch_txt + '%" OR artist LIKE "%' + srch_txt + '%" AND artist NOT LIKE "Unknown"', (err, results) => {


                                if (results != 0) {

                                    for (let res of results) {
                                        favoritesDb.all('SELECT * FROM favorite_songs where src like "%' + res.src + '%"', (err, songs) => {
                                            if (songs != 0) {
                                                found = true;
                                                console.log(songs)
                                                for (song of songs) {
                                                    var artist = res.artist;
                                                    var title = res.title;
                                                    console.log(playlists["favorites"].indexOf(res.src))
                                                    console.log(res.src)
                                                    var musicDiv = MinSongCard(playlists["favorites"].indexOf(res.src),
                                                        title, song.added_time.split(' ')[0], artist, "favorites");
                                                    musicListDiv.appendChild(musicDiv);
                                                }
                                            }

                                        });
                                    }

                                } else {
                                    getTemplate(templatesUrl.mini.noMusic, {
                                        message: "Sorry we can't find your search..."
                                    }, (temp) => {
                                        $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                                    });
                                }

                            });

                        } else if (srch_txt == "" || srch_txt.length <= 3) {
                            if (srch_txt == "") {
                                getTemplate(templatesUrl.mini.noMusic, {
                                    message: "type what you want to search..."
                                }, (temp) => {
                                    $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                                });
                            } else if (srch_txt.length <= 3) {
                                getTemplate(templatesUrl.mini.noMusic, {
                                    message: "Sorry we can't find your search..."
                                }, (temp) => {
                                    $(".srch-result").html(temp).find('.icon').html('<i class="fa fa-comment    "></i>');
                                });
                            }
                        }
                    });
                    $('.srch-form .close-btn').on('click',() => {
                        $('.srch-modal-cont').fadeToggle('fast', () => {
                            $('.srch-modal-cont').remove();
                        })
                    })
                });
            })
    },
    render: () => {
        setActive(".nav-favorites", "favorites");
        getTemplate(templatesUrl.favorites, {}, (temp) => {
            $('#main').html(temp).ready((ev) => {
                playlists['min-favorites'] = [];
                var name = 'favorites';
                $("#srch-btn").on('click',() => {
                    Favorites.search();
                });
                $('#view-more-songs').on('click',() => {
                    getTemplate(templatesUrl.modals.viewMore, {
                        title: "Favorite Music"
                    }, (temp) => {
                        $('#main').append(temp).ready(() => {
                            getAllFavorites("song", (songs) => {
                                if (songs.length != 0) {


                                    for (let song of songs) {
                                        if (fs.existsSync(song.src)) {

                                            var musicListDiv = document.querySelector('.view-more-body .music-cont');
                                            var loading = document.createElement('div');
                                            loading.classList = "_music-loading";
                                            musicListDiv.appendChild(loading);
                                            musicListDiv.setAttribute('loading', "true");
                                            // we stopped here
                                            NodeID3.read(song.src, (err, infos) => {
                                                if (!playlists['favorites'].indexOf(song.src)) {
                                                    playlists['favorites'].push(song.src);
                                                }
                                                var duration = song.added_time;
                                                var artist;
                                                var title;
                                                if (infos || !err) {

                                                    if (infos.title) {
                                                        title = infos.title;
                                                    } else {
                                                        title = path.parse(song.src).name;
                                                    }
                                                    artist = infos.artist || "Unknown";
                                                    if (!song.duration) {
                                                        duration = "";
                                                    }
                                                } else {
                                                    title = path.parse(song.src).name;
                                                    artist = "Unknown";
                                                    duration = "";
                                                    if (err) {
                                                        console.log(err);
                                                    }
                                                }

                                                var musicDiv = MinSongCard(playlists[name].indexOf(song.src),
                                                    title, duration, artist, name);

                                                if (musicListDiv.getAttribute('loading') == 'true') {
                                                    musicListDiv.innerHTML = "";
                                                    musicListDiv.setAttribute('loading', "false");
                                                }

                                                musicListDiv.appendChild(musicDiv)
                                            });
                                        }


                                    }
                                } else {

                                }
                            })
                        });
                        $('.close-btn').on('click',() => {
                            $('.view-more-cont').remove();
                        });
                    })
                })
                getFavorites("song", 10, (songs) => {
                    playlists['min-favorites'] = [];
                    if (songs.length != 0) {


                        for (let song of songs) {
                            if (fs.existsSync(song.src)) {

                                var musicListDiv = document.getElementById('list-music');
                                var loading = document.createElement('div');
                                loading.classList = "_music-loading";
                                musicListDiv.appendChild(loading);
                                musicListDiv.setAttribute('loading', "true");
                                // we stopped here
                                NodeID3.read(song.src, (err, infos) => {
                                    if (err) {
                                        console.log(err)
                                    }
                                    playlists['min-favorites'].push(song.src);
                                    var artist;
                                    var title;
                                    if (infos) {

                                        if (infos.title) {
                                            title = infos.title;
                                        } else {
                                            title = path.parse(song.src).name;
                                        }
                                        artist = infos.artist || "Unknown";

                                    } else {
                                        title = path.parse(song.src).name;
                                        artist = "Unknown";

                                    }

                                    var musicDiv = MinSongCard(playlists['min-favorites'].indexOf(song.src),
                                        title, song.added_time.split(" ")[0], artist, 'min-favorites');

                                    if (musicListDiv.getAttribute('loading') == 'true') {
                                        musicListDiv.innerHTML = "";
                                        musicListDiv.setAttribute('loading', "false");
                                    }

                                    document.getElementById('list-music').appendChild(musicDiv)
                                });
                            }

                        }
                    } else {
                        getTemplate(templatesUrl.mini.noMusic, {
                            message: "you don't add any song to your favorites"
                        }, (temp) => {
                            var musicListDiv = document.getElementById('list-music');
                            musicListDiv.innerHTML = temp;
                        })
                    }
                });
                getFavorites('playlist', 10, (pls) => {

                    if (pls.length != 0) {
                        var plList = document.getElementById('pl-list');
                        for (pl of pls) {
                            playlistsDb.all('select * from playlists where title like ?', pl.name, (err, rows) => {
                                if (err) {
                                    alert(err)
                                } else {
                                    if (rows.length != 0 && rows.length == 1) {
                                        var row = rows[0];
                                        var time = row._created.split(' ')[0].replace('-', '/')
                                        var plModel = playlistCard(row.title, time, row['cover_src']);
                                        var col = document.createElement('div')
                                        col.classList = 'col-3 pl-0 mt-3';
                                        col.appendChild(plModel);
                                        plList.appendChild(col);
                                    }
                                }
                            })
                        }
                    } else {
                        getTemplate(templatesUrl.mini.noMusic, {
                            message: "you don't add any playlist to your favorites"
                        }, (temp) => {
                            var plList = document.getElementById('pl-list');
                            plList.innerHTML = temp;
                        })

                    }
                })
            })
        })
    }
}
var _Recorder = {
    refrech: () => {
        var records = fs.readdirSync(recPath);
        playlists['records'] = [];
        for (_path of records) {
            var parsed = path.parse(_path);
            if (parsed.ext = "wav") {
                playlists['records'].push(recPath + "/" + _path);
            }
        }
        $('.music-cont').html('');
        for (let vc of playlists['records']) {
            var pl = playlists['records'];
            var card = MinSongCard(pl.indexOf(vc), path.parse(vc).name, "", "", 'records');
            $('.music-cont').append(card);
        }
    },
    render: () => {
        setActive(".nav-recorder", 'recorder');
        getTemplate(templatesUrl.recorder, {}, (temp) => {
            $('#main').html(temp).ready((ev) => {
                // initializing voice records
                // list of records
                var records = fs.readdirSync(recPath);
                playlists['records'] = [];
                for (_path of records) {
                    var parsed = path.parse(_path);
                    if (parsed.ext = "wav") {
                        playlists['records'].push(recPath + "/" + _path);
                    }
                }

                $('.rec').on('click',() => {
                    Rec.start();
                    $('.rec-stop').animate({
                        left: "500px"
                    }, 200);
                    $('.rec-remove').animate({
                        right: "190px"
                    }, 200);
                })
                $('.rec-remove').on('click',() => {
                    Rec.recorder.clear();
                    Rec.recording = false;
                    Rec.seconds = 0;
                    clearInterval(Rec.interval);
                    $(".rec-btn").html('<i class="fa fa-microphone" aria-hidden="true"></i>');
                    $(".rec").removeClass('recording');
                    $('.rec-stop').css("left", "auto");
                    $('.rec-remove').css('right', "auto");
                })
                $('.rec-stop').on('click',() => {
                    Rec.stop();
                    $('.rec-stop').css("left", "auto")
                    $('.rec-remove').css('right', "auto")
                })
                if (playlists['records'].length != 0) {
                    for (let vc of playlists['records']) {
                        var pl = playlists['records'];
                        var card = MinSongCard(pl.indexOf(vc), path.parse(vc).name, "", "", 'records');
                        $('.music-cont').append(card);
                    }
                } else {
                    getTemplate(templatesUrl.mini.noMusic, {
                        message: "you don't have any recorded audio"
                    }, (temp) => {
                        $('.music-cont').html(temp);

                    })
                }



            })
        })
    }
}
navItems.home.on('click',() => {
    Home.render();
})
navItems.playlists.on('click',() => {
    Playlist.render()
});
navItems.music.on('click',() => {
    Music.showMusicList();
});
navItems.recorder.on('click',() => {
    _Recorder.render();
});
navItems.favorites.on('click',() => {
    Favorites.render();
});
// Modals
function showFindMusicModal() {
    getTemplate(templatesUrl.modals.findMusic, {}, (temp) => {

        $('body').append(temp).ready((e) => {
            for (let folder of musicFolders) {
                var name = path.parse(folder).name
                var dir = path.parse(folder).dir

                $('.pi-modal .body .folder-list').append(`
                    <div class="music-folder">
                    <div class="icon">
                        <span><i class="fa fa-folder" aria-hidden="true"></i></span>
                    </div>
                    <div class="infos">
                        <h4 class="m-0 p-0 folder-name">${name}</h4>
                        <span class="folder-path">${dir}</span>
                    </div>
                </div>
                    `);
            }
            var folderPaths = [];
            $('.add-folder').on('click',(ev) => {
                remote.dialog.showOpenDialog(curWindow, {
                        properties: ['openDirectory', 'createDirectory']
                    })
                    .then((ev) => {
                        $('.pi-modal .body .folder-list').append(`
                            <div class="music-folder">
                            <div class="icon">
                                <span><i class="fa fa-folder" aria-hidden="true"></i></span>
                            </div>
                            <div class="infos">
                                <h4 class="m-0 p-0 folder-name">${path.parse(ev.filePaths[0]).name}</h4>
                                <span class="folder-path">${ev.filePaths[0]}</span>
                            </div>
                        </div>
                            `);
                        folderPaths.push(ev.filePaths[0]);


                    })
            });
            $('.btn-light').on('click',(ev) => {


                $('.find-song-modal').fadeToggle('fast', () => {
                    $('.find-song-modal').remove();
                });


            })
            $('#done').on('click',(ev) => {
                var resolved = [];
                $("#done").css({
                    backgroundColor: "white"
                })
                var img = '<img src="./assets/images/rolling.gif" width="30px" alt="">';
                $('#done').html(img)
                new Promise((resolve, reject) => {
                    insertMusicFolders(folderPaths).then((val) => {
                        finishing(folderPaths, resolved).then((val) => {
                            resolve()
                        });
                    })
                });
            })
        })
    });
}

function showCreatePlaylist() {
    var paths = []
    getTemplate(templatesUrl.modals.createPlaylist, {}, (temp) => {
        // $('.pl-overlay').hide();
        $('body').append(temp).ready(() => {

            var setCoverBtn = $('#set-cover');
            var removeCoverBtn = $('#remove-cover');

            $('.browse-file').on('click',() => {

                remote.dialog.showOpenDialog(curWindow, {
                    properties: ['multiSelections'],

                    filters: ["mp3", "m4a", "aac", "wav", "mpeg"]
                }).then((ev) => {
                    if (ev.filePaths && paths.length <= 50) {
                        for (let link of ev.filePaths) {
                            if (unicodes.indexOf(path.parse(link).ext) != -1) {
                                if (paths.length <= 50) {
                                    if (paths.indexOf(link) == -1) {
                                        var model = musicFolderModel(path.parse(link).name, link, () => {});
                                        $('.selected-paths').append(model);
                                        paths.push(link);
                                    }

                                } else {
                                    alert("playlist should have 50 the maximum");
                                    break;
                                }
                            }
                        }
                    }
                })
            })

            setCoverBtn.on('click',() => {
                remote.dialog.showOpenDialog(curWindow, {
                    properties: ['openFile'],
                    extensions: ['png', 'jpg']
                }).then((ev) => {
                    if (allowedImages.indexOf(path.parse(ev.filePaths[0]).ext) != -1) {
                        $('#pl-cover').attr('src', ev.filePaths[0]);
                    } else {
                        alert('this file is not an image file')
                    }
                })
            });

            $('#done').on('click',() => {
                if (paths.length != 0) {
                    var cover = $('#pl-cover').attr('src');
                    var title = $('#pl-title').val();
                    if (title != "") {
                        createPlaylist(title, cover, (success) => {

                            if (success) {

                                insertIntoPlaylist(title, paths)
                                playlists[title] = paths;
                                $('.create-pl-cont').fadeToggle('fast', () => {
                                    $('.create-pl-cont').remove();
                                });
                            } else {
                                alert('Error Creating your playlist please try again later...')
                            }
                        })
                    }
                } else {
                    alert('Please add at least one song to create the playlist');
                }
            });
            $('#close-pl').on('click',(ev) => {
                $('.create-pl-cont').fadeToggle('fast', () => {
                    $('.create-pl-cont').remove();
                });
            });


        });
        $(".pl-cover").hover((ev) => {
            $(ev.currentTarget).find('.pl-overlay').fadeToggle();
        });


    })
}
//  set the minimized player in the window
function Maximize() {
    curWindow.maximize();
    curWindow.resizable = true;
    curWindow.menuBarVisible = true;
    $('._min-player').remove();
    $('.main-body .main').show();
    player.setInfos();
    if (player.song.loop) {
        $('.controls--loop').addClass('controls-active');
    } else {
        $('.controls--loop').removeClass('controls-active');
    }
    if (player.isRandom) {
        $('.controls--random').addClass('controls-active');
    } else {
        $('.controls--random').removeClass('controls-active');
    }
    if (!player.song.paused) {
        $(".controls--play, .min-play-btn div").html(pauseModel)
        $(".controls--play, .min-play-btn").addClass('playing');
    }
    clearInterval(player.rangeInterval)
    player.rangeInterval = setInterval(() => {
        if ($("#prog")) {
            var curTime = player.song.currentTime;
            var duration = player.song.duration;
            player.setTimeRange(curTime, duration)
            var percent = (curTime * 100) / duration;
            $('#range').val(percent);
            var val = $('#range').val()

            $("#prog").width(val.toString() + "%");
        }
    }, 1000)
    player.isMinPlayerActive = false;

}

function setMinPlayer(img, title, artist, duration, curTime) {
    async function setInfos(url) {
        let tags = await NodeID3.read(url);
        var title = tags.title || path.parse(url).name;
        var artist = tags.artist || "Unknown";
        var src;
        if (tags.image) {

            var base64String = "";
            for (var i = 0; i < tags.image.imageBuffer.length; i++) {
                base64String += String.fromCharCode(tags.image.imageBuffer[i]);
            }
            src = "data:" + tags.image.mime.format + ";base64," +
                window.btoa(base64String);

        } else {
            src = "./assets/images/placeholder.png"
        }
        $('#min-cover').attr("src", src);
        $('._min-title').html(setTitle(title, 35));


    }

    getTemplate(templatesUrl.mini.min_player, {
        src: img,
        title: title,
        artist: artist,
        src: img
    }, (temp) => {

        if (player.rangeInterval) {
            clearInterval(player.rangeInterval)
        }
        curWindow.resizable = false;
        curWindow.setContentSize(350, 350);
        curWindow.menuBarVisible = false;

        $('.main-body .main').hide();
        $('.main-body').append(temp).ready(() => {
            player.isMinPlayerActive = true;
            if (player.song) {
                setInfos(player.currentPlaying);
                if (player.song.loop) {
                    $('._min-loop').toggleClass("_min-active");
                }
                if (player.isRandom) {
                    $("._min-random").toggleClass('_min-active');
                }
                if (!player.song.paused) {
                    $('._min-play').html('<i class="fa fa-pause" aria-hidden="true"></i>')
                }
                player.rangeInterval = setInterval(() => {
                    var curTime = player.song.currentTime;
                    var duration = player.song.duration;
                    var percent = (curTime * 100) / duration;
                    $('#min-range').val(percent);
                    var val = $('#min-range').val()
                    $("#min-prog").width(val.toString() + "%");

                }, 1000);



                player.song.onended = () => {
                    if (!player.isRandom) {
                        if ((_playlist.length - 1) == player.curIndex) {
                            player.curIndex = 0;
                        } else {
                            player.curIndex = player.curIndex + 1;
                        }
                        player.currentPlaying = _playlist[player.curIndex];

                    } else {
                        var randIndex = randomIndex(_playlist.length - 1)
                        player.curIndex = randIndex;
                        player.currentPlaying = _playlist[player.curIndex];
                        $('._min-random').toggleClass("_min-active");
                    }
                    player.song.src = player.currentPlaying;
                    player.song.play().then(() => {
                        insertIntoLatestListened(player.currentPlaying);
                        setInfos(player.currentPlaying);
                    });

                }
                $("#min-range").on('input', () => {
                    var val = $('#min-range').val()
                    $("#min-prog").width(val.toString() + "%");
                    var duration = player.song.duration;
                    var curTime = (duration * val) / 100;
                    player.song.currentTime = curTime;
                    player.setTimeRange(curTime, duration);
                });
                $('._min-next').on('click',() => {
                    if (!player.isRandom) {
                        if ((_playlist.length - 1) == player.curIndex) {
                            player.curIndex = 0;
                        } else {
                            player.curIndex = player.curIndex + 1;
                        }
                        player.currentPlaying = _playlist[player.curIndex];

                    } else {
                        var randIndex = randomIndex(_playlist.length - 1)
                        player.curIndex = randIndex;
                        player.currentPlaying = _playlist[player.curIndex];
                    }
                    player.song.src = player.currentPlaying;
                    player.song.play().then(() => {
                        insertIntoLatestListened(player.currentPlaying);
                        setInfos(player.currentPlaying)
                    });

                });
                $('._min-previus').on('click',() => {
                    if (!(player.curIndex == 0)) {
                        player.curIndex = player.curIndex - 1;

                    } else {
                        player.curIndex = _playlist.length;
                    }
                    player.currentPlaying = _playlist[player.curIndex];
                    player.song.src = player.currentPlaying;
                    player.song.play().then(() => {
                        insertIntoLatestListened(player.currentPlaying);
                        setInfos(player.currentPlaying)
                    });

                });
                $('._min-play').on('click',() => {
                    if (!player.song.paused) {
                        $('._min-play').html('<i class="fa fa-play" aria-hidden="true"></i>')
                        player.song.pause();
                    } else {
                        $('._min-play').html('<i class="fa fa-pause" aria-hidden="true"></i>')
                        player.song.play();
                    }
                });
                $('._min-random').on('click',() => {
                    if (!player.isRandom) {
                        player.isRandom = true;
                    } else {
                        player.isRandom = false;
                    }
                    $('._min-random').toggleClass("_min-active");
                });
                $('._min-loop').on('click',() => {
                    if (!player.song.loop) {
                        player.song.loop = true;
                    } else {
                        player.song.loop = false;
                    }
                    $('._min-loop').toggleClass("_min-active");
                });

            }
            $('.top-options span').on('click',() => {
                Maximize();
            })
        });


    });
    player.isMinPlayerActive = true;
}

function refrechMusic() {
    if (currentPage == ".nav-music") {
        Music.render();
    }
}

function createFindMusicWindow() {
    const win = new remote.BrowserWindow({
        titleBarStyle: "hidden",
        icon: app.getAppPath() + "/dist/assets/logo/icon.ico",
        webPreferences: {
            nodeIntegration: true,
            preload: "./preload.js",
            enableRemoteModule: true
        },
        center: true,
        width: 1400,
        height: 800
    });


    // and load the index.html of the app.
    win.setSize(600, 650);
    win.center()
    win.resizable = false
    // win.menuBarVisible = false
    win.loadFile('dist/find-music.html');
}


var Rec = {
    audio_context: null,
    recorder:null,
    interval: null,
    seconds:0,
    recording:false,
    available:false,
    timer: (el)=>{
        var formatTime = videojs.formatTime(Rec.seconds)
        el.text(formatTime);
        Rec.interval = setInterval(()=>{
            Rec.seconds = Rec.seconds + 1;
            var formatTime = videojs.formatTime(Rec.seconds)
            el.text(formatTime);
        },1000)
    },
    init: ()=>{
        try {
            // webkit shim
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
            window.URL = window.URL || window.webkitURL;
            Rec.audio_context = new AudioContext();
            __log('Audio context set up.');
            navigator.getUserMedia({audio:true},()=>{
                Rec.available = true;  
            },(err)=>{
                Rec.available = false;
                console.log(err)
            })
            __log('navigator.getUserMedia ' + (navigator.getUserMedia ? 'available.' : 'not present!'));
        } catch (e) {
            alert('No web audio support in this !');
        }

        navigator.getUserMedia({
            audio: true
        }, Rec.startUserMedia, function (e) {
            __log('No live audio input: ' + e);
        });
    },
    createDownloadLink: ()=>{
        Rec.recorder && Rec.recorder.exportWAV(function (blob) {
            var url = URL.createObjectURL(blob);
            
            blob.arrayBuffer().then((val)=>{
                var Uint16 = new Uint16Array(val);
                
                var voice = new Audio(url);
                getTemplate(templatesUrl.mini.dialogBox,
                {message:"Choose a name for the file:"}
                ,(temp)=>{
                    $('#main').append(temp).ready(()=>{
                        $(".save-btn").click(()=>{
                            var filename = $('.dialog-input').val();
                            if (filename != "")
                            {
                                fs.writeFile(recPath + "/" + filename + ".wav", Uint16, {}, () => {
                                    $('.dialog-cont').remove();
                                    _Recorder.refrech();
                                });
                            } 

                        });
                        voice.onpause = ()=>{
                                $('.c-play-btn').html('<i class="fa fa-play mr-1" aria-hidden="true"></i> Play')
                        }
                        $(".cancel-btn").click(() => {
                             $('.dialog-cont').remove();
                             voice.pause()

                        });
                        $('.c-play-btn').click(()=>{
                            if (voice.paused)
                            {
                                $('.c-play-btn').html('<i class="fa fa-pause mr-1" aria-hidden="true"></i> pause')
                                voice.play()
                            }
                            else
                            {
                                voice.pause()
                                $('.c-play-btn').html('<i class="fa fa-play mr-1" aria-hidden="true"></i> Play')
                            }
                        })
                        
                    })
                })
            })
            
           
            
        });
    },
    startUserMedia : (stream)=> {
        var input = Rec.audio_context.createMediaStreamSource(stream);
        __log('Media stream created.');
        Rec.recorder = new Recorder(input);
        __log('Recorder initialised.');
    },
    start: ()=>{
        if (!Rec.recording)
        {

            Rec.recorder && Rec.recorder.record();
            Rec.timer($(".rec-btn"));
            $(".rec").addClass('recording');
            __log('Recording...');
            Rec.recording = true;

        }
        else
        {
            Rec.recorder && Rec.recorder.stop();
            clearInterval(Rec.interval);
            $(".rec-btn").html('<i class="fa fa-pause" aria-hidden="true"></i>');
            $(".rec").removeClass('recording');
            Rec.recording = false;
        }
        
    },
    stop: ()=>{
        Rec.recorder && Rec.recorder.stop();
        __log('Stopped recording.');
        // create WAV download link using audio data blob
        Rec.createDownloadLink();
        
        Rec.recorder.clear();
        Rec.recording = false;
        Rec.seconds = 0;
        clearInterval(Rec.interval);
        $(".rec-btn").html('<i class="fa fa-microphone" aria-hidden="true"></i>');
            $(".rec").removeClass('recording');

    },
    pause: ()=>{
         Rec.recorder && Rec.recorder.stop();
         clearInterval(Rec.interval);
         $(".rec-btn").html('<i class="fa fa-microphone" aria-hidden="true"></i>');
    }
}
function __log(e, data) {
     console.log(e)
}



window.onload = function () {
  console.log("Start initializing the Recorder...")
  Rec.init()   
};
