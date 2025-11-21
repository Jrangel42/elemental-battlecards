import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Carga los assets mínimos necesarios para la pantalla de carga (PreloaderScene)
        // Por ejemplo, el fondo de la barra de progreso y la propia barra.
        // Asumiremos que tienes estas imágenes en tu carpeta de assets.
        // Si no las tienes, puedes crearlas o simplemente dejar esto como ejemplo.
        this.load.image("loading-background", "/assets/images/pantalla de carga.png"); // Asset para el fondo de la pantalla de carga
        this.load.image("loading-logo", "/assets/images/logotipo.png"); // Asset para el logo en la pantalla de carga

        console.log('BootScene: Preload completado.');
    }

    create() {
        console.log('BootScene: Create. Lanzando PreloaderScene...');
        // Una vez que los assets de la barra de carga están listos,
        // inicia la escena de precarga.
        this.scene.start('PreloaderScene');
    }
}