#  phantomjs 生成 echarts 图片
基于phantomjs + echarts 的服务器端丰富图表生成方案

## 使用

* 命令行传参
-option: echarts官网运行的js代码,无法存在的特殊字符 `"`、`!0`、回车等

```
phantomjs echarts-draw.js -option option -outfile outfile -width width -height height
```
如：
```
phantomjs echarts-draw.js -option "window.dataList=[{name:'南海诸岛',value:0},{name:'北京',value:54},{name:'天津',value:13},{name:'上海',value:40},{name:'重庆',value:75},{name:'河北',value:13},{name:'河南',value:83},{name:'云南',value:11},{name:'辽宁',value:19},{name:'黑龙江',value:15},{name:'湖南',value:69},{name:'安徽',value:60},{name:'山东',value:39},{name:'新疆',value:4},{name:'江苏',value:31},{name:'浙江',value:104},{name:'江西',value:36},{name:'湖北',value:1052},{name:'广西',value:33},{name:'甘肃',value:7},{name:'山西',value:9},{name:'内蒙古',value:7},{name:'陕西',value:22},{name:'吉林',value:4},{name:'福建',value:18},{name:'贵州',value:5},{name:'广东',value:98},{name:'青海',value:1},{name:'西藏',value:0},{name:'四川',value:44},{name:'宁夏',value:4},{name:'海南',value:22},{name:'台湾',value:3},{name:'香港',value:5},{name:'澳门',value:5}];
option={tooltip:{triggerOn:'click',formatter:function(e,t,n){return.5==e.value?e.name+'：有疑似病例':e.seriesName+'<br/>'+e.name+'：'+e.value}},visualMap:{min:0,max:1000,left:26,bottom:40,showLabel:true,text:['高','低'],pieces:[{gt:100,label:'>100人',color:'#7f1100'},{gte:10,lte:100,label:'10-100人',color:'#ff5428'},{gte:1,lt:10,label:'1-9人',color:'#ff8c71'},{gt:0,lt:1,label:'疑似',color:'#ffd768'},{value:0,color:'#ffffff'}],show:true},geo:{map:'china',roam:false,scaleLimit:{min:1,max:2},zoom:1.23,top:120,label:{normal:{show:true,fontSize:'14',color:'rgba(0,0,0,0.7)'}},itemStyle:{normal:{borderColor:'rgba(0,0,0,0.2)'},emphasis:{areaColor:'#f2d5ad',shadowOffsetX:0,shadowOffsetY:0,borderWidth:0}}},series:[{name:'确诊病例',type:'map',geoIndex:0,data:window.dataList}]};" -outfile chart.png -width 800 -height 800
```
* 文件传参
-infile: echarts官网运行的js代码文件（echarts-option.js）
```
phantomjs echarts-draw.js -infile infile -outfile outfile -width width -height height
```
如：
```
phantomjs echarts-draw.js -infile echarts-option.js -outfile outfile -outfile chart1.png -width 800 -height 800
```

注：echarts运行的js代码不支持ajax请求和ES6特殊语句如箭头函数

使用地图,已添加中国地图*china*
定制地图可在 `geoMap` 对象中添加新的地图, 如添加地图 myMap,创建js文件并注册地图 `echarts.registerMap('myMap', {...})`
使用：
```
geo: {
    map: 'myMap',
}
```

## 调试
> Phantomjs命令行： phantomjs [options] somescript.js [arg1 [arg2 [...]]] 
关于调试的[options]： 
* --remote-debugger-port  开启调试模式并监听制定端口 
* --remote-debugger-autorun 在调试器中立即执行脚本（Yes/No） 

调试过程:
1. 调试的echarts-draw.js文件中添加 `debugger;` 放在开头  或者任意位置（当断点）
2. 运行命令 `phantomjs --remote-debugger-port=9000 --remote-debugger-autorun=true echarts-draw.js -infile echarts-option.js -outfile chart1.png`
3. 打开 [localhost:9000](http://localhost:9000) 
    phantomjs运行js[file://echarts-draw.js](http://localhost:9000/webkit/inspector/inspector.html?page=1)
    phantomjs 打开的空白页面[echarts page](http://localhost:9000/webkit/inspector/inspector.html?page=2)
4. 在Console中输入： __run()  回车即可调式

## 常见错误
* Page.onError 
传入的echarts 代码错误
如下 echarts-option.js第41行错误，使用了箭头函数
```
Page.onError : SyntaxError: Unexpected token '>'
TRACE:
 -> undefined: 41 (in function "appendChild")
 -> : 23 (in function "loadEchartsScript")
 -> : 27 (in function "renderEcharts")
 -> : 41
 -> : 9 (in function "onload")
 ```
使用命令方式传参，js代码中存在 *" "* 或 *回车*
 ```
Page.onError : SyntaxError: Unexpected EOF
TRACE:
 -> undefined: 1 (in function "appendChild")
 -> : 23 (in function "loadEchartsScript")
 -> : 27 (in function "renderEcharts")
 -> : 47
 -> : 49
 ```
 * 参数中存在 *!0*
 ```
 zsh: event not found: 0
 ```
