// Configuração inicial do JsSIP
let sipNumber;
let pass;
let configuration;
let dialpanacount = "800";
let ua;
let ipNumber = "www.homologacaotracevia.com.br";

const path = window.location.pathname;
const routerId = path.split("/").filter(Boolean)[0];
const adre = `https://api.homologacaotracevia.com.br/api/v1/sip/${routerId}`;

const mainSection = document.querySelector("#main-section");
const loadingSection = document.querySelector("#loading-section");
const loginName = document.querySelector("#login-name");

let audio;
const deviceId = getDeviceId();

// Inicializa SIP
async function initializeSipNumber() {
    const sipNumbere = await getFreeSip();
    sipNumber = Object.keys(sipNumbere)[0];
    pass = Object.values(sipNumbere)[0];
}

initializeSipNumber()
    .then(() => {
        configuration = initialWebSocketConfiguration();
        ua = new JsSIP.UA(configuration);

        ua.on("registered", () => {
            updateSectionDisplay(true, false);
            updateMainSection("Haz clic en el botón de abajo para hablar con un agente.");
        });

        ua.on("registrationFailed", (e) => {
            console.log("Falha no registro SIP:", e);
            updateSectionDisplay(false, true);
            alert("Falha ao registrar o ramal SIP.");
        });

        ua.start();
    })
    .catch((error) => {
        console.log("Erro ao inicializar SIP:", error);
        updateSectionDisplay(false, true);
    });

function updateSectionDisplay(mainSectionDisplay, loadingSectionDisplay) {
    mainSection.style.display = mainSectionDisplay ? "flex" : "none";
    loadingSection.style.display = loadingSectionDisplay ? "flex" : "none";
}

function getDeviceId() {
    let deviceId = sessionStorage.getItem("deviceId");

    if (!deviceId) {
        deviceId = window.crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
        sessionStorage.setItem("deviceId", deviceId);
    }

    return deviceId;
}

function updateMainSection(content) {
    loginName.innerHTML = content;
}

function initialWebSocketConfiguration() {
    const socket = new JsSIP.WebSocketInterface("wss://homologacaotracevia.com.br/ws");

    return {
        uri: `sip:${sipNumber}@${ipNumber}`,
        password: pass,
        sockets: [socket],
        register: true,
        session_timers: false,
        register_expires: 600
    };
}

// Variável para armazenar a sessão atual
let currentSession = null;

// Função para iniciar uma chamada
async function startCall() {
    if (currentSession) {
        return;
    }

    const eventHandlers = {
        progress: function () {
            playAudio("outgoing");
        },
        failed: function (e) {
            console.log("Chamada falhou:", e?.cause || e);
            currentSession = null;
            manipulateSoSButton(false);
            stopAudio();
        },
        ended: function (e) {
            console.log("Chamada encerrada:", e?.cause || e);
            currentSession = null;
            manipulateSoSButton(false);
            stopAudio();
        },
        confirmed: function () {
            stopAudio();
            manipulateSoSButton(true, true);
        }
    };

    const options = {
        eventHandlers: eventHandlers,
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        if (!stream) {
            throw new Error("Erro ao capturar stream de áudio.");
        }

        manipulateSoSButton(true);
        await sendCallInfos();

        currentSession = ua.call(`sip:${dialpanacount}@${ipNumber}`, options);

        currentSession.connection.addEventListener("track", (event) => {
            const remoteStream = new MediaStream();
            remoteStream.addTrack(event.track);

            const remoteAudio = document.createElement("audio");
            remoteAudio.srcObject = remoteStream;
            remoteAudio.play();
        });
    } catch (error) {
        alert("Erro ao acessar o microfone ou iniciar a chamada. Atualize a página e dê as permissões necessárias.");
        manipulateSoSButton(false);
        console.log(error);
    }
}

// Função para encerrar a chamada atual
function endCall() {
    if (currentSession) {
        currentSession.terminate();
        currentSession = null;
    } else {
        console.log("Nenhuma chamada em andamento para encerrar.");
    }

    manipulateSoSButton(false);
}

function playAudio(audioName) {
    const audioLocations = {
        outgoing: "./src/sounds/outgoing.mp3"
    };

    audio = new Audio(audioLocations[audioName]);
    audio.volume = 0.6;
    audio.loop = true;
    audio.play();
}

function stopAudio() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

function manipulateSoSButton(state, progress) {
    const button = document.querySelector("#sos-button");
    const text = document.querySelector("#login-name");

    button.textContent = state ? "Cancelar" : "Llamar";
    text.textContent = state
        ? "Buscando agente..."
        : "Haz clic en el botón de abajo para hablar con un agente.";

    if (progress && state) {
        text.textContent = "Em ligação";
    }
}

function updateCallButton() {
    const callButton = document.querySelector("#sos-button");
    callButton.textContent = currentSession ? "Desligar" : "Chamar";
}

// Evento de clique do botão de chamada
document.querySelector("#sos-button").addEventListener("click", async () => {
    if (currentSession) {
        endCall();
    } else {
        await startCall();
    }
});

// Encerra o UA ao sair da página
window.addEventListener("beforeunload", () => {
    if (ua) {
        ua.unregister();
        ua.transport.disconnect();
    }
});

async function sendCallInfos() {
    const response = await fetch("https://api.homologacaotracevia.com.br/api/v1/register-call", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sip: sipNumber,
            router: routerId
        })
    });

    if (!response.ok) {
        const text = await response.text();
        alert("Favor, atualize a página e tente realizar a ligação novamente");
        throw new Error(`Erro na requisição de chamada: ${response.status} - ${text}`);
    }

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await response.json();
    }

    return await response.text();
}

async function getFreeSip() {
    try {
        const response = await fetch(adre, {
            method: "GET"
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Erro ${response.status}: ${text}`);
        }

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            throw new Error(`Resposta inesperada da API: ${text}`);
        }

        const sipData = await response.json();
        return sipData;
    } catch (e) {
        console.log("Erro ao obter sip");
        console.log(e);
        alert("Atualize a página ou troque de roteador");
        throw e;
    }
}
