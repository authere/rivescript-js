// Asynchronous Objects Example
// See the accompanying README.md for details.

// Run this demo: `node weatherman.js`

/*jshint -W109 */

'use strict';
var readline = require("readline");
var request = require("request");
var colors = require('colors');

if (!process.env.MECAB_LIB_PATH) {
  process.env.MECAB_LIB_PATH = '/usr/local';
}
var mecab = require('mecab-ya');

const APPKEY = process.env.APPKEY || 'change me';

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");
var rs = new RiveScript({utf8: true/*, debug: true*/});

var getWeather = function(args, cb) {
  var params = {};
  args.forEach(function(v) {
    var sp = v.split('=');
    params[sp[0]] = sp[1];
  });
  request.get({
    url: 'http://apis.skplanetx.com/weather/current/minutely',
    headers: {
      'appKey': APPKEY
    },
    qs: {village: params.town, county: params.sigungu, city: params.sido, version: 1},
    json:true
  }, function (err, res, body) {
    let msg = '날씨를 가져오는데 실패 했어요.';
    if (!err && res.statusCode === 200) {
      let weather = body && body.weather && body.weather.minutely[0];
      if (weather) {
        let temp = parseInt(weather.temperature.tc);
        msg = '지금 날씨는 "' + weather.sky.name + '" 이고,  현재온도는 ' + 
          (temp < 0 ? '영하' +  Math.abs(temp): temp) + ' 도 입니다.';
      }
    } else {
      if (body && body.error && body.error.message) {
        msg += ' 이유는: "' + body.error.message + '"';
      }
    }
    return cb && cb.call(this, null, msg);
  });
};


rs.setSubroutine("getWeather", function (rs, args)  {
  return new rs.Promise(function(resolve, reject) {
    getWeather(args, function(error, data){
      if(error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
});

// Create a prototypical class for our own chatbot.
var AsyncBot = function(onReady) {
    var self = this;

    if (APPKEY === 'change me') {
        console.log('Error -- please define environment APPKEY for skplanet api use'.bold.yellow);
        process.exit(0);
    }

    // Load the replies and process them.
    rs.loadDirectory("./rive", function() {
      rs.sortReplies();
      onReady();
    });

    // This is a function for delivering the message to a user. Its actual
    // implementation could vary; for example if you were writing an IRC chatbot
    // this message could deliver a private message to a target username.
    self.sendMessage = function(username, message) {
      // This just logs it to the console like "[Bot] @username: message"
      console.log(
        ["[날씨봇]", message].join(": ").underline.green
      );
    };

    // This is a function for a user requesting a reply. It just proxies through
    // to RiveScript.
    self.getReply = function(username, message, callback) {
      return rs.replyAsync(username, message, self).then(function(reply){
        callback.call(this, null, reply);
      }).catch(function(error) {
        callback.call(this, error);
      });
    };
};

// Create and run the example bot.
var bot = new AsyncBot(function() {
  // Drop into an interactive shell to get replies from the user.
  // If this were something like an IRC bot, it would have a message
  // handler from the server for when a user sends a private message
  // to the bot's nick.
  var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
  });

  rl.setPrompt("> ");
  rl.prompt();
  rl.on("line", function(cmd) {
    // If this was an IRC bot, imagine "nick" came from the server as the
    // sending user's IRC nickname.
    var nick = "날씨봇";
    console.log("[" + nick + "] " + cmd);

    // Handle commands.
    if (cmd === "/quit") {
      process.exit(0);
    } else {
      mecab.morphs(cmd, (err, words) => {
        console.log('morphs:', words.join(' '));
        bot.getReply(nick, words.join(' '), function(error, reply){
          if (error) {
            bot.sendMessage(nick, "Oops. The weather service is not cooperating!");
          } else {
            bot.sendMessage(nick, reply);
          }
          rl.prompt();
        });
      });
    }
  }).on("close", function() {
    process.exit(0);
  });
});
