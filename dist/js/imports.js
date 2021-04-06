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

