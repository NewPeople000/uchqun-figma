const API_URL = "https://django-production-c898.up.railway.app/api/v1/courses/";

// Ikonkalar xaritasi (API'dan kelgan "icon" nomiga qarab)
const iconMap = {
  code: "fa-solid fa-code",
  database: "fa-solid fa-database",
  mobile: "fa-solid fa-mobile-screen-button",
  desktop: "fa-solid fa-desktop",
};

document.addEventListener("DOMContentLoaded", () => {
  fetchCourses();
});

async function fetchCourses() {
  try {
    const token = sessionStorage.getItem("apiToken");

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("data", data);

    renderPage(data);
  } catch (error) {
    console.error("Kurslarni yuklashda xatolik:", error);
  }
}

function renderPage(data) {
  // Salomlashuv va Ogohlantirish matnlarini qo'yish
  if (data.greeting) {
    document.getElementById("greetingText").innerText = data.greeting;
  }
  if (data.restriction_notice) {
    document.getElementById("noticeText").innerText = data.restriction_notice;
  }

  const container = document.getElementById("coursesContainer");
  container.innerHTML = "";

  const courses = Array.isArray(data)
    ? data
    : Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.courses)
        ? data.courses
        : Array.isArray(data.courses?.results)
          ? data.courses.results
          : [];
  courses.forEach((course) => {
    // Agar API'da ochiq bo'lsa yoki siz sinab ko'rish uchun is_accessible parametrini boshqarsangiz
    const isAccessible = course.is_accessible;

    const iconClass = iconMap[course.icon] || "fa-solid fa-book";

    // Texnologiyalar ro'yxati HTML generatori
    const technologies = Array.isArray(course.technologies)
      ? course.technologies
      : [];

    const techTagsHtml = technologies
      .map((tech) => `<span class="tech-tag">${tech}</span>`)
      .join("");

    // Card strukturasi
    const cardHtml = `
      <div class="course-card ${isAccessible ? "active" : "locked"}">
        <div>
          <div class="card-header">
            <div class="icon-box">
              <i class="${iconClass}"></i>
            </div>
            ${
              isAccessible
                ? `<span class="badge-open">OCHIQ</span>`
                : `<i class="fa-solid fa-lock lock-icon"></i>`
            }
          </div>

          <div class="card-body">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div class="tech-tags">
              ${techTagsHtml}
            </div>
          </div>
        </div>

        <div class="card-footer">
          ${
            isAccessible
              ? `<button class="btn-start" onclick="openCourse('${course.slug}')">Kursni boshlash</button>`
              : `<button class="btn-locked" disabled>
                  <i class="fa-solid fa-lock"></i> Yopiq (Navbat kutilmoqda)
                 </button>`
          }
        </div>
      </div>
    `;

    container.innerHTML += cardHtml;
  });
}

function openCourse(slug) {
  // Kursni boshlash tugmasi bosilganda
  window.location.href = `../dashboard/dashboard.html?slug=${slug}`;
}
