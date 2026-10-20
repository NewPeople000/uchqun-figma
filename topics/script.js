const API_BASE = "https://django-production-c898.up.railway.app/api/v1";
const DEFAULT_COURSE_SLUG = "1";

let currentSlug = DEFAULT_COURSE_SLUG;
let topics = [];
let activeFilter = "all";

const topicList = document.getElementById("topicList");
const topicSearch = document.getElementById("topicSearch");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");
const courseSelect = document.getElementById("courseSelect");
const courseMenu = document.getElementById("courseMenu");
const selectedCourse = document.getElementById("selectedCourse");
const toast = document.getElementById("toast");
const button = document.createElement("button");

button.className = "topic-arrow";
button.textContent = "›";
button.type = "button";

button.addEventListener("click", () => {
  window.location.href = `index.html?id=${topic.id}`;
});
``
// Xabar chiqarish
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// Progress qiymatini 0-100 oralig'iga keltirish
function normalizeProgress(topic) {
  const raw =
    topic.user_progress ?? topic.progress_percentage ?? topic.progress ?? 0;

  const number = Number.parseFloat(raw);

  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
}

function normalizeTopic(topic, index) {
  return {
    ...topic,
    id: topic.id ?? index + 1,
    order: topic.order ?? index + 1,
    title: topic.title ?? topic.name ?? `Mavzu ${index + 1}`,
    lessons_count: topic.lessons_count ?? topic.lessonsCount ?? 0,
    duration_hours:
      topic.duration_hours ?? topic.duration ?? "—",
    status: String(topic.status ?? "NOT_STARTED").toUpperCase(),
    progress_percentage:
      topic.progress_percentage ??
      topic.user_progress ??
      topic.progress ??
      0,
    has_presentation: topic.has_presentation ?? false,
  };
}

// API'dan kurs modullarini olish — GET

// API'dan kurs mavzularini olish
async function fetchModules(slug) {
  const token = sessionStorage.getItem("apiToken");

  const response = await fetch(
    `${API_BASE}/modules/${encodeURIComponent(slug)}/topics/`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Token yaroqsiz yoki avtorizatsiya talab qilinadi (401).");
    }

    if (response.status === 403) {
      throw new Error("Bu mavzularni ko'rish uchun ruxsat yo'q (403).");
    }

    throw new Error(`API xatosi: ${response.status}`);
  }

  const data = await response.json();

  console.log("API response:", data);

  // API response ichidagi mavzularni olish
  let list;

  if (Array.isArray(data)) {
    list = data;
  } else if (Array.isArray(data.topics)) {
    list = data.topics;
  } else if (Array.isArray(data.topics?.results)) {
    list = data.topics.results;
  } else if (Array.isArray(data.results)) {
    list = data.results;
  } else {
    throw new Error(
      "API javobida mavzular ro'yxati topilmadi."
    );
  }

  // LOCKED mavzular ham ro'yxatda ko'rinishi kerak.
  // Shuning uchun ularni filtrlab tashlamaymiz.
  return list.map((topic, index) => normalizeTopic(topic, index));
}

// Mavzularni yuklash

async function loadTopics(slug = currentSlug) {
  currentSlug = slug;

  topicList.innerHTML = `
    <div class="loading-state">
      <span class="loader"></span>
      <span>Mavzular yuklanmoqda...</span>
    </div>
  `;

  emptyState.classList.add("hidden");

  try {
    topics = await fetchModules(slug);
    renderTopics();

    console.log("Yuklangan mavzular soni:", topics.length);
  } catch (error) {
    console.error("Mavzularni yuklashda xato:", error);

    topics = [];
    topicList.innerHTML = "";

    emptyState.classList.remove("hidden");
    emptyState.textContent =
      "Mavzularni yuklab bo'lmadi. Internet, token yoki API manzilini tekshiring.";

    resultsCount.textContent = "0 ta mavzu";

    showToast(error.message);
  }
}

// Mavzu holatini aniqlash
function getTopicStatus(topic) {
  const status = String(topic.status || "").toUpperCase();
  const progress = normalizeProgress(topic);

  if (status.includes("LOCK")) {
    return "locked";
  }

  if (status.includes("COMPLETE") || progress >= 100) {
    return "completed";
  }

  if (status.includes("PROGRESS") || progress > 0) {
    return "progress";
  }

  return "not-started";
}

// Holat matnini olish
function getStatusLabel(topic) {
  const status = getTopicStatus(topic);

  if (status === "completed") {
    return "TUGALLANGAN";
  }

  if (status === "progress") {
    return "O'RGANILMOQDA";
  }

  if (status === "locked") {
    return "YOPIQ";
  }

  return "BOSHLANMAGAN";
}

