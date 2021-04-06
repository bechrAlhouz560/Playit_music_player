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