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
        this.playerData = data.playerData || { username: 'Jugador' }; // Fallback por si no hay datos
        const username = this.playerData.username;

        // Obtenemos una referencia a la GameScene para comunicarnos con ella
        this.gameScene = this.scene.get('GameScene');

        // Creamos los orbes para ambos jugadores
        this.createEssenceOrbs();

        const { width, height } = this.scale;

        // ---------- BARRA SUPERIOR ----------
        const topBarY = 50; // Eje vertical central para los elementos superiores

        // --- MENU HAMBURGUESA (se mantiene a la izquierda) ---
        const hamSize = 36;
        const hamX = 16, hamY = 14;
        const menuBg = this.add.rectangle(hamX + 6, hamY + 6, 180, 120, 0x000000, 0.75).setOrigin(0).setDepth(1000);
        menuBg.setVisible(false);
        const hamburger = this.add.text(hamX, hamY + 20, '☰', { fontSize: `${hamSize}px`, color: '#fff' }).setInteractive({ useHandCursor: true }).setDepth(1000);
        const settingsButton = this.add.text(hamX + 12, hamY + 40, '⚙ Configuración', { fontSize: '14px', color: '#fff' }).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);
        const surrenderButton = this.add.text(hamX + 12, hamY + 70, '🏳 Rendirse', { fontSize: '14px', color: '#fff' }).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

        hamburger.on('pointerdown', () => {
            const visible = !menuBg.visible;
            menuBg.setVisible(visible);
            settingsButton.setVisible(visible);
            surrenderButton.setVisible(visible);
        });

        // botones son placeholders por ahora
        settingsButton.on('pointerdown', () => { /* placeholder */ });
        surrenderButton.on('pointerdown', () => { /* placeholder */ });

        // --- Panel central (TU vs OPONENTE) ---
        const barWidth = 360;
        const barHeight = 48;
        const barX = Math.round((width - barWidth) / 2);
        const barY = topBarY - barHeight / 2;

        const cornerRadius = 12;

        const bar = this.add.graphics();
        bar.fillStyle(0x1a001a, 0.9); // Un morado oscuro más sutil
        bar.lineStyle(2, 0xc49bff, 1); // Un borde de neón más brillante
        bar.fillRoundedRect(0, 0, barWidth, barHeight, cornerRadius);
        bar.strokeRoundedRect(0, 0, barWidth, barHeight, cornerRadius);
        bar.setPosition(barX, barY);

        const textStyle = {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, fill: true }
        };
        this.add.text(barX + barWidth * 0.22, topBarY, username, textStyle).setOrigin(0.5);
        this.add.text(barX + barWidth * 0.5, topBarY, "VS", { ...textStyle, fontSize: '18px', fontStyle: 'normal' }).setOrigin(0.5);
        this.add.text(barX + barWidth * 0.78, topBarY, "Oponente", textStyle).setOrigin(0.5);

        // --- Botón Iniciar Partida (ahora en la parte superior derecha) ---
        const btnStartWidth = 180;
        const btnStartHeight = 45;
        const btnStartX = width - (btnStartWidth / 2) - 20; // Posición en la esquina superior derecha
        const btnStartY = topBarY;

        const startContainer = this.add.container(btnStartX, btnStartY);
        const startBg = this.add.graphics();
        startBg.fillStyle(0x006400, 0.9); // Color verde para la acción de iniciar
        startBg.fillRoundedRect(-btnStartWidth / 2, -btnStartHeight / 2, btnStartWidth, btnStartHeight, 12);
        startBg.lineStyle(2, 0x00ff00, 1);
        startBg.strokeRoundedRect(-btnStartWidth / 2, -btnStartHeight / 2, btnStartWidth, btnStartHeight, 12);

        const startText = this.add.text(0, 0, "Iniciar Partida", { ...textStyle, fontSize: '18px' }).setOrigin(0.5);

        startContainer.add([startBg, startText]);
        startContainer.setSize(btnStartWidth, btnStartHeight).setInteractive({ cursor: 'pointer' });

        // Conectamos el evento para que avise a la GameScene que debe empezar
        startContainer.on('pointerdown', () => {
            this.gameScene.events.emit('start-game');
            startContainer.setVisible(false); // Ocultamos el botón después de usarlo
        });

        // ---------- BARRA INFERIOR ----------
        const bottomBarY = height - 50; // Eje vertical para alinear elementos inferiores
        const bottomTextStyle = {
            fontSize: '18px',
            color: '#fff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            shadow: { offsetX: 1, offsetY: 1, color: '#000', blur: 2, fill: true }
        };

        // --- CONTADOR DE ATAQUE DEL JUGADOR (Izquierda) ---
        const playerCounterX = 150;
        const counterWidth = 220;
        const counterHeight = 40;

        const playerCounterFrame = this.add.graphics({ x: playerCounterX, y: bottomBarY });
        playerCounterFrame.lineStyle(2, 0xc49bff, 1);
        playerCounterFrame.strokeRoundedRect(-counterWidth / 2, -counterHeight / 2, counterWidth, counterHeight, 10);

        this.attackCounterTexts = {};
        this.attackCounterTexts.player = this.add.text(playerCounterX, bottomBarY, `${username} ataque: turno 1`, bottomTextStyle).setOrigin(0.5);

        // --- TEMPORIZADOR DE TURNO (Centro) ---
        const timerWidth = 200;
        const timerHeight = 50;
        const timerFrame = this.add.graphics({ x: width / 2, y: bottomBarY });
        timerFrame.lineStyle(2, 0xffff00, 1);
        timerFrame.strokeRoundedRect(-timerWidth / 2, -timerHeight / 2, timerWidth, timerHeight, 10);

        this.timerText = this.add.text(width / 2, bottomBarY, '', {
            ...bottomTextStyle,
            fontSize: '28px',
            color: '#ffff00'
        }).setOrigin(0.5);

        // --- CONTADOR DE ATAQUE DEL OPONENTE (Derecha) ---
        const opponentCounterX = width - 150;
        const opponentCounterFrame = this.add.graphics({ x: opponentCounterX, y: bottomBarY });
        opponentCounterFrame.lineStyle(2, 0xc49bff, 1);
        opponentCounterFrame.strokeRoundedRect(-counterWidth / 2, -counterHeight / 2, counterWidth, counterHeight, 10);

        this.attackCounterTexts.opponent = this.add.text(opponentCounterX, bottomBarY, 'Bot ataque: turno 1', bottomTextStyle).setOrigin(0.5);

        // Escuchar actualizaciones que envía GameScene para los contadores
        this.scene.get('GameScene').events.on('update-attack-counter', (owner, turnIndex, mustAttack) => {
            const textObj = this.attackCounterTexts[owner];
            if (!textObj) return;

            let label = '';
            if (owner === 'player') {
                label = `${username} ataque`;
            } else {
                label = 'Bot ataque';
            }

            const obliged = mustAttack ? ' - ¡OBLIGADO!' : '';
            textObj.setText(`${label}: turno ${turnIndex}${obliged}`);
            // opcional: cambiar color cuando está obligado
            textObj.setStyle({ fill: mustAttack ? '#ff4444' : '#ffffff' });
        });

        // --- LISTENER DE EVENTOS ---
        // Escuchamos eventos de la GameScene para actualizar la UI.
        this.gameScene.events.on('update-timer', this.updateTimer, this);
        this.gameScene.events.on('game-over', this.showGameOverModal, this);
        this.gameScene.events.on('essence-activated', this.handleEssenceActivation, this);

        // Nos aseguramos de limpiar el listener cuando la escena se destruya
        this.events.on('shutdown', () => {
            // Limpiamos todos los listeners para evitar fugas de memoria
            if (this.gameScene) {
                this.gameScene.events.off('update-timer', this.updateTimer, this);
                this.gameScene.events.off('game-over', this.showGameOverModal, this);
                this.gameScene.events.off('essence-activated', this.handleEssenceActivation, this);
                // --- ¡CORRECCIÓN CLAVE! ---
                // Nos aseguramos de eliminar también el listener del contador de ataque
                // para evitar que la UI de una partida anterior reaccione a eventos de una nueva.
                this.gameScene.events.off('update-attack-counter');
            }
        });

        // TODO: El botón "Cementerio" ahora está conectado al evento 'end-turn'.
        // Deberías cambiar esto para que abra la vista del cementerio.
        // graveyardContainer.on('pointerdown', () => {
        //     this.gameScene.events.emit('show-graveyard');
        // });


        // --- QUITAR / NO CREAR BOTON "Terminar Turno" ---
        // Si ya existía un botón de terminar turno, eliminar su handler o no crearlo.
        // Ejemplo: (si existía)
        // if (this.endTurnButton) { this.endTurnButton.destroy(); this.endTurnButton = null; }

        // --- CONTADOR VISIBLE DE ATAQUE OBLIGATORIO ---
        // Si UI emite 'end-player-turn' en botones antiguos, asegurarse de eliminar ese listener
        this.events.off('end-player-turn'); // seguro: elimina escuchas previas
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
     * Actualiza el texto del temporizador en la UI.
     * @param {number} time - El tiempo restante en segundos.
     */
    updateTimer(time) {
        if (time > 0) {
            this.timerText.setText(`Tiempo: ${time}`);
        } else {
            this.timerText.setText(''); // Limpiamos el texto si no hay tiempo
        }
    }

    /**
     * Muestra un modal de fin de partida.
     * @param {string} winner - Quién ganó la partida ('player' u 'opponent').
     */
    showGameOverModal(winner) {
        const { width, height } = this.scale;

        // 1. Creamos un fondo semitransparente que cubra toda la pantalla
        const overlay = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.7 } });
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(100); // Nos aseguramos que esté por encima de todo

        // 2. Creamos el panel del modal
        const panelWidth = 500;
        const panelHeight = 250;
        const panel = this.add.graphics({ fillStyle: { color: 0x1a001a }, lineStyle: { width: 2, color: 0xc49bff } });
        panel.fillRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
        panel.strokeRoundedRect(width / 2 - panelWidth / 2, height / 2 - panelHeight / 2, panelWidth, panelHeight, 15);
        panel.setDepth(101);

        // 3. Añadimos el texto de victoria o derrota
        const titleText = this.add.text(width / 2, height / 2 - 50, 'Fin de la Partida', { fontSize: '48px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);
        
        const resultText = (winner === 'player') ? '¡Has Ganado!' : '¡Has Perdido!';
        const resultColor = (winner === 'player') ? '#28a745' : '#dc3545';
        const messageText = this.add.text(width / 2, height / 2 + 30, resultText, { fontSize: '40px', color: resultColor, fontStyle: 'bold' }).setOrigin(0.5).setDepth(101);

        // Podríamos añadir un botón para volver al menú principal en el futuro
        // Botón para volver al menú principal
        const btnWidth = 200;
        const btnHeight = 48;
        const btnX = width / 2;
        const btnY = height / 2 + 90;

        const backBtnBg = this.add.graphics();
        backBtnBg.fillStyle(0x303df1, 1);
        backBtnBg.fillRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
        backBtnBg.lineStyle(2, 0xffffff, 0.15);
        backBtnBg.strokeRoundedRect(btnX - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 10);
        backBtnBg.setDepth(102);

        const backBtnText = this.add.text(btnX, btnY, 'Ir al inicio', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(103);

        // Hacer clickable el botón
        const backBtnZone = this.add.zone(btnX, btnY, btnWidth, btnHeight).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(104);
        // quitar efecto hover/animación para que el botón no cambie de posición ni escala al pasar el ratón
        backBtnZone.on('pointerdown', () => {
            // Limpiar modal
            overlay.destroy();
            panel.destroy();
            titleText.destroy();
            messageText.destroy();
            backBtnBg.destroy();
            backBtnText.destroy();
            backBtnZone.destroy();

            // --- ¡CORRECCIÓN CLAVE! ---
            // Detenemos las escenas de juego y UI. NO las eliminamos con .remove().
            // Esto permite que Phaser pueda volver a iniciarlas en una nueva partida.
            this.scene.stop('GameScene');
            this.scene.stop('UIScene');

            // Ir al menú principal (HomeScenes) PRIMERO
            this.scene.start('HomeScenes');
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