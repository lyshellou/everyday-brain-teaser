const puzzleList = document.getElementById("puzzle-list");
const puzzleCount = document.getElementById("puzzle-count");
const adminForm = document.getElementById("admin-form");
const formMode = document.getElementById("form-mode");
const newPuzzleButton = document.getElementById("new-puzzle-button");
const resetFormButton = document.getElementById("reset-form-button");
const savePuzzleButton = document.getElementById("save-puzzle-button");
const adminFeedback = document.getElementById("admin-feedback");
const adminFeedbackStatus = document.getElementById("admin-feedback-status");
const adminFeedbackMessage = document.getElementById("admin-feedback-message");

const idInput = document.getElementById("puzzle-id");
const typeInput = document.getElementById("puzzle-type");
const difficultyInput = document.getElementById("puzzle-difficulty");
const questionInput = document.getElementById("puzzle-question");
const answerInput = document.getElementById("puzzle-answer");
const acceptedAnswersInput = document.getElementById("puzzle-accepted-answers");
const explanationInput = document.getElementById("puzzle-explanation");

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

let puzzles = [];
let editingPuzzleId = null;

function showFeedback(state, title, message) {
  adminFeedback.hidden = false;
  adminFeedback.dataset.state = state;
  adminFeedbackStatus.textContent = title;
  adminFeedbackMessage.textContent = message;
}

function hideFeedback() {
  adminFeedback.hidden = true;
  adminFeedback.dataset.state = "";
  adminFeedbackStatus.textContent = "";
  adminFeedbackMessage.textContent = "";
}

function setSavingState(isSaving) {
  savePuzzleButton.disabled = isSaving;
  savePuzzleButton.textContent = isSaving ? "保存中..." : "保存题目";
}

function toAcceptedAnswersText(acceptedAnswers) {
  return acceptedAnswers.join("\n");
}

function fromAcceptedAnswersText(value) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fillForm(puzzle) {
  editingPuzzleId = puzzle.id;
  formMode.textContent = `编辑模式 · ${puzzle.id}`;
  idInput.value = puzzle.id;
  typeInput.value = puzzle.type;
  difficultyInput.value = puzzle.difficulty;
  questionInput.value = puzzle.question;
  answerInput.value = puzzle.answer;
  acceptedAnswersInput.value = toAcceptedAnswersText(puzzle.acceptedAnswers);
  explanationInput.value = puzzle.explanation;
}

function resetForm() {
  editingPuzzleId = null;
  formMode.textContent = "新增模式";
  adminForm.reset();
  typeInput.value = "number";
  difficultyInput.value = "easy";
  idInput.focus();
}

function createListItem(puzzle) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "puzzle-list__item";

  if (editingPuzzleId === puzzle.id) {
    button.classList.add("is-active");
  }

  const meta = `${typeLabels[puzzle.type]} · ${difficultyLabels[puzzle.difficulty]}`;
  button.innerHTML = `
    <strong>${puzzle.id}</strong>
    <span>${meta}</span>
    <p>${puzzle.question}</p>
  `;

  button.addEventListener("click", () => {
    fillForm(puzzle);
    renderPuzzleList();
    hideFeedback();
  });

  return button;
}

function renderPuzzleList() {
  puzzleCount.textContent = `当前共 ${puzzles.length} 道题`;
  puzzleList.innerHTML = "";

  puzzles.forEach((puzzle) => {
    puzzleList.appendChild(createListItem(puzzle));
  });
}

async function loadPuzzles() {
  puzzleCount.textContent = "正在加载题目...";

  try {
    const response = await fetch("/api/puzzles");

    if (!response.ok) {
      throw new Error("加载题库失败");
    }

    puzzles = await response.json();
    renderPuzzleList();
  } catch (error) {
    console.error(error);
    showFeedback("error", "加载失败", "没能读取题库列表，请确认本地服务正在运行。");
    puzzleCount.textContent = "题目加载失败";
  }
}

async function savePuzzle(event) {
  event.preventDefault();
  hideFeedback();
  setSavingState(true);

  const payload = {
    id: idInput.value.trim(),
    type: typeInput.value,
    difficulty: difficultyInput.value,
    question: questionInput.value.trim(),
    answer: answerInput.value.trim(),
    acceptedAnswers: fromAcceptedAnswersText(acceptedAnswersInput.value),
    explanation: explanationInput.value.trim()
  };

  try {
    const response = await fetch("/api/puzzles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "保存失败");
    }

    const existingIndex = puzzles.findIndex((puzzle) => puzzle.id === result.id);

    if (existingIndex >= 0) {
      puzzles[existingIndex] = result;
    } else {
      puzzles.push(result);
      puzzles.sort((left, right) => left.id.localeCompare(right.id));
    }

    fillForm(result);
    renderPuzzleList();
    showFeedback("success", "保存成功", `题目 ${result.id} 已写入 SQLite 题库。`);
  } catch (error) {
    console.error(error);
    showFeedback("error", "保存失败", error.message);
  } finally {
    setSavingState(false);
  }
}

adminForm.addEventListener("submit", savePuzzle);
newPuzzleButton.addEventListener("click", () => {
  hideFeedback();
  resetForm();
  renderPuzzleList();
});
resetFormButton.addEventListener("click", () => {
  hideFeedback();
  resetForm();
  renderPuzzleList();
});

resetForm();
loadPuzzles();
