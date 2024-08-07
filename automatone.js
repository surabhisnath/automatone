class Board
{
  constructor(x, y, size, tones, lifecycle, boardsize, octaveOffset, onComplete, synth, number, rule, ic, neigh, tot)
  {
    this.x = x;
    this.y = y;
    this.offset = 30;
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
    this.number = number;
    this.rule = rule;
    this.IC = ic;
    this.neigh = neigh;
    this.tot = tot;
    this.pixelBoardSize = this.size * this.boardsize + this.offset * 2;

    const binary = rule.toString(2);
    const l = binary.length;
    const powers = [];

    for (let i = 0; i < binary.length; i++) {
        if (binary[i] === '1') {
            powers.push(l - 1 - i);
        }
    }
    this.powers = powers;
    this.createBoard();
  }

  createBoard() {
    for (let i = 0; i < this.boardsize; i++) 
    {
      this.board.push([]);
      for (let j = 0; j < this.boardsize; j++) 
      {
        let state;
        if (this.IC == 2)
        { 
          state = Math.round(Math.random() % 1);
        }
        else if (this.IC == 1)      // make single centred starting
        {
          if ((i == Math.floor(this.boardsize/2)) && (j == Math.floor(this.boardsize/2))) state = 1;
          else state = 0;
        }

        let tone = this.tones[j % this.tones.length];
        let octave = Math.floor(j / this.tones.length);
        const cell = new Cell(i * this.size, j * this.size, this.size, this, tone + (octave + this.octaveOffset), state, this.lifecycle / 30, this.synth);
        this.board[i].push(cell);
        this.cells.push(cell);
      }
    }
  }

  neighbourhoodSum(i, j) 
  {
      let sum = 0;
      let tuples = [];

      if (this.neigh == 9) 
      {
          if (this.tot == 1) {
              tuples = [
                  [i, j], [i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1], 
                  [i + 1, j + 1], [i + 1, j - 1], [i - 1, j + 1], [i - 1, j - 1]
              ];
          } else if (this.tot == 0) {
              tuples = [
                  [i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1], 
                  [i + 1, j + 1], [i + 1, j - 1], [i - 1, j + 1], [i - 1, j - 1]
              ];
          }
      } else if (this.neigh == 5) {
          if (this.tot == 1) {
              tuples = [
                  [i, j], [i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]
              ];
          } else if (this.tot == 0) {
              tuples = [
                  [i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]
              ];
          }
      }

      for (const t of tuples) {
          if (t[0] >= 0 && t[0] < this.boardsize && t[1] >= 0 && t[1] < this.boardsize) {
              sum += this.board[t[0]][t[1]].state > 0 ? 1 : 0;
          }
      }

      return sum;
  }

  calculateNewState(x, y) {
    let neighsum = this.neighbourhoodSum(x, y);
    let currentState = this.board[x][y].state;
    let checkinpow;

    if (this.tot == 1)
    {
      checkinpow = neighsum;
      if (this.powers.includes(checkinpow))
      {
        this.board[x][y].newState = 1;
      }
    }
    else if (this.tot == 0)
    {
        checkinpow = 2 * neighsum + currentState;
        if (this.powers.includes(checkinpow))
        {
          this.board[x][y].newState = 1;
        }
    }
  }

  draw()
  {
    push();
    translate(this.x, this.y);
    noStroke();
    fill("#ffffff");
    rect(0, 0, this.pixelBoardSize, this.pixelBoardSize);

    fill("#000000");
    text(this.name, 0, 0, this.pixelBoardSize, this.size * 2);
    for (let j = 0; j < this.boardsize; j++) {
      let tone = this.tones[j % this.tones.length];
      let octave = Math.floor(j / this.tones.length);
      let val = tone + (octave + this.octaveOffset);
      text(val, 0, (j + 1) * this.size, this.size * 2, this.size * 2);
    }

    translate(this.size/1.1, this.size/1.5);
    fill("#808080");
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
    if (this.count === this.lifecycle * this.boardsize) {
      this.count = 0;
      this.currentIndex = 0;
      if (this.onComplete) {
        this.onComplete();
      }
    }
    if (this.count === 0) 
    {
      for (let i = 0; i < this.boardsize; i++) {
        for (let j = 0; j < this.boardsize; j++) 
        {
          this.calculateNewState(i, j);
        }
      }

      for (let i = 0; i < this.board.length; i++) {
        for (let j = 0; j < this.board[i].length; j++) {
          this.board[i][j].state = this.board[i][j].newState;
          this.board[i][j].newState = 0;
        }
      }
    }
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
    this.newState = 0;
    this.toneLength = toneLength;
    this.synth = synth;
    this.wasChanged = false;
  }

  draw() {
    if (this.state === 0) {
      push();
      translate(this.x, this.y);
      stroke("#808080");
      fill("#ffffff");
      rect(0, 0, this.size, this.size);
      pop();
    } else {
      push();
      translate(this.x, this.y);
      stroke("#808080");
      fill("#000000");
      rect(0, 0, this.size, this.size);
      pop();
    }
  }

  play() {
    this.synth.triggerAttackRelease(this.note, this.toneLength);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////

let synth;
let recorder;
let isRunning = false;
let boards = [];
let size;

function setup() {
  recorder = new Tone.Recorder();
  const vol = new Tone.Volume(-12).connect(recorder).toDestination();
  const filter = new Tone.Filter({
    frequency: 1100,
    rolloff: -12,
  }).connect(vol);

  const pianoOptions = {
    oscillator: {
      partials: [1, 2, 1],
    },
    portamento: 0.05,
  };
  synth = new Tone.PolySynth(Tone.Synth, pianoOptions).connect(filter);
  synth.maxPolyphony = 100;

  createCanvas(innerWidth, innerHeight);
  frameRate(50);
  setupBoards();
}

function windowResized() {
  resizeCanvas(innerWidth, innerHeight);
  setupBoards();
}

function getFormValues() {
  const boardsize = parseInt(document.getElementById('boardsize').value);
  const num_boards = parseInt(document.getElementById('num_boards').value);
  const rule = parseInt(document.getElementById('rule').value);
  const tot = parseInt(document.getElementById('tot').value);
  const neigh = parseInt(document.getElementById('neigh').value);
  const tone = document.getElementById('tone').value.split(',');
  const ic = parseInt(document.getElementById('ic').value);

  return { boardsize, num_boards, rule, tot, neigh, tone, ic };
}

function setupBoards() {
  const { boardsize, num_boards, rule, tot, neigh, tone, ic } = getFormValues();

  boards = [];

  if (num_boards < 3) {
    size = height / ((boardsize + 2) * num_boards + 2);
  } else {
    size = width / ((boardsize + 2) * num_boards + 2);
  }

  for (let i = 0; i < num_boards; i++) {    
      boards.push(new Board(0, 0, size, tone, 10 * (i + 1), boardsize, (7 - i), null, synth, i + 1, rule, ic, neigh, tot));
  }

  centerBoards();
}

function centerBoards() {
  const { boardsize, num_boards } = getFormValues();
  const boardSize = size * (boardsize + 1);
  for (let index in boards) {
    let board = boards[index];
    board.x = (width - boardSize * num_boards - size * (num_boards - 1)) / 2 + index * (boardSize + size);
    // board.y = (height - boardSize) / 2;
  }
}

function resetBoards() {
  setupBoards();
}

function toggleStart() {
  isRunning = !isRunning;
  const startButton = document.getElementById('startButton');
  if (isRunning) {
    startButton.innerText = "Stop";
    Tone.Transport.start();
  } else {
    startButton.innerText = "Start";
    Tone.Transport.stop();
  }
}

function draw() {
  background("#ffffff");

  for (let board of boards) {
    board.draw();
  }

  if (isRunning) {
    for (let board of boards) {
      board.update();
    }
  }
}