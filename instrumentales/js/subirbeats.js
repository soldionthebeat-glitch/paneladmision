const API_URL = (["localhost", "127.0.0.1"].includes(window.location.hostname) || window.location.protocol === "file:"
  ? "http://localhost:5000"
  : "https://backend-j3sk.onrender.com");

const SERVICES = [
  "Spotify", "Apple Music", "iTunes", "Instagram", "Facebook",
  "TikTok", "YouTube Music", "Amazon Music", "Pandora", "Deezer",
  "Tidal", "iHeartRadio", "Qobuz", "Saavn", "Boomplay",
  "Anghami", "NetEase", "Tencent", "Claro Musica", "Joox",
  "Kuack Media", "Adaptr", "Flo", "MediaNet", "Snapchat", "Roblox"
];

const GENRES = ["Trap", "Drill", "R&B", "Hip-Hop", "Reggaeton", "Techno", "House", "Lo-Fi", "Pop", "Electronic", "Latin", "Otros"];
const MOODS = ["Dark", "Sad", "Melodico", "Energetico", "Romantico", "Agresivo", "Relajante", "Motivacional"];

let usuarioActual = null;
let fileUidCounter = 0;
const fileMap = new Map();
const audioInstances = new Map();
let autoGenerating = false;

// DOM refs
const $ = (id) => document.getElementById(id);
const serviceGrid = $("serviceGrid");
const audioDropZone = $("audioDropZone");
const audioInput = $("audioInput");
const browseAudioBtn = $("browseAudioBtn");
const trackList = $("trackList");
const trackCount = $("trackCount");
const trackTemplate = $("trackTemplate");
const coverDrop = $("coverDrop");
const coverInput = $("coverInput");
const coverPreview = $("coverPreview");
const submitBtn = $("submitBtn");
const msg = $("msg");
const userBadge = $("userBadge");
const toggleExtras = $("toggleExtras");
const extrasBody = $("extrasBody");
const reviewContent = $("reviewContent");
const toggleAllServices = $("toggleAllServices");
const artistName = $("artistName");
const trackCountSelect = $("trackCountSelect");

function token() { return localStorage.getItem("token"); }
function authHeaders(extra = {}) { return { ...extra, Authorization: "Bearer " + token() }; }

function showMessage(text, type) {
  msg.className = type;
  msg.textContent = text;
}

function clearMessage() {
  msg.className = "";
  msg.textContent = "";
}

// ─── Utilities ──────────────────────────────────
function stripExtension(filename) {
  return String(filename || "").replace(/\.[^/.]+$/, "");
}

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "";
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    audio.src = url;
  });
}

function readId3Metadata(file) {
  return new Promise((resolve) => {
    if (!file || typeof jsmediatags === "undefined") { resolve({}); return; }
    jsmediatags.read(file, {
      onSuccess(tag) {
        const t = tag.tags || {};
        resolve({ title: t.title || t.TIT2?.data || "", artist: t.artist || t.TPE1?.data || "", bpm: t.bpm || t.TBPM?.data || t.tempo || "", genre: t.genre || t.TCON?.data || "" });
      },
      onError() { resolve({}); }
    });
  });
}

