let stream;
let gravando = false;
let rec;

const BACKEND = "https://SEU-BACKEND.onrender.com"; // depois você troca isso

async function compartilharTela() {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    document.getElementById("tela").srcObject = stream;
}

async function enviarFrame(pergunta="") {
    let video = document.getElementById("tela");

    let canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    let frame = canvas.toDataURL("image/jpeg");

    const respostaDiv = document.getElementById("resposta");

    respostaDiv.innerHTML = "Processando...";

    const resp = await fetch(BACKEND + "/analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame, pergunta })
    });

    const data = await resp.json();

    respostaDiv.innerHTML = data.texto;

    if (data.audio) {
        let audio = document.getElementById("audioResposta");
        audio.src = "data:audio/mp3;base64," + data.audio;
        audio.play();
    }
}

async function enviarTexto() {
    let t = document.getElementById("textoUsuario").value;
    enviarFrame(t);
}

function gravarAudio() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        rec = new MediaRecorder(stream);
        let chunks = [];

        rec.ondataavailable = e => chunks.push(e.data);

        rec.onstop = async () => {
            let blob = new Blob(chunks, { type: "audio/mp3" });
            let reader = new FileReader();
            reader.onloadend = () => {
                fetch(BACKEND + "/audio", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ audio: reader.result })
                })
                .then(r => r.json())
                .then(data => {
                    document.getElementById("resposta").innerHTML = data.texto;
                    let audio = document.getElementById("audioResposta");
                    audio.src = "data:audio/mp3;base64," + data.audio;
                    audio.play();
                });
            };
            reader.readAsDataURL(blob);
        };

        if (!gravando) {
            rec.start();
            gravando = true;
            alert("Gravando... fale agora. Clique de novo para parar.");
        } else {
            rec.stop();
            gravando = false;
        }
    });
}
