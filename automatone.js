// let polySynth;
let synth;
let chorusSynth;
let sineSynth;
let sawSynth;
let bassSynth;

function setup() {
  // mimics the autoplay policy
  // getAudioContext().suspend();
  const vol = new Tone.Volume(-12).toDestination();
  // const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(vol).start();
  const filter = new Tone.Filter({
    frequency: 1100,
    rolloff: -12,
  }).connect(vol);

  const chorusVol = new Tone.Volume(-10).toDestination();
  const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(chorusVol).start();
  const chorusFilter = new Tone.Filter({
    frequency: 1100,
    rolloff: -12,
  }).connect(chorus);
  // const osc = new Tone.Oscillator().connect(vol).start();
  // synth = new Tone.Synth().toDestination();
  // synth = new Tone.PolySynth().toDestination();
  const options = {
    oscillator: {
      type: "sine",
    },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 1,
    },
  };
  const options2 = {
    oscillator: {
      type: "sawtooth",
    },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0.3,
      release: 2,
    },
  };
  sineSynth = new Tone.PolySynth(Tone.Synth, options).connect(filter);
  sineSynth.maxPolyphony = 100;
  sawSynth = new Tone.PolySynth(Tone.Synth, options2).connect(filter);
  sawSynth.maxPolyphony = 100;
  // synth = new Tone.Synth(options2).connect(filter);
  const pianoOptions = {
    // volume: -8,
    oscillator: {
      partials: [1, 2, 1],
    },
    portamento: 0.05,
  };
  synth = new Tone.PolySynth(Tone.Synth, pianoOptions).connect(filter);
  synth.maxPolyphony = 100;
  // polySynth = new p5.PolySynth(p5.MonoSynth, 50);
  chorusSynth = new Tone.PolySynth(Tone.Synth).connect(chorusFilter);
  chorusSynth.maxPolyphony = 100;

  // const bassOptions = {
  //   oscillator: {
  //     type: "fmsawtooth",
  //     modulationType: "triangle",
  //   },
  // };
  const bassOptions = {
    envelope: {
      sustain: 0,
      attack: 0.02,
      decay: 0.8,
    },
    octaves: 10,
  };
  const bassOptions2 = {
    // volume: -10,
    envelope: {
      attack: 0.1,
      decay: 0.3,
      release: 2,
    },
    filterEnvelope: {
      attack: 0.001,
      decay: 0.01,
      sustain: 0.5,
      baseFrequency: 200,
      octaves: 2.6,
    },
  };
  const bassOptions3 = {
    vibratoAmount: 0.1,
    harmonicity: 1.5,
    voice0: {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.05,
      },
    },
    voice1: {
      oscillator: {
        type: "triangle",
      },
      envelope: {
        attack: 0.05,
      },
    },
  };
  const bass = new Tone.Gain(0.8).connect(vol);
  let distortion = new Tone.Distortion(0.8).connect(bass);
  distortion.wet = 0.2;
  //DuoSynth, single chord
  bassSynth = new Tone.PolySynth(Tone.Synth, bassOptions2).connect(vol);
  bassSynth.maxPolyphony = 16;

  createCanvas(1000, 800);
  frameRate(60);
  background(0, 0, 0);

  setupBoards();
}

class Board {
  constructor(
    x,
    y,
    size,
    tones,
    lifecycle,
    boardsize,
    octaveOffset,
    onComplete,
    synth
  ) {
    this.x = x;
    this.y = y;
    this.offset = 20;
    this.size = size;
    this.tones = tones;
    this.fields = [];
    this.board = [];
    this.lifecycle = lifecycle;
    this.count = 0;
    this.boardsize = boardsize;
    this.octaveOffset = octaveOffset;
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.synth = synth;
    this.pixelBoardSize = this.size * this.boardsize + this.offset * 2;
    this.createBoard();
  }

  createBoard() {
    for (let i = 0; i < this.boardsize; i++) {
      this.board.push([]);
      for (let j = 0; j < this.boardsize; j++) {
        let state = Math.round(Math.random() % 1);
        // state = 0;
        let tone = this.tones[j % this.tones.length];
        let octave = Math.floor(j / this.tones.length);
        console.log(octave);
        const field = new Field(
          i * this.size,
          j * this.size,
          this.size,
          this,
          tone + (octave + this.octaveOffset),
          state,
          this.lifecycle / 60,
          this.synth
        );
        this.board[i].push(field);
        this.fields.push(field);
      }
    }
  }

