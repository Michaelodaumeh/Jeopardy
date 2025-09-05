const API_URL = "https://rithm-jeopardy.herokuapp.com/api/";
const NUMBER_OF_CATEGORIES = 6;
const NUMBER_OF_CLUES_PER_CATEGORY = 5;

let categories = [];
let activeClue = null;
let currentPlayer = 1;
let scores = {1: 0, 2: 0};

// DOM elements
const playButton = document.getElementById("play");
const clueModal = document.getElementById("clue-modal");
const clueText = document.getElementById("clue-text");
const playerAnswer = document.getElementById("player-answer");
const submitAnswer = document.getElementById("submit-answer");
const spinner = document.getElementById("loading-spinner");
const gameContainer = document.getElementById("game-container");

playButton.addEventListener("click", startGame);
submitAnswer.addEventListener("click", submitPlayerAnswer);

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
      td.textContent = clue.value;
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

  clueText.innerHTML = `<b>Question:</b> ${clue.question}<br><small>Player ${currentPlayer}'s turn</small>`;
  playerAnswer.value = "";
  playerAnswer.focus();
}

function submitPlayerAnswer() {
  const answer = playerAnswer.value.trim().toLowerCase();
  const correctAnswer = activeClue.answer.trim().toLowerCase();

  let resultText = "";
  if (answer === correctAnswer) {
    scores[currentPlayer] += activeClue.value;
    resultText = `<span style="color:#28a200; font-weight:bold;">Correct!</span>`;
  } else {
    scores[currentPlayer] -= activeClue.value;
    resultText = `<span style="color:red; font-weight:bold;">Incorrect!</span><br>Correct Answer: ${activeClue.answer}`;
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
    clueText.innerHTML = `<b>🎉 Game Over!</b><br>
      Player 1: $${scores[1]}<br>
      Player 2: $${scores[2]}<br>
      Click Restart Game to play again.`;
  }
}
