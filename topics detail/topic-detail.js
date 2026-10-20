"use strict";

// ============================================
// 1. API VA UMUMIY O'ZGARUVCHILAR
// ============================================

const API_BASE = "https://django-production-c898.up.railway.app/api/v1";

const $ = (id) => document.getElementById(id);

let topic = null;
let assignment = null;
let quizzes = [];
let currentSlide = 1;

// ============================================
// 2. API SO'ROVLARI
// ============================================

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

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Login talab qilinadi. Hisobingizga qayta kiring."
        : `API xatosi: ${response.status}`,
    );
  }

  return response.json();
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
      data.detail || data.message || `Yuborishda xatolik: ${response.status}`,
    );
  }

  return data;
}

// ============================================
// 3. YORDAMCHI FUNKSIYALAR
// ============================================

function safeText(value, fallback = "Ma'lumot mavjud emas") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
}

function validId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

function showMessage(message) {
  console.log(message);
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}

function setSafeLink(id, url) {
  const link = $(id);

  if (!link) return;

  link.hidden = true;
  link.removeAttribute("href");

  if (!url) return;

  try {
    const parsed = new URL(url, API_BASE);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return;
    }

    link.href = parsed.href;
    link.hidden = false;
  } catch (error) {
    console.warn("Havola noto'g'ri:", error);
  }
}

// ============================================
// 4. MAVZUNI YUKLASH
// ============================================

async function loadTopicDetail() {
  const params = new URLSearchParams(window.location.search);
  const topicId = validId(params.get("id"));
  console.log("SIDEBAR TOPIC ID:", topicId);

  if (!topicId) {
    showMessage(
      "Mavzu ID raqami topilmadi. Sahifani ?id=3 kabi manzil bilan oching.",
    );
    return;
  }

  try {
    // Avval mavzu ma'lumotlarini olamiz.
    topic = await apiGet(`/topics/${topicId}/`);
    console.log("ASSIGNMENT SCRIPT ISHLADI");
    console.log("TOPIC ID:", topicId);
    console.log("URL:", window.location.href);
    renderTopic();

    // Topshiriq va testlarni mustaqil yuklaymiz.
    // Bittasidagi xato ikkinchisiga ta'sir qilmaydi.
    await Promise.allSettled([loadAssignment(topicId), loadQuizzes(topicId)]);
  } catch (error) {
    console.error("Mavzuni yuklash xatosi:", error);
    showMessage(`Mavzuni yuklab bo'lmadi: ${error.message}`);
  }
}

// ============================================
// 5. MAVZU MA'LUMOTLARINI CHIQARISH
// ============================================

function renderTopic() {
  if (!topic) return;

  const title = safeText(topic.title, "Mavzu");

  const description = safeText(
    topic.description,
    "Bu mavzu uchun tavsif berilmagan.",
  );

  setText(
    "breadcrumbTitle",
    `${safeText(topic.module_title, "HTML moduli")} / ${title}`,
  );

  setText(
    "presentationTitle",
    safeText(topic.presentation_title, `Dars prezentatsiyasi: ${title}`),
  );

  setText("slideTitle", title);
  setText("slideDescription", description);
  setText("slideTopicName", `Mavzu: ${title}`);

  updateSlideCounter();

  setSafeLink("downloadPresentation", topic.presentation_file_url);
  setSafeLink("sourceCodeLink", topic.source_code_url);
  setSafeLink("videoLink", topic.video_url);

  const sourceCode = $("sourceCode");

  if (sourceCode && topic.source_code_snippet) {
    sourceCode.hidden = false;

    const code = sourceCode.querySelector("code");

    if (code) {
      code.textContent = topic.source_code_snippet;
    }
  }
}

// ============================================
// 6. PREZENTATSIYA SLAYDLARI
// ============================================

function updateSlideCounter() {
  const total = Math.max(1, Number(topic?.slides_count) || 1);

  currentSlide = Math.min(currentSlide, total);

  setText("slideCounter", `Slayd ${currentSlide} / ${total}`);
}

const prevSlide = $("prevSlide");

if (prevSlide) {
  prevSlide.addEventListener("click", () => {
    if (currentSlide > 1) {
      currentSlide--;
      updateSlideCounter();
    }
  });
}

const nextSlide = $("nextSlide");

if (nextSlide) {
  nextSlide.addEventListener("click", () => {
    const total = Math.max(1, Number(topic?.slides_count) || 1);

    if (currentSlide < total) {
      currentSlide++;
      updateSlideCounter();
    } else {
      showMessage(
        "Oxirgi slayd. Boshqa slaydlar mazmuni API orqali kelishi kerak.",
      );
    }
  });
}

const fullscreenBtn = $("fullscreenBtn");

