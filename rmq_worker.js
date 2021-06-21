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
const UserAgent = require('user-agents');

// .env initialisation

require('dotenv').config();

// constants

const API_VERSION = process.env.API_VERSION || '5.131';
const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;

// commands config

const commands = {
    // 'SILENT': '',
    'HELP': 'help',
    'RAND': 'choose',
    'JOKE': 'joke',
    'STOPTALK': 'stop talk',
    'TALK': 'talk',
    'CHAT': 'chat'
};

// variables

let rmqChannel = null;
let rmqSockets = 'socketsUpdate';
let rmqSocketKey = 'sockets.update';
let rmqInstructions = 'instructions';
let rmqKey = 'data.instructions';
let modes = [];
let jokes = [];

// mongoose

const mongooseUtils = require('./modules/mongooseUtils.js');

(async () => {
  mongooseUtils.startSession();

  modes = await mongooseUtils.getClientsModes();

  jokes = await mongooseUtils.getJokes();  
  
  console.log('Worker is ready for work!');
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

    channel.assertExchange(rmqSockets, 'topic', {
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

      channel.bindQueue(q.queue, rmqInstructions, '#');

      channel.consume(q.queue, function(msg) {
        // console.log(`Got updates in rmq_worker with key - ${msg.fields.routingKey} body - ${msg.content.toString()}`);
        console.log(msg.content);
        local_totalCommander(msg.content.toString().split(','));
      }, {
        noAck: true
      });

      rmqChannel = channel;

    });
  });
});

// analyze incoming updates

