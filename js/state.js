import { CONFIG } from './constants.js';

export const state = {
  cards: [],
  title: 'New Level',
  author: 'Unknown Author',
  blocks: new Uint8Array(CONFIG.GRID_3D * 3),
  history: [],
  reset() {
    this.cards.length = 0;
    this.blocks.fill(0);
    this.title = 'New Level';
    this.author = 'Unknown Author';
  }
}