function parseFilenameMetadata(filename) {
  const name = stripExtension(filename);
  const r = { title: "", bpm: "", key: "" };
  const bpmLabeled = name.match(/(\d{2,3})\s*bpm/i);
  const anyNumber = name.match(/(\d{2,3})/);
  r.bpm = bpmLabeled?.[1] || anyNumber?.[1] || "";
  const notes = ["C#", "D#", "F#", "G#", "A#", "C", "D", "E", "F", "G", "A", "B"];
  const np = new RegExp(`\\b(${notes.join("|")})\\s*(m(?:enor|inor|ajor)?|mayor|dim|aug)?\\b`, "i");
  const km = name.match(np);
  if (km) {
    const note = km[1].toUpperCase();
    const q = (km[2] || "").toLowerCase();
    const sfx = { m: "menor", minor: "menor", men: "menor", menor: "menor", major: "mayor", mayor: "mayor", dim: "dim", aug: "aug" };
    r.key = q ? `${note} ${sfx[q] || q}` : note;
  }
  let clean = name.replace(/[([{\[].*?[\])}\]]/g, "").replace(/\d{2,3}\s*bpm/gi, "").replace(/\b\w[#b]?\s*(m(?:enor|inor|ajor)?|mayor|dim|aug)?\b/gi, "").replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (clean) r.title = clean;
  return r;
}

function normalizeGenre(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const m = GENRES.find((g) => g.toLowerCase() === raw || raw.includes(g.toLowerCase()));
  return m || "Otros";
}

// ─── Service Grid ───────────────────────────────
function renderServices() {
  const allChecked = SERVICES.every((s) => {
    const item = serviceGrid.querySelector(`[data-service="${s}"]`);
    return item && item.classList.contains("selected");
  });
  toggleAllServices.textContent = allChecked ? "Deseleccionar todas" : "Seleccionar todas";

  SERVICES.forEach((name) => {
    const div = document.createElement("div");
    div.className = "service-item selected";
    div.dataset.service = name;
    div.innerHTML = `<div class="service-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#030b18" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div><span>${name}</span>`;
    div.addEventListener("click", () => {
      div.classList.toggle("selected");
      updateToggleAllText();
    });
    serviceGrid.appendChild(div);
  });
}

function updateToggleAllText() {
  const allSelected = [...serviceGrid.querySelectorAll(".service-item")].every((el) => el.classList.contains("selected"));
  toggleAllServices.textContent = allSelected ? "Deseleccionar todas" : "Seleccionar todas";
}

toggleAllServices.addEventListener("click", () => {
  const items = [...serviceGrid.querySelectorAll(".service-item")];
  const allSelected = items.every((el) => el.classList.contains("selected"));
  items.forEach((el) => el.classList.toggle("selected", !allSelected));
  toggleAllServices.textContent = allSelected ? "Seleccionar todas" : "Deseleccionar todas";
});

// ─── Cover Upload ───────────────────────────────
coverDrop.addEventListener("click", () => coverInput.click());

coverInput.addEventListener("change", () => {
  const file = coverInput.files?.[0];
  if (!file) return;
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  coverPreview.innerHTML = "";
  coverPreview.appendChild(img);
});

// ─── Track Creation ─────────────────────────────
function stopAllAudio() {
  audioInstances.forEach((inst) => { inst.pause(); inst.currentTime = 0; });
  audioInstances.clear();
  trackList.querySelectorAll(".track-play.playing").forEach((btn) => btn.classList.remove("playing"));
}

function renumberTracks() {
  trackList.querySelectorAll(".track").forEach((t, i) => {
    t.querySelector(".track-num").textContent = i + 1;
  });
}

function addCreditRow(creditsList) {
  const row = document.createElement("div");
  row.className = "credit-row";
  row.innerHTML = `
    <select data-field="creditRole">
      <option value="producer">Productor</option>
      <option value="performer">Interprete</option>
      <option value="writer">Compositor</option>
      <option value="engineer">Ingeniero</option>
    </select>
    <div style="display:flex;gap:6px">
      <input type="text" data-field="creditName" placeholder="Nombre" style="flex:1">
      <button type="button" class="btn-remove-track" style="width:28px;height:28px" title="Quitar">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`;
  row.querySelector(".btn-remove-track").addEventListener("click", () => row.remove());
  creditsList.appendChild(row);
}

function applyAutoMetadata(track, file) {
  if (!file) return Promise.resolve();
  return Promise.all([readId3Metadata(file), readAudioDuration(file)]).then(([meta, durationSec]) => {
    const fileMeta = parseFilenameMetadata(file.name);
    const titleInput = track.querySelector('[data-field="title"]');
    const bpmInput = track.querySelector('[data-field="bpm"]');
    const keyInput = track.querySelector('[data-field="key"]');
    const genreSelect = track.querySelector('[data-field="genre"]');
    const durationInput = track.querySelector('[data-field="duration"]');

    if (!titleInput.value.trim()) titleInput.value = meta.title || fileMeta.title || stripExtension(file.name);
    if (!bpmInput.value.trim() && (meta.bpm || fileMeta.bpm)) bpmInput.value = parseInt(meta.bpm || fileMeta.bpm, 10) || meta.bpm || fileMeta.bpm;
    if (!keyInput.value.trim()) keyInput.value = meta.key || fileMeta.key;
    if (!genreSelect.value && meta.genre) genreSelect.value = normalizeGenre(meta.genre);
    if (durationSec) durationInput.value = durationSec;

    const durDisplay = track.querySelector('[data-field="duration-display"]');
    if (durDisplay) durDisplay.textContent = durationSec ? formatDuration(durationSec) : "";
  });
}

function createTrack(file) {
  const uid = ++fileUidCounter;
  if (file) fileMap.set(uid, file);

  const clone = trackTemplate.content.cloneNode(true);
  const track = clone.querySelector(".track");
  track.dataset.uid = uid;

  // Head elements
  const playBtn = track.querySelector(".track-play");
  const playIcon = track.querySelector(".play-icon");
  const pauseIcon = track.querySelector(".pause-icon");
  const expandBtn = track.querySelector(".btn-expand");
  const removeBtn = track.querySelector(".btn-remove-track");
  const trackBody = track.querySelector(".track-body");
  const titleInput = track.querySelector('[data-field="title"]');
  const artistDisplay = track.querySelector('[data-field="artist-display"]');
  const durDisplay = track.querySelector('[data-field="duration-display"]');
  const fileUpload = track.querySelector('[data-field="fileUpload"]');
  const fileStatus = track.querySelector('[data-field="fileStatus"]');
  const fileInputEl = fileUpload.querySelector("input[type=file]");
  const creditsList = track.querySelector('[data-field="creditsList"]');
  const addCreditBtn = track.querySelector('[data-field="addCredit"]');

  if (!file) {
    playBtn.style.display = "none";
    fileStatus.textContent = "Seleccionar archivo de audio";
    fileUpload.classList.remove("has-file");
  }

  // Play button
  playBtn.addEventListener("click", () => {
    const u = Number(track.dataset.uid);
    const cur = audioInstances.get(u);
    if (cur) {
      cur.pause(); cur.currentTime = 0;
      audioInstances.delete(u);
      playBtn.classList.remove("playing");
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
      return;
    }
    stopAllAudio();
    const f = fileMap.get(u);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const audio = new Audio(url);
    audio.addEventListener("ended", () => {
      audioInstances.delete(u);
      playBtn.classList.remove("playing");
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
      URL.revokeObjectURL(url);
    });
    audioInstances.set(u, audio);
    playBtn.classList.add("playing");
    playIcon.classList.add("hidden");
    pauseIcon.classList.remove("hidden");
    audio.play();
  });

  // Expand
  expandBtn.addEventListener("click", () => {
    const h = trackBody.classList.toggle("hidden");
    expandBtn.classList.toggle("expanded", !h);
  });

  // Remove
  removeBtn.addEventListener("click", () => {
    stopAllAudio();
    fileMap.delete(Number(track.dataset.uid));
    track.remove();
    renumberTracks();
    updateTrackCount();
    updateReview();
  });

  // Artist name sync
  const updateArtistDisplay = () => {
    const name = artistName.value.trim() || "Soldi On The Beat";
    const featVal = track.querySelector('[data-field="featuredArtist"]')?.value?.trim();
    artistDisplay.textContent = featVal ? `${name} ft. ${featVal}` : name;
  };

  artistName.addEventListener("input", updateArtistDisplay);
  titleInput.addEventListener("input", () => { updateReview(); });

  // File upload within track
  fileUpload.addEventListener("click", () => fileInputEl.click());
  fileInputEl.addEventListener("change", () => {
    const f = fileInputEl.files?.[0];
    if (!f) return;
    fileMap.set(uid, f);
    fileStatus.textContent = f.name;
    fileUpload.classList.add("has-file");
    if (playBtn) playBtn.style.display = "";
    applyAutoMetadata(track, f).then(() => { updateReview(); });
  });

  // Featured artist
  const featInput = track.querySelector('[data-field="featuredArtist"]');
  if (featInput) featInput.addEventListener("input", updateArtistDisplay);

  // Credits
  addCreditBtn.addEventListener("click", () => addCreditRow(creditsList));

  // Auto-metadata from audio file
  applyAutoMetadata(track, file).then(() => {
    updateArtistDisplay();
    updateReview();
  });

  // Re-render on any input change
  track.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("change", () => updateReview());
    el.addEventListener("input", () => updateReview());
  });

  trackList.appendChild(track);
  renumberTracks();
  updateTrackCount();
  updateReview();
  return track;
}

