var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
var box = 20;
var COLS = 30;
var ROWS = 30;
canvas.width = COLS*box;
canvas.height = ROWS*box;

var snake = [];
var food = {};
var dir = 'RIGHT';
var nextDir = 'RIGHT';
var score = 0;
var foods = 0;
var level = 1;
var speed = 120;
var loop = null;
var paused = false;
var over = false;
var started = false;
var high = parseInt(localStorage.getItem('phantomHigh')||'0');
var obstacles = [];
var mode = 'classic';
var wrap = false;
var grid = true;
var myData = null;

function $(id){return document.getElementById(id);}
$('highScore').textContent=high;
$('topScore').textContent=high;
$('myBest').textContent=high;

// Load JSON file - I added this for big project look
fetch('data.json')
.then(res=>res.json())
.then(data=>{
    console.log('My JSON loaded',data);
    myData=data;
    loadModes(data.modes);
    loadBoard(data.board);
    loadFoods(data.foods);
})
.catch(err=>{
    console.log('JSON failed, using default');
    loadDefault();
});

function loadModes(modes){
    var boxDiv = $('modesBox');
    boxDiv.innerHTML='';
    for(var i=0;i<modes.length;i++){
        var m=modes[i];
        var active = m.id=='classic' ? 'active' : '';
        var onOff = m.id=='classic' ? 'ON' : 'OFF';
        boxDiv.innerHTML+='<div class="mode-box '+active+'" data-mode="'+m.id+'"><i class="fa-solid '+m.icon+'"></i> '+m.name+' <span>'+onOff+'</span></div>';
    }
    addModeEvents();
}

function loadBoard(board){
    var div=$('boardBox');
    div.innerHTML='';
    for(var i=0;i<board.length;i++){
        var b=board[i];
        div.innerHTML+='<div class="lead"><span class="r '+b.badge+'">'+b.rank+'</span><div><p>'+b.name+'</p><small>Lvl '+b.level+'</small></div><b>'+b.score+'</b></div>';
    }
}

function loadFoods(foods){
    var div=$('foodBox');
    div.innerHTML='';
    for(var i=0;i<foods.length;i++){
        var f=foods[i];
        div.innerHTML+='<div class="food"><span class="d '+f.color+'"></span><div><h5>'+f.name+'</h5><p>+'+f.points+' '+f.desc+'</p></div></div>';
    }
}

function loadDefault(){
    loadModes([{id:'classic',name:'Classic',icon:'fa-infinity',desc:'Normal'},{id:'walls',name:'Walls',icon:'fa-cubes',desc:'Obstacles'},{id:'speed',name:'Speed',icon:'fa-bolt',desc:'Fast'}]);
    loadBoard([{rank:1,name:'NeonKing',level:10,score:920,badge:'gold'},{rank:2,name:'Viper',level:8,score:640,badge:'silver'}]);
    loadFoods([{name:'Red Berry',color:'red',points:10,desc:'Normal'},{name:'Gold Star',color:'yellow',points:50,desc:'Super'},{name:'Shield',color:'blue',points:30,desc:'Shield'},{name:'Ghost',color:'purple',points:100,desc:'Ghost'}]);
}

function makeFood(){
    var x,y,ok=false,t=0;
    while(!ok&&t<100){
        x=Math.floor(Math.random()*COLS)*box;
        y=Math.floor(Math.random()*ROWS)*box;
        ok=true;
        for(var i=0;i<snake.length;i++){if(snake[i].x==x&&snake[i].y==y)ok=false;}
        for(var j=0;j<obstacles.length;j++){if(obstacles[j].x==x&&obstacles[j].y==y)ok=false;}
        t++;
    }
    var r=Math.random();
    var type='normal';
    if(r<0.6) type='normal';
    else if(r<0.8) type='super';
    else type='shield';
    food={x:x,y:y,type:type};
}

