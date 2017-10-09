var Crawler = require('crawler');
var cheerio = require('cheerio');

var posts = [];
const postsCrawler = new Crawler({
  maxConnections: 10,
  callback: function (error, res, done){
    if (error) {
      console.log(error)
    } else {
      const $ = cheerio.load(res.body, {decodeEntities: false});
			$('#alpha .module-list a').each(function (id, ele) {
				var $ele = $(ele);
				posts.push({
					title: $ele.text(),
					link: $ele.attr('href')
				})
      });
			done();
    }
  }
});

postsCrawler.queue('http://www.ruanyifeng.com/blog/javascript/');

postsCrawler.on('drain', function(){
	console.log(posts)
});
