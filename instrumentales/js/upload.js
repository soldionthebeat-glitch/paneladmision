const API_URL = (["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:" ? "http://localhost:5000" : "https://backend-j3sk.onrender.com");

// 🔐 PROTEGER
async function proteger() {
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.replace("index.html");
    return;
  }
}

proteger();

// 📤 SUBIR
document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_URL}/api/upload-beat`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      },
      body: formData
    });

    const text = await res.text();
    alert(text);

    e.target.reset();

  } catch (err) {
    alert("Error subiendo beat");
  }
});

// 🔙 VOLVER
function volver() {
  window.location.href = "dashboard.html";
}


