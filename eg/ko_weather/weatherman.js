// Asynchronous Objects Example
// See the accompanying README.md for details.

// Run this demo: `node weatherman.js`

/*jshint -W109 */

'use strict';
var readline = require("readline");
var request = require("request");
var _ = require('lodash');

if (!process.env.MECAB_LIB_PATH) {
  process.env.MECAB_LIB_PATH = '/usr/local';
}
//var mecab = require('mecab-ya');
var mecab = require('/Users/lysoo/sotong/node-mecab-ya');

const APPKEY = process.env.APPKEY || 'change me';

// This would just be require("rivescript") if not for running this
// example from within the RiveScript project.
var RiveScript = require("../../lib/rivescript");
var rs = new RiveScript({utf8: true/*, debug: true*/});

var getWeather = function(args, cb) {
  var user = rs.currentUser();
  var params = rs.getUservars(user);
  console.log('params', params);
  //var pos = vars.pos.split(',');
  var url, qs;
 
  if (params.forecast === 'true') {
    url = 'http://apis.skplanetx.com/weather/summary';
    qs = {lat: params.lat, lon: params.lon, version: 1};
  } else {
    url = 'http://apis.skplanetx.com/weather/current/minutely';
    qs = {village: params.town, county: params.sigungu, city: params.sido, version: 1};
  }
  request.get({
    url: url,
    qs: qs,
    headers: {
      'appKey': APPKEY
    },
    json:true
  }, function (err, res, body) {
    let msg = '날씨를 가져오는데 실패 했어요.';
    if (!err && res.statusCode === 200) {
      let weather;
      if (params.forecast === 'true') {
        weather = body && body.weather && body.weather.summary[0][params.when];
      } else {
        weather = body && body.weather && body.weather.minutely[0];
      }
      if (weather) {
        msg = `날씨는 "${weather.sky.name}" 이고, `;
        if (weather.temperature.tc) {
          msg += `현재 온도는 ${parseInt(weather.temperature.tc)} 도`;
        }
        if (weather.temperature.tmax) {
          msg += `최고 온도는 ${parseInt(weather.temperature.tmax)} 도`;
        }
        if (weather.temperature.tmin) {
          msg += `최처 온도는 ${parseInt(weather.temperature.tmin)} 도`;
        }
        msg += '입니다';
        if (weather.station) {
          rs.setUservar(user, 'lat', weather.station.latitude);
          rs.setUservar(user, 'lon', weather.station.longitude);
        }
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
        ["[날씨봇]", message].join(": ")
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
    var nick = "나";
    console.log("[" + nick + "] " + cmd);

    // Handle commands.
    if (cmd === "/quit") {
      process.exit(0);
    } else {
      mecab.orgform(cmd, (err, tags) => {
        let words = [];
        _.each(tags, (t) => {
          words.push(t[0]);
        });
        console.log('simple orgform:', words.join(' '));
        //set variable: with pos
        rs.setUservar(nick, 'pos', _.flatten(tags).toString());
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
