// .env initialisation

require('dotenv').config();

// modules

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
let io = require('socket.io');
const fetch = require('node-fetch');

// constants

const API_VERSION = process.env.API_VERSION || '5.131';
const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;

// variables

let clients = [];
let modes = [];

// mongoose

const mongooseUtils = require('./modules/mongooseUtils.js');

(async () => {
    mongooseUtils.startSession();
  
    clients = await mongooseUtils.getClientsIds();
    modes = await mongooseUtils.getClientsModes();
    
    console.log('server is ready for work!');
  })();

// export target

let server = {
    start: function() {

        //sockets

        io = io.listen(process.env.IOPORT);

        io.sockets.on('connection', (socket) => {

            socket.on('getClients', async function(data) {
                let frontData = {};
                for (elem in clients) {
                    var response = await fetch('https://api.vk.com/method/users.get?user_ids='+clients[elem]+'&fields=photo_200&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN, {
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
        
            socket.on('setModes', async function(data) {
                modes = data;
                console.log(modes)
                await mongooseUtils.setClientsModes(modes);
            });
        
            socketSetModes = function(modes) {
                socket.emit('setModes', modes);
            }
        });

        // express

        const urlencodedParser = bodyParser.urlencoded({extended: false});
        app.use(express.static(__dirname + '/'));

        app.get('/newToken', urlencodedParser, (req, res) => {
            res.send("<a href='https://oauth.vk.com/authorize?client_id="+process.env.APPID+"&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope="+process.env.TOKENSCOPE+"&response_type=token&v=" + API_VERSION + "'>Push the button</a>");
        });

        app.get('/', urlencodedParser, function(req, res) {
            res.sendfile('index.html');
        });

        app.listen(process.env.PORT);
        console.log(`server on :${process.env.PORT}`);
        console.log(`sockets on :${process.env.IOPORT}`);
    }
}



module.exports = server;