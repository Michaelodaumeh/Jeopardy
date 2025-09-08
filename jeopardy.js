const API_URL = "https://rithm-jeopardy.herokuapp.com/api/";
const NUMBER_OF_CATEGORIES = 6;
const NUMBER_OF_CLUES_PER_CATEGORY = 5;
const ANSWER_TIMEOUT = 30000; // 30 seconds

let categories = [];
let activeClue = null;
let currentPlayer = 1;
let scores = {1: 0, 2: 0};
let answerTimer = null;

// DOM elements
const playButton = document.getElementById("play");
const clueModal = document.getElementById("clue-modal");
const clueText = document.getElementById("clue-text");
const playerAnswer = document.getElementById("player-answer");
const submitAnswer = document.getElementById("submit-answer");
const spinner = document.getElementById("loading-spinner");
const gameContainer = document.getElementById("game-container");
const timerDisplay = document.getElementById("timer-display");

playButton.addEventListener("click", startGame);
submitAnswer.addEventListener("click", submitPlayerAnswer);

// ============================
// Sound Effects
// ============================
function playSound(type) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
      case 'correct':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'incorrect':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
        break;
      case 'timeout':
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
        break;
    }
  } catch (error) {
    // Sound failed, continue without sound
    console.log('Sound not available');
  }
}

// ============================
// Timer Functions
// ============================
function startAnswerTimer() {
  let timeLeft = ANSWER_TIMEOUT / 1000;
  
  if (timerDisplay) {
    timerDisplay.style.display = 'block';
    timerDisplay.textContent = timeLeft;
  }
  
  answerTimer = setInterval(() => {
    timeLeft--;
    if (timerDisplay) {
      timerDisplay.textContent = timeLeft;
      timerDisplay.className = timeLeft <= 5 ? 'timer-warning' : 'timer-normal';
    }
    
    if (timeLeft <= 0) {
      clearAnswerTimer();
      playSound('timeout');
      submitPlayerAnswer(); // Auto-submit empty answer
    }
  }, 1000);
}

function clearAnswerTimer() {
  if (answerTimer) {
    clearInterval(answerTimer);
    answerTimer = null;
  }
  if (timerDisplay) {
    timerDisplay.style.display = 'none';
  }
}

// ============================
// Start or Restart Game
// ============================
async function startGame() {
  playButton.disabled = true;
  gameContainer.style.display = "none";
  spinner.style.display = "flex"; // show loading spinner

  resetScores();

  try {
    await setupGame();
    spinner.style.display = "none";
    gameContainer.style.display = "block";
  } catch (error) {
    spinner.style.display = "none";
    clueModal.classList.remove("disabled");
    clueText.innerHTML = `<span style="color:red;">⚠️ Failed to load game. Please try again later.</span>`;
    console.error("Error starting game:", error);
  }

  playButton.disabled = false;
}

// ============================
// Score Handling
// ============================
function resetScores() {
  scores = {1: 0, 2: 0};
  currentPlayer = 1;
  updateScores();
}

function updateScores() {
  document.getElementById("player1-score").innerText = `Player 1: $${scores[1]}`;
  document.getElementById("player2-score").innerText = `Player 2: $${scores[2]}`;
}

// ============================
// Fetch Data and Setup Board
// ============================
async function setupGame() {
  document.getElementById("categories").innerHTML = "";
  document.getElementById("clues").innerHTML = "";
  playButton.innerText = "Restart Game!";

  const categoryIds = await getCategoryIds();
  categories = [];

  for (let id of categoryIds) {
    const cat = await getCategoryData(id);
    categories.push(cat);
  }

  fillTable();
}

async function getCategoryIds() {
  try {
    const res = await axios.get(`${API_URL}categories?count=100`);
    const shuffled = _.shuffle(res.data);
    const ids = [];
    for (let cat of shuffled) {
      if (cat.clues_count >= NUMBER_OF_CLUES_PER_CATEGORY) ids.push(cat.id);
      if (ids.length === NUMBER_OF_CATEGORIES) break;
    }
    return ids;
  } catch (error) {
    throw new Error("Failed to fetch category IDs");
  }
}

async function getCategoryData(id) {
  try {
    const res = await axios.get(`${API_URL}category`, { params: { id } });
    const data = res.data;
    const validClues = _.shuffle(data.clues.filter(c => c.question && c.answer));
    const selected = validClues.slice(0, NUMBER_OF_CLUES_PER_CATEGORY);

    return {
      id: data.id,
      title: data.title,
      clues: selected.map((c, i) => ({
        id: c.id,
        value: c.value || (i + 1) * 100,
        question: c.question,
        answer: c.answer,
        categoryId: data.id
      }))
    };
  } catch (error) {
    throw new Error(`Failed to fetch category data for ID ${id}`);
  }
}