if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", async () => {
    const viewer = $("slideViewer");

    if (!viewer) {
      showMessage("Prezentatsiya oynasi topilmadi.");
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await viewer.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      showMessage("To'liq ekran rejimini ochib bo'lmadi.");
    }
  });
}

("use strict");

// ============================================
// 7. TESTLARNI API'DAN OLISH
// ============================================

async function loadQuizzes(topicId) {
  const list = $("quizList");
  const count = $("quizCount");

  if (!list) return;

  list.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Testlar yuklanmoqda...";
  list.appendChild(loading);

  if (count) count.textContent = "YUKLANMOQDA";

  try {
    const data = await apiGet(`/topics/${topicId}/quizzes/`);

    if (Array.isArray(data)) {
      quizzes = data;
    } else if (Array.isArray(data.results)) {
      quizzes = data.results;
    } else if (Array.isArray(data.quizzes)) {
      quizzes = data.quizzes;
    } else {
      quizzes = [];
    }

    renderQuizList();
  } catch (error) {
    console.error("Testlarni yuklash:", error);

    list.replaceChildren();

    const message = document.createElement("p");
    message.className = "quiz-empty";
    message.textContent =
      "Testlarni yuklab bo'lmadi. API manzili va kirish huquqini tekshiring.";

    list.appendChild(message);

    if (count) count.textContent = "0 TA TEST";
  }
}

// ============================================
// 8. TEST KARTALARI
// ============================================

function renderQuizList() {
  const list = $("quizList");
  const count = $("quizCount");

  if (!list) return;

  list.replaceChildren();

  if (count) {
    count.textContent = `${quizzes.length} TA TEST`;
  }

  if (quizzes.length === 0) {
    const empty = document.createElement("p");
    empty.className = "quiz-empty";
    empty.textContent = "Bu mavzu uchun testlar mavjud emas.";

    list.appendChild(empty);
    return;
  }

  quizzes.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "quiz-card";

    const number = document.createElement("div");
    number.className = "quiz-number";
    number.textContent = `TEST ${String(index + 1).padStart(2, "0")}`;

    const title = document.createElement("h3");
    title.className = "quiz-question";
    title.textContent = safeText(item.title, `Mavzu testi ${index + 1}`);

    const questionCount =
      item.questions_count ??
      item.question_count ??
      (Array.isArray(item.questions) ? item.questions.length : null);

    const details = document.createElement("p");
    details.className = "quiz-description";

    details.textContent =
      `${questionCount ?? "—"} ta savol` +
      ` · O'tish bali: ${item.pass_percentage ?? 60}%`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-submit";
    button.textContent = "Testni boshlash";

    button.addEventListener("click", () => {
      startQuiz(item);
    });

    card.append(number, title, details, button);
    list.appendChild(card);
  });
}

// ============================================
// 9. TESTNI OCHISH
// ============================================

function startQuiz(item) {
  const quizId = validId(item?.id);

  if (!quizId) {
    showMessage("Test ID raqami topilmadi.");
    return;
  }

  const url = new URL("/test-screen/test.html", window.location.href);
  url.searchParams.set("quizId", quizId);

  window.location.href = url.href;
}

// ============================================
// 10. AMALIY TOPSHIRIQNI YUKLASH
// ============================================

async function loadAssignment(topicId) {
  const message = $("assignmentMessage");

  // Tugma ostidagi xabar boshlanishida ko'rinmaydi.
  if (message) {
    message.textContent = "";
    message.hidden = true;
  }

  try {
    assignment = await apiGet(`/topics/${topicId}/assignment/`);
    renderAssignment();
  } catch (error) {
    console.error("Topshiriqni yuklash:", error);

    assignment = null;

    setText("assignmentTitle", "Topshiriq mavjud emas");
    setText(
      "assignmentDescription",
      "Topshiriq ma'lumotlarini hozircha yuklab bo'lmadi.",
    );

    const form = $("assignmentForm");
    if (form) form.hidden = true;
  }
}

// ============================================
// 11. AMALIY TOPSHIRIQNI KO'RSATISH
// ============================================