function makeObs(){
    obstacles=[];
    var count=0;
    if(mode=='walls') count=8;
    else if(level>=2) count=level*2;
    for(var i=0;i<count;i++){
        var ox=Math.floor(Math.random()*(COLS-2)+1)*box;
        var oy=Math.floor(Math.random()*(ROWS-2)+1)*box;
        obstacles.push({x:ox,y:oy});
    }
}

function drawGrid(){
    if(!grid) return;
    ctx.strokeStyle='rgba(255,255,255,0.04)';
    ctx.lineWidth=0.5;
    for(var i=0;i<=COLS;i++){ctx.beginPath();ctx.moveTo(i*box,0);ctx.lineTo(i*box,ROWS*box);ctx.stroke();}
    for(var j=0;j<=ROWS;j++){ctx.beginPath();ctx.moveTo(0,j*box);ctx.lineTo(COLS*box,j*box);ctx.stroke();}
}

function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawGrid();
    for(var i=0;i<obstacles.length;i++){ctx.fillStyle='#ff4757';ctx.shadowBlur=8;ctx.shadowColor='#ff4757';ctx.fillRect(obstacles[i].x+3,obstacles[i].y+3,box-6,box-6);ctx.shadowBlur=0;}
    var col='#ff4757';
    if(food.type=='super') col='#ffdd59';
    else if(food.type=='shield') col='#70a1ff';
    else if(food.type=='ghost') col='#a78bfa';
    ctx.fillStyle=col;ctx.shadowBlur=15;ctx.shadowColor=col;ctx.beginPath();ctx.arc(food.x+box/2,food.y+box/2,box/2-4,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    for(var k=0;k<snake.length;k++){
        if(k==0){ctx.fillStyle='#00ff88';ctx.shadowBlur=14;ctx.shadowColor='#00ff88';ctx.fillRect(snake[k].x+1,snake[k].y+1,box-2,box-2);ctx.shadowBlur=0;}
        else{ctx.fillStyle='rgba(0,255,136,'+(1-k/snake.length*0.6)+')';ctx.fillRect(snake[k].x+2,snake[k].y+2,box-4,box-4);}
    }
}

function run(){
    if(paused||over) return;
    dir=nextDir;
    var head={x:snake[0].x,y:snake[0].y};
    if(dir=='LEFT') head.x-=box;
    if(dir=='RIGHT') head.x+=box;
    if(dir=='UP') head.y-=box;
    if(dir=='DOWN') head.y+=box;
    if(wrap){
        if(head.x<0) head.x=(COLS-1)*box;
        if(head.x>=COLS*box) head.x=0;
        if(head.y<0) head.y=(ROWS-1)*box;
        if(head.y>=ROWS*box) head.y=0;
    }else{
        if(head.x<0||head.x>=COLS*box||head.y<0||head.y>=ROWS*box) return gameOver();
    }
    for(var i=0;i<snake.length;i++){if(snake[i].x==head.x&&snake[i].y==head.y) return gameOver();}
    for(var j=0;j<obstacles.length;j++){if(obstacles[j].x==head.x&&obstacles[j].y==head.y) return gameOver();}
    snake.unshift(head);
    if(head.x==food.x&&head.y==food.y){
        if(food.type=='super') score+=50;
        else if(food.type=='shield') score+=30;
        else score+=10;
        foods++;
        if(foods%5==0){level++;speed=Math.max(45,speed-8);clearInterval(loop);loop=setInterval(run,speed);makeObs();}
        makeFood();update();
    }else{snake.pop();}
    draw();
}

function update(){
    $('score').textContent=score;$('scoreMain').textContent=score;$('level').textContent=level;$('foods').textContent=foods;$('length').textContent=snake.length;
    $('barFill').style.width=(foods%5)/5*100+'%';$('miniBar').style.width=(foods%5)/5*100+'%';$('pText').textContent=(foods%5)+'/5';
    if(score>high){high=score;localStorage.setItem('phantomHigh',high);$('highScore').textContent=high;$('topScore').textContent=high;$('myBest').textContent=high;}
}

