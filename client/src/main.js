import './style.css';
import { startGame } from './game.js';
import { startMenu } from './menu.js';
import { startOnline } from './online/ui.js';

const game = startGame();
const menu = startMenu(game);
const online = startOnline({
  getLook: menu.look,
  onMatch: match => game.play(menu.look(), match),
});
document.getElementById('onlineBtn').onclick = () => online.open();
// Leave a match: back to the start menu (online, this also leaves the lobby)
document.getElementById('leaveBtn').onclick = () => online.leave().finally(() => location.reload());
setTimeout(() => document.getElementById('intro')?.remove(), 3200);
