// === CONFIG ===
const BACKEND_URL = "https://8458e65a-ab25-4804-8d59-f7be6cfab39d-00-1ms5j8fw2r5ut.riker.replit.dev";
const elem = id => document.getElementById(id);

// elementos
const videoEl = elem("screenVideo");
const btnShare = elem("btnShare");
const btnStop = elem("btnStop");
const chat = elem("chat");
const textInput = elem("textInput");
const sendText = elem("sendText");
const startRec = elem("startRec");
const stopRec = elem("stopRec");
const backendStatus = elem("backendStatus");

let screenStream = null;
let mediaRecorder = null;
let recordedChunks = [];

// checar backend (status)
async function checkBackend() {
  try {
    const r = await fetch(BACKEND_URL + "/");
    if (!r.ok) throw new Error("não ok");
    backendStatus.textContent = "online";
    backendStatus.style.color = "#00ff99";
  } catch (e) {
    backendStatus.textContent = "offline";
    backendStatus.style.color = "salmon";
  }
}
checkBackend();
setInterval(checkBackend, 30_000);

// Chat helpers
function addMessage(text, who="bot") {
  const div = document.createElement("div");
  div.className = "msg " + (who==="user" ? "user" : "bot");
  div.innerText = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// SCREEN SHARE
btnShare.addEventListener("click", async () => {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    videoEl.srcObject = screenStream;
    btnStop.disabled = false;
    btnShare.disabled = true;
    addMessage("Tela compartilhada (local). Você pode falar ou digitar.", "bot");
  } catch (err) {
    alert("Erro ao compartilhar tela: " + err.message);
  }
});

btnStop.addEventListener("click", () => {
  if (screenStream) {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    videoEl.srcObject = null;
    btnStop.disabled = true;
    btnShare.disabled = false;
    addMessage("Compartilhamento parado.", "bot");
  }
});

// SEND TEXT
sendText.addEventListener("click", async () => {
  const text = textInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  textInput.value = "";
  try {
    const r = await fetch(BACKEND_URL + "/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const j = await r.json();
    // espera { text: "...", audio_url?: "...", audio_base64?: "..." }
    if (j.text) addMessage(j.text, "bot");
    // tocar audio (se devolveu)
    if (j.audio_url) playAudio(j.audio_url);
    else if (j.audio_base64) playBase64(j.audio_base64);
  } catch (err) {
    addMessage("Erro: " + err.message, "bot");
  }
});

// RECORD AUDIO (microfone) e enviar
startRec.addEventListener("click", async () => {
  try {
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mic);
    mediaRecorder.ondataavailable = e => { if (e.data.size) recordedChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      addMessage("Áudio gravado. Enviando para o servidor...", "user");
      // enviar para backend
      try {
        const fd = new FormData();
        fd.append("file", blob, "voice.webm");
        const r = await fetch(BACKEND_URL + "/audio", { method: "POST", body: fd });
        const j = await r.json();
        if (j.text) addMessage(j.text, "bot");
        if (j.audio_url) playAudio(j.audio_url);
        else if (j.audio_base64) playBase64(j.audio_base64);
      } catch (err) {
        addMessage("Erro no envio do áudio: " + err.message, "bot");
      }
    };
    mediaRecorder.start();
    startRec.disabled = true;
    stopRec.disabled = false;
    addMessage("Gravando... pressione Parar quando terminar.", "bot");
  } catch (err) {
    alert("Erro ao acessar o microfone: " + err.message);
  }
});

stopRec.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    startRec.disabled = false;
    stopRec.disabled = true;
  }
});

// util: tocar audio por URL
function playAudio(url){
  try {
    const a = new Audio(url);
    a.play().catch(()=>{});
  } catch(e){}
}

// util: tocar base64 (wav/ogg) retornado do backend
function playBase64(base64){
  try {
    const audio = new Audio("data:audio/wav;base64," + base64);
    audio.play().catch(()=>{});
  } catch(e){}
}

// teste rápido no load
window.addEventListener("load", () => {
  addMessage("Bem-vinda! Para testar, compartilhe a tela ou escreva algo e clique em Enviar.", "bot");
});
