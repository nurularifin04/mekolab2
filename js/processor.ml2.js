import { convert } from './utils.ml2.js';

import {
  atlas,
  fontRules,
  mekoBlocks,
  orientationRules,
  poseTemplates
} from './blocks.ml2.js';



export class Decode {
  constructor(binary) {
    this.binary = binary;
    this.title = '';
    this.author = '';
    this.blocks = [];
  }
  
  static async create(imgElement) {
    const bitmap = await createImageBitmap(imgElement);
    
    if (bitmap.width === 0 || bitmap.height === 0) {
      throw new Error('Invalid image dimension.');
    }

    const binary = await worker({ id: 'JSQR', bitmap: bitmap }, [bitmap]);
    
    if (!binary) throw new Error('Failed to decode QR Code.');
    
    // Header check
    const version = binary[0];
    const signature = binary.slice(1, 4);
    const isHeader = [1, 2, 3].includes(version) && signature.join('.') === '19.13.252';
    
    if (!isHeader) throw new Error('This is not mekorama data.');
    
    // Create Instance Decode.
    const instance = new Decode(binary);
    await instance.parsing();
    return instance;
  }
  
  async parsing() {
    // Decompress using "pako.js" library.
    const level = await worker({ id: 'INFLATE', msg: this.binary.slice(4) });
    
    // Get level title.
    let index = 0;
    const titleLength = level[index++];
    const title = level.slice(index, index + titleLength);
    this.title = Convert.code2Char(title);
    
    // Get author name.
    index += titleLength;
    const authorLength = level[index++];
    const author = level.slice(index, index + authorLength);
    this.author = Convert.code2Char(author);
    
    // Get block values.
    index += authorLength;
    const flatBlocks = Array.from(level.slice(index));
    this.blocks = this.attributeAssignment(flatBlocks);
  }
  
  attributeAssignment(flatBlocks) {
    const blockSets = [];
    let idx = 0;
    while (idx < flatBlocks.length) {
      const id = flatBlocks[idx];
      const block = mekoBlocks[id];
  
      if (block.type === 3) {
        blockSets.push([id, flatBlocks[idx + 1], flatBlocks[idx + 2]]);
        idx += 3;
      } else if (block.type === 2 || block.type === 1) {
        blockSets.push([id, flatBlocks[idx + 1]]);
        idx += 2;
      } else {
        blockSets.push([id]);
        idx += 1;
      }
    }
    return blockSets;
  }
}


export class Encode {
  constructor(blocks) {
    this.blocks = blocks;
    this.encoding();
    this.qrGenerate();
  }
  
  qrGenerate() {
    // Generate QR Code using "qrcode.js" library.
    const typeNumber = 0;
    const errorCorrectionLevel = 'L';
    const qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(String.fromCharCode(...this.code));
    qr.make();
    
    const module = qr.getModuleCount();
    const maxModule = 177; /** QR version 40 **/
    const maxCell = 4;
    const qrsize = maxModule * maxCell;
    const cell = Math.round(qrsize / module);
    const margin = maxModule;
    const cvsw = qrsize + (2 * margin);
    const cvsh = qrsize + (4 * margin);
    const cvs = new OffscreenCanvas(cvsw, cvsh);
    const ctx = cvs.getContext('2d');
    ctx.save();
    ctx.translate(margin, margin);
    qr.renderTo2dContext(ctx, cell);
    ctx.restore();
    
    const title = this.titleInput.value;
    const titleX = margin;
    const titleY = cvsw;
    
    const author = this.authorInput.value;
    const authorX = margin;
    const authorY = cvsw + margin;
    
    const fontSize = margin / 2;
    ctx.fillStyle = 'black';
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(title, titleX, titleY);
    ctx.fillText(author, authorX, authorY);
    
    /*
    // Render QR Code to Canvas.
    const moduleCount = qr.getModuleCount();
    const moduleSize = 4;
    const padding = 50;
    const qrsize = (moduleCount * moduleSize) + (2 * padding);
    const [qrcvs, qrctx] = createCanvas(qrsize, qrsize, 'white');
    qrctx.save();
    qrctx.translate(padding, padding);
    qr.renderTo2dContext(qrctx, moduleSize);
    qrctx.restore();
    
    const margin = 64;
    const fontSize = 40;
    const lineHeight = 54;
    const cardWidth = 732;
    const cardHeight = cardWidth + (3 * lineHeight);
    const qrarea = cardWidth - (2 * margin);
    const [ccvs, cctx] = createCanvas(cardWidth, cardHeight, 'white');
    cctx.drawImage(qrcvs, margin, margin, qrarea, qrarea);

    // Adding Level info.
    const title = this.titleInput.value;
    const titleX = margin;
    const titleY = cardHeight - margin - lineHeight;
    
    const author = this.authorInput.value;
    const authorX = margin;
    const authorY = cardHeight - margin;
    
    cctx.fillStyle = 'black';
    cctx.font = `${fontSize}px Arial`;
    cctx.fillText(title, titleX, titleY);
    cctx.fillText(author, authorX, authorY);
    */
    // Append New QR Code Image to DOM.
    const cc = document.querySelector('.card-collector');
    const img = new Image();
    img.src = cvs.toDataURL();
    img.name = this.titleInput.value + '.png';
    img.className = 'card';
    cc.appendChild(img);
  }
  
