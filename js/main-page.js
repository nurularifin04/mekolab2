import { Modal } from './modal.js';
import { state } from './state.js';
import { loadImageFile } from './file-loader.js';

const init = () => {
  const modal = new Modal(document.querySelector('.ml2-modal'));
  
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
  
  const handleMainToolbar = () => {
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
  
  mainPage.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    const activeCard = document.querySelectorAll('.card.active');
    const isControlElement = [
      'button',
      'dialog',
      'input[type="file"]',
      'select',
      '.card-collector',
      '.main-toolbar'
    ].some((selector) => e.target.closest(selector));
      
    if (card) {
      const index = state.cards.indexOf(card);
      card.classList.toggle('active');
      if (card.classList.contains('active')) {
        state.cards.push(card);
      } else {
        state.cards.splice(index, 1);
      }
    }
    
    else if (!card && !isControlElement) {
      activeCard.forEach((card) => card.classList.remove('active'));
      state.reset();
    }
    
    handleMainToolbar();
  });
    
  imageInput.addEventListener('change', async (event) => {
    const files = event.target.files;
    
    if (files.length > 0) {
      const imgs = await Promise.all(Array.from(files).map(loadImageFile));
      cardCollector.append(...imgs);
      
      requestAnimationFrame(() => {
        versionBtn.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
    
    event.target.value = '';
  });
  
  uploadBtn.onclick = () => imageInput.click();
  reloadBtn.onclick = () => modal.alert({ text: 'Haloo' });
  versionBtn.onclick = () => window.location.assign('1.0');
  
  deleteBtn.addEventListener('click', () => {
    let count = state.cards.length;
    let message = (count !== 1) ? `Remove ${count} cards?` : 'Remove this card?';
    
    modal.alert({
      text: message,
      onConfirm: () => {
        state.cards.forEach((card) => card.remove());
        state.cards.length = 0;
      }
    });
  });
  
  playBtn.addEventListener('click', async () => {
    modal.loading();
    try {
      //const level = await Decode.create(state.cards[0]);
      const base64 = btoa(convert.code2Char(new Uint8Array([9])));
      const link = document.createElement('a');
      link.href = `http:/\/play.mekorama.com/?l=${base64}`;
      link.target = '_blank';
      link.click();
      link.remove();
      modal.close();
    } catch (error) {
      modal.alert({ text: error.message });
    }
  });
  
  buildBtn.addEventListener('click', async () => {
    modal.loading();
    try {
    for (let i = 0; i < state.cards.length; i++) {
      const level = await Decode.create(state.cards[i]);
      
      if (i === 0) {
        title.value = level.title;
        author.value = level.author;
        myBlocks = level.blocks;
      } else {
        if (author.value !== level.author) {
          modal.alert({ text: 'Author name not match.' });
          return;
        } else {
          level.blocks.forEach((val, idx) => {
            if (val[0] === 0) return;
            myBlocks[idx] = val;
          });
        }
      }
    }
    
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
    
    toggle.display([mainPage, editPage]);
    layers[15].scrollIntoView()
    state.cards.length = 0;
    handleMainToolbar();
    modal.close();
    } catch (error) {
      const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      
      if (isDev) {
        catchLog(error);
      } else {
        modal.alert({ text: error });
      }
    }
  });
}

export default init;