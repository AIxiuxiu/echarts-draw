/**
“phantomjs 生成echarts图片 
1、增加支持变量，echarts官网代码基本可直接运行（除ajax请求，和ES6特殊语法：如箭头函数等）
2、添加错误处理，运行失败会打印错误日志，且不会生成图片（也可以改为生成特定失败图片）
3、添加地图注册功能 当前只添加中国“china” 地图，添加新地图在 “geoMap” 中添加 { "map: '新地图名称'": '地图js文件地址'}
4、echarts绘制完成事件拦截，防止图未绘制完成
5、添加超时处理， 5s(config.TIMEOUT)后未获取到绘制完成事件，则退出
注：命令行参数 -options 修改为 -option

使用流程：
命令方式
1、运行命令 “phantomjs echarts-draw.js -option option -outfile filename -width width -height height”
2、判断生成图片 filename 是否存在，存在则使用，不存在则使用失败的图片
注：命令需特殊处理双引号回车等
文件方式
1、将echarts官网运行的代码写入到本地特定文件如 “option.js” （可防止出现空格回车等造成命令行执行错误）
2、运行命令 “phantomjs echarts-draw.js -infile option.js -outfile filename -width width -height height”
3、判断生成图片 filename 是否存在，存在则使用，不存在则使用失败的图片
注：多线程需特殊处理

错误调试 添加调试参数 “phantomjs --remote-debugger-port=9000 --remote-debugger-autorun=true echarts-draw.js” 打开 http://localhost:9000 调试
 */
var system = require('system');
var fs = require('fs');

// 使用配置
var config = {
  // 本地依赖库
  JQUERY: 'jquery.min.js',
  ECHARTS: 'echarts.min.js',

  DEFAULT_WIDTH: '800', //图片默认宽
  DEFAULT_HEIGHT: '400', //图片默认高
  TIMEOUT: 50000, // 超时时间5s
};

// 地图  也可使用echarts官网地图 https://gallerybox.echartsjs.com/dep/echarts/map/js/china.js，
// 添加新地图 { "map: '新地图名称'": '地图js文件地址'}
var geoMap = { "map: 'china'": 'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/js/china.js' };

var finished = false;

// 使用方式
var usage = function () {
  console.log(
    '\nUsage: phantomjs echarts-draw.js -option option -outfile filename -width width -height height' +
    'OR' +
    'Usage: phantomjs echarts-draw.js -infile URL -outfile filename -width width -height height\n'
  );
};

// 获取宽高参数
var getSize = function (params) {
  var getRealValue = function (size, defaultSize) {
    if (size !== undefined && size !== null && size !== 'null' && size != '0') {
      var num = Number(size);
      if (!isNaN(num)) {
        return size;
      } else if (size.indexOf('px') != -1) {
        return size.replace('px', '');
      }
    } else {
      return defaultSize;
    }
  }
  params.width = getRealValue(params.width, config.DEFAULT_WIDTH);
  params.height = getRealValue(params.height, config.DEFAULT_HEIGHT);
}

// 解析参数
var parseParams = function () {
  var map = {},
    key,
    index;
  if (system.args.length < 2) {
    usage();
    phantom.exit();
  }

  for (index = 0; index < system.args.length; index++) {
    if (system.args[index] !== null && system.args[index] !== '' && system.args[index].charAt(0) === '-') {
      key = system.args[index].substr(1);
      if (key === 'infile') {
        key = 'option';
        try {
          map[key] = fs.read(system.args[index + 1]).replace(/^\s+/, '');
        } catch (e) {
          console.log('Error: cannot find file, ' + system.args[index + 1]);
          phantom.exit();
        }
      } else {
        map[key] = system.args[index + 1];
      }
    }
  }
  return map;
};