  encoding() {
    const header = this.setHeader();
    
    this.titleInput = document.querySelector('#title-input');
    const title = Convert.char2Code(this.titleInput.value.slice(0, 16));
    
    this.authorInput = document.querySelector('#author-input');
    const author = Convert.char2Code(this.authorInput.value.slice(0, 16));
    
    const blocks = this.blocks.flat();
    const level = new Uint8Array([title.length, ...title, author.length, ...author, ...blocks]);
    
    // Compress using "pako.js" library.
    this.code = [...header, ...pako.deflate(level)];
  }
  
  setHeader() {
    //const maxId = Math.max(...this.blocks.map(block => block[0]));
    const maxId = this.blocks.reduce((max, block) => Math.max(max, block[0]), 0);

    // Mekorama header format: [x, 19, 13, 252].
    let header = [19, 13, 252];
    if (maxId > 52) {
      header.unshift(3);
    } else if (maxId > 48) {
      header.unshift(2);
    } else {
      header.unshift(1);
    }
    return header;
  }
}


export class Transform {
  constructor() {
    this.rotated = [];
    this.translated = [];
  }
  /**
    * Convert index to coordinates.
    * @param {number} index - Index array.
    */
  static index2Coords(index) {
    const x = index % 16;
    const y = Math.floor((index % 256) / 16);
    const z = Math.floor(index / 256);
    return { x, y, z };
  }
  /**
    * Convert coordinates to index.
    * @param {number} x, y, z - Coordinate value.
    */
  static coords2Index(x, y, z) {
    return x + (y * 16) + (z * 256);
  }
  /**
    * Transposes the coordinate properties (x, y, z) in-place.
    * @param {object} coords - The coordinate object {x: val1, y: val2, z: val3}. 
    * @param {string} xKey - The property key providing the new value for 'coords.x'.
    * @param {string} yKey - The property key providing the new value for 'coords.y'.
    * @param {string} zKey - The property key providing the new value for 'coords.z'.
    */
  transpose(coords, xKey, yKey, zKey) {
    const oldValues = [
      coords[xKey],
      coords[yKey],
      coords[zKey]
    ];
    
    [coords.x, coords.y, coords.z] = oldValues;
  }
  /**
    * Reverse coordinates order.
    * @param {object} coords - Coordinate x, y, z.
    * @param {string} axis - Coords properties (select coord to reverse).
    */
  reverse(coords, axis) {
    coords[axis] = 16 - 1 - coords[axis];
  }
  /**
    * Rotating blocks in 3D.
    * @param {object} blocks - Array 1D.
    * @param {string} axis - Rotate at axis 'x' / 'y' / 'z'.
    * @param {boolean} isClockwise - Rotate direction.
    */
  rotate(blocks, axis, isClockwise) {
    const orientationSets = {
      x: [
        [0, 4, 8, 12],
        [2, 14, 10, 6],
        [1, 17, 11, 21],
        [3, 23, 9, 19],
        [5, 18, 15, 20],
        [7, 22, 13, 16]
      ],
      y: [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [8, 9, 10, 11],
        [12, 13, 14, 15],
        [16, 17, 18, 19],
        [20, 21, 22, 23]
      ],
      z: [
        [0, 16, 10, 20],
        [1, 13, 9, 5],
        [2, 22, 8, 18],
        [3, 7, 11, 15],
        [4, 17, 14, 23],
        [6, 21, 12, 19]
      ]
    };
    
    const newBlocks = Array(4096).fill([0]);
    blocks.forEach((val, idx) => {
      const newVal = [...val];
      if (newVal[0] === 0) return;
      const coords = Transform.index2Coords(idx);
      const mb = mekoBlocks[newVal[0]];
      
      if (axis === 'x') {
        this.transpose(coords, 'x', 'z', 'y');
        const reverseAxis = isClockwise ? 'z' : 'y';
        this.reverse(coords, reverseAxis);
      }
      else if (axis === 'y') {
        this.transpose(coords, 'z', 'y', 'x');
        const reverseAxis = isClockwise ? 'x' : 'z';
        this.reverse(coords, reverseAxis);
      }
      else if (axis === 'z') {
        this.transpose(coords, 'y', 'x', 'z');
        const reverseAxis = isClockwise ? 'y' : 'x';
        this.reverse(coords, reverseAxis);
      }
      else return;
      
      if (mb.type & 1) {
        const orient = newVal[1];
        const orientSet = orientationSets[axis].find(set => set.includes(orient));
        const currentIndex = orientSet.indexOf(orient);
        const newIndex = isClockwise ? (currentIndex - 1 + 4) % 4 : (currentIndex + 1) % 4;
        newVal[1] = orientSet[newIndex];
      }
      
      const index = Transform.coords2Index(coords.x, coords.y, coords.z);
      newBlocks[index] = newVal;
    });
    this.rotated = newBlocks;
  }
  /**
    * Translate blocks in 3D.
    * @param {object} blocks - Array 1D.
    * @param {string} axis - Translate at axis 'x' / 'y' / 'z'.
    * @param {number} move - Signed integer.
    */
  translate(blocks, axis, move) {
    const newBlocks = Array(4096).fill([0]);
    blocks.forEach((val, idx) => {
      if (val[0] === 0) return;
      const coords = Transform.index2Coords(idx);
      coords[axis] = (coords[axis] + move) % 16;
      
      const index = Transform.coords2Index(coords.x, coords.y, coords.z);
      newBlocks[index] = val;
    });
    this.translated = newBlocks;
  }
}


