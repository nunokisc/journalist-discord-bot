//setup
const { Client, GatewayIntentBits, EmbedBuilder, Options } = require('discord.js');
const axios = require('axios');
const config = require('./config');
const { linkPreviewCallback } = require('link-preview-node');
var pplware = require('./lib/pplware_scraper')
var db = require('./lib/db');
var uuid = require('uuid').v1;
var sendChannels = config.sendChannels;

const HTTP_TIMEOUT = 10000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  // Bound how much discord.js caches in memory instead of the unlimited
  // default, since this bot only ever needs guild/channel metadata.
  makeCache: Options.cacheWithLimits({
    MessageManager: 0,
    UserManager: 0,
    GuildMemberManager: 0,
    PresenceManager: 0,
    ReactionManager: 0
  })
});

// A crash in one of the async fetch/scrape callbacks used to take down the
// whole process (pm2 would then restart it, which showed up as frequent
// crashes). Fixed points are guarded individually below; these are just a
// safety net for anything unexpected so the bot logs and keeps running.
process.on('unhandledRejection', (err) => {
  console.error(`${timestamp()} Unhandled rejection:`, err);
});
process.on('uncaughtException', (err) => {
  console.error(`${timestamp()} Uncaught exception:`, err);
});

console.log(sendChannels)
//Tells console when bot ready
client.once('clientReady', () => {
  console.log(`${timestamp()} ${client.user.tag} sucessfully logged in!`)
  console.log("Connected Servers:")
  client.guilds.cache.forEach(server => {
    console.log(server.name + " id: " + server.id);
  });
});
//listen for messages
client.on('messageCreate', message => {
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
//login with encoded token
client.login(Buffer.from(config.token, 'hex').toLocaleString()).catch(console.error);
//timestamp
function timestamp() {
  let date = new Date();
  return `[${date.toDateString()}]`
}

// Guards against a channel that was removed/misconfigured after the fact;
// used to throw and crash the whole process on send.
function sendEmbedToConfiguredChannels(feed, embed) {
  client.guilds.cache.forEach(server => {
    let feeds = sendChannels[server.id];
    if (!feeds || typeof feeds[feed] === "undefined") return;
    let sendTo = feeds[feed];
    let channel = client.channels.cache.get(sendTo);
    if (!channel) {
      console.log(`${timestamp()} Configured channel ${sendTo} for ${feed} on server ${server.name} (${server.id}) no longer exists`);
      return;
    }
    console.log("Send it to server: " + server.name + " " + server.id + " channel: " + sendTo)
    channel.send({ embeds: [embed] });
  });
}

var pplwareTickInFlight = false;
var hackerNewsTickInFlight = false;

setInterval(getHackerNewsTimer, 10000, 'newest');
setInterval(getPplwareTimer, 10000);

function getPplwareTimer() {
  if (pplwareTickInFlight) return;
  pplwareTickInFlight = true;
  try {
    pplware.getTopArticle(function (err, data) {
      try {
        if (err || !data || !data.id) return

        if (db.hasSeen('pplware', data.id)) return

        db.markSeen('pplware', data.id, uuid())
        linkPreviewCallback(data.url, (err, resp) => {
          try {
            console.log(`Fetching Pplware new article ${data.url}`);
            let hasImage = !err && resp && resp.image && (resp.image.indexOf("http://") != -1 || resp.image.indexOf("https://") != -1);
            let embed = new EmbedBuilder()
              .setColor('#ff0000')
              .setThumbnail('https://pbs.twimg.com/profile_images/546480476538425344/pL1sThkk_400x400.png')
              .setDescription((data.text1 + "\n" + data.text2) || 'N/A')
              .setTitle(data.title || 'N/A')
              .addFields({ name: 'Categoria', value: data.category || 'N/A', inline: !hasImage })
              .setURL(data.url)
              .setTimestamp()
              .setFooter({ text: 'https://pplware.sapo.pt/', iconURL: 'https://pbs.twimg.com/profile_images/546480476538425344/pL1sThkk_400x400.png' });
            if (hasImage) {
              embed.setImage(resp.image);
              if (resp.description) {
                embed.addFields({ name: 'Short', value: resp.description });
              }
            }
            sendEmbedToConfiguredChannels('pplware', embed);
          } catch (err) {
            console.error(`${timestamp()} Error building/sending pplware embed:`, err);
          }
        });
      } catch (err) {
        console.error(`${timestamp()} Error in pplware tick:`, err);
      }
    });
  } catch (err) {
    console.error(`${timestamp()} Error starting pplware fetch:`, err);
  } finally {
    pplwareTickInFlight = false;
  }
}

function extractTopArticleId(body) {
  let match = body.match(RegExp(/">1\..*_(.*vote)/));
  if (!match) return null;
  let idMatch = match[0].match(RegExp(/_[^']+/));
  if (!idMatch) return null;
  return idMatch[0].replace('_', '');
}

function getHackerNewsTimer(thread) {
  if (hackerNewsTickInFlight) return;
  hackerNewsTickInFlight = true;
  axios.get(`https://news.ycombinator.com/${thread}`, { timeout: HTTP_TIMEOUT })
    .then(response => {
      let output = extractTopArticleId(response.data);
      if (!output) return;

      if (db.hasSeen('hackernews', output)) return

      db.markSeen('hackernews', output, uuid())
      return axios.get(`https://hacker-news.firebaseio.com/v0/item/${output}.json`, { timeout: HTTP_TIMEOUT })
        .then(itemResponse => {
          let bodyItem = itemResponse.data;
          console.log(`Fetching https://hacker-news.firebaseio.com/v0/item/${output}.json`)
          if (!bodyItem) return

          return axios.get(`https://hacker-news.firebaseio.com/v0/user/${bodyItem.by}.json`, { timeout: HTTP_TIMEOUT })
            .then(userResponse => {
              let bodyUser = userResponse.data;
              console.log(`https://hacker-news.firebaseio.com/v0/user/${bodyItem.by}.json`)
              if (!bodyUser) return

              linkPreviewCallback(bodyItem.url, (err, resp) => {
                try {
                  let hasImage = !err && resp && resp.image && (resp.image.indexOf("http://") != -1 || resp.image.indexOf("https://") != -1);
                  let embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setThumbnail('https://pbs.twimg.com/profile_images/469397708986269696/iUrYEOpJ_400x400.png')
                    .setTitle(bodyItem.title || 'N/A')
                    .addFields(
                      { name: 'Score', value: `${bodyItem.score}`, inline: true },
                      { name: 'Submitted by', value: `[${bodyItem.by}](https://news.ycombinator.com/user?id=${bodyItem.by} 'optional hovertext')`, inline: true },
                      { name: 'User Karma', value: `${bodyUser.karma}`, inline: true }
                    )
                    .setURL(bodyItem.url)
                    .setTimestamp()
                    .setFooter({ text: `https://news.ycombinator.com/item?id=${output}`, iconURL: 'https://pbs.twimg.com/profile_images/469397708986269696/iUrYEOpJ_400x400.png' });
                  if (hasImage) {
                    embed.setDescription(resp.description || 'N/A');
                    embed.setImage(resp.image);
                  }
                  sendEmbedToConfiguredChannels('hackernews', embed);
                } catch (err) {
                  console.error(`${timestamp()} Error building/sending hackernews embed:`, err);
                }
              });
            });
        });
    })
    .catch(err => {
      console.error(`${timestamp()} Error in hackernews tick:`, err.message);
    })
    .finally(() => {
      hackerNewsTickInFlight = false;
    });
}

//function for fetching most types of submissions on news.ycombinator.com
function getHackerNews(message, thread) {
  axios.get(`https://news.ycombinator.com/${thread}`, { timeout: HTTP_TIMEOUT })
    .then(response => {
      console.log(`Fetching https://news.ycombinator.com/${thread}`);
      let output = extractTopArticleId(response.data);
      if (!output) {
        message.channel.send(`Não foi possível encontrar o artigo mais recente em ${thread}.`);
        return;
      }
      return axios.get(`https://hacker-news.firebaseio.com/v0/item/${output}.json`, { timeout: HTTP_TIMEOUT })
        .then(itemResponse => {
          let body = itemResponse.data;
          console.log(`Fetching https://hacker-news.firebaseio.com/v0/item/${output}.json`)
          let embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(body.title || 'N/A')
            .addFields(
              { name: 'Submitted by', value: `${body.by}` },
              { name: 'URL', value: `${body.url}` }
            )
            .setFooter({ text: `https://news.ycombinator.com/item?id=${output}` });
          message.channel.send({ embeds: [embed] });
        });
    })
    .catch(err => {
      console.error(`${timestamp()} Error in getHackerNews command:`, err.message);
    });
}
