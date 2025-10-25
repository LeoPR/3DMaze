// Protótipo simples de labirinto 2D (JS)
// Grade: 11 linhas x 15 colunas (cada célula 40px, canvas 600x440)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

const COLS = 15;
const ROWS = 11;
const CELL = 40; // 600 / 15 = 40, 440 / 11 = 40

// 0 = caminho, 1 = parede
const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,0,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Entities (positions are [col, row])
let player = { x: 1, y: 1 };
let portal = { x: 13, y: 9 };
let monster = { x: 7, y: 5 };

let gameState = 'playing'; // 'playing', 'won', 'lost'

// Draw loop
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw grid
  for(let r=0;r<ROWS;r++){ 
    for(let c=0;c<COLS;c++){ 
      const x = c * CELL;
      const y = r * CELL;
      if(MAZE[r][c] === 1){
        ctx.fillStyle = '#222';
        ctx.fillRect(x,y,CELL,CELL);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x,y,CELL,CELL);
      }
      // optional grid lines
      ctx.strokeStyle = '#eee';
      ctx.strokeRect(x,y,CELL,CELL);
    }
  }

  // portal
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(portal.x*CELL+6, portal.y*CELL+6, CELL-12, CELL-12);

  // monster
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(monster.x*CELL + CELL/2, monster.y*CELL + CELL/2, CELL/2 - 6, 0, Math.PI*2);
  ctx.fill();

  // player
  ctx.fillStyle = '#3498db';
  ctx.beginPath();
  ctx.arc(player.x*CELL + CELL/2, player.y*CELL + CELL/2, CELL/2 - 8, 0, Math.PI*2);
  ctx.fill();

  // status overlay
  if(gameState === 'won' || gameState === 'lost'){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height/2 - 40, canvas.width, 80);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gameState === 'won' ? 'Você venceu!' : 'Você foi pego!', canvas.width/2, canvas.height/2 + 8);
  }
  requestAnimationFrame(()=>{});
}

// Start drawing loop via simple interval refresh (sufficient para protótipo)
setInterval(() => {
  draw();
}, 1000/30);

// Movement helpers
function canMoveTo(x,y){
  return x >= 0 && x < COLS && y >= 0 && y < ROWS && MAZE[y][x] === 0;
}

function attemptMovePlayer(dx,dy){
  if(gameState !== 'playing') return;
  const nx = player.x + dx;
  const ny = player.y + dy;
  if(canMoveTo(nx,ny)){ 
    player.x = nx; player.y = ny;
    checkPortal();
    checkMonsterCollision();
  }
}

function checkPortal(){
  if(player.x === portal.x && player.y === portal.y){
    gameState = 'won';
    statusEl.textContent = 'VENCEU!';
  }
}

function checkMonsterCollision(){
  if(player.x === monster.x && player.y === monster.y){
    gameState = 'lost';
    statusEl.textContent = 'FOI PEG0!';
  }
}

// Keyboard
window.addEventListener('keydown', (e) => {
  if(gameState !== 'playing') return;
  const key = e.key.toLowerCase();
  if(key === 'arrowup' || key === 'w') attemptMovePlayer(0,-1);
  else if(key === 'arrowdown' || key === 's') attemptMovePlayer(0,1);
  else if(key === 'arrowleft' || key === 'a') attemptMovePlayer(-1,0);
  else if(key === 'arrowright' || key === 'd') attemptMovePlayer(1,0);
});

// Monster movement (aleatório) - move a cada 700ms
function monsterStep(){
  if(gameState !== 'playing') return;
  const dirs = [
    {dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}
  ];
  // collect valid moves
  const valid = dirs.map(d => ({x: monster.x + d.dx, y: monster.y + d.dy}))
                    .filter(p => canMoveTo(p.x,p.y) && !(p.x === portal.x && p.y === portal.y));
  if(valid.length > 0){
    const choice = valid[Math.floor(Math.random()*valid.length)];
    monster.x = choice.x;
    monster.y = choice.y;
    checkMonsterCollision();
  }
}
const monsterTimer = setInterval(monsterStep, 700);

// Reset
function resetGame(){
  player = { x: 1, y: 1 };
  portal = { x: 13, y: 9 };
  monster = { x: 7, y: 5 };
  gameState = 'playing';
  statusEl.textContent = '';
}
resetBtn.addEventListener('click', () => {
  resetGame();
});

// initial draw
draw();