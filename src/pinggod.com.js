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
var dir = './md/pinggod.com';
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
  maxConnections: 5,
  callback: function (error, res, done) {
    if (error) {
      console.log(error)
    } else {
      var $ = cheerio.load(res.body, { decodeEntities: false });
      $('.archive .post-item a').each(function (id, ele) {
        var $ele = $(ele);
        posts.push(`http://pinggod.com${$ele.attr('href')}`);
      });
      done();
    }
  }
});

// 抓取文章详情
var contentCrawler = new Crawler({
  maxConnections: 2,
  callback: function (error, res, done) {
    var $ = cheerio.load(res.body, { decodeEntities: false });
    var title = $('h1.post-title').text();
    bar.tick();
    // html to markdown
    var content = toMarkdown($('.post-content').html() || '', {
      converters: [
        // { // code snippet
        //   filter: 'blockquote',
        //   replacement: function (content) {
        //     return '```' + content + '```';
        //   }
        // }
      ]
    });

    if (title) {
      var blog = {
        title,
        author: 'PING4GOD',
        date: $('.post-info').text(),
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
  postsCrawler.queue('http://pinggod.com/archives/');

  postsCrawler.on('drain', function () {
    total = posts.length;
    bar = new ProgressBar('PING4GOD: [:bar] :current/:total', { total: total });
    contentCrawler.queue(posts);
  });

  contentCrawler.on('drain', function () {
    if (bar.complete) {
      console.log(`✅ 成功: ${success}, ❌ 失败: ${fail}\n`)
    }
  });
}

start();