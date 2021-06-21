// .env initialisation

require('dotenv').config();

// modules

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const app = express();
const fetch = require('node-fetch');
// const io = require('socket.io').listen(process.env.IOPORT);
const say = require('say');
const amqp = require('amqplib/callback_api');
const server = require('./server.js');

// constants

const API_VERSION = process.env.API_VERSION || '5.131';
const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;

// variables

let longPoll = null;
let rmqChannel = null;
let rmqSockets = 'socketsUpdate';
let rmqSocketKey = 'sockets.update';
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

            channel.assertExchange(rmqSockets, 'topic', {
                durable: false
            });

            channel.assertExchange(rmqExchange, 'topic', {
                durable: false
            });

            channel.assertQueue('', {
                exclusive: true
              }, function(error2, q) {
                if (error2) {
                  throw error2;
                }
          
                channel.bindQueue(q.queue, rmqSockets, '#');
          
                channel.consume(q.queue, function(msg) {
                  console.log('server sockets updates: ' + msg.content.toString());
                  server.socketSetModes(JSON.parse(msg.content.toString()));
                }, {
                  noAck: true
                });
          
                rmqChannel = channel;
          
            });

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
            console.log(`rmq_client updates: ${JSON.stringify(update)}`);
            
            rmqChannel.publish(rmqExchange, rmqKey, Buffer.from(update.toString()));
            console.log(`Sent from rmq_client with key - ${rmqKey}`);

            local_getNewUpdate();
        }
    );
}

local_start();
server.start();