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