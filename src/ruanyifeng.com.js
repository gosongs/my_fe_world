var Crawler = require('crawler');
var cheerio = require('cheerio');
var toMarkdown = require('to-markdown');
var fs = require('fs');
var shelljs = require('shelljs');
var ProgressBar = require('progress');

// 存储抓到的博文
var posts = [];

// 统计结果
var total = 0;
var success = 0;
var fail = 0;
var bar;

// 删除历史文档, 创新创建
var dir = './md/ruanyifeng.com';
shelljs.rm('-rf', dir);
shelljs.mkdir('-p', dir);

// 写文件
function writeMd(blog) {
  var { title, author, date, link, content, dislike } = blog;
  var filename = `${dir}/${title}.md`;
  shelljs.touch(filename);
  fs.writeFile(filename, `# ${title}\n ${link}\n\n${content}`, function (err) {
    if (err) {
      fail += 1;
      console.log('写文件失败:', title);
    } else {
      success += 1;
    }
  });
}

// 抓取列表
var postsCrawler = new Crawler({
  maxConnections: 10,
  callback: function (error, res, done) {
    if (error) {
      console.log(error)
    } else {
      var $ = cheerio.load(res.body, { decodeEntities: false });
      $('#alpha .module-list a').each(function (id, ele) {
        var $ele = $(ele);
        posts.push($ele.attr('href'));
      });
      done();
    }
  }
});

// 抓取文章详情
var contentCrawler = new Crawler({
  maxConnections: 5,
  callback: function (error, res, done) {
    var $ = cheerio.load(res.body, { decodeEntities: false });
    var title = $('#page-title').text();
    bar.tick();
    // html to markdown
    var content = toMarkdown($('#main-content').html(), {
      converters: [
        { // code snippet
          filter: 'blockquote',
          replacement: function (content) {
            return '```' + content + '```';
          }
        }
      ]
    });

    if (title) {
      var blog = {
        title,
        author: $('.hentry .asset-meta .author a').text(),
        date: $('.hentry .asset-meta .published').text(),
        link: res.request.uri.href,
        content,
        dislike: false
      };
      writeMd(blog);
    }
    done();
  }
});

function start() {
  postsCrawler.queue('http://www.ruanyifeng.com/blog/javascript/');

  postsCrawler.on('drain', function () {
    total = posts.length;
    bar = new ProgressBar('阮一峰的网络日志: [:bar] :current/:total', { total: total });
    contentCrawler.queue(posts);
  });

  contentCrawler.on('drain', function () {
    if(bar.complete){
      console.log(`✅ 成功: ${success}, ❌ 失败: ${fail}\n`)
    }
  });
}

start();