function renderAssignment() {
  if (!assignment) return;

  setText("assignmentTitle", safeText(assignment.title, "Amaliy topshiriq"));

  setText("assignmentDescription", safeText(assignment.description));

  setText("assignmentPoints", `${assignment.max_score ?? 100} BALL`);

  const deadline =
    assignment.deadline_text ||
    (assignment.due_date
      ? new Date(assignment.due_date).toLocaleDateString("uz-UZ")
      : "Muddat ko'rsatilmagan");

  setText("assignmentDeadline", `Muddat: ${deadline}`);

  const details = $("assignmentDetails");

  if (details) {
    details.replaceChildren();

    if (assignment.due_date) {
      const date = document.createElement("p");
      date.textContent = `Topshirish sanasi: ${new Date(
        assignment.due_date,
      ).toLocaleDateString("uz-UZ")}`;
      details.appendChild(date);
    }

    if (assignment.attachment) {
      const link = document.createElement("a");
      link.className = "light-button";
      link.href = assignment.attachment;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Topshiriq faylini ochish";
      details.appendChild(link);
    }
  }

  const form = $("assignmentForm");
  if (!form) return;

  form.hidden = true;

  let openButton = $("openAssignmentForm");

  if (!openButton) {
    openButton = document.createElement("button");
    openButton.id = "openAssignmentForm";
    openButton.type = "button";
    openButton.className = "primary-button full-button";
    openButton.textContent = "Vazifani topshirish";

    form.parentNode.insertBefore(openButton, form);
  }

  openButton.onclick = function () {
    // Avval URL'dagi ID'ni tekshiramiz.
    const params = new URLSearchParams(window.location.search);
    const urlTopicId = validId(params.get("id"));

    // Agar URL'da ID bo'lmasa, API'dan olingan mavzu ID'sini ishlatamiz.
    const currentTopicId = urlTopicId || validId(topic?.id);

    if (!currentTopicId) {
      alert("XATO: topic-detail.js ichidagi ID tekshiruvi");
      return;
    }

    // assignment.html joylashgan papka manzili.
    const targetUrl = new URL(
      "/assignment/assigment.html",
      window.location.href,
    );

    targetUrl.searchParams.set("topicId", currentTopicId);

    window.location.href = targetUrl.href;
  };

  openButton.hidden = false;

  const message = $("assignmentMessage");

  if (message) {
    message.textContent = "";
    message.hidden = true;
  }
}

// ============================================
// 12. TOPSHIRIQNI YUBORISH
// ============================================

const assignmentForm = $("assignmentForm");

if (assignmentForm) {
  assignmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const answer = $("assignmentAnswer")?.value.trim() || "";
    const githubUrl = $("githubUrl")?.value.trim() || "";
    const codeText = $("codeText")?.value.trim() || "";
    const file = $("assignmentFile")?.files[0];

    const assignmentId = validId(assignment?.id);

    if (!assignmentId) {
      showMessage("Topshiriq ID raqami topilmadi.");
      return;
    }

    if (!answer && !githubUrl && !codeText && !file) {
      showMessage("Avval javob yozing yoki fayl biriktiring.");
      return;
    }

    const formData = new FormData();

    formData.append("student_comment", answer);
    formData.append("github_url", githubUrl);
    formData.append("code_text", codeText);

    if (file) {
      formData.append("screenshot", file);
    }

    const button = assignmentForm.querySelector('button[type="submit"]');

    if (button) {
      button.disabled = true;
      button.textContent = "Yuborilmoqda...";
    }

    try {
      const response = await fetch(
        `${API_BASE}/assignments/${assignmentId}/submit/`,
        {
          method: "POST",
          headers: getHeaders(),
          body: formData,
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = Object.entries(result)
          .map(([key, value]) => {
            const textValue = Array.isArray(value)
              ? value.join(", ")
              : typeof value === "string"
                ? value
                : JSON.stringify(value);

            return `${key}: ${textValue}`;
          })
          .join(" | ");

        throw new Error(details || `API xatosi: ${response.status}`);
      }

      // Pastdagi xabarni yashiramiz.
      const message = $("assignmentMessage");

      if (message) {
        message.hidden = true;
        message.textContent = "";
      }

      assignmentForm.reset();
      assignmentForm.hidden = true;

      // Tashqi tugmani ham yashiramiz.
      const openButton = $("openAssignmentForm");

      if (openButton) {
        openButton.hidden = true;
      }

      // Topshiriq yuborilganini belgilaymiz.
      if (assignment) {
        assignment.my_submission = true;
      }
    } catch (error) {
      console.error("Topshiriqni yuborish:", error);

      // Xatolik xabarini ko'rsatmaymiz.
      const message = $("assignmentMessage");

      if (message) {
        message.hidden = true;
        message.textContent = "";
      }
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Vazifani topshirish";
      }
    }
  });
}

// ============================================
// 13. SAHIFANI ISHGA TUSHIRISH
// ============================================

loadTopicDetail();


// Sidebar'dagi "Topshiriqlar" tugmasini boshqarish
document.addEventListener("click", function (event) {
  const link = event.target.closest("a, button");

  if (!link) return;
  if (link.textContent.trim() !== "Topshiriqlar") return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const params = new URLSearchParams(window.location.search);
  const topicId = validId(params.get("id"));

  if (!topicId) {
    alert("Mavzu ID topilmadi!");
    return;
  }

  window.location.href =
    `/assignment/assigment.html?topicId=${encodeURIComponent(topicId)}`;
}, true);