  calculateNewState(x, y) {
    // count neighbour cells
    let startX = Math.max(0, x - 1);
    let startY = Math.max(0, y - 1);
    let endX = Math.min(this.board.length, x + 2);
    let endY = Math.min(this.board[x].length, y + 2);
    // console.log(startX + " " + startY + " " + endX + " " + endY);
    let values = [];
    for (let i = startX; i < endX; i++) {
      let cells = this.board[i].slice(startY, endY);
      values = values.concat(cells);
    }
    // filter for 1/0
    let liveCells = values.filter((cell) => cell.state === 1);
    let currentState = this.board[x][y].state;
    if (liveCells.length === 3) {
      this.board[x][y].newState = 1;
    } else if (liveCells.length === 4) {
      this.board[x][y].newState = currentState;
    } else {
      this.board[x][y].newState = 0;
    }
    // 2 = 0
    // 4 = same
    // 3 = 1
    // >5 = 0
  }

  calculateLiving() {
    let flat = this.board.flat();
    let mapped = flat.map((cell) => cell.state);
    let living = mapped.reduce((acc, cur) => acc + cur);
    return living;
  }

  draw() {
    push();
    translate(this.x, this.y);
    noStroke();
    fill("#33135c");
    rect(0, 0, this.pixelBoardSize, this.pixelBoardSize);

    fill("#fffb96");
    for (let j = 0; j < this.boardsize; j++) {
      let tone = this.tones[j % this.tones.length];
      let octave = Math.floor(j / this.tones.length);
      let val = tone + (octave + this.octaveOffset);
      text(val, 0, (j + 1) * this.size, this.size, this.size);
    }

    translate(this.offset, this.offset);
    fill("#08f7fe");
    rect(
      (this.currentIndex - 1) * this.size,
      this.size * this.board.length,
      this.size
    );

    for (let field of this.fields) {
      field.draw();
    }
    pop();
  }

  update() {
    if (this.count === this.lifecycle * this.currentIndex) {
      for (let j = 0; j < this.board[this.currentIndex].length; j++) {
        if (this.board[this.currentIndex][j].state === 1) {
          this.board[this.currentIndex][j].play();
        }
      }
      this.currentIndex++;
    }
    this.count++;
    if (this.count === this.lifecycle * this.board.length) {
      this.count = 0;
      this.currentIndex = 0;
      if (this.onComplete) {
        this.onComplete();
      }
    }
    if (this.count === 0) {
      for (let i = 0; i < this.board.length; i++) {
        for (let j = 0; j < this.board[i].length; j++) {
          // this.board[i][j].draw();
          this.calculateNewState(i, j);
        }
      }
      this.calculateLiving();

      for (let i = 0; i < this.board.length; i++) {
        for (let j = 0; j < this.board[i].length; j++) {
          this.board[i][j].state = this.board[i][j].newState;
        }
      }
    }
  }

  hitTest(x, y) {
    return (
      x > this.x &&
      x < this.x + this.pixelBoardSize &&
      y > this.y &&
      y < this.y + this.pixelBoardSize
    );
  }
}

class Field {
  constructor(x, y, size, board, note, state, toneLength, synth) {
    this.x = x;
    this.y = y;
    this.parent = board;
    this.size = size;
    this.note = note;
    this.state = state;
    this.newState = -1;
    this.toneLength = toneLength;
    this.synth = synth;
    this.wasChanged = false;
  }

  draw() {
    if (this.state === 0) {
      push();
      translate(this.x, this.y);
      fill("#ff2079");
      rect(0, 0, this.size, this.size);
      pop();
    }
  }

  play() {
    // polySynth.play(this.note, 0.5, 0, 0.5);
    // polySynth.play(this.note, 0.5, 0);
    this.synth.triggerAttackRelease(this.note, this.toneLength);
    // sineSynth.triggerAttackRelease(this.note, this.toneLength);
    // sawSynth.triggerAttackRelease(this.note, this.toneLength);
    // synth.triggerAttackRelease(this.note, 1 + Math.floor(Math.random() * 4) + "n");
  }

