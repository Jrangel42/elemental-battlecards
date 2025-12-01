// createRoomScene.js
import Phaser from "phaser";

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
                <button class="btn-exit">Atrás</button>
            </header>

            <div class="main">

                <!-- LEFT: CREATE ROOM PANEL -->
                <section class="panel">
                    <h2 style="margin-bottom:20px">Crear Sala</h2>
                    <p>Comparte el código con tu amigo para que se una.</p>

                    <div id="room-code" class="input-box">XXX XXX</div>

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
            this.scene.start("HomeScenes");
        });
        if (startBtn) startBtn.addEventListener('click', () => {
            this.scene.start("GameScene");
        });

        node.querySelector("#btn-join").onclick = () => {
            const code = node.querySelector("#input-room-code").value;
            console.log("Intentando unirse a sala:", code);
        };

        // Responsive
        this.scale.on("resize", this.onResize, this);
    }

    onResize(gameSize) {
        const { width, height } = gameSize;

        if (this.bg) this.bg.setDisplaySize(width, height);

        if (this.domUI) {
            const node = this.domUI.node;
            node.style.width = width + "px";
            node.style.height = height + "px";
        }
    }
}