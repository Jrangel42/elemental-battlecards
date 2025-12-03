// createRoomScene.js
import Phaser from "phaser";
import { io } from 'socket.io-client';

export default class CreateRoomScene extends Phaser.Scene {
    constructor() {
        super("CreateRoomScene");
        this.playerData = null;
    }

    init(data) {
        this.playerData = data;
    }

    preload() {
        this.load.image("home-background", "/assets/images/home.png");
    }

    create() {
        const { width, height } = this.scale;

        // BACKGROUND
        this.bg = this.add.image(width / 2, height / 2, "home-background");
        this.bg.setDisplaySize(width, height);

        // HTML UI TEMPLATE
        const html = `
        <style>
            :host { box-sizing: border-box; }

            .wrap {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                color: white;
                font-family: Poppins, Arial;
                overflow: hidden;
            }

            /* HEADER */
            .header {
                flex: 0 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 28px;
                max-width: 100%;
            }
            .logo-box { display: flex; align-items: center; gap: 12px; }
            .logo { width: 50px; height: 50px; }
            .user { font-size: 14px; opacity: 0.85; }
            .btn-exit {
                background: #b90000;
                padding: 10px 16px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                color: white;
                font-weight: bold;
            }

            /* MAIN */
            .main {
                flex: 1;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 5vw;
                padding: 2.5vh 3vw;
            }

            /* REUSED PANEL */
            .panel {
                background: rgba(0,0,0,0.45);
                backdrop-filter: blur(8px);
                border-radius: 14px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                width: 35%;
                max-width: 520px;
                min-width: 320px;
                box-shadow: 0 0 12px rgba(0,0,0,0.55);
            }

            h2 { margin: 0; font-size: 28px; }
            p { margin: 0 0 18px 0; }

            .input-box {
                background: rgba(255,255,255,0.08);
                border-radius: 10px;
                padding: 12px;
                margin-bottom: 20px;
                color: #b26aff;
                font-size: 22px;
                text-align: center;
            }

            .btn-primary {
                padding: 12px;
                background: #8a00ff;
                border-radius: 8px;
                border: none;
                color: white;
                cursor: pointer;
                margin-top: 10px;
            }
        </style>

        <div class="wrap">
            <header class="header">
                <div class="logo-box">
                    <img class="logo" src="/assets/images/logo.png" />
                    <div>
                        <h1 style="margin:0; font-size:22px;">Elemental Battlecards</h1>
                        <span class="user">Jugador: ${this.playerData?.username || ""}</span>
                    </div>
                </div>
                <button class="btn-exit">Salir</button>
            </header>

            <div class="main">

                <!-- LEFT: CREATE ROOM PANEL -->
                <section class="panel">
                    <h2 style="margin-bottom:20px">Crear Sala</h2>
                    <p>Comparte el código con tu amigo para que se una.</p>

                    <div id="room-code" class="input-box">XXX XXX</div>
                    <button id="btn-copy" class="btn-primary" style="margin-top:8px; padding:8px 10px; font-size:14px;">Copiar código</button>

                    <h3 style="margin-top:10px; margin-bottom:10px">Jugadores en sala: 1/2</h3>
                    <div class="input-box">${this.playerData?.username || "Tú"} (Anfitrión)</div>
                    <div class="input-box" style="color:white; opacity:0.6;">Esperando jugador...</div>

                    <button class="btn-primary" id="btn-start">Jugar Ahora!</button>
                </section>

                <!-- RIGHT: JOIN ROOM PANEL -->
                <section class="panel">
                    <h2 style="margin-bottom:20px">Unirse a sala</h2>
                    <p>Ingresa el código que te compartieron.</p>
                    <input id="input-room-code" class="input-box" placeholder="XXX XXX" style="font-size:20px; color:white;">
                    <button class="btn-primary" id="btn-join">Unirse a sala</button>
                </section>

            </div>
        </div>`;

        // DOM UI
        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        const node = this.domUI.node;
        node.style.position = "absolute";
        node.style.left = 0;
        node.style.top = 0;
        node.style.width = width + "px";
        node.style.height = height + "px";

        // BUTTONS
        const exitBtn = node.querySelector(".btn-exit");
        const startBtn = node.querySelector("#btn-start");
        if (exitBtn) exitBtn.addEventListener('click', () => {
            // Use start to ensure the scene is launched/returned to reliably
            this.scene.start("HomeScenes");
        });

        // Inicializar socket después de que el DOM exista
        // Determinar URL del backend (prioridad):
        // 1) Parametro de query ?backend=http://IP:PORT
        // 2) Variable global `window.BACKEND_URL` (útil para VS Code previews)
        // 3) Por defecto usar location.hostname con puerto 3001
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        let SERVER_URL = null;
        if (params.has('backend')) {
            SERVER_URL = params.get('backend');
        } else if (typeof window !== 'undefined' && window.BACKEND_URL) {
            SERVER_URL = window.BACKEND_URL;
        } else if (typeof window !== 'undefined') {
            SERVER_URL = `http://${location.hostname}:3001`;
        } else {
            SERVER_URL = 'http://localhost:3001';
        }
        console.log('Usando BACKEND_URL =', SERVER_URL);
        this.socket = io(SERVER_URL);
        this.currentRoom = null;
        this.playersInRoom = 0;

        this.socket.on('connect', () => {
            console.log('Socket conectado (cliente):', this.socket.id);
        });

        const formatCode = (c) => {
            if (!c) return '';
            const s = c.toString().replace(/\s+/g, '');
            return s.slice(0,3) + (s.length > 3 ? ' ' + s.slice(3) : '');
        };

        const updateCodeUI = (code) => {
            this.currentRoom = code;
            const codeEl = this.domUI.node.querySelector('#room-code');
            if (codeEl) codeEl.textContent = formatCode(code);
            this.playersInRoom = 1;
            const playersEl = this.domUI.node.querySelector('h3');
            if (playersEl) playersEl.textContent = `Jugadores en sala: ${this.playersInRoom}/2`;
            const statusEl = this.domUI.node.querySelectorAll('.input-box')[3];
            if (statusEl) statusEl.textContent = 'Esperando jugador...';
            const copyBtn = this.domUI.node.querySelector('#btn-copy');
            if (copyBtn) copyBtn.disabled = false;
        };

        this.socket.on('room_created', ({ code }) => {
            updateCodeUI(code);
        });

        this.socket.on('player_joined', ({ players }) => {
            this.playersInRoom = players || (this.playersInRoom + 1);
            const playersEl = this.domUI.node.querySelector('h3');
            if (playersEl) playersEl.textContent = `Jugadores en sala: ${this.playersInRoom}/2`;
            const statusEl = this.domUI.node.querySelectorAll('.input-box')[3];
            if (statusEl) statusEl.textContent = 'Jugador conectado!';
        });

        this.socket.on('player_left', () => {
            this.playersInRoom = Math.max(1, this.playersInRoom - 1);
            const playersEl = this.domUI.node.querySelector('h3');
            if (playersEl) playersEl.textContent = `Jugadores en sala: ${this.playersInRoom}/2`;
            const statusEl = this.domUI.node.querySelectorAll('.input-box')[3];
            if (statusEl) statusEl.textContent = 'Esperando jugador...';
        });

        this.socket.on('game_event', (payload) => {
            console.log('Evento de juego recibido:', payload);
        });

        // flag para decidir si mantener socket al cambiar de escena
        this.keepSocket = false;

        if (startBtn) startBtn.addEventListener('click', () => {
            // Si no hay sala, crearla; si ya existe y hay 2 jugadores, iniciar escena de juego
            if (!this.currentRoom) {
                this.socket.emit('create_room', (res) => {
                    if (res && res.success && res.code) {
                        console.log('Sala creada con código', res.code);
                        // UI se actualiza por el evento 'room_created'
                        // también actualizamos inmediatamente por si el evento llega después
                        updateCodeUI(res.code);
                        // Mantener el socket vivo y lanzar la escena LAN
                        this.keepSocket = true;
                        this.scene.start('GameSceneLAN', { roomCode: res.code, socket: this.socket, playerData: this.playerData });
                    } else {
                        console.error('Error creando sala', res);
                    }
                });
            } else {
                if (this.playersInRoom >= 2) {
                    this.keepSocket = true;
                    this.scene.start('GameSceneLAN', { roomCode: this.currentRoom, socket: this.socket, playerData: this.playerData });
                } else {
                    console.log('Esperando al segundo jugador antes de iniciar.');
                }
            }
        });

        const joinBtn = node.querySelector('#btn-join');
        if (joinBtn) {
            joinBtn.onclick = () => {
                const code = node.querySelector('#input-room-code').value.replace(/\s+/g, '');
                if (!code) return console.warn('Código vacío');
                this.socket.emit('join_room', { code }, (res) => {
                    if (res && res.success) {
                            console.log('Entré a la sala', res.code);
                            this.currentRoom = res.code;
                            this.playersInRoom = 2;
                            this.keepSocket = true;
                            this.scene.start('GameSceneLAN', { roomCode: this.currentRoom, socket: this.socket, playerData: this.playerData });
                        } else {
                            console.warn('No se pudo unir a la sala:', res && res.message);
                            alert(res && res.message ? res.message : 'No se pudo unir a la sala');
                        }
                });
            };
        }

        // Copy button handler
        const copyBtn = node.querySelector('#btn-copy');
        if (copyBtn) {
            copyBtn.disabled = true;
            copyBtn.addEventListener('click', async () => {
                if (!this.currentRoom) return;
                const text = this.currentRoom;
                try {
                    await navigator.clipboard.writeText(text);
                    copyBtn.textContent = 'Copiado';
                    setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1500);
                } catch (e) {
                    // fallback
                    const input = document.createElement('input');
                    input.value = text;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    copyBtn.textContent = 'Copiado';
                    setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1500);
                }
            });
        }

        // Responsive
        this.scale.on("resize", this.onResize, this);

        // Cleanup on scene shutdown to avoid resize events after DOM removal
        this.events.on('shutdown', () => {
            this.scale.off("resize", this.onResize, this);
            if (this.domUI && this.domUI.node) {
                // remove any attached DOM listeners if necessary
                const node = this.domUI.node;
                const exitBtn = node.querySelector(".btn-exit");
                const startBtn = node.querySelector("#btn-start");
                const joinBtn = node.querySelector("#btn-join");
                if (exitBtn) exitBtn.removeEventListener('click', () => {});
                if (startBtn) startBtn.removeEventListener('click', () => {});
                if (joinBtn) joinBtn.onclick = null;
                    // Desconectar socket si existe y no queremos mantenerlo (por ejemplo al cerrar la UI)
                    if (this.socket && !this.keepSocket) {
                        try {
                            this.socket.disconnect();
                        } catch (e) {
                            // ignore
                        }
                    }
                this.domUI.destroy();
                this.domUI = null;
            }
        }, this);
    }

    onResize(gameSize) {
        // Defensive: gameSize may be undefined in some calls
        if (!gameSize) return;
        const { width, height } = gameSize;

        if (this.bg) this.bg.setDisplaySize(width, height);

        // Defensive: ensure domUI and its node are present before touching DOM
        if (this.domUI && this.domUI.node) {
            const node = this.domUI.node;
            if (node.style) {
                node.style.width = width + "px";
                node.style.height = height + "px";
            }
        }
    }
}