export class Render {
  static TILE_SIZE = 64;
  static GRID = 16;
  
  static drawTile(ctx, value) {
    const ID = value[0];
    const mb = mekoBlocks[ID];
    
    //ctx.clearRect(0, 0, this.TILE_SIZE, this.TILE_SIZE);
    
    if (mb.type === 0) {
      const sx = mb.srcX * this.TILE_SIZE;
      const sy = mb.srcY * this.TILE_SIZE;
      const dx = 0;
      const dy = 0;
      
      ctx.drawImage(
        atlas,
        sx, sy, this.TILE_SIZE, this.TILE_SIZE,
        dx, dy, this.TILE_SIZE, this.TILE_SIZE
      );
    }
    
    else if (mb.type === 1) {
      const rule = orientationRules[mb.rule];
      const ORIENT = value[1] ? value[1] : 0;
      const index = rule[ORIENT][0];
      const transform = rule[ORIENT][1];
      
      let sx = (mb.startX + (index % mb.cols)) * this.TILE_SIZE;
      let sy = (mb.startY + Math.floor(index / mb.cols)) * this.TILE_SIZE;
      
      if (ID === 29) sy = 0;
      
      let tl = this.TILE_SIZE / 2;
      let dx = -tl;
      let dy = -tl;
      let [angle, scaleX, scaleY] = poseTemplates[transform];
      
      ctx.save();
      ctx.translate(tl, tl);
      ctx.rotate(angle);
      ctx.scale(scaleX, scaleY);
      ctx.drawImage(
        atlas,
        sx, sy, this.TILE_SIZE, this.TILE_SIZE,
        dx, dy, this.TILE_SIZE, this.TILE_SIZE
      );
      ctx.restore();
    }
    
    else if (mb.type === 2) {
      const rule = fontRules[mb.rule];
      const FONT = value[1] ? value[value.length-1] : 0;
      const index = rule[FONT];
      
      const sx = (mb.startX + (index % mb.cols)) * this.TILE_SIZE;
      const sy = (mb.startY + Math.floor(index / mb.cols)) * this.TILE_SIZE;
      const dx = 0;
      const dy = 0;
      
      ctx.drawImage(
        atlas,
        sx, sy, this.TILE_SIZE, this.TILE_SIZE,
        dx, dy, this.TILE_SIZE, this.TILE_SIZE
      );
    }
    
    else if (mb.type === 3) {
      const rule = orientationRules[mb.rule];
      const ORIENT = value[1] ? value[1] : 0;
      const index = rule[ORIENT][0];
      const transform = rule[ORIENT][1];
      
      const sx = (mb.startX + (index % mb.cols)) * this.TILE_SIZE;
      const sy = (mb.startY + Math.floor(index / mb.cols)) * this.TILE_SIZE;
      const dx = 0;
      const dy = 0;
      
      ctx.drawImage(
        atlas,
        sx, sy, this.TILE_SIZE, this.TILE_SIZE,
        dx, dy, this.TILE_SIZE, this.TILE_SIZE
      );
      
      // Attach Font
      if ([59, 60].includes(ID)) return;
      if (![2, 8, 18, 22].includes(ORIENT)) return;
      
      const ruleFont = fontRules[1];
      const FONT = value[value.length-1];
      const indexFont = ruleFont[FONT];
      
      let startX = 0;
      let startY = 14;
      if (ID === 67) startY = 12;
      
      const fontSize = this.TILE_SIZE / 2;
      const offset = fontSize / 2;
      
      const fsx = offset + ((startX + (indexFont % 32)) * this.TILE_SIZE);
      const fsy = offset + ((startY + Math.floor(indexFont / 32)) * this.TILE_SIZE);
      const fdx = -offset - 1;
      const fdy = -offset - 1;
      const angle = poseTemplates[transform][0];
      
      ctx.save();
      ctx.translate(fontSize, fontSize);
      ctx.rotate(angle);
      ctx.drawImage(
        atlas,
        fsx, fsy, fontSize, fontSize,
        fdx, fdy, fontSize + 2, fontSize + 2
      );
      ctx.restore();
    }
  }
  
