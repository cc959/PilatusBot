var icy = require('icy');
var Discord = require('discord.js');
var fs = require('fs');
var admin = require('firebase-admin');
var https = require("https");
var btoa = require("btoa");

var serviceAccount = require('./Firebase.json');
const { resolve } = require('path');
const { rejects } = require('assert');

const token = "caf09329a307fa9111cf9ee2bd8ea7bdf031c7ea";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://pilatusbot-e5644-default-rtdb.firebaseio.com/"
})


var songs;

var client = new Discord.Client();
client.login("Nzg0MTEyNjM4NTY0MjM3MzYy.X8kjzQ.UzFYcMfTmLk_viDAkZoGztHylSc");
var channel;

client.on("ready", () => {
    console.log("Discord.js ready");
    client.guilds.fetch("784113118543347733").then(guild => channel = guild.channels.cache.get("784113119571607584"));
});

var title;

// URL to ICY stream
var url = 'https://radiopilatus.ice.infomaniak.ch/pilatus192.mp3';


getGithubFileInfo("cc959/PilatusBot", "Songs.txt").then(e => getGithubFile(e.download_url)).then(e => { songs = e; title = songs.split("\n").pop(); getTitle(); }).catch(e => console.error(e));



// connect to the remote stream
function getTitle() {

    icy.get(url, function (res) {

        // any "metadata" events that happen
        res.on("metadata", function (metadata) {
            var parsed = icy.parse(metadata);

            var containsPilatus = parsed.StreamTitle.indexOf("Radio Pilatus") !== -1;

            var timeNow = new Date().getUTCHours();

            var withinTime = timeNow > 4 && timeNow < 16;

            console.log(withinTime + " " + parsed.StreamTitle);



            if (parsed.StreamTitle !== title && !containsPilatus && parsed.StreamTitle.length > 5) {

                if (withinTime) {
                    //github sux
                    title = parsed.StreamTitle;
                    console.log(title);
                    channel.send(title);

                    getGithubFileInfo("cc959/PilatusBot", "Songs.txt").then(e => getGithubFile(e.download_url)).then(e => songs = e).catch(e => console.error(e));

                    if (songs.includes(title)) {

                        var message = {
                            notification: {
                                title: 'Duplicate Song',
                                body: title
                            },
                            topic: "general"
                        };

                        admin.messaging().send(message);

                    } else {
                        songs += "\n" + title;

                        var message = {
                            notification: {
                                title: 'New Song',
                                body: title
                            },
                            topic: "general"
                        };

                        editGithubFile("cc959/PilatusBot", "Songs.txt", "Song updated by web app", songs).catch(e => console.error(e));

                        admin.messaging().send(message);

                    }
                } else {

                    songs = "\n";
                    editGithubFile("cc959/PilatusBot", "Songs.txt", "Song updated by web app", songs).catch(e => console.error(e));

                }
            }

            getTitle();

        });
    });
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

            console.log(res.statusCode);

            let rawData = '';

            res.setEncoding("utf-8");

            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    console.log(parsedData);

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
function getGithubFile(filePath) {

    return new Promise((resolve, rejects) => {

        var req = https.get(filePath, res => {

            //console.log(res.statusCode);

            let rawData = '';

            res.setEncoding("utf-8");

            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    resolve(rawData.toString());
                } catch (e) {
                    console.error(e.message);
                }
            });

            req.on("error", err => {
                rejects(err);
            });

        });

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
