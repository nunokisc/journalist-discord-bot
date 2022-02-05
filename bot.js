//setup
const Discord = require('discord.js');
const config = require('./config');
const client = new Discord.Client();
const request = require('request');
const { linkPreviewCallback } = require('link-preview-node');
var pplware = require('./lib/pplware_scraper')
var db = require('./lib/db');
var uuid = require('uuid/v1');
var sendChannels = config.sendChannels;
console.log(sendChannels)
//Tells console when bot ready
client.on('ready', () => {
  console.log(`${timestamp()} ${client.user.tag} sucessfully logged in!`)
  console.log("Connected Servers:")
  client.guilds.cache.forEach(server => {
    console.log(server.name + " id: " + server.id);
  });
});
//listen for messages
client.on('message', message => {
  if (message.author.id == client.user.id) return;
  if (!message.content.startsWith(config.prefix)) return;
  let args = message.content.toLowerCase().replace(/^\-/, '').split(' ');
  let thread = undefined
  switch (args[0]) {
    case "latest":
      thread = "newest"
      getHackerNews(message, thread);
      break;
    case "news":
      thread = "news"
      getHackerNews(message, thread);
      break;
    case "ask":
      thread = "ask"
      getHackerNews(message, thread);
      break;
    case "past":
      thread = "front"
      getHackerNews(message, thread);
      break;
    case "show":
      thread = "show"
      getHackerNews(message, thread);
      break;
    default:
      break;
  }
});
client.on('debug', console.log);
//login with encoded token
client.login(Buffer.from(config.token, 'hex').toLocaleString()).catch(console.error);
//timestamp
function timestamp() {
  let date = new Date();
  return `[${date.toDateString()}]`
}

setInterval(getHackerNewsTimer, 10000, 'newest');
setInterval(getPplwareTimer, 10000);

function getPplwareTimer() {
  try {
    pplware.getTopArticle(function (err, data) {
      //console.log(data)
      if (err)
        return

      let articleId = db.db.get('articles')
        .filter({
          articleId: data.id,
          source: 'pplware'
        })
        .value()

      if (articleId.length == 0) {
        db.db.get('articles')
          .push({ uuid: uuid(), articleId: data.id, source: 'pplware' })
          .write()
        linkPreviewCallback(data.url, (err, resp) => {
          console.log(`Fetching Pplware new article ${data.url}`);
          //console.log(resp)
          //console.log(err)
          if (err) {
            let embed = new Discord.MessageEmbed()
              .setColor('#ff0000')
              .setThumbnail('https://pbs.twimg.com/profile_images/546480476538425344/pL1sThkk_400x400.png')
              .setDescription(data.text1 + "\n" + data.text2)
              .setTitle(data.title)
              .addField('Categoria', `${data.category}`, true)
              .setURL(data.url)
              .setTimestamp()
              .setFooter(`https://pplware.sapo.pt/`, 'https://pbs.twimg.com/profile_images/546480476538425344/pL1sThkk_400x400.png');
            client.guilds.cache.forEach(server => {
              if (typeof sendChannels[server.id].pplware != "undefined") {
                let sendTo = sendChannels[server.id].pplware
                console.log("Send it to server: " + server.name + " " + server.id + " channel: " + sendChannels[server.id].pplware)
                client.channels.cache.get(sendTo).send(embed)
              }
            });
          } else {
            let embed = new Discord.MessageEmbed()
              .setColor('#ff0000')
              .setThumbnail('https://pbs.twimg.com/profile_images/546480476538425344/pL1sThkk_400x400.png')
              .setDescription(data.text1 + "\n" + data.text2)
              .setImage(resp.image)
              .setTitle(data.title)
              .addField('Categoria', `${data.category}`, false)
              .addField('Short', `${resp.description}`, false)
              .setURL(data.url)
              .setTimestamp()
              .setFooter(`https://pplware.sapo.pt/`, 'https://pbs.twimg.com/profile_images/546480476538425344/pL1sThkk_400x400.png');
            client.guilds.cache.forEach(server => {
              if (typeof sendChannels[server.id].pplware != "undefined") {
                let sendTo = sendChannels[server.id].pplware
                console.log("Send it to server: " + server.name + " " + server.id + " channel: " + sendChannels[server.id].pplware)
                client.channels.cache.get(sendTo).send(embed)
              }
            });
          }
        });
      }
    });
  } catch (err) { }
}

