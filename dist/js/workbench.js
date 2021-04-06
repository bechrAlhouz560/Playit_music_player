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