function local_totalCommander(item) {

    (async () => {
        modes = await mongooseUtils.getClientsModes();
        
        console.log('modes: ' + modes);
      })();

    // флаг 16 - проверка на сообщение из чата, скоро станет deprecated, если что-то
    // сломалось, стоит проверить здесь в перувую очередь 
    // как вариант при быстром deprecated флаге - ввод переменной тригера при вызове
    // функции totalCommander
    var self = (item[2] & 2);
    var bot = self && !(item[2] & 16);
    // console.log(bot);

    if ((
        // item[5] == commands.SILENT || 
        item[5] == commands.HELP) && !bot) {
        local_botInit(item);
    }

    if ((item[5].split(' ')[0] == commands.RAND && ((modes[item[3]]['rand'] && !self) || self)) && !bot) {
        var choice = getRandomInt(2);
        var choiceMessage = 'Can\'t choose(';
        switch (choice) {
            case 0: {
                choiceMessage = 'I think first)';
                break;
            }
            case 1: {
                choiceMessage = 'Maybe second)';
                break;
            }
        }
        request(
            {
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=' + choiceMessage + '&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                method: 'POST'
            }, (error, res) => {

            }
        );
    } else if (item[5] == commands.RAND && !modes[item[3]]['rand']) {
        local_accessDeniedMode(item);
    }

    if ((item[5] == commands.JOKE && ((modes[item[3]]['jokes'] && !self) || self)) && !bot) {
        request(
            {
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Anton is looking for cool joke!&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                method: 'POST'
            }, (error, res) => {
                var ind = Math.floor(Math.random() * Math.floor(jokes.length - 1));
                setTimeout(()=> {
                    request(
                        {
                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Joke number: ' + (ind+1) + ' from ' + jokes.length + '\n\n' + jokes[ind] + '&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                            method: 'POST'
                        }, (error, res) => {
                            // console.log(error);
                            // console.log(res.body);
                        }
                    );
                }, 300);
            }
        );
    } else if (item[5] == commands.JOKE && !modes[item[3]]['jokes']) {
        local_accessDeniedMode(item);
    }

    if ((item[5] != commands.STOPTALK && 
        // item[5] != commands.SILENT && 
        item[5] != commands.TALK && !isCommandMessage(item[5]) && ((modes[item[3]]['tts'] && !self))) && !bot) {
        say.export(translit(item[5]), 'Microsoft Irina Desktop', 1.0, 'tts/tmp_tts_'+item[3]+'.wav', err => {
            request(
                {
                    uri: encodeURI('https://api.vk.com/method/docs.getMessagesUploadServer?type=audio_message&peer_id=172576383&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                    method: 'POST'
                }, (error, res) => {
                    var url = JSON.parse(res.body)['response']['upload_url'];
                    var formData = {
                        file: fs.createReadStream('tts/tmp_tts_'+item[3]+'.wav')
                    }
                    request.post({url, formData}, (error, html, res) => {
                        res = JSON.parse(res)['file'];
                        request(
                            {
                                uri: encodeURI('https://api.vk.com/method/docs.save?file='+res+'&title='+'tmp_tts_'+item[3]+'&tags=bot&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                                method: 'POST'
                            }, (error, res) => {
                                // console.log(error);
                                if (!error) {
                                    res = JSON.parse(res.body)['response']['audio_message'];
                                    request(
                                        {
                                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=&attachment=doc'+res['owner_id']+'_'+res['id']+'&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                                            method: 'POST'
                                        }, (error, res) => {
                                            // console.log(error);
                                            // console.log(res.body);
                                        }
                                    );
                                }
                            }
                        );
                    });
                }
            );
        });
    }

    if ((item[5] == commands.TALK && (modes[item[3]]['ttsRoots'] || self)) && !bot) {
        if (!self) modes[item[3]]['tts'] = true;
        mongooseUtils.setClientsModes(modes);
        rmqChannel.publish(rmqSockets, rmqSocketKey, Buffer.from(JSON.stringify(modes).toString()));
    } else if (item[5] == commands.TALK && !modes[item[3]]['ttsRoots']) {
        local_accessDeniedMode(item);
    }

    if ((item[5].split(' ')[0] == commands.CHAT && (modes[item[3]]['chat'] || self)) && !bot) {
        let userAgent = new UserAgent();
        console.log(userAgent.toString());


        try {
            (async () => {

                request(
                    {
                        uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Let me think...&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                        method: 'POST'
                    }, (error, res) => {
                        // console.log(error);
                        // console.log(res.body);
                    }
                );

                let res = await fetch('https://api.aicloud.sbercloud.ru/public/v1/public_inference/gpt3/predict', {
                    method: 'post',
                    body: JSON.stringify({'text': item[5]}),
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'User-Agent': userAgent.toString()
                    },
                });
                res = await res.json();
                
                res = res.predictions;

                try {
                    request(
                        {
                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=My answer is: ' + res.slice(item[5].length).match(/[^\.\!\?]+[\.\!\?]+/g)[0] + '&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                            method: 'POST'
                        }, (error, res) => {
                            // console.log(error);
                            // console.log(res.body);
                        }
                    );
                } catch {
                    console.log('Error during answering with gpt3!');
                    request(
                        {
                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=I can\'t answer :(&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                            method: 'POST'
                        }, (error, res) => {
                            // console.log(error);
                            // console.log(res.body);
                        }
                    );
                }
            })();
        } catch {
            console.log('Error during answering with gpt3!');
            request(
                {
                    uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=I can\'t answer :(&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                    method: 'POST'
                }, (error, res) => {
                    // console.log(error);
                    // console.log(res.body);
                }
            );
        }
    } else if (item[5] == commands.CHAT && !modes[item[3]]['chat']) {
        local_accessDeniedMode(item);
    }

    if (item[5] == commands.STOPTALK) {
        if (!self) modes[item[3]]['tts'] = false;
        mongooseUtils.setClientsModes(modes);
        rmqChannel.publish(rmqSockets, rmqSocketKey, Buffer.from(JSON.stringify(modes).toString()));
    }
}

function local_accessDeniedMode(item) {
    request(
        {
            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Sorry, this function is denied for you right now!&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
            method: 'POST'
        }, (error, res) => {
            // console.log(error);
            // console.log(res.body);
        }
    );
}

function local_botInit(item) {

    // флаг 16 - проверка на сообщение из чата, скоро станет deprecated, если что-то
    // сломалось, стоит проверить здесь в перувую очередь 
    // как вариант при быстром deprecated флаге - ввод переменной тригера при вызове
    // функции totalCommander
    var self = (item[2] & 2);
    var bot = self && !(item[2] & 16);

    var msg = 'Hey! I am Anton!\n\n\n'

    msg += `/bot ${commands.HELP} - get help with bot\n\n`;

    if ((modes[item[3]]['ttsRoots'] && !self)) {
        msg += `/bot ${commands.TALK} - answering with audio messages\n`;
        msg += `/bot ${commands.STOPTALK} - stop answering with audio messages\n`;
    }

    if ((modes[item[3]]['tts'] && !self)) {
        msg += '[current state]: bot is talking\n\n';
    } else {
        msg += '[current state]: bot is silent\n\n';
    }

    console.log(modes[item[3]])

    if ((modes[item[3]]['jokes'] && !self)) {
        msg += `/bot ${commands.JOKE} - send you an ugly (wonderful) joke\n\n`;
    }

    if ((modes[item[3]]['chat'] && !self)) {
        msg += `/bot ${commands.CHAT} - chat with you (answering your message with gpt3)\n\n`;
    }

    if ((modes[item[3]]['rand'] && !self)) {
        msg += `/bot ${commands.RAND} - choice between two options\n\n`;
    }

    if (!bot) {
        request(
            {
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=' + msg + '&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                method: 'POST'
            }, (error, res) => {
                // console.log(error);
                // console.log(res.body);
            }
        );
    }
}

// utils

function isCommandMessage(text) {
    // if (text == commands.SILENT) return true;
    if (text == commands.HELP) return true;
    if (text == commands.JOKE) return true;
    if (text == commands.TALK) return true;
    if (text == commands.STOPTALK) return true;
    if (text.split(' ')[0] == commands.CHAT) return true;
    if (text.split(' ')[0] == commands.RAND) return true;

    return false;
}

function getRandomInt(max) {
    // console.log(Math.floor(Math.random() * Math.floor(2147483647)));
    return Math.floor(Math.random() * Math.floor(max || 2147483647));
}

let translitContent = {
    'rus': " щ   ш  ч  ц  ю  я  ё  ж  ъ  ы  э  а б в г д е з и й к л м н о п р с т у ф х ь".split(/ +/g),
    'en': " shh sh ch cz yu ya yo zh `` y' e a b v g de e z i j k l m n o p r s t u f h `".split(/ +/g)
}

function translit(text) {
    text = text.toLowerCase();
    // translitContent['rus'].push(' ');
    // translitContent['en'].push(' ');
    var translited = "";
    for (var i = 0; i < text.length; i++) {
        if (text[i] == ' ') {
            translited += ' ';
            continue;
        }
        for (elem in translitContent['rus']) {
            if (translitContent['rus'][elem] == text[i]) translited += translitContent['en'][elem];
        }
    }
    return translited;
}