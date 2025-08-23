// You only need to touch comments with the todo of this file to complete the assignment!

/*
=== How to build on top of the starter code? ===

Problems have multiple solutions.
We have created a structure to help you on solving this problem.
On top of the structure, we created a flow shaped via the below functions.
We left descriptions, hints, and to-do sections in between.
If you want to use this code, fill in the to-do sections.
However, if you're going to solve this problem yourself in different ways, you can ignore this starter code.
 */

/*
=== Terminology for the API ===

Clue: The name given to the structure that contains the question and the answer together.
Category: The name given to the structure containing clues on the same topic.
 */

/*
=== Data Structure of Request the API Endpoints ===

/categories:
[
  {
    "id": <category ID>,
    "title": <category name>,
    "clues_count": <number of clues in the category where each clue has a question, an answer, and a value>
  },
  ... more categories
]

/category:
{
  "id": <category ID>,
  "title": <category name>,
  "clues_count": <number of clues in the category>,
  "clues": [
    {
      "id": <clue ID>,
      "answer": <answer to the question>,
      "question": <question>,
      "value": <value of the question (be careful not all questions have values) (Hint: you can assign your own value such as 200 or skip)>,
      ... more properties
    },
    ... more clues
  ]
}
 */

const API_URL = "https://rithm-jeopardy.herokuapp.com/api/"; // The URL of the API.
const NUMBER_OF_CATEGORIES = 6; // The number of categories you will be fetching. You can change this number.
const NUMBER_OF_CLUES_PER_CATEGORY = 5; // The number of clues you will be displaying per category. You can change this number.

let categories = []; // The categories with clues fetched from the API.
/*
[
  {
    "id": <category ID>,
    "title": <category name>,
    "clues": [
      {
        "id": <clue ID>,
        "value": <value (e.g. $200)>,
        "question": <question>,
        "answer": <answer>
      },
      ... more categories
    ]
  },
  ... more categories
]
 */

let activeClue = null; // Currently selected clue data.
let activeClueMode = 0; // Controls the flow of #active-clue element while selecting a clue, displaying the question of selected clue, and displaying the answer to the question.
/*
0: Empty. Waiting to be filled. If a clue is clicked, it shows the question (transits to 1).
1: Showing a question. If the question is clicked, it shows the answer (transits to 2).
2: Showing an answer. If the answer is clicked, it empties (transits back to 0).
 */

let isPlayButtonClickable = true; // Only clickable when the game haven't started yet or ended. Prevents the button to be clicked during the game.

//Attach an event listener to the play button
// When the button is clicked, run the function handleClickOfPlay
document.getElementById("play").addEventListener("click", handleClickOfPlay);

document.getElementById("active-clue").addEventListener("click", handleClickOfActiveClue);
/**
 * Manages the behavior of the play button (start or restart) when clicked.
 * Sets up the game.
 *
 * Hints:
 * - Sets up the game when the play button is clickable.
 */
async function handleClickOfPlay ()
{
  // todo set the game up if the play button is clickable
  if (!isPlayButtonClickable) {return;} // If the button is not clickable, do nothing


  isPlayButtonClickable = false; // Set the button to not clickable to prevent multiple clicks
  document.getElementById("play").classList.add("disabled"); // Disable the button visually
   await setupTheGame();
};

/**
 * Sets up the game.
 *
 * 1. Cleans the game since the user can be restarting the game.
 * 2. Get category IDs
 * 3. For each category ID, get the category with clues.
 * 4. Fill the HTML table with the game data.
 *
 * Hints:
 * - The game play is managed via events.
 */
