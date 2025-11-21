import Phaser from 'phaser';

/**
 * La escena de la Interfaz de Usuario (UI).
 * Se ejecuta en paralelo a GameScene para mostrar información y controles.
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        const { width, height } = this.scale;


        // Escucha si GameScene ya está lista
        const game = this.scene.get('GameScene');
        game.events.on('board-ready', () => {
            console.log("Tablero cargado, UI lista.");
        });

        // ---------- BARRA SUPERIOR ----------

        // Botón salir
        const btnExit = this.add.rectangle(80, 40, 110, 40, 0x8B0000, 0.9)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();
        this.add.text(80, 40, "Salir", {
            fontSize: '18px',
            color: '#fff'
        }).setOrigin(0.5);

        // Panel central (TU vs OPONENTE)
        const bar = this.add.rectangle(width / 2, 40, 350, 45, 0x220022, 0.85)
            .setStrokeStyle(2, 0xaf7cff);

        this.add.text(width / 2 - 70, 40, "Tú", { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        this.add.text(width / 2, 40, "VS", { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        this.add.text(width / 2 + 70, 40, "Oponente", { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // Botón tu turno
        const btnTurn = this.add.rectangle(width - 100, 40, 140, 40, 0x00aa33, 0.9)
            .setStrokeStyle(2, 0xffffff);
        this.add.text(width - 100, 40, "Tu turno", {
            fontSize: '18px',
            color: '#fff'
        }).setOrigin(0.5);

        // ---------- BARRA INFERIOR ----------
        this.add.rectangle(width / 2, height - 35, 450, 50, 0x000000, 0.55);

        this.add.text(width / 2 - 300, height - 35, "Turno obligatorio: 0/2", {
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height - 35, "TURNO: 7/80", {
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);

        const btnEndTurn = this.add.rectangle(width - 120, height - 35, 180, 45, 0x8000ff, 0.95)
            .setStrokeStyle(2, 0xe6c4ff)
            .setInteractive();

        this.add.text(width - 120, height - 35, "Terminar turno", {
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);
    }
}