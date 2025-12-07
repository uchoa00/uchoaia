async function iniciarCompartilhamentoDeTela() {
    const videoElement = document.getElementById("telaCompartilhada");

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: false
        });

        videoElement.srcObject = stream;

    } catch (error) {
        alert("Erro ao compartilhar tela: " + error);
    }
}
