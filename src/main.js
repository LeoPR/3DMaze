// Raycasting protótipo simples (JS) - versão corrigida
// Usa o mesmo mapa (MAZE) do protótipo 2D. Renderiza visão em 1ª pessoa via raycasting.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');

// Map grid (15x11) - 0 caminho, 1 parede (mesmo que antes)
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

const COLS = MAZE[0].length;
const ROWS = MAZE.length;
const CELL = 40; // unidade do mapa

// Player (pos em coordenadas de mundo, não apenas tile)
let player = {
  x: 1.5,
  y: 1.5,
  angle: 0,
  moveSpeed: 2.4, // tiles por segundo
  rotSpeed: Math.PI // rad/s
};

// Portal e monstro (pos tile-center)
let portal = { x: 13.5, y: 9.5 };
let monster = { x: 7.5, y: 5.5 };
let monsterTimer = null;
let monsterMoveInterval = 1000; // ms

let gameState = 'playing'; // playing, won, lost

// Raycasting parameters
const FOV = (60 * Math.PI) / 180; // 60 graus
const NUM_RAYS = 240; // resolução horizontal do raycast

// Resize canvas logical size for consistent ray steps
function fitCanvas(){
  canvas.width = 600; canvas.height = 440;
}
fitCanvas();

// Helpers
function tileAt(x,y){
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if(tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return 1;
  return MAZE[ty][tx];
}
function clampAngle(a){
  let v = a % (Math.PI*2);
  if(v < -Math.PI) v += Math.PI*2;
  if(v > Math.PI) v -= Math.PI*2;
  return v;
}
function distance(ax,ay,bx,by){
  const dx = bx-ax; const dy = by-ay; return Math.hypot(dx,dy);
}

// Movement and collision
function movePlayer(forward,strafe,dt){
  if(gameState !== 'playing') return;
  const ang = player.angle;
  const vx = Math.cos(ang) * forward - Math.sin(ang) * strafe;
  const vy = Math.sin(ang) * forward + Math.cos(ang) * strafe;
  const speed = player.moveSpeed * dt;
  const nx = player.x + vx * speed;
  const ny = player.y + vy * speed;
  // collision simple: check tile
  if(tileAt(nx, player.y) === 0) player.x = nx;
  if(tileAt(player.x, ny) === 0) player.y = ny;
  // collisions with monster or portal
  checkPortalCollision();
  checkMonsterCollision();
}
function checkPortalCollision(){
  if(Math.floor(player.x) === Math.floor(portal.x) && Math.floor(player.y) === Math.floor(portal.y)){
    gameState = 'won';
    statusEl.textContent = 'VENCEU!';
  }
}
function checkMonsterCollision(){
  const d = distance(player.x,player.y, monster.x, monster.y);
  if(d < 0.6){
    gameState = 'lost';
    statusEl.textContent = 'FOI PEG0!';
  }
}

// Simple monster movement (aleatório entre tiles disponíveis)
function monsterStep(){
  if(gameState !== 'playing') return;
  const dirs = [ [0,-1],[0,1],[-1,0],[1,0] ];
  const valid = [];
  for(const d of dirs){
    const nx = monster.x + d[0];
    const ny = monster.y + d[1];
    if(tileAt(nx,ny) === 0 && !(Math.floor(nx) === Math.floor(portal.x) && Math.floor(ny) === Math.floor(portal.y))){
      valid.push({x:nx,y:ny});
    }
  }
  if(valid.length > 0){
    const choice = valid[Math.floor(Math.random()*valid.length)];
    monster.x = choice.x; monster.y = choice.y;
    checkMonsterCollision();
  }
}

// Raycast routine (DDA-style stepping)
function castRay(rayAngle){
  rayAngle = clampAngle(rayAngle);
  const sinA = Math.sin(rayAngle), cosA = Math.cos(rayAngle);
  let distanceToWall = 0;
  const maxDepth = 20.0;
  let hit = false;
  let hitX=0, hitY=0;
  const stepSize = 0.02;
  while(!hit && distanceToWall < maxDepth){
    distanceToWall += stepSize;
    const testX = player.x + cosA * distanceToWall;
    const testY = player.y + sinA * distanceToWall;
    if(testX < 0 || testX >= COLS || testY < 0 || testY >= ROWS){
      hit = true; distanceToWall = maxDepth; break;
    }
    if(tileAt(testX, testY) === 1){
      hit = true; hitX = testX; hitY = testY; break;
    }
  }
  return {distance: distanceToWall, hitX, hitY, angle: rayAngle};
}

// Render loop (agora também atualiza controles)
let lastTime = performance.now();
function render(now){
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now;

  // Atualiza controles (movimentação) usando dt calculado aqui
  updateControls(dt);

  // clear
  ctx.fillStyle = '#87CEEB'; // sky
  ctx.fillRect(0,0,canvas.width, canvas.height/2);
  ctx.fillStyle = '#7f7f7f'; // floor
  ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

  // cast rays
  for(let i=0;i<NUM_RAYS;i++){
    const rayScreenPos = (i / NUM_RAYS) - 0.5; // -0.5 .. 0.5
    const rayAngle = player.angle + rayScreenPos * FOV;
    const ray = castRay(rayAngle);
    const correctedDist = ray.distance * Math.cos(clampAngle(rayAngle - player.angle));
    const wallHeight = Math.min(10000, (CELL * 300) / (correctedDist + 0.0001));
    const x = Math.floor(i * (canvas.width / NUM_RAYS));
    const h = Math.floor(wallHeight);
    const top = Math.floor((canvas.height/2) - (h/2));
    const shade = Math.max(0, 255 - Math.floor(correctedDist * 18));
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(x, top, Math.ceil(canvas.width/NUM_RAYS)+1, h);
  }

  // draw monster as simple sprite projection
  const dx = monster.x - player.x;
  const dy = monster.y - player.y;
  const distM = Math.hypot(dx,dy);
  let angleToM = Math.atan2(dy,dx);
  let delta = clampAngle(angleToM - player.angle);
  if(Math.abs(delta) < FOV/2 && distM > 0.2){
    const screenX = Math.floor((0.5 + (delta / FOV)) * canvas.width);
    const size = Math.min(canvas.width/2, Math.max(6, (CELL*300) / distM));
    ctx.fillStyle = 'rgba(231,76,60,0.95)';
    ctx.beginPath();
    ctx.ellipse(screenX, canvas.height/2, size/3, size/2, 0, 0, Math.PI*2);
    ctx.fill();
  }

  // HUD - mini map (top-left small)
  drawMinimap();

  // continue loop
  requestAnimationFrame(render);
}

// Mini-map drawing for orientation
function drawMinimap(){
  const mapScale = 6;
  const ox = 8, oy = 8;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  const w = COLS*mapScale+ox*2, h = ROWS*mapScale+oy*2;
  ctx.fillRect(6,6,w,h);
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const x = 6 + ox + c*mapScale;
      const y = 6 + oy + r*mapScale;
      ctx.fillStyle = MAZE[r][c] === 1 ? '#222' : '#ddd';
      ctx.fillRect(x,y,mapScale-1,mapScale-1);
    }
  }
  // portal
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(6+ox + Math.floor(portal.x-0.5)*mapScale, 6+oy + Math.floor(portal.y-0.5)*mapScale, mapScale-1, mapScale-1);
  // monster
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(6+ox + Math.floor(monster.x-0.5)*mapScale, 6+oy + Math.floor(monster.y-0.5)*mapScale, mapScale-1, mapScale-1);
  // player
  ctx.fillStyle = '#3498db';
  ctx.fillRect(6+ox + Math.floor(player.x-0.5)*mapScale, 6+oy + Math.floor(player.y-0.5)*mapScale, mapScale-1, mapScale-1);
  ctx.restore();
}