  static setupLayers(layers) {
    const layerWrapper = document.querySelector('#layer-wrapper');
    const layerState = document.querySelector('#layer-state');
    
    for (let z = 0; z < this.GRID; z++) {
      const canvasSize = this.GRID * this.TILE_SIZE;
      const saveZone = 2 * this.TILE_SIZE;
      const cvs = document.createElement('canvas');
      cvs.width = canvasSize + saveZone;
      cvs.height = canvasSize + saveZone;
      cvs.dataset.z = z;
      layers.push(cvs);
      layerWrapper.appendChild(cvs);
    }
  }
  
  static clearTilesArea(cvs) {
    const ctx = cvs.getContext('2d');
    ctx.clearRect(this.TILE_SIZE, this.TILE_SIZE, cvs.width - (64*2), cvs.height - (64*2));
  }
  
  static setupEditTools() {
    const bottomBar = document.querySelector('.edit-bottombar');
    
    for (let i = 0; i < mekoBlocks.length; i += 1) {
      const div = document.createElement('div');
      const cvs = document.createElement('canvas');
      const ctx = cvs.getContext('2d');
      cvs.width = this.TILE_SIZE;
      cvs.height = this.TILE_SIZE;
      
      this.drawTile(ctx, [i]);
      
      div.appendChild(cvs);
      bottomBar.appendChild(div);
    }
    
  }
}


