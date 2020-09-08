const request = require('request');
const fs = require('fs');
var token = fs.readFileSync('./data/messagesToken.txt', 'utf8');
var API_VERSION = '5.110';

function vkAPI (method, tech, params) {
    var url = 'https://api.vk.com/method/' + method + '?';
    for (var key in params) {
        url += key;
        url += '='
        url += params[key];
        url += '&';
    }
    url += 'access_token=';
    url += token;
    url += '&v=';
    url += API_VERSION;
    // console.log(url);
    request({uri: url, method: tech}, (error, res)=> {
        // console.log(error);
        // console.log(res.body);
        return res.body;
    });
}

module.exports = vkAPI;