import { state } from './state.ml2.js';
import {
  convert,
  loadMultipleFiles,
  toggle
} from './utils.ml2.js';

import { Decode } from './processor.ml2.js';

// MAIN VARIABLE
const mainPage = document.querySelector('.main-page');
const cardCollector = document.querySelector('#card-collector');
const imageInput = document.querySelector('#image-input');
const uploadBtn = document.querySelector('#upload-level');
const fullscreenBtn = document.querySelector('#toggle-fullscreen');
const reloadBtn = document.querySelector('#reload');
const versionBtn = document.querySelector('#app-version');

const mainToolbar = document.querySelector('.main-toolbar');
const deleteBtn = document.querySelector('#delete-card');
const playBtn = document.querySelector('#play-online');
const buildBtn = document.querySelector('#level-editor');
const shareBtn = document.querySelector('#share-card');

// EDITOR VARIABLE
const editPage = document.querySelector('.edit-page');
const title = document.querySelector('#title-input');
const author = document.querySelector('#author-input');
const layerWrapper = document.querySelector('#layer-wrapper');

// EVENT







shareBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = state.cards[0].src;
  link.download = state.cards[0].alt;
  document.body.appendChild(link);
  link.click();
  link.remove();
});


function handleMainToolbar() {
  const count = state.cards.length;
  if (count > 1) {
    playBtn.disabled = true;
    shareBtn.disabled = true;
  } else if (count === 1) {
    playBtn.disabled = false;
    shareBtn.disabled = false;
    mainToolbar.classList.add('open');
  } else {
    mainToolbar.classList.remove('open');
  }
}



editPage.querySelector('#close').onclick = () => {
  resetAll();
  toggle.display([editPage, mainPage]);
};


const saveBtn = document.querySelector('#save');
const infoBtn = document.querySelector('#info');

let i = 0;

saveBtn.addEventListener('click', (tf) => {
  tf.rotate(myBlocks, 'y', false);
  myBlocks = tf.rotated;
  i++;
  infoBtn.textContent = i;
  
  myBlocks.forEach((block, index) => {
    const { x, y, z } = Transform.index2Coords(index);
    const cvs = layers[z];
    const ctx = cvs.getContext('2d');
    const dx = x * 64;
    const dy = (16 - 1 - y) * 64;
    
    ctx.save();
    ctx.translate(dx + 64, dy + 64);
    Render.drawTile(ctx, block);
    ctx.restore();
  });
});

infoBtn.addEventListener('click', () => {
  //layers.forEach(cvs => Render.clearTilesArea(cvs));
  
  tf.rotate(myBlocks, 'y', true);
  myBlocks = tf.rotated;
  /*
  myBlocks.forEach((block, index) => {
    const { x, y, z } = Transform.index2Coords(index);
    const ctx = layers[z].getContext('2d');
    const dx = x * 64;
    const dy = (16 - 1 - y) * 64;
    
    ctx.save();
    ctx.translate(dx + 64, dy + 64);
    Render.drawTile(ctx, block);
    ctx.restore();
  });
  */
});