async function setupTheGame ()
{
  // todo show the spinner while setting up the game

  // The spinner is a small loading icon that lets the player know
  // the game is preparing data.
  document.getElementById("spinner").classList.remove("disabled");

  // todo reset the DOM (table, button text, the end text)

   // clear any messages)
  // Clear the table headers (categories)
  document.getElementById("categories").innerHTML = "";

  // Clear the table body (clues)
  document.getElementById("clues").innerHTML = "";

  // Reset the "active clue" area (where questions/answers show up)
  document.getElementById("active-clue").innerHTML = "";

  // Change the play button text to "Restart Game" 
  document.getElementById("play").innerText = "Restart Game";

  // todo fetch the game data (categories with clues)

  //  Fetch the game data (categories with clues)
  //  First get random category IDs from the API
  const categoryIds = await getCategoryIds();

  //  For each category ID, fetch the category and its clues
   categories = [];
  for (let id of categoryIds) {
    const catData = await getCategoryData(id);
    categories.push(catData);
  }

  // todo fill the table

 // Fill the table with the new game data
 fillTable(categories);

 // 5. Hide the spinner again since setup is finished
 document.getElementById("spinner").classList.add("disabled");
};

/**
 * Gets as many category IDs as in the `NUMBER_OF_CATEGORIES` constant.
 * Returns an array of numbers where each number is a category ID.
 *
 * Hints:
 * - Use /categories endpoint of the API.
 * - Request as many categories as possible, such as 100. Randomly pick as many categories as given in the `NUMBER_OF_CATEGORIES` constant, if the number of clues in the category is enough (<= `NUMBER_OF_CLUES` constant).
 */
async function getCategoryIds ()
{
   // todo set after fetching
  const res = await axios.get(`${API_URL}categories?count=100`);
    // The response data is an array of category objects.
  const allCategories = res.data;

  // todo fetch NUMBER_OF_CATEGORIES amount of categories

//  Shuffle categories so the selection is random
  // We use lodash _.shuffle() for randomizing
  const shuffled = _.shuffle(allCategories);

  // 4. Loop through the shuffled list and pick categories that have enough clues
    const ids = [];
    for (cat of shuffled) {
      if (cat.clues_count >= NUMBER_OF_CLUES_PER_CATEGORY) {
      ids.push(cat.id);
    }

    // Stop once we’ve collected enough category IDs
  if (ids.length === NUMBER_OF_CATEGORIES) break;
    }
  return ids;
};


/**
 * Gets category with as many clues as given in the `NUMBER_OF_CLUES` constant.
 * Returns the below data structure:
 *  {
 *    "id": <category ID>
 *    "title": <category name>
 *    "clues": [
 *      {
 *        "id": <clue ID>,
 *        "value": <value of the question>,
 *        "question": <question>,
 *        "answer": <answer to the question>
 *      },
 *      ... more clues
 *    ]
 *  }
 *
 * Hints:
 * - You need to call this function for each category ID returned from the `getCategoryIds` function.
 * - Use /category endpoint of the API.
 * - In the API, not all clues have a value. You can assign your own value or skip that clue.
 */
async function getCategoryData (categoryId)
{
  const res = await axios.get(`${API_URL}category`, { params: { id: categoryId } });
  // The response data is a category object with clues
  const data = res.data;
  // todo set after fetching
  // We will return an object with the structure described in the function comment
  const validClues = _.shuffle(data.clues.filter(c => c.question && c.answer));
  const selectedClues = validClues.slice(0, NUMBER_OF_CLUES_PER_CATEGORY);

  return {
    id: categoryId,
    title: data.title,
    clues: selectedClues.map( (clue, i) => 
      ({
      id: clue.id,
      value: clue.value || (i + 1) * 100, // Assign a value if missing
      question: clue.question,
      answer: clue.answer

    }))
  };
}

/**
 * Fills the HTML table using category data.
 *
 * Hints:
 * - You need to call this function using an array of categories where each element comes from the `getCategoryData` function.
 * - Table head (thead) has a row (#categories).
 *   For each category, you should create a cell element (th) and append that to it.
 * - Table body (tbody) has a row (#clues).
 *   For each category, you should create a cell element (td) and append that to it.
 *   Besides, for each clue in a category, you should create a row element (tr) and append it to the corresponding previously created and appended cell element (td).
 * - To this row elements (tr) should add an event listener (handled by the `handleClickOfClue` function) and set their IDs with category and clue IDs. This will enable you to detect which clue is clicked.
 */