// HTML ichiga xavfsiz matn joylashtirish
function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

// Mavzularni sahifaga chiqarish
function renderTopics() {
  const query = topicSearch.value.trim().toLocaleLowerCase("uz");

  const filtered = topics.filter((topic) => {
    const title = String(topic.title).toLocaleLowerCase("uz");
    const matchesSearch = title.includes(query);
    const status = getTopicStatus(topic);

    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "completed" && status === "completed") ||
      (activeFilter === "progress" && status === "progress") ||
      (activeFilter === "locked" && status === "locked");

    return matchesSearch && matchesFilter;
  });

  resultsCount.textContent = `${filtered.length} ta mavzu`;
  topicList.innerHTML = "";

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filtered.forEach((topic, index) => {
    const progress = normalizeProgress(topic);
    const status = getTopicStatus(topic);
    const locked = status === "locked";

    const row = document.createElement("article");

    row.className = `topic-row ${status}`;
    row.style.animationDelay = `${Math.min(index * 45, 250)}ms`;

    const duration = String(topic.duration_hours ?? "—");

    row.innerHTML = `
      <div class="topic-number">
        ${escapeHTML(String(topic.order))}
      </div>

      <div class="topic-main">
        <h2>${escapeHTML(topic.title)}</h2>

        <p>
          ${escapeHTML(String(topic.lessons_count))} dars
          <span>•</span>
          Davomiyligi ${escapeHTML(duration)} soat
        </p>
      </div>

      <div class="progress-cell">
        <div class="progress-meta">
          <span>O‘zlashtirish</span>
          <strong>${progress}%</strong>
        </div>

        <div class="progress-track">
          <div
            class="progress-fill"
            style="width: ${progress}%"
          ></div>
        </div>
      </div>

      <span class="status ${status}">
        ${getStatusLabel(topic)}
      </span>

      <button
        class="topic-open"
        type="button"
        aria-label="${escapeHTML(topic.title)} mavzusini ochish"
        ${locked ? "disabled" : ""}
      >
        ›
      </button>
    `;

    const openButton = row.querySelector(".topic-open");

    openButton.addEventListener("click", () => {
      openTopic(topic);
    });

    topicList.appendChild(row);
  });
}

// Mavzuni ochish

function openTopic(topic) {
  if (getTopicStatus(topic) === "locked") {
    showToast("Bu mavzu hozircha yopiq.");
    return;
  }

  // Tanlangan mavzuni vaqtincha saqlash
  sessionStorage.setItem("selectedTopic", JSON.stringify(topic));

  // Mavzu ID raqami bilan alohida sahifani ochish
  window.location.href = `/topics detail/topic-detail.html?id=${encodeURIComponent(topic.id)}`;
}

// Qidiruv
topicSearch.addEventListener("input", renderTopics);

// Filtrlar
document.querySelectorAll(".filter-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    activeFilter = button.dataset.filter;

    renderTopics();
  });
});

// Qidiruv va filtrlarni tozalash
document.getElementById("resetSearch").addEventListener("click", () => {
  topicSearch.value = "";
  activeFilter = "all";

  document.querySelectorAll(".filter-tab").forEach((item) => {
    item.classList.toggle("active", item.dataset.filter === "all");
  });

  renderTopics();
});

// Kurs tanlash menyusini ochish/yopish
courseSelect.addEventListener("click", () => {
  const isOpen = courseMenu.classList.toggle("open");

  courseSelect.setAttribute("aria-expanded", String(isOpen));
});

// Tanlangan kursni yuklash
courseMenu.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    const slug = button.dataset.slug;

    currentSlug = slug;
    selectedCourse.textContent = button.textContent;

    courseMenu.classList.remove("open");
    courseSelect.setAttribute("aria-expanded", "false");

    loadTopics(slug);
  });
});

// Menyu tashqarisiga bosilganda yopish
document.addEventListener("click", (event) => {
  if (!event.target.closest(".course-select-wrap")) {
    courseMenu.classList.remove("open");

    courseSelect.setAttribute("aria-expanded", "false");
  }
});

// Hozircha tayyor bo'lmagan menyular
document.querySelectorAll("[data-local-page]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    showToast(
      `${link.dataset.localPage} bo‘limi keyingi bosqichda qo‘shiladi.`,
    );
  });
});

// Bildirishnomalar
document.getElementById("notificationBtn").addEventListener("click", () => {
  showToast("Hozircha yangi bildirishnomalar yo‘q.");
});

// Ctrl + K orqali qidiruvga o'tish
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    topicSearch.focus();
  }
});

// Sahifa ochilganda ma'lumotlarni yuklash
loadTopics();
