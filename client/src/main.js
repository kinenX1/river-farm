import './style.css';
import { startGame } from './game.js';
import { startMenu } from './menu.js';
import { startOnline } from './online/ui.js';

const game = startGame();
const menu = startMenu(game);
const online = startOnline({
  getSkin: menu.skin,
  onMatch: match => game.play(menu.skin(), match),
});
document.getElementById('onlineBtn').onclick = () => online.open();
