import Phaser from "phaser";

export default class CreateRoomScene extends Phaser.Scene {
    constructor() { super("CreateRoomScene"); this.playerData = null; }

    init(data) {
        this.playerData = data;
        console.log('CreateRoomScene iniciada con los datos del jugador:', this.playerData);
    }

    preload() {
        // No es necesario precargar las imágenes aquí, ya que el HTML/CSS las cargarán directamente.
        // Corregido: Sí necesitamos cargar el fondo para que Phaser lo gestione.
        this.load.image('home-background', '/assets/images/home.png');
        console.log("%c[CreateRoomScene] Precargando assets...", "color: #9f7bff");
    }

    create() {
        console.log(`%c[CreateRoomScene] ¡Bienvenido, ${this.playerData.username}!`, "color: #9f7bff");
        const { width, height } = this.scale;

        // 1. Añadimos el fondo como una imagen de Phaser (igual que en LoginScene)
        this.bg = this.add.image(width / 2, height / 2, 'home-background');
        this.bg.setDisplaySize(width, height);

        /**
         * Crea el componente de la barra de navegación.
         * @param {object} playerData - Los datos del jugador para mostrar el nombre.
         * @returns {string} El HTML del navbar.
         */
        const createNavbar = (playerData) => `
            <header class="header">
                <div class="logo-box">
                    <img src="/assets/images/logo.png" class="logo" alt="Logo">
                    <div>
                        <h1>Elemental Battlecards</h1>
                        <span class="user">Jugador: ${playerData.username}</span>
                    </div>
                </div>
                <button class="btn-exit">Salir</button>
            </header>
        `;


        const sceneHTML = `
            <style>
                .home-container {
                    width: 100%;
                    height: 100%; /* Usa vh para asegurar que ocupe toda la altura de la ventana */
                    font-family: Poppins, Arial, sans-serif;
                    color: white;
                    overflow: hidden; /* Evita barras de scroll dentro del elemento DOM */
                }
                .header {
                   width: 100%; display: flex; justify-content: space-between; padding: 20px 40px; align-items: center; box-sizing: border-box; flex-shrink: 0; 
                    }   
                .logo-box { display: flex; align-items: center; gap: 15px; }
                .logo { width: 60px; height: 60px; }
                .logo-box h1 { font-size: 24px; margin: 0; }
                .user { font-size: 14px; opacity: 0.8; }
                .btn-exit {
                    background: #b90000; padding: 10px 20px; border-radius: 8px;
                    border: none; color: white; cursor: pointer; font-weight: bold;
                }
                .main-container {
                    display: flex;
                    gap: 100px; /* Aumentamos el espacio entre paneles */
                    padding: 50px 130px; /* Reducimos el padding vertical y horizontal para dar más espacio */
                    height: calc(100% - 90px); /* Ajusta la altura para el espacio del header */
                } 
                .glass {
                    padding: 30px; border-radius: 12px;
                    background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(8px);
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
                    display: flex; flex-direction: column; /* Para alinear contenido interno */
                }
                .panel h2 { margin-top: 0; }
                .blank-box {
                    width: 100%; height: 160px; background: rgba(255, 255, 255, 0.08);
                    border-radius: 8px; margin: 20px 0;
                }
                .stats {
                    display: grid; grid-template-columns: 1fr auto;
                    gap: 10px; margin-bottom: 25px;
                }
                .play-panel {
                    flex: 9; /* Ocupa el doble de espacio que el panel de estadísticas */
                }
                .stats-panel {
                    flex: 9; /* Ocupa una fracción del espacio */
                }
                .actions { display: flex; flex-direction: column; margin-top: auto; } /* Empuja las acciones al final */
                .btn-primary {
                    width: 100%; background: #8a00ff; border: none; padding: 12px;
                    border-radius: 8px; color: white; font-size: 15px; cursor: pointer;
                    margin-bottom: 10px; transition: 0.2s;
                }
                .btn-primary:hover { background: #b24cff; }
            </style>

            <div class="home-container">
                ${createNavbar(this.playerData)}
                <main class="main-container">
                    <section class="panel glass play-panel">
                        <h2>Iniciar Partida</h2>
                        <p>Haz click en "Jugar Ahora" para comenzar.</p>
                        <div class="blank-box"></div>
                        <button class="btn-primary" id="play-now-btn">Jugar Ahora!</button>
                    </section>
                    <section class="panel glass stats-panel">
                        <h2>Estadísticas</h2>
                        <div class="stats">
                            <span>Partidas jugadas</span><span>0</span>
                            <span>Partidas ganadas</span><span>0</span>
                            <span>Logros</span><span>0/50</span>
                            <span>Tiempo Jugado</span><span>0h 0m</span>
                        </div>
                        <h2>Acciones</h2>
                        <div class="actions">
                            <button class="btn-primary" id="btn-settings">Configuración</button>
                            <button class="btn-primary" id="btn-about">Acerca de</button>
                            <button class="btn-primary" id="btn-mechanics">Mecánicas del juego</button>
                        </div>
                    </section>
                </main>
            </div>
        `;

        // 2. Creamos el elemento DOM y lo centramos
        this.homeElement = this.add.dom(width / 2, height / 2).createFromHTML(sceneHTML);

        // --- LÓGICA DE LOS BOTONES ---

        const btnExit = this.homeElement.node.querySelector('.btn-exit');
        btnExit.addEventListener('click', () => {
            this.scene.stop('LoginScene');
            this.scene.stop('RegisterScene');
            this.scene.start("LoginScene");
        });

        const btnBack = this.homeElement.node.querySelector('#btn-back');
        btnBack.addEventListener('click', () => {
            this.scene.start("HomeScene", this.playerData);
        });

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

    /**
     * Se llama cada vez que la ventana cambia de tamaño.
     * Reajusta el fondo y reposiciona el elemento DOM.
     */
    resize(gameSize) {
        const { width, height } = gameSize;

        // Reajustamos el tamaño del fondo de Phaser
        this.bg.setDisplaySize(width, height);

        // Reposicionamos el elemento DOM en el nuevo centro
        this.homeElement.setPosition(width / 2, height / 2);
    }
}
