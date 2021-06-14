// modules

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const app = express();
const fetch = require('node-fetch');
const io = require('socket.io').listen(8080);
const say = require('say');
const amqp = require('amqplib/callback_api');

// .env initialisation

// express default things

const urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(express.static(__dirname + '/'));

// constants

const API_VERSION = process.env.API_VERSION || '5.131';
const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;

// variables

let longPoll = null;

function local_start() {
    request(
        {
            uri: encodeURI(`https://api.vk.com/method/messages.getLongPollServer?need_pts=0&lp_version=3&v=${API_VERSION}&access_token=${MESSAGES_TOKEN}`),
            method: 'POST'
        }, function (error, res) {

            longPoll = JSON.parse(res.body).response;

            local_getNewUpdate();

            return;
        }
    );
}

function local_getNewUpdate() {
    request(
        {
            uri: encodeURI(`https://${longPoll['server']}?act=a_check&key=${longPoll['key']}&ts=${longPoll['ts']}&wait=10&mode=2&version=3`),
            method: 'POST'
        }, (error, res) => {
            try {
                var deJSON = JSON.parse(res.body);
            } catch (err) {
                local_getNewUpdate();
            }
            longPoll['ts'] = deJSON['ts'];
            update = deJSON['updates'];
            console.log(`rpc_client updates: ${res.body}`);
            analyseNewUpdate();
            local_getNewUpdate();
        }
    );
}