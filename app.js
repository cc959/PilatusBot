var Discord = require('discord.js');
var admin = require('firebase-admin');
var https = require("https");
var btoa = require("btoa");
var atob = require("atob")

var serviceAccount = require('./Firebase.json');
const { resolve } = require('path');
const { rejects } = require('assert');

const token = "caf09329a307fa9111cf9ee2bd8ea7bdf031c7ea";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pilatusbot-e5644-default-rtdb.firebaseio.com/"
})

var count = 0;

var songs;

var client = new Discord.Client();
client.login("Nzg0MTEyNjM4NTY0MjM3MzYy.X8kjzQ.UzFYcMfTmLk_viDAkZoGztHylSc");
var channel;

client.on("ready", () => {
    console.log("Discord.js ready");
    client.guilds.fetch("784113118543347733").then(guild => channel = guild.channels.cache.get("784113119571607584"));
});


var title = "brrr";

// URL to ICY stream
var url = new URL('https://radiopilatus.ice.infomaniak.ch/pilatus192.mp3');

var message = {
    data: {
        title: 'Duplicate Song',
        body: title,
        dupe: '1'
    },
    topic: "general"
};

setTimeout(() => admin.messaging().send(message), 10);

/*getGithubFile("cc959/PilatusBot", "Songs.txt")
    .then(e => {
        songs = e;
        title = songs.split("\n").pop();
        setInterval(() => getStreamTitle().then(e => doShitWithTitle(e)).catch(e => console.error(e)), 5000);
    })
    .catch(e => console.error(e));*/

function getStreamTitle() {

    return new Promise((resolve, rejects) => {

        var options = {
            hostname: url.hostname,
            path: url.pathname,
            method: "GET",
            headers: { "Icy-MetaData": 1 }
        }

        var req = https.get(options, res => {

            res.setEncoding("utf-8");

            res.on('data', (chunk) => {

                if (chunk.includes("StreamTitle='")) {

                    var title = chunk.split("StreamTitle='")[1].split("';StreamUrl")[0];

                    res.destroy();

                    if (title.length < 5)
                        getStreamTitle().then(e => resolve(e)).catch(e => console.error(e));
                    else
                        resolve(title);
                }

            });

        });

        req.on("error", err => {
            rejects(err);
        });

        req.end();
    });

}

function doShitWithTitle(songTitle) {

    var containsPilatus = songTitle.includes("Radio Pilatus");

    var timeNow = new Date().getUTCHours();

    var withinTime = true;//timeNow > 4 && timeNow < 16;

    console.log("songtitle: '" + songTitle + "'");

    if (songTitle !== title && !containsPilatus && songTitle.length > 5) {


        title = songTitle;

        if (!withinTime) {
            songs = "\n";
            editGithubFile("cc959/PilatusBot", "Songs.txt", "Song updated by web app", songs).catch(e => console.error(e));
            return;
        }

        console.log(title);
        channel.send(title);

        getGithubFile("cc959/PilatusBot", "Songs.txt").then(e => songs = e).catch(e => console.error(e));

        if (songs.includes(title)) {

            if (songs.length - songs.indexOf(title) < 100)
                return;

            var message = {
                data: {
                    title: 'Duplicate Song',
                    body: title,
                    dupe: '1'
                },
                topic: "general"
            };

            setTimeout(() => admin.messaging().send(message), 10);
            console.log("sent firebase message");

        } else {
            songs += "\n" + title;

            var message = {
                data: {
                    title: 'New Song',
                    body: title,
                    dupe: '0'
                },
                topic: "general"
            };

            editGithubFile("cc959/PilatusBot", "Songs.txt", "Song updated by web app", songs).catch(e => console.error(e));

            setTimeout(() => admin.messaging().send(message), 10);
            console.log("sent firebase message");
        }

    }

}



function getGithubFileInfo(repos, filePath) {

    return new Promise((resolve, rejects) => {

        var options = {
            hostname: "api.github.com",
            path: `/repos/${repos}/contents/${filePath}`,
            accept: "application/vnd.github.v3+json",
            method: "GET",
            headers: { Authorization: "token " + token, 'User-Agent': 'request' }
        }

        var req = https.get(options, res => {

            let rawData = '';

            res.setEncoding("utf-8");

            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);

                    resolve(parsedData);
                } catch (e) {
                    console.error(e.message);
                    rejects(e);
                }
            });

        });

        req.on("error", err => {
            rejects(err);
        });

        req.end();

    })

}
function getGithubFile(repos, filePath) {

    return new Promise((resolve, rejects) => {
        getGithubFileInfo(repos, filePath).then(e => resolve(atob(e.content))).catch(e => rejects(e));
    });
}
function editGithubFile(repos, filePath, message, content) {
    var sha;
    return new Promise((resolve, rejects) => {
        getGithubFileInfo(repos, filePath).then(e => {
            sha = e.sha;

            content = btoa(content);

            var data = JSON.stringify({ sha: sha, message: message, content: content });

            var options = {
                hostname: "api.github.com",
                path: `/repos/${repos}/contents/${filePath}`,
                accept: "application/vnd.github.v3+json",
                method: "PUT",
                headers: { Authorization: "token " + token, 'User-Agent': 'request', "Content-Type": "application/json", "Content-Length": data.length }
            }

            var req = https.request(options, res => {

                res.on("data", d => {
                    resolve();
                });

            });

            req.on("error", err => {
                console.error(err);
                rejects(err);
            });


            req.write(data);
            req.end();

        }).catch(e => console.error(e));
    });

}
