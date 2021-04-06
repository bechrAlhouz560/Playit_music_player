const $ = require('jquery');
const jsmediatags = require('jsmediatags');
const electron = require('electron');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const NodeID3 = require('node-id3');
const appData = electron.remote.app.getPath('appData') + '/Playit';
const appPath = electron.remote.app.getAppPath();
const databases = appData + "/databases";
var exists = fs.existsSync(databases);
const unicodes = ['.mp3', ".m4a", ".mpeg", ".wav", ".aac"]
var list_music = [];
var infos;
const delay = time => new Promise(resolve => setTimeout(resolve, time));
var infosDiv = $('.infos');
function musicPaths(_path) {
    var music_paths = [];
    var files = fs.readdirSync(_path);
    for (const file of files) {
        var joined = _path + "/" + file;
        var parsed = path.parse(joined);
        if (parsed.ext != "") {
            if (unicodes.indexOf(parsed.ext) != -1) {
                music_paths.push(joined);
            }

        }
    }
    return music_paths;
}

if (!exists) {
    fs.mkdirSync(databases);
}
var folderPaths = [];

var playlistsDb = new sqlite3.Database(databases + '/playlists.db', (err) => {
    if (err) {
        remote.dialog.showErrorBox('Database Error', 'error creating a database...it will be errors in the future')
        console.log(err)
    } else {
        playlistsDb.all('CREATE TABLE IF NOT EXISTS musicList (src text,title text,artist text,frequent_num INT DEFAULT 0,added_time DEFAULT current_timestamp)', (err) => {
            if (err) {
                alert(err);
            }
        })
    }
});
var settingsDb = new sqlite3.Database(databases + '/settings.db', (err) => {
    if (err) {
        remote.dialog.showErrorBox('Database Error', 'error creating a database...it will be errors in the future')
        console.log(err)
    } else {
        settingsDb.run('CREATE TABLE IF NOT EXISTS music_folders (folder_name TEXT,path TEXT);', (err) => {
            if (err) {
                alert(err);
            }
        });
    }
});

function appendFolder() {

    electron.remote.dialog.showOpenDialog(electron.remote.getCurrentWindow(), {
            properties: ['openDirectory', 'createDirectory']
        })
        .then((ev) => {
            settingsDb.all('SELECT * FROM music_folders where folder_name like ?', [path.parse(ev.filePaths[0]).name], (err, exists) => {
                if (err) {
                    alert(err);
                } else {
                    if (exists.length == 0) {
                        var model = musicFolderModel(path.parse(ev.filePaths[0]).name, ev.filePaths[0], () => {})
                        settingsDb.run('INSERT INTO music_folders (folder_name,path) VALUES (?,?)',
                            [path.parse(ev.filePaths[0]).name, ev.filePaths[0]], (err) => {
                                if (err) {
                                    alert(err)

                                }
                            })
                        $('.pi-modal .body .folder-list').append(model);
                        folderPaths.push(ev.filePaths[0]);
                        var music = musicPaths(ev.filePaths[0]);
                        for (music_path of music) {
                            list_music.push(music_path);
                        }
                    } else {
                        alert('This folder already added.');
                    }
                }
            });

        })
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

function insertMusicFolders() {
    return new Promise((resolve, reject) => {
        var error;
        for (let _path of folderPaths) {

            settingsDb.run('INSERT INTO music_folders (folder_name,path) VALUES (?,?)',
                [path.parse(_path).name, _path], (err) => {
                    if (err) {
                        alert(err)
                        error = err
                    }
                })
        }
        if (!error) {
            resolve()
        } else {
            reject()
        }
    })

}

function insertIntoMusicList(_path, title, artist) {
    return new Promise((resolve, reject) => {
        playlistsDb.all('INSERT INTO musicList  (src ,title ,artist) VALUES (?,?,?)', [path.resolve(_path), title, artist],
            (err) => {
                if (err) {
                    console.log(err)
                    reject(err)
                } else {

                    resolve(_path);
                }
            });
    })
}

async function* getSongInfos() {
    for (let song of list_music) {
        var tags = await NodeID3.read(song);
        yield {
            src: song,
            tags: tags
        };
    }
}

function finish() {
    playlistsDb.close();
    settingsDb.close();
    localStorage.setItem("findNewMusic", "no");
    electron.remote.app.relaunch();
    electron.remote.app.quit();
}

async function run() {
    var counter = 0;
    
    for await (let song of list_music) {
       
        await insertIntoMusicList(song, path.parse(song).name,"Unknown");
        await delay(100);
        infosDiv.html(counter + ' of '+list_music.length + "loaded");
        counter = counter + 1;
    }
}

$(document).ready(() => {
    infos = $(".infos");
    settingsDb.all('SELECT * FROM music_folders', (err, dirs) => {
        for (dir of dirs) {
            var model = musicFolderModel(dir.folder_name, dir.path, () => {});
            $('.folder-list').append(model);
        }
    });
    $('.loading-1').css({
        display: "none"
    });
    $(".add-folder").click(() => {
        appendFolder();
    });
    $("#done").click(() => {
        $('.loading').css({
            display: "flex"
        }).ready(() => {
            if (folderPaths.length != 0) {
                run().then(() => {
                    finish();
                });
            } else {
                alert('Please select at least one folder to continue');
                $('.loading').css("display", "none");
            }
        });

    });
});



var files = "C:\Users\Accent\AppData\Roaming\Playit\databases";

