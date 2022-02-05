const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  getTopArticle: function (callback) {
    const url = 'https://pplware.sapo.pt/';
    const userAgent = "facebookexternalhit/1.1";

    axios.get(url, { headers: { 'User-Agent': userAgent } }).then(response => {
      const html = response.data;
      var articleScraped = {};
      const $ = cheerio.load(html);

      const articles = $('div.container > div.container-inner > div.main > div.main-inner > div.content > div.pad > article');

      var articleNumber = 0;


      articles.each(function () {
        if (articleNumber == 0) {
          let id = $(this).attr('id');
          let url = $(this).find('div > h2 > a').attr('href');
          let title = $(this).find('div > h2 > a').text().trim();
          let category = $(this).find('div > p > a').text().trim();
          let text1 = "";
          let text2 = "";
          $(this).find('div > p').map((i, section) => {
            if (i == 1) {
              text1 = $(section).text()
            } else if (i == 2) {
              text2 = $(section).text()
            }
          })

          articleScraped = {
            'id': id,
            'url': url,
            'title': title,
            'category': category,
            'text1': text1,
            'text2': text2
          }
        }
        articleNumber++;
      });
      callback(undefined, articleScraped)

    }).catch(function (e) {
      callback(e);
    });
  }
}