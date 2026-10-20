"use strict";

const API_BASE = "https://django-production-c898.up.railway.app/api/v1";

const params = new URLSearchParams(window.location.search);
const quizId = Number(params.get("quizId"));

const $ = (id) => document.getElementById(id);

let quiz = null;
let questions = [];
let currentIndex = 0;
let selectedAnswers = {};
let elapsedSeconds = 0;
let timerInterval = null;
let isSubmitting = false;
let testFinished = false;

function getHeaders() {
  const token = sessionStorage.getItem("apiToken");

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `Testni yuklashda xatolik: ${response.status}`,
    );
  }

  return data;
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `Javoblarni yuborishda xatolik: ${response.status}`,
    );
  }

  return data;
}

function showMessage(message) {
  const element = $("message");

  if (element) {
    element.textContent = message;
  }
}

function startTimer() {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (testFinished) return;

    elapsedSeconds++;

    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");

    const seconds = String(elapsedSeconds % 60).padStart(2, "0");

    if ($("timer")) {
      $("timer").textContent = `${minutes}:${seconds}`;
    }
  }, 1000);
}

async function loadTest() {
  if (!Number.isInteger(quizId) || quizId < 1) {
    if ($("loading")) {
      $("loading").textContent =
        "Test ID topilmadi. Mavzudan testni qayta boshlang.";
    }
    return;
  }

  try {
    quiz = await apiGet(`/quizzes/${quizId}/`);

    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("Bu testda savollar mavjud emas.");
    }

    questions = [...quiz.questions].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );

    if ($("loading")) $("loading").hidden = true;
    if ($("testArea")) $("testArea").hidden = false;

    document.title = `${quiz.title || "Test"} — Uchqun`;

    if ($("category")) {
      $("category").textContent = quiz.title || "UCHQUN TEST";
    }

    startTimer();
    renderQuestion();
  } catch (error) {
    console.error("Testni yuklash xatosi:", error);

    if ($("loading")) {
      $("loading").textContent = error.message;
    }
  }
}

function renderQuestion() {
  const question = questions[currentIndex];

  if (!question) return;

  showMessage("");

  if ($("questionBadge")) {
    $("questionBadge").textContent =
      `Savol: ${currentIndex + 1} / ${questions.length}`;
  }

  if ($("questionTitle")) {
    $("questionTitle").textContent = question.text || "Savol";
  }

  const list = $("optionsList");

  if (!list) {
    console.error("HTML ichida optionsList elementi topilmadi.");
    return;
  }

  list.replaceChildren();

  const letters = ["A", "B", "C", "D", "E", "F"];

  const options = [...(question.options || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  options.forEach((option, index) => {
    const selected = Number(selectedAnswers[question.id]) === Number(option.id);

    const item = document.createElement("button");
    item.type = "button";
    item.className = `option-item${selected ? " selected" : ""}`;
    item.setAttribute("aria-pressed", String(selected));

    const letter = document.createElement("span");
    letter.className = `option-letter${selected ? " active" : ""}`;
    letter.textContent = letters[index] || String(index + 1);

    const text = document.createElement("span");
    text.className = "option-text";
    text.textContent = String(option.text || "").replace(/^[A-FА-Е]\)\s*/i, "");

    item.append(letter, text);

    item.addEventListener("click", () => {
      if (isSubmitting || testFinished) return;

      selectedAnswers[question.id] = Number(option.id);
      renderQuestion();
    });

    list.appendChild(item);
  });

  if ($("prevBtn")) {
    $("prevBtn").disabled = currentIndex === 0;
  }

  const isLastQuestion = currentIndex === questions.length - 1;

  if ($("nextBtn")) {
    $("nextBtn").hidden = isLastQuestion;
  }

  if ($("skipBtn")) {
    $("skipBtn").hidden = isLastQuestion;
  }

  if ($("submitBtn")) {
    $("submitBtn").hidden = !isLastQuestion;
  }
}

function goNext() {
  if (isSubmitting || testFinished) return;

  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  }
}

