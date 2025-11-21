import Phaser from "phaser";
// import { CardTypes } from '../game_objects/card.js'; // Descomenta si lo necesitas

export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super("PreloaderScene");
    }

    /**
     * En preload, SOLO nos enfocamos en registrar los assets que se van a cargar.
     * NO creamos objetos visuales aquí (imágenes, texto, etc.).
     */
    preload() {
        console.log("%c[PreloaderScene] Cargando assets del juego...", "color: #00aaff");

        // Mostramos la barra de progreso que crearemos en `create`.
        this.createLoadingBar();

        // --- Carga de Recursos del JUEGO ---
        // Aquí es donde cargas todo lo que tu juego necesita: cartas, fondos, música, etc.
        // Los assets de la pantalla de carga ('loading-background', 'loading-logo')
        // ya deberían estar cargados por la BootScene.

        // Ejemplo de carga de cartas (adaptado de tu otro archivo preloader)
        /*
        const assetPath = 'assets/images/cards/';
        this.load.image('card_back', `${assetPath}card_back.png`);
        const types = Object.values(CardTypes);
        for (const type of types) {
            for (let level = 1; level <= 3; level++) {
                const key = `${type}_${level}`;
                const url = `${assetPath}${key}.png`;
                this.load.image(key, url);
            }
        }
        */

        // El evento 'complete' nos avisa cuando todo en preload() ha terminado.
        // Es el lugar correcto para iniciar la siguiente escena.
        this.load.on("complete", () => {
            console.log("%c[PreloaderScene] Carga completa.", "color: #7dff6b");
            // La animación de fade out dará una transición suave.
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                // Creamos nuestro usuario temporal
                const temporaryUserData = {
                    username: 'PlayerDev',
                    level: 99,
                };
                // Inicia la escena del juego y le pasa los datos del usuario.
                this.scene.start("HomeScene", temporaryUserData); // Ahora inicia HomeScene
            });
        });
    }

    /**
     * En create, SÍ creamos los objetos visuales de la escena.
     * Este método se ejecuta DESPUÉS de que preload haya registrado todos los archivos.
     */
    create() {
        // --- CREACIÓN DE LA INTERFAZ DE CARGA ---
        // Los assets para esta interfaz ('loading-background', 'loading-logo')
        // fueron cargados en BootScene, por lo que están disponibles inmediatamente.

        const { width, height } = this.scale;

        const bg = this.add.image(width / 2, height / 2, "loading-background");
        bg.setDisplaySize(this.scale.width, this.scale.height);

        this.add.image(width / 2, height * 0.18, "loading-logo").setScale(0.35);

        this.loadingText = this.add.text(width / 2, height * 0.70, "LOADING...", {
            fontFamily: "Poppins", fontSize: "36px", fontStyle: "bold", color: "#e4b05c",
        }).setOrigin(0.5);
        this.animateLoadingText();

        const consejos = [
            "Consejo: Combina tus cartas para ganar ventaja.",
            "Consejo: Observa las debilidades elementales.",
            "Consejo: Planea tu estrategia antes de atacar.",
            "Consejo: Mantén el equilibrio entre ataque y defensa."
        ];
        const consejo = Phaser.Math.RND.pick(consejos);
        this.add.text(width / 2, height * 0.78, consejo, {
            fontFamily: "Poppins", fontSize: "16px", color: "#ffffff"
        }).setOrigin(0.5);
    }

    /**
     * Crea los elementos visuales para la barra de carga.
     */
    createLoadingBar() {
        const { width, height } = this.scale;

        // Texto de porcentaje que se actualizará
        const percentText = this.make.text({
            x: width / 2,
            y: height * 0.48,
            text: '0%',
            style: { fontFamily: "Poppins", fontSize: "35px", fontStyle: "bold", color: "#ffffff" }
        }).setOrigin(0.5);

        // Evento 'progress' de Phaser que se actualiza durante la carga
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
        });
    }

    animateLoadingText() {
        this.tweens.add({
            targets: this.loadingText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
        });
    }
}
