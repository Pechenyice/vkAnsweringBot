const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const fs = require('fs');
const app = express();
const vkAPI = require('./js/vkAPI');
const fetch = require('node-fetch');
const io = require('socket.io').listen(8080);
const say = require('say');

var scope = "offline,messages,docs";
var token = fs.readFileSync('data/token.txt', 'utf8');
var messagesToken = fs.readFileSync('data/messagesToken.txt', 'utf8');
var appId = 6121396;
var longPoll = {};
var update = [];
var clients = fs.readFileSync('data/clients.txt', 'utf-8');
clients = clients.split(' ');
var chats = [];
var API_VERSION= '5.110';
// console.log('token: ' + token);
var jokes = fs.readFileSync('data/jokes.txt', 'utf-8');
jokes = jokes.split('[endOfJoke]');
var modes = JSON.parse(fs.readFileSync('data/modes.json'));
var socketSetModes;

//"172576383":{"tts":1,"jokes":1,"rand":true,"ttsRoots":true}
var user = {
    "tts":0,
    "jokes":1,
    "rand":true,
    "ttsRoots":true
}

// for (elem in modes) modes[elem]['ttsRoots'] = 0;
// fs.writeFileSync("data/modes.json", JSON.stringify(modes));

var translitContent = {
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


const urlencodedParser = bodyParser.urlencoded({extended: false});
app.use(express.static(__dirname + '/'));

function getRandomInt(max) {
    // console.log(Math.floor(Math.random() * Math.floor(2147483647)));
    return Math.floor(Math.random() * Math.floor(max || 2147483647));
}

function start() {
    request(
        {
            uri: encodeURI('https://api.vk.com/method/messages.getLongPollServer?need_pts=0&lp_version=3&v='+API_VERSION+'&access_token='+messagesToken),
            method: 'POST'
        }, function (error, res) {

            longPoll = JSON.parse(res.body).response;

            getNewUpdate();

            // console.log(longPoll);
            // console.log(longPoll['ts']);
            return;
        }
    );
}

function getNewUpdate() {
    request(
        {
            uri: encodeURI('https://'+longPoll['server']+'?act=a_check&key='+longPoll['key']+'&ts='+longPoll['ts']+'&wait=10&mode=2&version=3'),
            method: 'POST'
        }, (error, res) => {
            try {
                var deJSON = JSON.parse(res.body);
            } catch (err) {
                getNewUpdate();
            }
            longPoll['ts'] = deJSON['ts'];
            update = deJSON['updates'];
            console.log(res.body);
            analyseNewUpdate();
            getNewUpdate();
        }
    );
}

function analyseNewUpdate() {
    news = 1;
    update.forEach(
        (item, i, arr) => {
            if (item[0] == 4) {
                // if (!(item[2] & 2)) {
                    if (item[3] < 2000000000) {
                        clients.forEach(
                            (elem, iter) => {
                                if (elem == item[3]) {
                                    var sys = item[5].split(' ')[0] == '!Бот' || item[5].split(' ')[0] == '!бот';
                                    var self = (item[2] & 2);
                                    var bot = self && !(item[2] & 16);
                                    if (sys || (((modes[item[3]]['tts'] && !self) || (user['tts'] && self)) && !sys)) {
                                        if (sys) {
                                            item[5] = item[5].split(' ');
                                            item[5].splice(0, 1);
                                            item[5] = item[5].join(' ');
                                        }
                                        totalCommander(item);
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
        }
    );
}

function totalCommander(item) {

    // флаг 16 - проверка на сообщение из чата, скоро станет deprecated, если что-то
    // сломалось, стоит проверить здесь в перувую очередь 
    // как вариант при быстром deprecated флаге - ввод переменной тригера при вызове
    // функции totalCommander
    var self = (item[2] & 2);
    var bot = self && !(item[2] & 16);
    // console.log(bot);

    if ((!item[5] || item[5] == 'что умеешь') && !bot) {
        botInit(item);
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
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=' + choiceMessage + '&v='+API_VERSION+'&access_token='+messagesToken),
                method: 'POST'
            }, (error, res) => {

            }
        );
    } else if (item[5] == 'выбери' && !modes[item[3]]['rand']) {
        accessDeniedMode(item);
    }

    if ((item[5] == 'анекдот' && ((modes[item[3]]['jokes'] && !self) || self)) && !bot) {
        request(
            {
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Бот Антон услышал, бот Антон на месте!&v='+API_VERSION+'&access_token='+messagesToken),
                method: 'POST'
            }, (error, res) => {
                var ind = Math.floor(Math.random() * Math.floor(jokes.length - 1));
                setTimeout(()=> {
                    request(
                        {
                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=ТАК, СРАЗУ ПРЕДУПРЕЖДАЮ, СМЕЯТЬСЯ НЕ ОБЯЗАТЕЛЬНО, ВОТ ЭТО ВАШЕ МНЕНИЕ ПО КЛАССИКЕ ЮМОРА КОНЕЧНО, ДА...\nНомер анекдота: ' + (ind+1) + ' из ' + jokes.length + '\n\n' + jokes[ind] + '&v='+API_VERSION+'&access_token='+messagesToken),
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
        accessDeniedMode(item);
    }

    console.log('mode: ' + modes[item[3]]['tts'] + ' user: ' + user['tts'] + ' self: ' + self);

    if ((item[5] != 'хватит болтать' && item[5] != '' && ((modes[item[3]]['tts'] && !self) || (user['tts'] && self))) && !bot) {
        say.export(translit(item[5]), 'Microsoft Irina Desktop', 1.0, 'tts/tmp_tts_'+item[3]+'.wav', err => {
            request(
                {
                    uri: encodeURI('https://api.vk.com/method/docs.getMessagesUploadServer?type=audio_message&peer_id=172576383&v='+API_VERSION+'&access_token='+messagesToken),
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
                                uri: encodeURI('https://api.vk.com/method/docs.save?file='+res+'&title='+'tmp_tts_'+item[3]+'&tags=bot&v='+API_VERSION+'&access_token='+messagesToken),
                                method: 'POST'
                            }, (error, res) => {
                                // console.log(error);
                                if (!error) {
                                    res = JSON.parse(res.body)['response']['audio_message'];
                                    request(
                                        {
                                            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=&attachment=doc'+res['owner_id']+'_'+res['id']+'&v='+API_VERSION+'&access_token='+messagesToken),
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
        if (!self) modes[item[3]]['tts'] = 1; else user['tts'] = 1;
        fs.writeFileSync("data/modes.json", JSON.stringify(modes));
        socketSetModes();
    } else if (item[5] == 'поболтаем' && !modes[item[3]]['ttsRoots']) {
        accessDeniedMode(item);
    }

    if (item[5] == 'хватит болтать') {
        if (!self) modes[item[3]]['tts'] = 0; else user['tts'] = 0;
        fs.writeFileSync("data/modes.json", JSON.stringify(modes));
        socketSetModes();
    }

    // if (item[5] == 'хватит') {
    //     modes[item[3]]['tts'] = 0;
    //     fs.writeFileSync("data/modes.json", JSON.stringify(modes));
    //     socketSetModes();
    // }
}

function accessDeniedMode(item) {
    request(
        {
            uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=Извините, у вас нет прав на использование этой функции!&v='+API_VERSION+'&access_token='+messagesToken),
            method: 'POST'
        }, (error, res) => {
            // console.log(error);
            // console.log(res.body);
        }
    );
}

function botInit(item) {

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
    if ((modes[item[3]]['ttsRoots'] && !self) || (user['ttsRoots'] && self)) {
        msg += '1) Отличные новости, могу озвучить тебе что-нибудь, босс сказал!\n';
        msg += '\t1.1) Если хочешь поболтать, вызови меня "!Бот" или "!бот" и напиши "поболтаем"!\n';
        msg += '\t1.2) Если я надоел болтать, вызови меня "!Бот" или "!бот" и напиши "хватит болтать"!\n';
    } else {
        msg += '1) Вот доступа к машинной озвучке у тебя нет, можешь попросить босса конечно, но помни что мне лень это делать!\n';
        msg += '\t1.1) Если тебя все-же допустят и захочешь поболтать, вызови меня "!Бот" или "!бот" и напиши "поболтаем"!\n';
        msg += '\t1.2) Если босс над тобой поприкалывается и я надоем болтать, вызови меня "!Бот" или "!бот" и напиши "хватит болтать"!\n';
    }

    if ((modes[item[3]]['tts'] && !self) || (user['tts'] && self)) {
        msg += '\t1.3) Сейчас функция озвучки включена!\n';
    } else {
        msg += '\t1.3) Сейчас функция озвучки выключена!\n';
    }


    if ((modes[item[3]]['jokes'] && !self) || (user['jokes'] && self)) {
        msg += '2) Скучно? Хочешь пОхОхОтАтЬ? тебе открыт доступ к золотму фонду анекдотов! Вызови меня "!Бот" или "!бот" и напиши "анекдот"!\n';
    } else {
        msg += '2) Не знаю как, но тебя даже к анекдотам не пускают, кто ты?\n';
    }

    if ((modes[item[3]]['rand'] && !self) || (user['rand'] && self)) {
        msg += '3) Мое любимое! Если захочешь, чтобы я решил за тебя, вызови меня "!Бот" или "!бот" и напиши "выбери"!\n';
    } else {
        msg += '3) Печально, босс сказал, что я не могу решать за тебя, путь к рандомайзеру закрыт:(\n';
    }

    if (!bot) {
        request(
            {
                uri: encodeURI('https://api.vk.com/method/messages.send?random_id='+getRandomInt()+'&peer_id='+item[3]+'&message=' + msg + '&v='+API_VERSION+'&access_token='+messagesToken),
                method: 'POST'
            }, (error, res) => {
                // console.log(error);
                // console.log(res.body);
            }
        );
    }
}

io.sockets.on('connection', (socket) => {
    // console.log(socket.id);

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

app.get('/newToken', urlencodedParser, (req, res) => {
    res.send("<a href='https://oauth.vk.com/authorize?client_id="+appId+"&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope="+scope+"&response_type=token&v=5.37'>Push the button</a>");
});

app.get('/', urlencodedParser, function(req, res) {

    res.sendfile('index.htm');
});

app.listen(3000);
start();
console.log('server on :3000');