function fillTable (categories)
{
  // todo
  //  Get table parts
  const tableHead = document.querySelector("#categories"); // thead row
  const tableBody = document.querySelector("#clues");      // tbody

  // Clear out old game data (in case user restarts)
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  //  Add categories (thead row with th elements)
  for (let cat of categories) {
    const th = document.createElement("th");
    th.textContent = cat.title.toUpperCase();
    tableHead.appendChild(th);
  }

  //  Add clues (tbody rows with td elements)
  //    We need NUMBER_OF_CLUES rows (one row per clue value across all categories).
  for (let clueIndex = 0; clueIndex < NUMBER_OF_CLUES_PER_CATEGORY; clueIndex++) {
    const tr = document.createElement("tr"); // a row for this clue level

    for (let cat of categories) {
      const clue = cat.clues[clueIndex]; // get the clue for this category

      const td = document.createElement("td");
      td.classList.add("clue");

      // Set an id so we know which category/clue this cell belongs to
      td.id = `cat-${cat.id}-clue-${clue.id}`

      // Display the value (e.g., $100, $200)
      td.textContent = clue.value;

      // Attach click event to reveal question/answer later
      td.addEventListener("click", handleClickOfClue);

      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  }
};
/**
 * Manages the behavior when a clue is clicked.
 * Displays the question if there is no active question.
 *
 * Hints:
 * - Control the behavior using the `activeClueMode` variable.
 * - Identify the category and clue IDs using the clicked element's ID.
 * - Remove the clicked clue from categories since each clue should be clickable only once. Don't forget to remove the category if all the clues are removed.
 * - Don't forget to update the `activeClueMode` variable.
 *
 */
function handleClickOfClue (event)
  {
  // todo find and remove the clue from the categories
  // The clicked <td>
  const cell = event.target;

  // If a clue/question is already active, ignore the click
  if (activeClueMode !== 0) return;
  

  // Extract category ID and clue ID from the cell's ID
  // ID format: "cat-<categoryId>-clue-<clueId>"
  const [_, categoryIdStr, __, clueIdStr] = cell.id.split("-");

  // Find the category in the global categories array
  const categoryId = parseInt(categoryIdStr);
  const clueId = parseInt(clueIdStr);

  // Find the clue in that category
  const category = categories.find(c => c.id === categoryId);
  const clueIndex = category.clues.findIndex(c => c.id === clueId);
  activeClue = category.clues[clueIndex]; // Store the active clue

  // Remove the clue from the category (so it can’t be reused)
  category.clues.splice(clueIndex, 1);

  // If category has no more clues, remove it entirely
  if (category.clues.length === 0) categories = categories.filter(c => c.id !== categoryId);

  // todo mark clue as viewed (you can use the class in style.css), display the question at #active-clue
  // Mark the cell visually as "viewed" (CSS will gray it out)
  document.getElementById("active-clue").textContent = activeClue.question; // Show the question in the cell
  document.getElementById("active-clue").style.display = "block"; // Ensure the active clue area is visible
  cell.classList.add("viewed");

  activeClue.cell = cell; // Store the cell for later use
  activeClueMode = 1; // Set mode to "showing question"

  
};


function handleClickOfActiveClue(event) {
  // todo handle the click of the active clue area
  // If the active clue is empty, do nothing
  // If currently showing a question
  if (activeClueMode === 1) {
    activeClueMode = 2; // switch to answer mode
    $("#active-clue").html(activeClue.answer);
  }
  // If currently showing the answer
  else if (activeClueMode === 2) {
    activeClueMode = 0; // clear mode
    $("#active-clue").html("");

    // Check if all categories are empty = game over
    const noCluesLeft = categories.every(cat => cat.clues.length === 0);
    if (noCluesLeft) {
      isPlayButtonClickable = true;
      $("#play").text("Restart the Game!");
      $("#active-clue").html("Game Over! Click 'Restart the Game!' to play again.");
    }
  }
}

