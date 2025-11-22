import Phaser from 'phaser';
import { CardTypes } from '../game_objects/card.js';

/**
 * La escena de la interfaz de usuario (UI) se ejecuta sobre la GameScene.
 * Se encarga de mostrar información como los datos del jugador, botones
 * y, en este caso, los orbes de esencia.
 */
export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
        this.playerOrbs = {};
        this.opponentOrbs = {};
    }

    preload() {
        // Cargamos aquí los assets de la UI para mantener el código organizado
        console.log("%c[UIScene] Cargando assets de UI...", "color: #00ff00");
        this.load.image('orb-fuego', '/assets/images/iconos/fuego.png');
        this.load.image('orb-agua', '/assets/images/iconos/agua.png');
        this.load.image('orb-planta', '/assets/images/iconos/planta.png');
        this.load.image('orb-luz', '/assets/images/iconos/luz.png');
        this.load.image('orb-espiritu', '/assets/images/iconos/espiritu.png');
        this.load.image('orb-sombra', '/assets/images/iconos/sombra.png');
    }

    create(data) {
        console.log("%c[UIScene] Creada.", "color: #00ff00");
        this.playerData = data.playerData;

        // Obtenemos una referencia a la GameScene para comunicarnos con ella
        this.gameScene = this.scene.get('GameScene');

        // Creamos los orbes para ambos jugadores
        this.createEssenceOrbs();

        // ---------- BARRA SUPERIOR ----------
        const { width, height } = this.scale;

        // Botón salir
        const btnExit = this.add.rectangle(80, 27, 110, 40, 0x8B0000, 0.9)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive();
        this.add.text(80, 27, "Salir", {
            fontSize: '18px',
            color: '#fff',
            fontFamily: 'Arial',
        }).setOrigin(0.5);

        // Panel central (TU vs OPONENTE)
        const bar = this.add.rectangle(width / 2, 27, 300, 45, 0x220022, 0.85)
            .setStrokeStyle(2, 0xaf7cff);

        this.add.text(width / 2 - 90, 27, "Tú", { fontSize: '18px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(width / 2, 27, "VS", { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
        this.add.text(width / 2 + 90, 27, "Oponente", { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

        // Botón tu turno
        const btnTurn = this.add.rectangle(width - 100, 27, 140, 40, 0x00aa33, 0.9)
            .setStrokeStyle(2, 0xffffff);
        this.add.text(width - 100, 27, "Tu turno", {
            fontSize: '18px',
            color: '#fff',
        }).setOrigin(0.5);

        // ---------- BARRA INFERIOR ----------
        this.add.rectangle(width / 2, height - 35, 450, 50, 0x000000, 0.55);

        this.add.text(width / 2 - 150, height - 35, "Turno obligatorio: 0/2", { // Ajustado para que no se solape
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height - 35, "TURNO: 7/80", {
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);

        const btnEndTurn = this.add.rectangle(width - 120, height - 35, 180, 45, 0x8000ff, 0.95)
            .setStrokeStyle(2, 0xe6c4ff)
            .setInteractive({ cursor: 'pointer' });

        this.add.text(width - 120, height - 35, "Terminar turno", {
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);

        // --- LISTENER DE EVENTOS ---
        // La UIScene escucha un evento global del juego.
        // GameScene emitirá este evento cuando una esencia deba ser activada.
        this.game.events.on('essence-activated', this.handleEssenceActivation, this);

        // Nos aseguramos de limpiar el listener cuando la escena se destruya
        this.events.on('shutdown', () => {
            this.game.events.off('essence-activated', this.handleEssenceActivation, this);
        });

        // Hacemos que el botón de terminar turno emita un evento
        btnEndTurn.on('pointerdown', () => {
            console.log('%c[UIScene] Evento "end-turn" emitido.', 'color: #00ff00');
            this.gameScene.events.emit('end-turn');
        });
    }

    /**
     * Crea los indicadores visuales (orbes) para las esencias de ambos jugadores.
     */
    createEssenceOrbs() {
        const { width, height } = this.scale;
        const essenceTypes = Object.values(CardTypes);
        const orbSize = 40; // Reducimos ligeramente el tamaño para que encajen mejor
        const padding = 10;
        const columns = 2; // 2 orbes por fila

        // --- Orbes del Jugador (Abajo a la izquierda en 2 filas) ---
        const playerGridStartX = 50;
        const playerGridStartY = height - (orbSize * 2 + padding * 3); // Más padding para separar de la barra inferior

        // --- Orbes del Oponente (Arriba a la derecha en 2 filas) ---
        const opponentGridWidth = (orbSize * columns + padding * (columns - 1));
        const opponentGridStartX = width - opponentGridWidth - 50;
        const opponentGridStartY = 75; // Bajado un poco para no chocar con la barra superior

        essenceTypes.forEach((type, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;

            // --- Crear Orbe del Jugador ---
            const pOrbX = playerGridStartX + col * (orbSize + padding);
            const pOrbY = playerGridStartY + row * (orbSize + padding);
            const pOrb = this.add.image(pOrbX, pOrbY, `orb-${type}`)
                .setScrollFactor(0)
                .setOrigin(0.5)
                .setScale(0.08)
                .setTint(0x666666); // Tinte gris para indicar "desactivado"
            this.playerOrbs[type] = pOrb;

            // --- Crear Orbe del Oponente ---
            const oOrbX = opponentGridStartX + col * (orbSize + padding);
            const oOrbY = opponentGridStartY + row * (orbSize + padding);
            const oOrb = this.add.image(oOrbX, oOrbY, `orb-${type}`)
                .setScrollFactor(0)
                .setOrigin(0.5)
                .setScale(0.08)
                .setTint(0x666666); // Tinte gris para indicar "desactivado"
            this.opponentOrbs[type] = oOrb;
        });
    }

    /**
     * Manejador que se ejecuta cuando se recibe el evento 'essence-activated'.
     * @param {string} playerId 'player' u 'opponent'
     * @param {string} essenceType El tipo de esencia activada (ej. 'fuego')
     */
    handleEssenceActivation(playerId, essenceType) {
        console.log(`%c[UIScene] Recibido evento: Activar esencia ${essenceType} para ${playerId}`, "color: #00ff00");

        let targetOrb;
        if (playerId === 'player') {
            targetOrb = this.playerOrbs[essenceType];
        } else {
            targetOrb = this.opponentOrbs[essenceType];
        }

        if (targetOrb) {
            // Activamos el orbe quitándole el tinte gris y añadiendo un pequeño tween
            targetOrb.clearTint();
            this.tweens.add({
                targets: targetOrb,
                scale: { from: 0.6, to: 0.8 },
                duration: 200,
                yoyo: true,
                ease: 'Power1'
            });
        }
    }
}