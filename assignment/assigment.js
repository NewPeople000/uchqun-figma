"use strict";

const API_BASE = "https://django-production-c898.up.railway.app/api/v1";

const fileInput = document.getElementById("fileInput");
const dropzone = document.querySelector(".upload-dropzone");
const uploadedFiles = document.getElementById("uploadedFiles");
const uploadedTitle = document.getElementById("uploadedTitle");
const commentInput = document.getElementById("studentComment");
const submitButton = document.querySelector(".submit-btn");

let selectedFiles = [];

// Topic ID URL orqali olinadi: assignment.html?topicId=1
const params = new URLSearchParams(window.location.search);
const topicId = params.get("topicId");
console.log("ASSIGNMENT URL:", window.location.href);
console.log("ASSIGNMENT TOPIC ID:", topicId);

let assignmentId = null;

function getToken() {
  return sessionStorage.getItem("apiToken");
}

const lessonsLink = document.querySelector(".sidebar-link");

if (lessonsLink && topicId) {
  lessonsLink.href =
    `../topics detail/topic-detail.html?id=${encodeURIComponent(topicId)}`;
}

// Fayl hajmini ko'rsatish
function formatSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Xabar ko'rsatish
function showNotice(message) {
  alert(message);
}

// Fayllarni tekshirish
function addFiles(files) {
  const allowedExtensions = ["zip", "pdf", "png", "html", "css"];

  for (const file of files) {
    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      showNotice(`${file.name}: bu fayl turi ruxsat etilmagan.`);
      continue;
    }

    if (file.size > 25 * 1024 * 1024) {
      showNotice(`${file.name}: fayl hajmi 25 MB dan oshmasligi kerak.`);
      continue;
    }

    if (
      selectedFiles.some(
        (item) => item.name === file.name && item.size === file.size,
      )
    ) {
      continue;
    }

    selectedFiles.push(file);
  }

  renderFiles();
}

// Fayllar ro'yxatini chizish
function renderFiles() {
  uploadedFiles.innerHTML = "";
  uploadedTitle.textContent = `Yuklangan fayllar (${selectedFiles.length} ta)`;

  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "file-item";

    const left = document.createElement("div");
    left.className = "file-info-left";

    const iconBox = document.createElement("div");
    iconBox.className = "file-type-icon";
    iconBox.textContent = "📄";

    const details = document.createElement("div");
    details.className = "file-details";

    const name = document.createElement("h5");
    name.textContent = file.name;

    const size = document.createElement("p");
    size.textContent = `${formatSize(file.size)} • Tanlandi`;

    details.append(name, size);
    left.append(iconBox, details);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "delete-file-btn";
    removeButton.textContent = "🗑";
    removeButton.setAttribute("aria-label", "Faylni o'chirish");

    removeButton.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      renderFiles();
    });

    item.append(left, removeButton);
    uploadedFiles.appendChild(item);
  });
}

// Fayl tanlash oynasini ochish
dropzone.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  addFiles(Array.from(fileInput.files));
  fileInput.value = "";
});

// Sudrab tashlash
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.style.backgroundColor = "#fff7ed";
});

dropzone.addEventListener("dragleave", () => {
  dropzone.style.backgroundColor = "#ffffff";
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.style.backgroundColor = "#ffffff";
  addFiles(Array.from(event.dataTransfer.files));
});

// Topshiriq ma'lumotini API'dan olish
async function loadAssignment() {
  if (!topicId) {
    showNotice("Mavzu ID topilmadi. Sahifani topicId bilan oching.");
    return;
  }

  const token = getToken();

  if (!token) {
    showNotice("Avval tizimga kiring.");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/topics/${topicId}/assignment/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API xatosi: ${response.status}`);
    }

    const data = await response.json();

    // API obyekt yoki ro'yxat qaytarishi mumkin
    const assignment = Array.isArray(data) ? data[0] : data.assignment || data;

    if (!assignment || !assignment.id) {
      throw new Error("Topshiriq ID topilmadi.");
    }

    assignmentId = assignment.id;

    const title = document.querySelector(".title-group h2");
    const description = document.querySelector(".title-group p");

    if (title && assignment.title) {
      title.textContent = assignment.title;
    }

    if (description && assignment.description) {
      description.textContent = assignment.description;
    }
  } catch (error) {
    console.error("Topshiriqni olish xatosi:", error);
    showNotice("Topshiriq ma'lumotlarini yuklab bo'lmadi.");
  }
}

// Topshiriqni API'ga yuborish
submitButton.addEventListener("click", async (event) => {
  event.preventDefault();

  if (!assignmentId) {
    showNotice("Topshiriq hali yuklanmagan.");
    return;
  }

  const token = getToken();

  if (!token) {
    showNotice("Avval tizimga kiring.");
    return;
  }

  const comment = commentInput.value.trim();

  if (!comment && selectedFiles.length === 0) {
    showNotice("Izoh yozing yoki fayl tanlang.");
    return;
  }

  const githubMatch = comment.match(
    /https?:\/\/(?:www\.)?(?:github\.com|vercel\.app)\S*/i,
  );

  const formData = new FormData();

  formData.append("student_comment", comment);
  formData.append("github_url", githubMatch ? githubMatch[0] : "");
  formData.append("code_text", "");

  // Backend "screenshot" maydonini qabul qilishi
  // oldingi API ma'lumotlarida ko'rsatilgan.
  // Fayl maydoni nomi backend bilan tekshirilishi kerak.
  if (selectedFiles.length > 0) {
    formData.append("screenshot", selectedFiles[0]);
  }

  submitButton.disabled = true;
  submitButton.textContent = "Yuborilmoqda...";

  try {
    const response = await fetch(
      `${API_BASE}/assignments/${assignmentId}/submit/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      },
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("API javobi:", result);
      throw new Error(
        result.detail ||
          result.message ||
          `Yuborishda xato: ${response.status}`,
      );
    }

    showNotice("Topshiriq muvaffaqiyatli yuborildi!");
    selectedFiles = [];
    renderFiles();
    commentInput.value = "";
  } catch (error) {
    console.error("Topshirish xatosi:", error);
    showNotice(error.message || "Topshiriqni yuborib bo'lmadi.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Topshirish";
  }
});

loadAssignment();