function goPrevious() {
  if (isSubmitting || testFinished) return;

  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

function skipQuestion() {
  // Savolni o'tkazib yuborish tanlangan javobni o'chirmaydi.
  goNext();
}

async function submitTest() {
  if (isSubmitting || testFinished) return;

  const unanswered = questions.filter(
    (question) =>
      selectedAnswers[question.id] === undefined ||
      selectedAnswers[question.id] === null,
  );

  if (unanswered.length > 0) {
    const firstUnansweredIndex = questions.findIndex(
      (question) =>
        selectedAnswers[question.id] === undefined ||
        selectedAnswers[question.id] === null,
    );

    currentIndex = firstUnansweredIndex;
    renderQuestion();

    showMessage(
      `${unanswered.length} ta savolga javob berilmagan. ` +
        "Iltimos, barcha savollarga javob bering.",
    );

    return;
  }

  const confirmed = window.confirm(
    "Testni yakunlamoqchimisiz? Javoblaringiz tekshiriladi.",
  );

  if (!confirmed) return;

  isSubmitting = true;

  if ($("submitBtn")) {
    $("submitBtn").disabled = true;
    $("submitBtn").textContent = "Tekshirilmoqda...";
  }

  ["prevBtn", "nextBtn", "skipBtn"].forEach((id) => {
    if ($(id)) $(id).disabled = true;
  });

  showMessage("Javoblar tekshirilmoqda...");

  // Backend kutayotgan format:
  // { answers: [{ question_id, selected_option_id }] }
  const answers = questions.map((question) => ({
    question_id: Number(question.id),
    selected_option_id: Number(selectedAnswers[question.id]),
  }));

  try {
    const result = await apiPost(`/quizzes/${quizId}/submit/`, { answers });

    console.log("Backend test natijasi:", result);

    testFinished = true;
    clearInterval(timerInterval);

    if ($("testArea")) $("testArea").hidden = true;
    if ($("resultArea")) $("resultArea").hidden = false;

    renderResult(result);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  } catch (error) {
    console.error("Testni yakunlash xatosi:", error);

    showMessage(error.message);

    isSubmitting = false;

    if ($("submitBtn")) {
      $("submitBtn").disabled = false;
      $("submitBtn").textContent = "Testni yakunlash";
    }

    if ($("prevBtn")) {
      $("prevBtn").disabled = currentIndex === 0;
    }

    if ($("nextBtn")) $("nextBtn").disabled = false;
    if ($("skipBtn")) $("skipBtn").disabled = false;
  }
}

function renderResult(result) {
  const resultArea = $("resultArea");

  if (!resultArea) {
    console.error(
      "HTML ichida resultArea elementi topilmadi. Natijani ko'rsatish uchun HTML elementini qo'shing.",
    );
    return;
  }

  resultArea.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = result.passed
    ? "Tabriklaymiz! Testdan o'tdingiz!"
    : "Test yakunlandi";

  const summary = document.createElement("p");
  summary.textContent = result.message || "Test tekshirildi";

  const score = document.createElement("p");
  score.textContent =
    `To'g'ri javoblar: ${result.correct_answers ?? 0} / ` +
    `${result.total_questions ?? questions.length}`;

  const percentage = document.createElement("p");
  percentage.textContent = `Natija: ${result.score_percentage ?? 0}%`;

  const points = document.createElement("p");
  points.textContent = `To'plangan ball: ${result.points_earned ?? 0}`;

  const status = document.createElement("p");
  status.textContent = result.passed
    ? "Holat: O'tdingiz"
    : "Holat: O'ta olmadingiz";

  resultArea.append(heading, summary, score, percentage, points, status);

  const detailsHeading = document.createElement("h3");
  detailsHeading.textContent = "Javoblar tahlili";
  resultArea.appendChild(detailsHeading);

  const results = Array.isArray(result.results) ? result.results : [];

  if (results.length === 0) {
    const note = document.createElement("p");
    note.textContent =
      "Backend savollar bo'yicha batafsil natijalarni qaytarmadi.";
    resultArea.appendChild(note);
  }

  results.forEach((item) => {
    const card = document.createElement("div");
    card.className = item.is_correct
      ? "answer-result correct"
      : "answer-result incorrect";

    const title = document.createElement("h4");
    title.textContent =
      `Savol ${item.question_order ?? ""}: ` +
      (item.status_badge || (item.is_correct ? "TO'G'RI" : "NOTO'G'RI"));

    card.appendChild(title);

    if (item.explanation) {
      const explanation = document.createElement("p");
      explanation.textContent = item.explanation;
      card.appendChild(explanation);
    }

    resultArea.appendChild(card);
  });

  if ($("resultText")) {
    $("resultText").textContent =
      `${result.correct_answers ?? 0}/${result.total_questions ?? questions.length} ` +
      `ta to'g'ri javob — ${result.score_percentage ?? 0}%.`;
  }

  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.textContent = "← Menyuga qaytish";
  backButton.className = "back-menu-btn";

  backButton.addEventListener("click", () => {
    // Test ochilgan oldingi sahifaga qaytadi.
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/topics detail/topic-detail.html";
    }
  });

  resultArea.appendChild(backButton);
}

if ($("prevBtn")) {
  $("prevBtn").addEventListener("click", goPrevious);
}

if ($("nextBtn")) {
  $("nextBtn").addEventListener("click", goNext);
}

if ($("skipBtn")) {
  $("skipBtn").addEventListener("click", skipQuestion);
}

if ($("submitBtn")) {
  $("submitBtn").addEventListener("click", submitTest);
}

loadTest();