  click() {
    let hit = this.hitTest(mouseX, mouseY);
    if (!this.wasChanged && hit) {
      this.wasChanged = true;
      // this.play();
      if (this.state === 0) {
        this.state = 1;
      } else {
        this.state = 0;
      }
    } else if (this.wasChanged && !hit) {
      this.wasChanged = false;
    }
    return hit;
  }

  hitTest(x, y) {
    let posX = this.x + this.parent.x + this.parent.offset;
    let posY = this.y + this.parent.y + this.parent.offset;
    return x > posX && x < posX + this.size && y > posY && y < posY + this.size;
  }
}

// C D E G A

// let toneX = ["C", "D", "E", "G", "A"];
let toneX = ["C", "D", "E", "G", "A"];
let toneY = ["A", "B", "C", "E", "F"];
let toneZ = ["F", "G", "A", "C", "D"];
let toneXX = ["C", "F", "G"];
let tone = ["B#", "D", "F", "G", "A"];
// let fields = [];
const size = 20;

let boards = [];

// Draw intial start field
// Change volume per board
// Change filter/effect per board
// Change instrument/Synth per board
// Static forms reset
// Different aspect ratio for boards

function setupBoards() {
  console.log(synth);
  //toneX
  let board1 = new Board(
    0,
    0,
    size,
    toneX,
    120,
    8,
    3,
    () => {
      // boards.forEach((board) => {
      //   board.tones = toneY;
      //   for (let i = 0; i < board.board.length; i++) {
      //     for (let j = 0; j < board.board[i].length; j++) {
      //       let tone = board.tones[j % board.tones.length];
      //       let octave = Math.floor(j / board.tones.length);
      //       board.board[i][j].tone = tone + (octave + board.octaveOffset);
      //     }
      //   }
      // });
      board1.tones = toneY;
      for (let i = 0; i < board1.board.length; i++) {
        for (let j = 0; j < board1.board[i].length; j++) {
          let tone = board1.tones[j % board1.tones.length];
          let octave = Math.floor(j / board1.tones.length);
          board1.board[i][j].note = tone + (octave + board1.octaveOffset);
        }
      }
    },
    bassSynth
  );
  boards.push(board1);

  let board2 = new Board(200, 0, size, toneX, 30, 8, 5, null, synth);
  boards.push(board2);

  let board3 = new Board(400, 0, size, toneX, 15, 8, 6, null, synth);
  boards.push(board3);

  let board4 = new Board(600, 0, size, toneX, 5, 8, 7, null, synth);
  boards.push(board4);
}

let isRunning = false;
let isToneStarted = false;

function draw() {
  // background(0, 0, 0);
  background("#1a1c2c");

  rect(0, 220, 100, 80);

  for (let board of boards) {
    board.draw();
  }

  if (isRunning) {
    for (let board of boards) {
      board.update();
    }
  }
}

/*
Neon Pink: #ff2079
Neon Blue: #08f7fe
Neon Green: #07f49e
Bright Yellow: #fffb96
Dark Purple: #33135c
*/

function mouseClicked() {
  if (mouseX > 0 && mouseX < 100 && mouseY > 220 && mouseY < 300) {
    isRunning = true;
  }
  if (!isToneStarted) {
    Tone.start();
    isToneStarted = true;
  }
  // if (!isRunning) {
  boards.forEach((board) => {
    board.fields.forEach((field) => {
      field.click();
    });
  });
  // }
}

function mouseDragged() {
  let fieldHit = false;
  boards.forEach((board) => {
    board.fields.forEach((field) => {
      let hit = field.click();
      if (hit) {
        fieldHit = hit;
      }
    });
  });

  if (!fieldHit) {
    boards.forEach((board) => {
      if (board.hitTest(mouseX, mouseY)) {
        board.x += movedX;
        board.y += movedY;
      }
    });
  }
  return false;
}

// function mouseDragged() {
//   if (!isRunning) {
//     boards.forEach((board) => {
//       board.fields.forEach((field) => {
//         field.click();
//       });
//     });
//   }
// }
