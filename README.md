# journalist-discord-bot
Simple discord bot for communicating to the public API at https://github.com/HackerNews/API and scraping Pplware.
By default this discord bot searches every 10s for the latest news and sent it to the configured channels.

# setting up config.js
Make a new file called config.js where bot.js is located, and paste the following
Be sure to paste your discord bot key in HEXADECIMAL(string to hex)!!!
```
const settings = {
    prefix : "-",
    token : "Convert your bot token into hexadecimal and paste it here",
    sendChannels: {
    "paste server id here": {
      pplware: "paste channel id here for pplware news",
      hackernews: "paste channel id here for hackers news"
    },
    "paste server2 id here": {
      pplware: "paste channel id here for pplware news",
      hackernews: "paste channel id here for hackers news"
    } ... (other servers)
  }
}
module.exports = settings;
```

# Discord Developer Portal
This bot reads message content to detect its commands (`-latest`, `-news`, ...), which requires the **Message Content Intent** privileged intent to be enabled for the bot in the [Discord Developer Portal](https://discord.com/developers/applications) (Bot page → Privileged Gateway Intents). Discord enforces this at the gateway level regardless of the client library version — without it, message events arrive with an empty `content` and no command will trigger.
