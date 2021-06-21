// modules

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const app = express();
const fetch = require('node-fetch');
// const io = require('socket.io').listen(8080);
const say = require('say');
const amqp = require('amqplib/callback_api');

// variables

let rmqChannel = null;
let rmqExchange = 'updates';
let rmqInstructions = 'instructions';
let rmqKey = 'data.instructions';
let clients = [];
let chats = [];
let modes = [];

// mongoose

const mongooseUtils = require('./modules/mongooseUtils.js');

(async () => {
  mongooseUtils.startSession();

  clients = await mongooseUtils.getClientsIds();
  modes = await mongooseUtils.getClientsModes();
  
  console.log('analyzer is ready for work!');
})();


// rabbit mq

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

    channel.assertExchange(rmqInstructions, 'topic', {
        durable: false
    });

    channel.assertQueue('', {
      exclusive: true
    }, function(error2, q) {
      if (error2) {
        throw error2;
      }

      channel.bindQueue(q.queue, rmqExchange, '#');

      channel.consume(q.queue, function(msg) {
        console.log(`Got updates in rmq_analyzer with key - ${msg.fields.routingKey} body - ${msg.content.toString()}`);
        local_analyzeNewUpdate(msg.content.toString().split(','));
      }, {
        noAck: true
      });

      rmqChannel = channel;

    });
  });
});

// helpers

function local_isInteger(value) {
  return /^\d+$/.test(value);
}

// analyze incoming updates

function local_analyzeNewUpdate(item) {

  (async () => {
    modes = await mongooseUtils.getClientsModes();
    
    console.log('modes: ' + modes);
  })();

  // console.log(update)

  // for (let i = 0; i < update.length; i++) {
  //   if (local_isInteger(update[i])) update[i] = parseInt(update[i]);
  // }

  // console.log(update)
  
    // update.forEach(
    //     (item, i, arr) => {
          // console.log(item)
            if (item[0] == 4) {
                // if (!(item[2] & 2)) {
                    if (item[3] < 2000000000) {
                        clients.forEach(
                            (elem, iter) => {
                                if (elem == item[3]) {
                                    let sys = item[5].split(' ')[0] == '/bot';
                                    let self = (item[2] & 2);
                                    let bot = self && !(item[2] & 16);
                                    if (sys || (((modes[item[3]] && modes[item[3]]['tts'] && !self)) && !sys)) {
                                        if (sys) {
                                            item[5] = item[5].split(' ');
                                            item[5].splice(0, 1);
                                            item[5] = item[5].join(' ');
                                        }
                                        rmqChannel.publish(rmqInstructions, rmqKey, Buffer.from(item.toString()));
                                        console.log(`Sent from rmq_analyzer with key - ${rmqKey} body - ${item}`);
                                        // totalCommander(item);
                                    }
                                }
                            }
                        );
                    } else {
                        chats.forEach(
                            (elem, iter) => {
                                if (elem[iter] == item[3]) {

                                }
                            }
                        );
                    }
                // }
            }
        // }
    // );
}