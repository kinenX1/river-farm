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
