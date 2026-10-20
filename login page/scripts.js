const method = new Methods();
const API_BASE = "https://django-production-c898.up.railway.app/api/v1";
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const button = loginForm.querySelector("button");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  button.disabled = true;
  message.textContent = "Tekshirilmoqda...";

  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorText =
        typeof data.detail === "string"
          ? data.detail
          : typeof data.message === "string"
            ? data.message
            : Object.entries(data)
                .map(([key, value]) => {
                  const text = Array.isArray(value)
                    ? value.join(", ")
                    : String(value);
                  return `${key}: ${text}`;
                })
                .join(" | ");

      throw new Error(errorText || `Login xatosi: ${response.status}`);
    }

    if (!data.access) {
      throw new Error("Login javobida access token topilmadi.");
    }

    sessionStorage.setItem("apiToken", data.access);

    message.textContent =
      "Login muvaffaqiyatli! Mavzu sahifasiga o'tilmoqda...";

    window.location.href = "/intro/intro.html?id=1";
  } catch (error) {
    message.textContent = error.message || "Server bilan bog'lanishda xatolik.";

    console.error("Login xatosi:", error);
  } finally {
    button.disabled = false;
  }
});
