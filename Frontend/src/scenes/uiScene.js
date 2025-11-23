import Phaser from 'phaser';
import { CARD_TYPES as CardTypes } from '../helpers/constants.js';

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

        // --- Botón Salir ---
        const btnExitX = 80;
        const btnExitY = 40;
        const btnExitWidth = 110;
        const btnExitHeight = 40;

        const exitContainer = this.add.container(btnExitX, btnExitY);
        const exitBg = this.add.graphics();
        exitBg.fillStyle(0x8B0000, 0.9);
        exitBg.fillRoundedRect(-btnExitWidth / 2, -btnExitHeight / 2, btnExitWidth, btnExitHeight, 12);
        exitBg.lineStyle(2, 0xff6666, 1);
        exitBg.strokeRoundedRect(-btnExitWidth / 2, -btnExitHeight / 2, btnExitWidth, btnExitHeight, 12);

        const exitText = this.add.text(0, 0, "Salir", {
            fontSize: '20px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold',
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
        }).setOrigin(0.5);

        exitContainer.add([exitBg, exitText]);
        exitContainer.setSize(btnExitWidth, btnExitHeight).setInteractive({ cursor: 'pointer' });

        // Panel central (TU vs OPONENTE)
        const barWidth = 320;
        const barHeight = 45;
        const barX = width / 2 - barWidth / 2;
        const barY = btnExitY - barHeight / 2;
        const cornerRadius = 12;

        const bar = this.add.graphics();
        bar.fillStyle(0x1a001a, 0.9); // Un morado oscuro más sutil
        bar.lineStyle(2, 0xc49bff, 1); // Un borde de neón más brillante
        bar.fillRoundedRect(barX, barY, barWidth, barHeight, cornerRadius);
        bar.strokeRoundedRect(barX, barY, barWidth, barHeight, cornerRadius);

        const textStyle = {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        };
        this.add.text(width / 2 - 95, btnExitY, "Tú", textStyle).setOrigin(0.5);
        this.add.text(width / 2, btnExitY, "VS", { ...textStyle, fontSize: '18px', fontStyle: 'normal' }).setOrigin(0.5);
        this.add.text(width / 2 + 95, btnExitY, "Oponente", textStyle).setOrigin(0.5);

        // --- Indicador "Tu Turno" ---
        const turnIndicatorX = width - 100;
        const turnIndicatorY = btnExitY;
        const turnIndicatorWidth = 140;
        const turnIndicatorHeight = 40;

        const turnIndicatorBg = this.add.graphics();
        turnIndicatorBg.fillStyle(0x006622, 0.9); // Un verde más oscuro
        turnIndicatorBg.fillRoundedRect(turnIndicatorX - turnIndicatorWidth / 2, turnIndicatorY - turnIndicatorHeight / 2, turnIndicatorWidth, turnIndicatorHeight, 12);
        turnIndicatorBg.lineStyle(2, 0x00ff44, 1); // Borde de neón verde
        turnIndicatorBg.strokeRoundedRect(turnIndicatorX - turnIndicatorWidth / 2, turnIndicatorY - turnIndicatorHeight / 2, turnIndicatorWidth, turnIndicatorHeight, 12);

        this.add.text(turnIndicatorX, turnIndicatorY, "Tu Turno", {
            fontSize: '20px', color: '#fff', fontFamily: 'Arial', fontStyle: 'bold',
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
        }).setOrigin(0.5);

        // ---------- BARRA INFERIOR ----------
        const bottomBarY = height - 35;
        const bottomTextStyle = {
            fontSize: '20px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
        };

        this.add.rectangle(width / 2, bottomBarY, 550, 50, 0x000000, 0.7);

        this.add.text(width / 2 - 150, bottomBarY, "Ataque obligatorio: 0/2", bottomTextStyle).setOrigin(0.5);
        this.add.text(width / 2 + 50, bottomBarY, "TURNO: 7/80", bottomTextStyle).setOrigin(0.5);

        // --- Botón Cementerio ---
        const btnGraveyardX = width - 120;
        const btnGraveyardY = bottomBarY;
        const btnGraveyardWidth = 160;
        const btnGraveyardHeight = 45;

        const graveyardContainer = this.add.container(btnGraveyardX, btnGraveyardY);
        const graveyardBg = this.add.graphics();
        graveyardBg.fillStyle(0x333333, 0.9);
        graveyardBg.fillRoundedRect(-btnGraveyardWidth / 2, -btnGraveyardHeight / 2, btnGraveyardWidth, btnGraveyardHeight, 12);
        graveyardBg.lineStyle(2, 0x888888, 1);
        graveyardBg.strokeRoundedRect(-btnGraveyardWidth / 2, -btnGraveyardHeight / 2, btnGraveyardWidth, btnGraveyardHeight, 12);

        const graveyardText = this.add.text(0, 0, "Cementerio", bottomTextStyle).setOrigin(0.5);

        graveyardContainer.add([graveyardBg, graveyardText]);
        graveyardContainer.setSize(btnGraveyardWidth, btnGraveyardHeight).setInteractive({ cursor: 'pointer' });

        // --- LISTENER DE EVENTOS ---
        // La UIScene escucha un evento global del juego.
        // GameScene emitirá este evento cuando una esencia deba ser activada.
        this.game.events.on('essence-activated', this.handleEssenceActivation, this);

        // Nos aseguramos de limpiar el listener cuando la escena se destruya
        this.events.on('shutdown', () => {
            this.game.events.off('essence-activated', this.handleEssenceActivation, this);
        });

        // TODO: El botón "Cementerio" ahora está conectado al evento 'end-turn'.
        // Deberías cambiar esto para que abra la vista del cementerio.
        // graveyardContainer.on('pointerdown', () => {
        //     this.gameScene.events.emit('show-graveyard');
        // });
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
        const playerGridStartX = 280;
        const playerGridStartY = height - 235;

        // --- Orbes del Oponente (Arriba a la derecha en 2 filas) ---
        const opponentGridWidth = (orbSize * columns + padding * (columns - 1));
        const opponentGridStartX = width - opponentGridWidth - 230;
        const opponentGridStartY = 140; // Bajado un poco para no chocar con la barra superior

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
                scale: 0.08 ,
                duration: 200,
                yoyo: true,
                ease: 'Power1'
            });
        }
    }
}