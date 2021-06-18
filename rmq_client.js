// .env initialisation

require('dotenv').config();

// modules

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const app = express();
const fetch = require('node-fetch');
const io = require('socket.io').listen(process.env.IOPORT);
const say = require('say');
const amqp = require('amqplib/callback_api');

// constants

const API_VERSION = process.env.API_VERSION || '5.131';
const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;

// variables

let longPoll = null;
let rmqChannel = null;
let rmqExchange = 'updates';
let rmqKey = 'data.updates';

// entry point

function local_start() {

    amqp.connect('amqp://localhost', function(error0, connection) {

        if (error0) {
            throw error0;
        }

        connection.createChannel(function(error1, channel) {

            if (error1) {
                throw error1;
            }

            channel.assertExchange(rmqExchange, 'topic', {
                durable: false
            });

            rmqChannel = channel;

        });

    });

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

// loop updates

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
            console.log(`rmq_client updates: ${update}`);
            
            rmqChannel.publish(rmqExchange, rmqKey, Buffer.from(update.toString()));
            console.log(`Sent from rmq_client with key - ${rmqKey}`);

            local_getNewUpdate();
        }
    );
}

local_start();

// sockets

io.sockets.on('connection', (socket) => {

    socket.on('getClients', async function(data) {
        var frontData = {};
        for (elem in clients) {
            var response = await fetch('https://api.vk.com/method/users.get?user_ids='+clients[elem]+'&fields=photo_200&v='+API_VERSION+'&access_token='+messagesToken, {
                method: 'POST',
              });
            var result = await response.json();
            frontData[clients[elem]] = result.response[0];
        }
        socket.emit('getClients', frontData);
    });

    socket.on('getModes', function(data) {
        socket.emit('getModes', modes);
    });

    socket.on('setModes', function(data) {
        modes = data;
        fs.writeFileSync("data/modes.json", JSON.stringify(modes));
    });

    socketSetModes = function() {
        socket.emit('setModes', modes);
    }
});

// express

const urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(express.static(__dirname + '/'));

app.get('/newToken', urlencodedParser, (req, res) => {
    res.send("<a href='https://oauth.vk.com/authorize?client_id="+appId+"&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope="+scope+"&response_type=token&v=5.37'>Push the button</a>");
});

app.get('/', urlencodedParser, function(req, res) {
    res.sendfile('index.html');
});

app.listen(process.env.PORT);
console.log(`server on :${process.env.PORT}`);
console.log(`sockets on :${process.env.IOPORT}`);