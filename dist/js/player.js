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