// Input handling
const keys = {};
window.addEventListener('keydown', (e)=>{ keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e)=>{ keys[e.key.toLowerCase()] = false; });

function updateControls(dt){
  let forward = 0, strafe = 0, turn = 0;
  if(keys['w'] || keys['arrowup']) forward += 1;
  if(keys['s'] || keys['arrowdown']) forward -= 1;
  if(keys['a'] || keys['arrowleft']) turn -= 1; // turn left
  if(keys['d'] || keys['arrowright']) turn += 1; // turn right
  if(keys['q']) strafe -= 1;
  if(keys['e']) strafe += 1;
  // apply rotation
  player.angle += turn * player.rotSpeed * dt;
  player.angle = clampAngle(player.angle);
  // move
  movePlayer(forward, strafe, dt);
}

// Reset game
function resetGame(){
  player = { x:1.5, y:1.5, angle: 0, moveSpeed:2.4, rotSpeed: Math.PI };
  portal = { x:13.5, y:9.5 };
  monster = { x:7.5, y:5.5 };
  gameState = 'playing';
  statusEl.textContent = '';
}
resetBtn.addEventListener('click', resetGame);

// Start monster timer and loop
function start(){
  if(monsterTimer) clearInterval(monsterTimer);
  monsterTimer = setInterval(monsterStep, monsterMoveInterval);
  lastTime = performance.now();
  requestAnimationFrame(render);
}

// initial guard: ensure canvas/context
if(!canvas || !ctx){
  const msg = document.createElement('div');
  msg.textContent = 'Erro: canvas não encontrado ou não é suportado no navegador.';
  document.body.appendChild(msg);
} else {
  start();
}