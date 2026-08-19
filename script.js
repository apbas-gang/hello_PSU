// The browser only calls our local backend. The API key stays on the server in an
// environment variable, so it is never exposed to people using this page.
const TRANSLATION_API_URL = "/api/translate";
const MAX_CHARS = 1000;

const sourceText = document.querySelector("#sourceText");
const outputText = document.querySelector("#outputText");
const charCount = document.querySelector("#charCount");
const translateButton = document.querySelector("#translateButton");
const swapButton = document.querySelector("#swapButton");
const clearButton = document.querySelector("#clearButton");
const copyButton = document.querySelector("#copyButton");
const speakButton = document.querySelector("#speakButton");
const sourceLanguage = document.querySelector("#sourceLanguage");
const targetLanguage = document.querySelector("#targetLanguage");
const toast = document.querySelector("#toast");
const dialectSelect = document.querySelector("#dialectSelect");
let isDialectToCentral = false;
let toastTimer;

function updateCharacterCount() { charCount.textContent = `${sourceText.value.length.toLocaleString("th-TH")} / ${MAX_CHARS.toLocaleString("th-TH")}`; }
function showToast(message, type = "error") { clearTimeout(toastTimer); toast.textContent = message; toast.className = `toast ${type} show`; toastTimer = setTimeout(() => { toast.className = "toast"; }, 3800); }
function setOutput(text = "") { outputText.textContent = text; if (!text) outputText.innerHTML = '<span class="output-placeholder">คำแปลของคุณจะแสดงที่นี่</span>'; copyButton.disabled = !text; speakButton.disabled = !text; if (!text) stopSpeaking(); }
function setLoading(isLoading) { translateButton.disabled = isLoading; translateButton.classList.toggle("is-loading", isLoading); translateButton.querySelector(".button-label").textContent = isLoading ? "กำลังแปล..." : "แปลภาษา"; }

/** Switches the source and destination languages, and preserves text for quick re-translation. */
function swapDirection() {
  isDialectToCentral = !isDialectToCentral;
  sourceLanguage.textContent = isDialectToCentral ? "ภาษาถิ่น" : "ไทยกลาง";
  targetLanguage.textContent = isDialectToCentral ? "ไทยกลาง" : "ภาษาถิ่น";
  if (outputText.textContent.trim()) { sourceText.value = outputText.textContent.trim(); setOutput(); updateCharacterCount(); }
  sourceText.placeholder = isDialectToCentral ? "พิมพ์ภาษาถิ่นที่อยากแปลตรงนี้..." : "พิมพ์ข้อความที่อยากแปลตรงนี้...";
}

/** Sends text to the local backend, which securely calls the configured AI provider. */
async function translate() {
  const text = sourceText.value.trim();
  if (!text) return showToast("กรุณาพิมพ์ข้อความที่ต้องการแปล");
  setLoading(true); setOutput();
  try {
    const response = await fetch(TRANSLATION_API_URL, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ text, dialectToCentral:isDialectToCentral, targetDialect:dialectSelect.value }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `ไม่สามารถเชื่อมต่อบริการแปลภาษาได้ (รหัส ${response.status})`);
    const translated = data.translation?.trim();
    if (!translated) throw new Error("API ไม่ส่งคำแปลกลับมา กรุณาลองใหม่อีกครั้ง");
    setOutput(translated); showToast("แปลภาษาเรียบร้อยแล้ว", "success");
  } catch (error) { setOutput(); showToast(error instanceof TypeError ? "เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาตรวจสอบแล้วลองใหม่" : error.message); }
  finally { setLoading(false); }
}

sourceText.addEventListener("input", updateCharacterCount);
translateButton.addEventListener("click", translate);
swapButton.addEventListener("click", swapDirection);
clearButton.addEventListener("click", () => { sourceText.value = ""; updateCharacterCount(); sourceText.focus(); });
copyButton.addEventListener("click", async () => { try { await navigator.clipboard.writeText(outputText.textContent.trim()); showToast("คัดลอกคำแปลแล้ว", "success"); } catch { showToast("ไม่สามารถคัดลอกได้ กรุณาคัดลอกด้วยตนเอง"); } });
speakButton.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) return showToast("เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง");
  if (speechSynthesis.speaking) return stopSpeaking();
  const utterance = new SpeechSynthesisUtterance(outputText.textContent.trim());
  utterance.lang = "th-TH"; utterance.rate = 0.9; utterance.pitch = 1;
  utterance.onstart = () => { speakButton.classList.add("is-speaking"); speakButton.innerHTML = '<span aria-hidden="true">■</span> หยุดเสียง'; };
  utterance.onend = utterance.onerror = () => { speakButton.classList.remove("is-speaking"); speakButton.innerHTML = '<span aria-hidden="true">▶</span> ฟังเสียง'; };
  speechSynthesis.speak(utterance);
});
function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel(); speakButton.classList.remove("is-speaking"); speakButton.innerHTML = '<span aria-hidden="true">▶</span> ฟังเสียง'; }
document.querySelectorAll(".phrase-button").forEach((button) => button.addEventListener("click", () => { sourceText.value = button.dataset.phrase; updateCharacterCount(); sourceText.focus(); }));
sourceText.addEventListener("keydown", (event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") translate(); });
updateCharacterCount();