function getHackerNewsTimer(thread) {
  try {
    request({ url: `https://news.ycombinator.com/${thread}` }, function (error, response, body) {
      //console.log(`Fetching https://news.ycombinator.com/${thread}`);
      let output = body.match(RegExp(/">1\..*_(.*vote)/))
      output = (output[0].match(RegExp(/_[^']+/)));
      output = output[0].replace('_', '');
      let articleId = db.db.get('articles')
        .filter({
          articleId: output,
          source: 'hackernews'
        })
        .value()
      if (articleId.length == 0) {
        db.db.get('articles')
          .push({ uuid: uuid(), articleId: output, source: 'hackernews' })
          .write()
        request({ url: `https://hacker-news.firebaseio.com/v0/item/${output}.json`, json: true }, function (error, response, bodyItem) {
          console.log(`Fetching https://hacker-news.firebaseio.com/v0/item/${output}.json`)
          //console.log(bodyItem)
          if (!bodyItem || error)
            return
          request({ url: `https://hacker-news.firebaseio.com/v0/user/${bodyItem.by}.json`, json: true }, function (error, response, bodyUser) {
            console.log(`https://hacker-news.firebaseio.com/v0/user/${bodyItem.by}.json`)
            //console.log(bodyUser)
            if (!bodyUser || error)
              return
            linkPreviewCallback(bodyItem.url, (err, resp) => {
              //console.log(resp)
              //console.log(err)
              if (err) {
                let embed = new Discord.MessageEmbed()
                  .setColor('#ff0000')
                  .setThumbnail('https://pbs.twimg.com/profile_images/469397708986269696/iUrYEOpJ_400x400.png')
                  .setTitle(bodyItem.title)
                  .addField('Score', `${bodyItem.score}`, true)
                  .addField('Submitted by', `[${bodyItem.by}](https://news.ycombinator.com/user?id=${bodyItem.by} 'optional hovertext')`, true)
                  .addField('User Karma', `${bodyUser.karma}`, true)
                  .setURL(bodyItem.url)
                  .setTimestamp()
                  .setFooter(`https://news.ycombinator.com/item?id=${output}`, 'https://pbs.twimg.com/profile_images/469397708986269696/iUrYEOpJ_400x400.png');
                client.guilds.cache.forEach(server => {
                  if (typeof sendChannels[server.id].hackernews != "undefined") {
                    let sendTo = sendChannels[server.id].hackernews
                    console.log("Send it to server: " + server.name + " " + server.id + " channel: " + sendChannels[server.id].hackernews)
                    client.channels.cache.get(sendTo).send(embed)
                  }
                });
              } else {
                let embed = new Discord.MessageEmbed()
                  .setColor('#ff0000')
                  .setThumbnail('https://pbs.twimg.com/profile_images/469397708986269696/iUrYEOpJ_400x400.png')
                  .setDescription(resp.description)
                  .setImage(resp.image)
                  .setTitle(bodyItem.title)
                  .addField('Score', `${bodyItem.score}`, true)
                  .addField('Submitted by', `[${bodyItem.by}](https://news.ycombinator.com/user?id=${bodyItem.by} 'optional hovertext')`, true)
                  .addField('User Karma', `${bodyUser.karma}`, true)
                  .setURL(bodyItem.url)
                  .setTimestamp()
                  .setFooter(`https://news.ycombinator.com/item?id=${output}`, 'https://pbs.twimg.com/profile_images/469397708986269696/iUrYEOpJ_400x400.png');
                client.guilds.cache.forEach(server => {
                  if (typeof sendChannels[server.id].hackernews != "undefined") {
                    let sendTo = sendChannels[server.id].hackernews
                    console.log("Send it to server: " + server.name + " " + server.id + " channel: " + sendChannels[server.id].hackernews)
                    client.channels.cache.get(sendTo).send(embed)
                  }
                });
              }
            });
          })
        })
      }
    })
  } catch (err) { }
}

//function for fetching most types of submissions on news.ycombinator.com
function getHackerNews(message, thread) {
  try {
    request({ url: `https://news.ycombinator.com/${thread}` }, function (error, response, body) {
      console.log(`Fetching https://news.ycombinator.com/${thread}`);
      let output = body.match(RegExp(/">1\..*_(.*vote)/))
      output = (output[0].match(RegExp(/_[^']+/)));
      output = output[0].replace('_', '');
      request({ url: `https://hacker-news.firebaseio.com/v0/item/${output}.json`, json: true }, function (error, response, body) {
        console.log(`Fetching https://hacker-news.firebaseio.com/v0/item/${output}.json`)
        let embed = new Discord.MessageEmbed()
          .setColor('#ff0000')
          .setTitle(body.title)
          .addField('Submitted by', `${body.by}`, false)
          .addField('URL', `${body.url}`, false)
          .setFooter(`https://news.ycombinator.com/item?id=${output}`);
        message.channel.send(embed);
      })
    })
  } catch (err) { }
}