// ============================
// Build the Game Board
// ============================
function fillTable() {
  const thead = document.getElementById("categories");
  const tbody = document.getElementById("clues");

  // Headers
  categories.forEach(cat => {
    const th = document.createElement("th");
    th.textContent = cat.title.toUpperCase();
    thead.appendChild(th);
  });

  // Rows of clues
  for (let i = 0; i < NUMBER_OF_CLUES_PER_CATEGORY; i++) {
    const tr = document.createElement("tr");
    categories.forEach(cat => {
      const clue = cat.clues[i];
      const td = document.createElement("td");
      td.classList.add("clue");
      td.id = `cat-${cat.id}-clue-${clue.id}`;
      td.textContent = `$${clue.value.toLocaleString()}`;
      td.addEventListener("click", () => showClueModal(clue, td));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  }
}

// ============================
// Show Modal & Answer Handling
// ============================
function showClueModal(clue, td) {
  if (td.classList.contains("viewed")) return;

  td.classList.add("viewed");
  activeClue = clue;
  clueModal.classList.remove("disabled");

  clueText.innerHTML = `
    <div class="question-header">Question:</div>
    <div class="question-text">${clue.question}</div>
    <small>Player ${currentPlayer}'s turn</small>
  `;
  playerAnswer.value = "";
  playerAnswer.focus();
  
  // Show submit button and input field
  submitAnswer.style.display = "inline-block";
  playerAnswer.style.display = "block";
  
  // Start answer timer
  startAnswerTimer();
}

function submitPlayerAnswer() {
  const answer = playerAnswer.value.trim().toLowerCase();
  const correctAnswer = activeClue.answer.trim().toLowerCase();

  // Hide submit button and input field
  submitAnswer.style.display = "none";
  playerAnswer.style.display = "none";

  // Clear timer
  clearAnswerTimer();

  let resultText = "";
  if (answer === correctAnswer) {
    scores[currentPlayer] += activeClue.value;
    resultText = `<span style="color:#28a200; font-weight:bold;">Correct!</span>`;
    playSound('correct');
  } else {
    scores[currentPlayer] -= activeClue.value;
    resultText = `<span style="color:red; font-weight:bold;">Incorrect!</span><br>Correct Answer: ${activeClue.answer}`;
    playSound('incorrect');
  }

  updateScores();

  clueText.innerHTML = `${resultText}<br><small>Player ${currentPlayer}'s turn finished</small>`;

  // Switch players
  currentPlayer = currentPlayer === 1 ? 2 : 1;

  // Remove clue from category
  const catIndex = categories.findIndex(c => c.id === activeClue.categoryId);
  if (catIndex !== -1) {
    categories[catIndex].clues = categories[catIndex].clues.filter(c => c.id !== activeClue.id);
  }

  // Close modal after 2s
  setTimeout(() => {
    clueModal.classList.add("disabled");
    checkGameOver();
  }, 2000);
}

// ============================
// Game Over
// ============================
function checkGameOver() {
  const gameOver = categories.every(c => c.clues.length === 0);
  if (gameOver) {
    clueModal.classList.remove("disabled");
    
    // Determine winner
    const winner = scores[1] > scores[2] ? 1 : 
                   scores[2] > scores[1] ? 2 : null;
    
    // Hide submit button and input
    submitAnswer.style.display = "none";
    playerAnswer.style.display = "none";
    
    // Show game over with winner announcement
    clueText.innerHTML = `
      <div class="game-over">
        <h2>🎉 Game Over!</h2>
        <div class="final-scores">
          <div class="final-score ${winner === 1 ? 'winner' : ''}">
            Player 1: $${scores[1].toLocaleString()}
          </div>
          <div class="final-score ${winner === 2 ? 'winner' : ''}">
            Player 2: $${scores[2].toLocaleString()}
          </div>
        </div>
        ${winner ? `<div class="winner-announcement">Player ${winner} Wins!</div>` : `<div class="winner-announcement">It's a Tie!</div>`}
      </div>
    `;
    
    // Show restart button after 2 seconds
    setTimeout(() => {
      clueText.innerHTML += `
        <div class="restart-section">
          <button id="restart-game-btn" class="restart-button">Play Again!</button>
        </div>
      `;
      
      // Add event listener to restart button
      document.getElementById('restart-game-btn').addEventListener('click', () => {
        clueModal.classList.add("disabled");
        startGame();
      });
    }, 2000);
  }
}