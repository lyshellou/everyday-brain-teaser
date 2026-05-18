const typeLabels = {
  number: "数字规律",
  logic: "逻辑推理",
  word: "趣味谜题"
};

const difficultyLabels = {
  easy: "入门",
  medium: "进阶",
  hard: "挑战"
};

const typePill = document.getElementById("type-pill");
const difficultyPill = document.getElementById("difficulty-pill");
const questionText = document.getElementById("question-text");
const answerForm = document.getElementById("answer-form");
const answerInput = document.getElementById("answer-input");
const revealButton = document.getElementById("reveal-button");
const nextButton = document.getElementById("next-button");
const feedbackPanel = document.getElementById("feedback-panel");
const feedbackStatus = document.getElementById("feedback-status");
const feedbackMessage = document.getElementById("feedback-message");
const explanationPanel = document.getElementById("explanation-panel");
const explanationType = document.getElementById("explanation-type");
const solutionAnswer = document.getElementById("solution-answer");
const solutionExplanation = document.getElementById("solution-explanation");

let puzzleBank = [];
let currentPuzzle = null;
let remainingPuzzleIds = [];

function shuffle(items) {
  const array = [...items];

  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

function normalizeAnswer(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function getPuzzleById(id) {
  return puzzleBank.find((puzzle) => puzzle.id === id);
}

function rebuildQueue() {
  remainingPuzzleIds = shuffle(puzzleBank.map((puzzle) => puzzle.id));
}

function getNextPuzzle() {
  if (puzzleBank.length === 0) {
    return null;
  }

  if (remainingPuzzleIds.length === 0) {
    rebuildQueue();
  }

  let nextId = remainingPuzzleIds.pop();

  if (puzzleBank.length > 1 && currentPuzzle && nextId === currentPuzzle.id) {
    remainingPuzzleIds.unshift(nextId);
    nextId = remainingPuzzleIds.pop();
  }

  return getPuzzleById(nextId);
}

function showFeedback(state, status, message) {
  feedbackPanel.hidden = false;
  feedbackPanel.dataset.state = state;
  feedbackStatus.textContent = status;
  feedbackMessage.textContent = message;
}

function hideFeedback() {
  feedbackPanel.hidden = true;
  feedbackPanel.dataset.state = "";
  feedbackStatus.textContent = "";
  feedbackMessage.textContent = "";
}

function hideExplanation() {
  explanationPanel.hidden = true;
}

function setActionAvailability(enabled) {
  answerInput.disabled = !enabled;
  revealButton.disabled = !enabled;
  nextButton.disabled = !enabled;
}

function renderPuzzle(puzzle) {
  currentPuzzle = puzzle;
  typePill.textContent = typeLabels[puzzle.type] || "未知题型";
  difficultyPill.textContent = difficultyLabels[puzzle.difficulty] || "未知难度";
  questionText.textContent = puzzle.question;
  explanationType.textContent = typeLabels[puzzle.type] || "未知题型";
  solutionAnswer.textContent = puzzle.answer;
  solutionExplanation.textContent = puzzle.explanation;
  answerInput.value = "";
  setActionAvailability(true);
  hideFeedback();
  hideExplanation();
  answerInput.focus();
}

function showLoadingState() {
  questionText.textContent = "正在从题库加载题目...";
  typePill.textContent = "题型";
  difficultyPill.textContent = "难度";
  solutionAnswer.textContent = "";
  solutionExplanation.textContent = "";
  setActionAvailability(false);
  hideFeedback();
  hideExplanation();
}

function showDatabaseError() {
  currentPuzzle = null;
  questionText.textContent = "题库暂时不可用";
  typePill.textContent = "题型";
  difficultyPill.textContent = "难度";
  setActionAvailability(false);
  showFeedback("error", "题库加载失败", "没能从 SQLite 题库读取数据。请先运行本地服务，再刷新页面。");
}

function revealExplanation() {
  if (!currentPuzzle) {
    return;
  }

  explanationPanel.hidden = false;
}

function checkAnswer(event) {
  event.preventDefault();

  if (!currentPuzzle) {
    return;
  }

  const rawAnswer = answerInput.value.trim();

  if (!rawAnswer) {
    showFeedback("warning", "先写下你的答案", "输入框还是空的，先试着作答，再决定要不要看解析。");
    hideExplanation();
    return;
  }

  const normalized = normalizeAnswer(rawAnswer);
  const acceptedAnswers = currentPuzzle.acceptedAnswers.map(normalizeAnswer);
  const isCorrect = acceptedAnswers.includes(normalized);

  if (isCorrect) {
    showFeedback("success", "回答正确", "这道题答得很稳。你也可以点“查看解析”，看看标准思路。");
    return;
  }

  showFeedback("error", "这次差一点", "答案还不对，不过没关系，你可以继续想一想，或者直接查看解析。");
}

function loadNextPuzzle() {
  if (puzzleBank.length === 0) {
    return;
  }

  const nextPuzzle = getNextPuzzle();

  if (nextPuzzle) {
    renderPuzzle(nextPuzzle);
  }
}

async function loadPuzzleBank() {
  showLoadingState();

  try {
    const response = await fetch("/api/puzzles");

    if (!response.ok) {
      throw new Error(`Unexpected status: ${response.status}`);
    }

    const puzzles = await response.json();

    if (!Array.isArray(puzzles) || puzzles.length === 0) {
      throw new Error("Puzzle list is empty");
    }

    puzzleBank = puzzles;
    rebuildQueue();
    loadNextPuzzle();
  } catch (error) {
    console.error("Failed to load puzzles", error);
    showDatabaseError();
  }
}

answerForm.addEventListener("submit", checkAnswer);
revealButton.addEventListener("click", revealExplanation);
nextButton.addEventListener("click", loadNextPuzzle);

loadPuzzleBank();
