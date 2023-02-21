// let polySynth;
let synth;
let chorusSynth;
let sineSynth;
let sawSynth;

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
  synth = new Tone.PolySynth(Tone.Synth).connect(filter);
  synth.maxPolyphony = 100;
  // polySynth = new p5.PolySynth(p5.MonoSynth, 50);
  chorusSynth = new Tone.PolySynth(Tone.Synth).connect(chorusFilter);
  chorusSynth.maxPolyphony = 100;

  createCanvas(800, 300);
  frameRate(60);
  background(0, 0, 0);

  setupBoards();
}

class Board {
  constructor(x, y, size, tones, lifecycle, boardsize, octaveOffset, onComplete, synth) {
    this.x = x;
    this.y = y;
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
    this.createBoard();
  }

  createBoard() {
    for (let i = 0; i < this.boardsize; i++) {
      this.board.push([]);
      for (let j = 0; j < this.boardsize; j++) {
        let state = Math.round(Math.random() % 1);
        let tone = this.tones[j % this.tones.length];
        let octave = Math.floor(j / this.tones.length);
        console.log(octave);
        const field = new Field(
          this.x + i * this.size,
          j * this.size,
          this.size,
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
    fill(128, 128, 0);
    rect(this.x + (this.currentIndex - 1) * this.size, this.size * this.board.length, this.size);

    for (let field of this.fields) {
      field.draw();
    }
  }

  update() {
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
  }
}

class Field {
  constructor(x, y, size, note, state, toneLength, synth) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.note = note;
    this.state = state;
    this.newState = -1;
    this.toneLength = toneLength;
    this.synth = synth;
  }

  draw() {
    push();
    translate(this.x, this.y);
    if (this.state === 0) {
      fill(255, 255, 255);
    } else {
      fill(0, 0, 0);
    }
    rect(0, 0, this.size, this.size);
    pop();
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
    if (this.hitTest(mouseX, mouseY)) {
      this.play();
    }
  }

  hitTest(x, y) {
    return x > this.x && x < this.x + this.size && y > this.y && y < this.y + this.size;
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
    synth
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

function draw() {
  background(0, 0, 0);

  for (let board of boards) {
    board.draw();
  }

  if (isRunning) {
    for (let board of boards) {
      board.update();
    }
  }
}

function mouseClicked() {
  isRunning = true;
  Tone.start();
}
