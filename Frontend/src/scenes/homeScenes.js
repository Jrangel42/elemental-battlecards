import Phaser from "phaser";

export default class homeScenes extends Phaser.Scene {
    constructor() {
        super("homeScenes");
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

        // UI TEMPLATE
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

            /* MAIN CONTENT */
            .main {
                flex: 1;
                display: flex;
                padding: 2.5vh 3vw;
                gap: 5vw;
                overflow: hidden;
                justify-content: center;     /* CENTRAR PANELS */
                align-items: center;         /* CENTRAR VERTICAL */
            }

            /* PANEL BASE */
            .panel {
                background: rgba(0,0,0,0.45);
                backdrop-filter: blur(8px);
                border-radius: 14px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                flex: 1;                    /* QUE CREZCAN PERO SIN ROMPER */
                height: auto;               /* FIX OVERFLOW */
                max-height: 100%;           /* EVITA SCROLL */
                width: auto;                /* FIX OVERFLOW */
                max-width: 35%;            /* EVITA SCROLL */
                box-shadow: 0 0 12px rgba(0,0,0,0.55);
            }

            /* NUEVO TAMAÑO 60% TOTAL */
            .play-panel {
                height: 60%;
                width: 40%;
                min-width: 320px;
                min-height: 300px;   /* <-- NUEVO: fuerza espacio interno */
                display: flex;
                flex-direction: column;
            }


            .stats-panel {
                display: flex;
                flex-direction: column;
                height: auto;
                width: 20%; 
                min-width: 260px; 
            }

            h2 { margin: 0;
            font-size: 28px; }
            p { margin: 0 0 18px 0; }

            .blank-box {
                flex: 1;                         /* rellena espacio disponible */
                background: rgba(255,255,255,0.08);
                border-radius: 10px;
                margin-bottom: 20px;
            }


            .stats-grid {
                display: grid;
                grid-template-columns: 1fr auto;
                row-gap: 8px;
                margin-bottom: 60px;
                gap: 15px;
            }

            .actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 10px;
            }

            .btn-primary {
                padding: 12px;
                background: #8a00ff;
                border-radius: 8px;
                border: none;
                color: white;
                cursor: pointer;
            }
        </style>

        <div class="wrap">
            <header class="header">
                <div class="logo-box">
                    <img class="logo" src="/assets/images/logo.png">
                    <div>
                        <h1 style="margin:0; font-size:22px;">Elemental Battlecards</h1>
                        <span class="user">Jugador: ${this.playerData?.username || ""}</span>
                    </div>
                </div>
                <button class="btn-exit">Salir</button>
            </header>

            <div class="main">
                <section class="panel play-panel">
                    <h2 style="margin-bottom:20px">Iniciar Partida</h2>
                    <p>Haz click en "Jugar Ahora" para comenzar.</p>
                    <div class="blank-box"></div>
                    <button class="btn-primary" id="play">Jugar Ahora!</button>
                </section>

                <section class="panel stats-panel">
                    <h2 style="margin-bottom:20px">Estadísticas</h2>
                    <div class="stats-grid">
                        <span>Partidas jugadas</span> <span>0</span>
                        <span>Partidas ganadas</span> <span>0</span>
                        <span>Logros</span> <span>0/50</span>
                        <span>Tiempo Jugado</span> <span>0h 0m</span>
                    </div>

                    <h2>Acciones</h2>
                    <div class="actions">
                        <button class="btn-primary">Configuración</button>
                        <button class="btn-primary">Acerca de</button>
                        <button class="btn-primary">Mecánicas del juego</button>
                    </div>
                </section>
            </div>
        </div>`;

        // DOM ELEMENT
        this.domUI = this.add.dom(0, 0).createFromHTML(html);
        this.domUI.setOrigin(0);
        this.domUI.setDepth(9999);

        const node = this.domUI.node;
        node.style.position = "absolute";
        node.style.left = 0;
        node.style.top = 0;
        node.style.width = width + "px";
        node.style.height = height + "px";
        node.style.pointerEvents = "auto";

        // --- LÓGICA DE LOS BOTONES ---
        // EXIT BUTTON
        node.querySelector(".btn-exit").onclick = () => this.scene.start("LoginScene");

        this.scale.on("resize", this.onResize, this);
        const btnCreateRoom = this.homeElement.node.querySelector('#btn-create-room');

        btnCreateRoom.addEventListener('click', () => {
            const roomName = this.homeElement.node.querySelector('#room-name').value;
            const password = this.homeElement.node.querySelector('#room-password').value;
            console.log(`Creando sala... Nombre: ${roomName}, Contraseña: ${password || 'ninguna'}`);
            // Aquí iría la lógica para conectar con el servidor y crear la sala.
            // Por ahora, solo mostraremos un mensaje en consola.
        });

        // 3. Añadimos el listener para que la escena sea responsive
        this.scale.on('resize', this.resize, this);
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
