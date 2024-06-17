// let polySynth;
let synth;
let chorusSynth;
let sineSynth;
let sawSynth;
let bassSynth;
let recorder;

function setup() {
  // recorder = new Tone.Recorder({ mimeType: "audio/mp4" });
  recorder = new Tone.Recorder();
  // mimics the autoplay policy
  // getAudioContext().suspend();
  const vol = new Tone.Volume(-12).connect(recorder).toDestination();
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

  createCanvas(innerWidth, innerHeight);
  frameRate(30);
  background(0, 0, 0);

  setupBoards();
}

window.addEventListener("resize", () => {
  resizeCanvas(innerWidth, innerHeight);
  centerBoards();
});

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
    synth,
    name
  ) {
    this.x = x;
    this.y = y;
    this.offset = 20;
    this.size = size;
    this.tones = tones;
    this.cells = [];
    this.board = [];
    this.lifecycle = lifecycle;
    this.count = 0;
    this.boardsize = boardsize;
    this.octaveOffset = octaveOffset;
    this.currentIndex = 0;
    this.onComplete = onComplete;
    this.synth = synth;
    this.name = name;
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
        // console.log(octave);
        const cell = new Cell(
          i * this.size,
          j * this.size,
          this.size,
          this,
          tone + (octave + this.octaveOffset),
          state,
          this.lifecycle / 30,
          this.synth
        );
        this.board[i].push(cell);
        this.cells.push(cell);
      }
    }
  }

  calculateNewState(x, y) {
    // count neighbour cells
    let startX = Math.max(0, x - 1);
    let startY = Math.max(0, y - 1);
    let endX = Math.min(this.board.length, x + 2);
    let endY = Math.min(this.board[x].length, y + 2);
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
    text(this.name, 0, 0, this.pixelBoardSize, this.size * 2);
    for (let j = 0; j < this.boardsize; j++) {
      let tone = this.tones[j % this.tones.length];
      let octave = Math.floor(j / this.tones.length);
      let val = tone + (octave + this.octaveOffset);
      text(val, 0, (j + 1) * this.size, this.size * 2, this.size * 2);
    }

    translate(this.offset, this.offset);
    fill("#08f7fe");
    rect(
      (this.currentIndex - 1) * this.size,
      this.size * this.board.length,
      this.size
    );

    for (let cell of this.cells) {
      cell.draw();
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

class Cell {
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
      stroke("#08f7fe");
      fill("#ff2079");
      rect(0, 0, this.size, this.size);
      pop();
    } else {
      push();
      translate(this.x, this.y);
      stroke("#08f7fe");
      fill("#33135c");
      rect(0, 0, this.size, this.size);
      pop();
    }
  }

  play() {
    this.synth.triggerAttackRelease(this.note, this.toneLength);
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

class Button {
  constructor(x, y, title, onClick) {
    this.x = x;
    this.y = y;
    this.width = 120;
    this.height = 40;
    this.title = title;
    this.onClick = onClick;
  }

  draw() {
    push();
    translate(this.x, this.y);
    noStroke();
    textAlign(CENTER);
    textSize(18);
    fill("#33135c");
    rect(0, 0, this.width, this.height);
    fill("#fffb96");
    text(this.title, 0, this.height / 4, this.width, this.height);
    pop();
  }

  click() {
    if (this.hitTest(mouseX, mouseY)) {
      this.onClick();
    }
  }

  hitTest(x, y) {
    return (
      x > this.x &&
      x < this.x + this.width &&
      y > this.y &&
      y < this.y + this.height
    );
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
let screenshotCounter = 1;

function takeScreenshot() {
  setTimeout(() => {
    isRunning = false;
    saveCanvas(`AutomaTone_${screenshotCounter}.png`);
    screenshotCounter++;
  }, 1000);
}

let boards = [];
const startButton = new Button(0, 0, "Start", () => {
  isRunning = !isRunning;
  if (isRunning) {
    startButton.title = "Stop";
    // takeScreenshot();
    /*recorder.start();
    setTimeout(async () => {
      // the recorded audio is returned as a blob
      const recording = await recorder.stop();
      // download the recording by creating an anchor element and blob url
      const url = URL.createObjectURL(recording);
      const anchor = document.createElement("a");
      anchor.download = "recording.webm";
      anchor.href = url;
      anchor.click();

      isRunning = false;
    }, 16000);*/
  } else {
    startButton.title = "Start";
  }
});

// Draw intial start field
// Change volume per board
// Change filter/effect per board
// Change instrument/Synth per board
// Static forms reset
// Different aspect ratio for boards

function centerBoards() {
  const boardSize = size * 10;
  const numBoards = boards.length;
  for (let index in boards) {
    let board = boards[index];
    board.x =
      (width - boardSize * numBoards - size * (numBoards - 1)) / 2 +
      index * (boardSize + size);
    board.y = (height - boardSize) / 2;
  }
}

function setupBoards() {
  let board1 = new Board(
    0,
    0,
    size,
    toneX,
    120,
    8,
    3,
    () => {
      return;
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
    bassSynth,
    "Board 1"
  );
  boards.push(board1);

  let board2 = new Board(200, 0, size, toneX, 30, 8, 5, null, synth, "Board 2");
  boards.push(board2);

  let board3 = new Board(400, 0, size, toneX, 15, 8, 6, null, synth, "Board 3");
  boards.push(board3);

  let board4 = new Board(600, 0, size, toneX, 5, 8, 7, null, synth, "Board 4");
  boards.push(board4);

  centerBoards();
}

let isRunning = false;
let isToneStarted = false;

function draw() {
  background("#1a1c2c");

  startButton.x = (width - startButton.width) / 2;
  startButton.y = height - startButton.height - 20;
  startButton.draw();

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
  startButton.click();
  if (!isToneStarted) {
    Tone.start();
    isToneStarted = true;
  }
  // if (!isRunning) {
  boards.forEach((board) => {
    board.cells.forEach((cell) => {
      cell.click();
    });
  });
  // }
}

function touchEnded() {
  mouseClicked();
}

function mouseDragged() {
  let cellHit = false;
  boards.forEach((board) => {
    board.cells.forEach((cell) => {
      let hit = cell.click();
      if (hit) {
        cellHit = hit;
      }
    });
  });
  /*
  if (!cellHit) {
    boards.forEach((board) => {
      if (board.hitTest(mouseX, mouseY)) {
        board.x += movedX;
        board.y += movedY;
      }
    });
  }*/
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
