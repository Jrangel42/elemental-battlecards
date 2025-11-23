import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

/**
 * Esta escena se encarga de cargar todos los recursos necesarios para el juego
 * antes de que comience. Muestra una barra de progreso durante la carga.
 */
export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.createLoadingBar();

        // --- Carga de Recursos ---

        // Asumimos que las imágenes están en esta ruta. ¡Asegúrate de que coincida con tu estructura!
        const assetPath = 'assets/images/cards/';

        // 1. Cargar la imagen del reverso de la carta
        this.load.image('card_back', `${assetPath}card_back.png`);

        // 2. Cargar todas las imágenes de las caras de las cartas (6 tipos * 3 niveles)
        const types = Object.values(CardTypes);
        for (const type of types) {
            for (let level = 1; level <= 3; level++) {
                const key = `${type}_${level}`; // Ej: 'fuego_1'
                const url = `${assetPath}${key}.png`; // Ej: 'assets/images/cards/fuego_1.png'
                this.load.image(key, url);
            }
        }

        // Aquí también cargarías otros assets como fondos, botones, sonidos, etc.
        // this.load.image('background', 'assets/images/background.png');
        // this.load.audio('attackSound', 'assets/sounds/attack.mp3');
    }

    /**
     * Una vez que todos los recursos en preload() han sido cargados,
     * este método se ejecuta y lanza la escena principal del juego.
     */
    create() {
        this.scene.start('GameScene');
    }

    /**
     * Crea los elementos visuales para la barra de carga.
     */
    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Caja de la barra de progreso
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        // Barra de progreso
        const progressBar = this.add.graphics();

        // Texto de carga
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Cargando...',
            style: { font: '20px monospace', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        // Texto de porcentaje
        const percentText = this.make.text({
            x: width / 2,
            y: height / 2,
            text: '0%',
            style: { font: '18px monospace', fill: '#ffffff' }
        }).setOrigin(0.5, 0.5);

        // Evento 'progress' de Phaser que se actualiza durante la carga
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
    }
}