// 打开空白页面绘制图表并截图
var main = function (params) {
  var page = require('webpage').create();

  page.onConsoleMessage = function (msg) {
    console.log(msg);
  };

  // 用来判断echarts 是否绘制完成
  page.onAlert = function (msg) {
    if (msg == 'myChartfinished' && !finished) {
      console.log('Echarts draw finshed');
      finished = true;
      page.clipRect = {
        top: 0,
        left: 0,
        width: params.width,
        height: params.height,
      };
      // render the image
      page.render(params.outfile);
      console.log('Success render image: ' + params.outfile);
      phantom.exit(); // exit
    }
  };

  // page中的资源请求错误
  page.onResourceError = function () {
    console.log('Page.onResourceError: ' + JSON.stringify(arguments));
  };

  // page 中 js错误打印
  page.onError = function (msg, trace) {
    var msgStack = ['Page.onError : ' + msg];
    if (trace && trace.length) {
      msgStack.push('TRACE:');
      trace.forEach(function (t) {
        msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
      });
    }
    console.log(msgStack.join('\n'));
    phantom.exit();
  };

  var createChart = function (chartCode, geoMap) {
    var rendering = false;

    function loadScript(url, callback) {
      var head = document.getElementsByTagName('head')[0];
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.onload = function () {
        callback();
      };
      script.onerror = function () {
        console.log('ERROR: loadScript load ' + url);
        phantom.exit();
      };
      script.src = url;
      head.appendChild(script);
    }

    function loadEchartsScript(codeStr) {
      var script = $('<script>').attr('type', 'text/javascript');
      script.html(codeStr);
      // console.log('script.html:' + codeStr);
      document.getElementsByTagName('head')[0].appendChild(script[0]);
    }

    function renderEcharts() {
      loadEchartsScript(chartCode);

      if (option && 'object' == typeof option && myChart) {
        option.animation = false;
        myChart.setOption(option);
      }
    }

    Object.keys(geoMap).forEach(function (key) {
      if (chartCode.indexOf(key) != -1 || chartCode.indexOf(key.replace(/\s+/g, '')) != -1) {
        var jsUrl = geoMap[key];
        console.log('LoadScript echarts geoMap: ' + jsUrl);
        rendering = true;
        loadScript(jsUrl, function () {
          renderEcharts();
        });
      }
    });

    if (!rendering) {
      renderEcharts();
    }
  };

  var injectJs = function (jsFile) {
    var result = page.injectJs(jsFile);
    if (!result) {
      console.log('ERROR: injectJs cannot find ' + jsFile);
      phantom.exit(); // exit
    }
  }

  // 打开空页面来绘制图表
  page.open('about:blank', function (status) {
    console.log('Page.open status: ' + status);

    // inject the dependency js
    injectJs(config.JQUERY);
    injectJs(config.ECHARTS);

    var jsCode =
      "$(document.body).css('backgroundColor','white'); var container=$('<div>').appendTo(document.body); container.attr('id','container'); container.css({width:" +
      params.width +
      ',height:' +
      params.height +
      "}); var myChart=echarts.init(container[0]); myChart.on('finished',function(){alert('myChartfinished');});";
    var chartCode = jsCode + 'var option;' + params.option;
    // create the echart
    page.evaluate(createChart, chartCode, geoMap);

  });

  page.onLoadFinished = function (status) {
    console.log('Page.onLoadFinished status: ' + status);
    // 超时未结束，关闭
    setTimeout(function () {
      console.log('ERROR: echarts draw with timeout');
      phantom.exit();
    }, config.TIMEOUT);
  };
};

// 错误处理
phantom.onError = function (msg, trace) {
  var msgStack = ['Phantom.onError: ' + msg];
  if (trace && trace.length) {
    msgStack.push('TRACE:');
    trace.forEach(function (t) {
      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function + ')' : ''));
    });
  }
  console.log(msgStack.join('\n'));
  phantom.exit();
};

params = parseParams();

if (params.option === undefined || params.option.length === 0 || params.option == 'undefined') {
  console.log('ERROR: No option or infile found.');
  usage();
  phantom.exit();
}
// set the default out file
if (params.outfile === undefined) {
  var tmpDir = fs.workingDirectory + '/tmp';
  // exists tmpDir and is it writable?
  if (!fs.exists(tmpDir)) {
    try {
      fs.makeDirectory(tmpDir);
    } catch (e) {
      console.log('ERROR: Cannot make tmp directory');
    }
  }
  params.outfile = tmpDir + '/' + new Date().getTime() + '.png';
}

getSize(params);
// console.log('params:' + params.option + params.outfile);

main(params);