function gameOver(){
    over=true;clearInterval(loop);
    $('fScore').textContent=score;$('fLen').textContent=snake.length;$('fFood').textContent=foods;$('fLevel').textContent=level;
    var rank='Worm';
    if(score<50) rank='Worm - Keep Trying';
    else if(score<150) rank='Hunter - Good';
    else if(score<350) rank='Predator - Great';
    else rank='SNAKE GOD - Amazing';
    $('rank').textContent='Rank: '+rank;
    $('overScreen').classList.remove('hide');
}

function startGame(){
    var btn=document.querySelector('.lvl.active');
    var lvl=parseInt(btn.dataset.lvl);
    if(lvl==1) speed=130; else if(lvl==2) speed=90; else speed=65;
    if(mode=='speed') speed-=20;
    snake=[{x:10*box,y:10*box},{x:9*box,y:10*box},{x:8*box,y:10*box}];
    dir='RIGHT';nextDir='RIGHT';score=0;foods=0;over=false;paused=false;started=true;
    $('startScreen').classList.add('hide');$('pauseScreen').classList.add('hide');$('overScreen').classList.add('hide');
    makeFood();makeObs();update();clearInterval(loop);loop=setInterval(run,speed);
}

function showStart(){
    clearInterval(loop);started=false;over=false;
    $('startScreen').classList.remove('hide');$('overScreen').classList.add('hide');$('pauseScreen').classList.add('hide');
    ctx.clearRect(0,0,canvas.width,canvas.height);drawGrid();
}

function togglePause(){
    if(!started||over) return;
    paused=!paused;
    if(paused) $('pauseScreen').classList.remove('hide');
    else $('pauseScreen').classList.add('hide');
}

function addModeEvents(){
    var modes=document.querySelectorAll('.mode-box');
    for(var i=0;i<modes.length;i++){
        modes[i].addEventListener('click',function(){
            var all=document.querySelectorAll('.mode-box');
            for(var j=0;j<all.length;j++){all[j].classList.remove('active');all[j].querySelector('span').textContent='OFF';}
            this.classList.add('active');this.querySelector('span').textContent='ON';
            mode=this.dataset.mode;makeObs();draw();
        });
    }
}

document.addEventListener('keydown',function(e){
    if(e.code=='Space'){e.preventDefault();togglePause();return;}
    if((e.key=='ArrowUp'||e.key=='w')&&dir!='DOWN') nextDir='UP';
    if((e.key=='ArrowDown'||e.key=='s')&&dir!='UP') nextDir='DOWN';
    if((e.key=='ArrowLeft'||e.key=='a')&&dir!='RIGHT') nextDir='LEFT';
    if((e.key=='ArrowRight'||e.key=='d')&&dir!='LEFT') nextDir='RIGHT';
});

$('startBtn').addEventListener('click',startGame);
$('restartBtn').addEventListener('click',startGame);
$('resumeBtn').addEventListener('click',togglePause);
$('restartBtn2').addEventListener('click',function(){showStart();setTimeout(startGame,100);});
$('pauseMob').addEventListener('click',togglePause);
$('restartMob').addEventListener('click',startGame);
$('upBtn').addEventListener('click',function(){if(dir!='DOWN') nextDir='UP';});
$('downBtn').addEventListener('click',function(){if(dir!='UP') nextDir='DOWN';});
$('leftBtn').addEventListener('click',function(){if(dir!='RIGHT') nextDir='LEFT';});
$('rightBtn').addEventListener('click',function(){if(dir!='LEFT') nextDir='RIGHT';});
document.querySelectorAll('.lvl').forEach(function(b){
    b.addEventListener('click',function(){
        document.querySelectorAll('.lvl').forEach(function(x){x.classList.remove('active');});
        this.classList.add('active');
    });
});
$('wrapT').addEventListener('click',function(){this.classList.toggle('on');wrap=this.classList.contains('on');});
$('gridT').addEventListener('click',function(){this.classList.toggle('on');grid=this.classList.contains('on');draw();});
drawGrid();