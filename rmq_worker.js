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

// .env initialisation

require('dotenv').config();

// constants

const API_VERSION = process.env.API_VERSION || '5.131';
const MESSAGES_TOKEN = process.env.MESSAGES_TOKEN;

// variables

let rmqChannel = null;
let rmqInstructions = 'instructions';
let rmqKey = 'data.instructions';
let modes = [];

// mongoose

const mongooseUtils = require('./modules/mongooseUtils.js');

(async () => {
  mongooseUtils.startSession();

  modes = await mongooseUtils.getClientsModes();
  
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

    // флаг 16 - проверка на сообщение из чата, скоро станет deprecated, если что-то
    // сломалось, стоит проверить здесь в перувую очередь 
    // как вариант при быстром deprecated флаге - ввод переменной тригера при вызове
    // функции totalCommander
    var self = (item[2] & 2);
    var bot = self && !(item[2] & 16);
    // console.log(bot);

    if ((!item[5] || item[5] == 'что умеешь') && !bot) {
        local_botInit(item);
    }

    if ((item[5].split(' ')[0] == 'выбери' && ((modes[item[3]]['rand'] && !self) || self)) && !bot) {
        var choice = getRandomInt(2);
        var choiceMessage = 'Не могу определиться(';
        switch (choice) {
            case 0: {
                choiceMessage = 'Скорее первое)';
                break;
            }
            case 1: {
                choiceMessage = 'Наверно второе)';
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
    } else if (item[5] == 'выбери' && !modes[item[3]]['rand']) {
        local_accessDeniedMode(item);
    }

    if ((item[5] == 'анекдот' && ((modes[item[3]]['jokes'] && !self) || self)) && !bot) {
        request(
            {
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Бот Антон услышал, бот Антон на месте!&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                method: 'POST'
            }, (error, res) => {
                var ind = Math.floor(Math.random() * Math.floor(jokes.length - 1));
                setTimeout(()=> {
                    request(
                        {
                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=ТАК, СРАЗУ ПРЕДУПРЕЖДАЮ, СМЕЯТЬСЯ НЕ ОБЯЗАТЕЛЬНО, ВОТ ЭТО ВАШЕ МНЕНИЕ ПО КЛАССИКЕ ЮМОРА КОНЕЧНО, ДА...\nНомер анекдота: ' + (ind+1) + ' из ' + jokes.length + '\n\n' + jokes[ind] + '&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
                            method: 'POST'
                        }, (error, res) => {
                            // console.log(error);
                            // console.log(res.body);
                        }
                    );
                }, 300);
            }
        );
    } else if (item[5] == 'анекдот' && !modes[item[3]]['jokes']) {
        local_accessDeniedMode(item);
    }

    console.log('mode: ' + modes[item[3]]['tts'] + ' self: ' + self);

    if ((item[5] != 'хватит болтать' && item[5] != '' && ((modes[item[3]]['tts'] && !self))) && !bot) {
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

    if ((item[5] == 'поболтаем' && (modes[item[3]]['ttsRoots'] || self)) && !bot) {
        if (!self) modes[item[3]]['tts'] = true;
        fs.writeFileSync("data/modes.json", JSON.stringify(modes));
        socketSetModes();
    } else if (item[5] == 'поболтаем' && !modes[item[3]]['ttsRoots']) {
        local_accessDeniedMode(item);
    }

    if (item[5] == 'хватит болтать') {
        if (!self) modes[item[3]]['tts'] = false;
        fs.writeFileSync("data/modes.json", JSON.stringify(modes));
        socketSetModes();
    }

    // if (item[5] == 'хватит') {
    //     modes[item[3]]['tts'] = 0;
    //     fs.writeFileSync("data/modes.json", JSON.stringify(modes));
    //     socketSetModes();
    // }
}

function local_accessDeniedMode(item) {
    request(
        {
            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Извините, у вас нет прав на использование этой функции!&v='+API_VERSION+'&access_token='+MESSAGES_TOKEN),
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

    var msg = 'Hey! Если что я Антон, сейчас расскажу что тебе можно:)\nНу смотри:\n\n'
    // console.log (modes);
    // console.log (item);
    // console.log (item[3] + " " + modes[item[3]]['ttsRoots']+ " " + modes[item[3]]['tts']+ " " + modes[item[3]]['jokes']+ " " + modes[item[3]]['rand']);
    if ((modes[item[3]]['ttsRoots'] && !self)) {
        msg += '1) Отличные новости, могу озвучить тебе что-нибудь, босс сказал!\n';
        msg += '\t1.1) Если хочешь поболтать, вызови меня "!Бот" или "!бот" и напиши "поболтаем"!\n';
        msg += '\t1.2) Если я надоел болтать, вызови меня "!Бот" или "!бот" и напиши "хватит болтать"!\n';
    } else {
        msg += '1) Вот доступа к машинной озвучке у тебя нет, можешь попросить босса конечно, но помни что мне лень это делать!\n';
        msg += '\t1.1) Если тебя все-же допустят и захочешь поболтать, вызови меня "!Бот" или "!бот" и напиши "поболтаем"!\n';
        msg += '\t1.2) Если босс над тобой поприкалывается и я надоем болтать, вызови меня "!Бот" или "!бот" и напиши "хватит болтать"!\n';
    }

    if ((modes[item[3]]['tts'] && !self)) {
        msg += '\t1.3) Сейчас функция озвучки включена!\n';
    } else {
        msg += '\t1.3) Сейчас функция озвучки выключена!\n';
    }


    if ((modes[item[3]]['jokes'] && !self)) {
        msg += '2) Скучно? Хочешь пОхОхОтАтЬ? тебе открыт доступ к золотму фонду анекдотов! Вызови меня "!Бот" или "!бот" и напиши "анекдот"!\n';
    } else {
        msg += '2) Не знаю как, но тебя даже к анекдотам не пускают, кто ты?\n';
    }

    if ((modes[item[3]]['rand'] && !self)) {
        msg += '3) Мое любимое! Если захочешь, чтобы я решил за тебя, вызови меня "!Бот" или "!бот" и напиши "выбери"!\n';
    } else {
        msg += '3) Печально, босс сказал, что я не могу решать за тебя, путь к рандомайзеру закрыт:(\n';
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

function getRandomInt(max) {
    // console.log(Math.floor(Math.random() * Math.floor(2147483647)));
    return Math.floor(Math.random() * Math.floor(max || 2147483647));
}