function updateTrackCount() {
  const count = trackList.querySelectorAll(".track").length;
  trackCount.textContent = `${count} instrumental${count === 1 ? "" : "es"}`;
}

function generateTracks(count) {
  stopAllAudio();
  fileMap.clear();
  trackList.innerHTML = "";
  for (let i = 0; i < count; i++) {
    createTrack(null);
  }
  renumberTracks();
  updateTrackCount();
  updateReview();
}

function populateTrackCountSelect() {
  for (let i = 1; i <= 35; i++) {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${i} instrumental${i > 1 ? "es" : ""}`;
    trackCountSelect.appendChild(opt);
  }
  trackCountSelect.addEventListener("change", () => {
    const val = trackCountSelect.value;
    if (!val) return;
    generateTracks(Number(val));
  });
}

// ─── Audio Drop Zone ────────────────────────────
browseAudioBtn.addEventListener("click", (e) => { e.stopPropagation(); audioInput.click(); });

audioDropZone.addEventListener("click", () => audioInput.click());

audioDropZone.addEventListener("dragover", (e) => { e.preventDefault(); audioDropZone.classList.add("drag-over"); });
audioDropZone.addEventListener("dragleave", () => audioDropZone.classList.remove("drag-over"));
audioDropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  audioDropZone.classList.remove("drag-over");
  if (e.dataTransfer.files.length) addAudioFiles(e.dataTransfer.files);
});

audioInput.addEventListener("change", () => {
  addAudioFiles(audioInput.files);
  audioInput.value = "";
});

function addAudioFiles(files) {
  clearMessage();
  [...files].filter((f) => f.name.match(/\.(mp3|wav|flac|aiff|m4a)$/i)).forEach((f) => createTrack(f));
}

// ─── Extras Toggle ──────────────────────────────
toggleExtras.addEventListener("click", () => {
  const h = extrasBody.classList.toggle("hidden");
  toggleExtras.textContent = h ? "Mostrar" : "Ocultar";
});

// ─── Review ─────────────────────────────────────
function updateReview() {
  const tracks = trackList.querySelectorAll(".track");
  if (!tracks.length) {
    reviewContent.innerHTML = `<p class="card-hint">Agrega canciones para ver el resumen.</p>`;
    submitBtn.disabled = true;
    return;
  }

  const name = artistName.value.trim() || "Soldi On The Beat";
  const label = $("recordLabel").value || "PRODUCERS GO";
  const date = $("releaseDate").value || "Tan pronto como sea posible";
  const genre = $("primaryGenre").value || "No especificado";

  let html = `<div class="review-summary">`;

  // Release info
  html += `<div class="review-section"><h3>Informacion del lanzamiento</h3>`;
  html += `<div class="review-row"><span class="rv-label">Artista</span><span class="rv-value">${name}</span></div>`;
  html += `<div class="review-row"><span class="rv-label">Discografica</span><span class="rv-value">${label}</span></div>`;
  html += `<div class="review-row"><span class="rv-label">Fecha</span><span class="rv-value">${date}</span></div>`;
  const selectedServices = [...serviceGrid.querySelectorAll(".service-item.selected")].map((el) => el.dataset.service);
  html += `<div class="review-row"><span class="rv-label">Plataformas</span><span class="rv-value">${selectedServices.length} plataformas</span></div>`;
  html += `<div class="review-row"><span class="rv-label">Genero</span><span class="rv-value">${genre}</span></div>`;
  html += `</div>`;

  // Tracks
  html += `<div class="review-section"><h3>Canciones (${tracks.length})</h3>`;
  tracks.forEach((t, i) => {
    const title = t.querySelector('[data-field="title"]').value || `Cancion ${i + 1}`;
    const a = t.querySelector('[data-field="artist-display"]').textContent || name;
    html += `<div class="review-track"><span class="rt-num">${i + 1}</span><span class="rt-title">${title}</span><span class="rt-artist">${a}</span></div>`;
  });
  html += `</div>`;

  // Legal
  const legalOwnership = $("legalOwnership");
  const legalTerms = $("legalTerms");
  if (legalOwnership?.checked && legalTerms?.checked) {
    html += `<div class="review-section" style="border-color:rgba(0,255,154,0.2);background:rgba(0,255,154,0.03)">
      <div class="review-row"><span class="rv-value" style="color:var(--green)">Acuerdos legales aceptados</span></div>
    </div>`;
  } else {
    html += `<div class="review-section" style="border-color:rgba(255,69,96,0.2)">
      <div class="review-row"><span class="rv-value" style="color:var(--red)">Faltan acuerdos legales</span></div>
    </div>`;
  }

  html += `</div>`;
  reviewContent.innerHTML = html;

  submitBtn.disabled = !(legalOwnership?.checked && legalTerms?.checked && tracks.length > 0);
}

// ─── Submit ─────────────────────────────────────
function getSelectedServices() {
  return [...serviceGrid.querySelectorAll(".service-item.selected")].map((el) => el.dataset.service);
}

function buildFormData() {
  const formData = new FormData();
  const tracks = trackList.querySelectorAll(".track");

  formData.append("catalogName", `${artistName.value} - ${new Date().toLocaleDateString()}`);
  formData.append("artistName", artistName.value);
  formData.append("producer", artistName.value);
  formData.append("recordLabel", $("recordLabel").value);
  formData.append("releaseDate", $("releaseDate").value);
  formData.append("releaseType", $("releaseType")?.value || "single");
  formData.append("language", $("language").value);
  formData.append("primaryGenre", $("primaryGenre").value);
  formData.append("secondaryGenre", $("secondaryGenre").value);
  formData.append("previouslyReleased", $("previouslyReleased").value);
  formData.append("services", JSON.stringify(getSelectedServices()));

  // Presence
  [...$("presenceGrid").querySelectorAll("input")].forEach((inp) => {
    formData.append(`presence_${inp.nextElementSibling.textContent.trim()}`, inp.checked ? "yes" : "no");
  });

  const beatsData = [];
  tracks.forEach((track, index) => {
    const get = (field) => {
      const el = track.querySelector(`[data-field="${field}"]`);
      if (!el) return "";
      return el.type === "checkbox" ? (el.checked ? "yes" : "no") : el.value;
    };
    const credits = [...track.querySelectorAll(".credit-row")].map((row) => ({
      role: row.querySelector('[data-field="creditRole"]')?.value || "",
      name: row.querySelector('[data-field="creditName"]')?.value || ""
    }));
    beatsData.push({
      title: get("title"),
      featuredArtist: get("featuredArtist"),
      version: get("version"),
      isrc: get("isrc"),
      bpm: get("bpm"),
      key: get("key"),
      genre: get("genre"),
      mood: get("mood"),
      tags: get("tags"),
      description: get("description"),
      mastering: get("mastering"),
      dolbyAtmos: get("dolbyAtmos"),
      composerFirstName: get("composerFirstName"),
      composerLastName: get("composerLastName"),
      isCover: get("isCover"),
      explicit: get("explicit"),
      radioEdit: get("radioEdit"),
      instrumental: get("instrumental"),
      aiGenerated: get("aiGenerated"),
      previewClip: get("previewClip"),
      price: get("price"),
      duration: get("duration"),
      credits
    });
    const uid = Number(track.dataset.uid);
    const file = fileMap.get(uid);
    if (file) formData.append(`audio_${index}`, file);
  });
  formData.append("beatsJson", JSON.stringify(beatsData));

  const cover = coverInput.files?.[0];
  if (cover) formData.append("catalogCover", cover);

  return formData;
}

submitBtn.addEventListener("click", async () => {
  const tracks = trackList.querySelectorAll(".track");
  if (!tracks.length) {
    showMessage("Selecciona la cantidad de instrumentales primero.", "error");
    return;
  }

  // Check each track has audio file
  const missing = [...tracks].filter(t => !fileMap.has(Number(t.dataset.uid)));
  if (missing.length) {
    showMessage(`Faltan archivos de audio para ${missing.length} instrumental${missing.length > 1 ? "es" : ""}.`, "error");
    return;
  }

  if (!$("legalOwnership").checked || !$("legalTerms").checked) {
    showMessage("Debes aceptar los acuerdos legales para continuar.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Subiendo lanzamiento...";
  stopAllAudio();

  try {
    const res = await fetch(`${API_URL}/api/upload-beat`, {
      method: "POST",
      headers: authHeaders(),
      body: buildFormData()
    });
    const text = await res.text();
    if (!res.ok) { showMessage(text || "Error al subir.", "error"); return; }
    showMessage(text || "Lanzamiento subido correctamente.", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 1800);
  } catch (err) {
    showMessage(err?.message || "Error de conexion con el servidor.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Subir lanzamiento";
  }
});

// ─── Auth ───────────────────────────────────────
async function proteger() {
  if (!token()) { window.location.replace("index.html"); return false; }
  try {
    const res = await fetch(`${API_URL}/api/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Sesion invalida");
    usuarioActual = await res.json();
    const label = usuarioActual.producerName || usuarioActual.email;
    userBadge.textContent = usuarioActual.role === "admin" ? `Admin: ${label}` : label;
    document.body.dataset.role = usuarioActual.role;
    artistName.value = usuarioActual.producerName || "";
    if (usuarioActual.role === "admin") document.querySelectorAll(".admin-only").forEach((el) => el.classList.remove("hidden"));
    return true;
  } catch {
    localStorage.removeItem("token");
    window.location.replace("index.html");
    return false;
  }
}

// ─── Init ───────────────────────────────────────
proteger().then(() => {
  renderServices();
  populateTrackCountSelect();
  updateReview();
});
