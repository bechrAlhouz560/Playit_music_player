const {
    app,
    BrowserWindow,
    contentTracing
} = require('electron')
const electron = require('electron')
const {
    session
} = require('electron');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function initMusic(callback) {
    const appData = app.getPath('appData') + '/Playit';
    const appPath = app.getAppPath();
    const databases = appData + "/databases";
    var exists = fs.existsSync(databases);

    if (!exists) {
        fs.mkdirSync(databases);
    }
    var settingsDb = new sqlite3.Database(databases + '/settings.db', (err) => {
        if (err) {
            console.log(err)
            callback(false)
        } else {
            var query = settingsDb.run('CREATE TABLE IF NOT EXISTS music_folders (folder_name,path)', (err) => {
                if (err) {
                    console.log(err)
                    callback(false)
                } else {
                    settingsDb.all('SELECT * FROM music_folders', (err, rows) => {
                        if (err) {
                            console.log(err)
                            callback(false)
                        } else {
                            console.log(rows)
                            if (rows.length == 0) {
                                callback(true);
                            } else {
                                callback(false);
                            }
                        }
                    });
                }
            });

        }
    });


}

function createWindow() {
    // Create the browser window.
    const win = new BrowserWindow({
        titleBarStyle: "hiddenInset",
        icon: electron.nativeImage.createFromPath(app.getAppPath() + "/dist/assets/logo/icon.ico"),
        webPreferences: {
            nodeIntegration: true,
            devTools: true,
            enableRemoteModule: true
        },
        autoHideMenuBar: true,
        center: true,
        width: 1400,
        height: 800,
    });
    var prBtn = electron.nativeImage.createFromPath(app.getAppPath() + "/dist/assets/images/btns/previous.png");
    var playBtn = electron.nativeImage.createFromPath(app.getAppPath() + "/dist/assets/images/btns/play.png");
    var nextBtn = electron.nativeImage.createFromPath(app.getAppPath() + "/dist/assets/images/btns/next.png");
    prBtn.resize({
        width: (prBtn.getSize().width / 4)
    });
    playBtn.resize({
        width: (playBtn.getSize().width / 4)
    });
    nextBtn.resize({
        width: (nextBtn.getSize().width / 4)
    });
    win.setThumbarButtons([{
        tooltip: 'previous',
        icon: prBtn,
        click() {
            electron.ipcMain.emit("previous-song");
        }
    }, {
        tooltip: 'Play/Pause',
        icon: playBtn,
        click() {
            electron.ipcMain.emit("play-song");
        }
    }, {
        tooltip: 'next',
        icon: nextBtn,
        click() {
            electron.ipcMain.emit("next-song");
        }
    }]);

    // and load the index.html of the app.
    initMusic((notExists) => {
        if (notExists) {
            win.setSize(600, 650);
            win.center()
            win.resizable = false
            // win.menuBarVisible = false
            win.loadFile('dist/find-music.html');
        } else {
            win.loadFile('dist/index.html');
        }
    });
}

app.whenReady().then(() => {
    electron.ipcMain.on('ondragstart', (event, filePath) => {
        event.sender.startDrag({
            file: path.resolve(filePath),
            icon: electron.nativeImage.createFromPath(app.getAppPath() + "/dist/assets/images/cover.png")
        });

    });
    electron.ipcMain.on("play-song", () => {
        electron.app.emit('play-song');
    });
    electron.ipcMain.on("previous-song", () => {
        electron.app.emit('previous-song');
    });
    electron.ipcMain.on("next-song", () => {
        electron.app.emit('next-song');
    });
    // develepment tools
    console.log('start watching for style.css...')
    
    createWindow();
});



