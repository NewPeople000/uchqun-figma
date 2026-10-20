// Dynamic slug: URL parametr orqali olinadi (masalan: dashboard.html?slug=frontend-dasturlash)
// Agar bo'lsa o'sha ishlatiladi, bo'lmasa fallback sifati "frontend-dasturlash" olinadi.
const urlParams = new URLSearchParams(window.location.search);
const courseSlug =
  urlParams.get("slug") ||
  localStorage.getItem("selected_slug") ||
  "frontend-dasturlash";

const API_URL = `https://django-production-c898.up.railway.app/api/v1/courses/${courseSlug}/modules/`;

document.addEventListener("DOMContentLoaded", () => {
  fetchCourseModules();
});

async function fetchCourseModules() {
  try {
    const token = sessionStorage.getItem("apiToken");

    if (!token) {
      console.error("Token topilmadi. Qaytadan login qiling.");
      return;
    }

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    console.log("API status:", response.status);
    console.log("API data:", data);

    if (!response.ok) {
      console.error("API xatoligi:", data);
      return;
    }

    renderDashboard(data);
  } catch (error) {
    console.error("Modullarni yuklashda xatolik:", error);
  }
}

function renderDashboard(data) {
  // Sarlavha va Dastur nomini o'zgartirish
  if (data.course_title) {
    document.getElementById("courseTitleHeader").innerText = data.course_title;
    document.getElementById("modulesSectionTitle").innerText =
      `${data.course_title} moduli mavzulari`;
  }

  const container = document.getElementById("modulesContainer");
  container.innerHTML = "";

  const modules = data.modules || [];

  modules.forEach((mod) => {
    const statusClass = getStatusClass(mod.status, mod.progress_percentage);
    const badgeText = getBadgeText(mod.status, mod.progress_percentage);
    const btnClass = getBtnClass(mod.status, mod.progress_percentage);

    const cardHtml = `
      <div class="module-card">
        <div>
          <div class="module-header">
            <h3>${mod.title}</h3>
            <span class="status-badge ${statusClass}">${badgeText}</span>
          </div>

          <div class="module-meta">
            <span><i class="fa-regular fa-bookmark"></i> ${mod.lessons_count_display} dars</span>
            <span><i class="fa-solid fa-hashtag"></i> ${mod.topics_count_display} mavzu</span>
          </div>

          <div class="progress-container">
            <div class="progress-info">
              <span>Kurs taraqqiyoti</span>
              <span>${mod.progress_percentage}%</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${mod.progress_percentage}%;"></div>
            </div>
          </div>
        </div>

        <button class="btn-module ${btnClass}" ${mod.status === "YOPIQ" ? "disabled" : ""} onclick="openModule(${mod.id})">
          Darslarga o'tish
        </button>
      </div>
    `;

    container.innerHTML += cardHtml;
  });
}

// Status va foizga qarab UI ko'rinishlarini belgilash
function getStatusClass(status, progress) {
  if (progress === 100) return "completed";
  if (status === "FAOLLASHGAN") return "active";
  return "locked";
}

function getBadgeText(status, progress) {
  if (progress === 100) return "TUGALLANDI";
  if (status === "FAOLLASHGAN") return "FAOLLASHGAN";
  return "YOPIQ";
}

function getBtnClass(status, progress) {
  if (progress === 100) return "outline";
  if (status === "FAOLLASHGAN") return "fill";
  return "disabled";
}

function openModule(moduleId) {
  // Tanlangan modul bo'yicha darslar sahifasiga o'tish
  window.location.href = `/topics/index.html`;
}
