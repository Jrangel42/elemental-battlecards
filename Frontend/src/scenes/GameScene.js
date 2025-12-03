import Phaser from 'phaser';
import { calculateRowPositions } from '../helpers/zone';
import { resolveCombat } from '../helpers/combat';
import Player from '../game_objects/player.js';
import Card from '../game_objects/card.js';
import { CardDefinitions } from '../game_objects/card-definitions.js';

/**
 * La escena principal donde se desarrolla el juego de cartas.
 * Se encarga del tablero, las manos de los jugadores y la lógica del juego.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null; // Propiedad para guardar los datos del jugador
        this.socket = null;
        this.isLAN = false;
        this.roomCode = null;
        this.vsBot = false;
        this.selectedCard = null; // Propiedad para la carta seleccionada
        // Eliminamos las escalas antiguas. Ahora usaremos un tamaño fijo.
        // El tamaño de las cartas será igual al de los slots.
        // Tamaños visuales fijos para normalizar tamaño real de todas las texturas
        this.cardHandSize = { width: 110, height: 158 }; // tamaño visual en mano
        this.cardFieldSize = { width: 110, height: 158 }; // tamaño visual en campo / fusiones

        this.gameState = 'pre-start'; // 'pre-start', 'player-turn', 'opponent-turn', 'game-over'
        this.turnTimer = null; // Referencia al temporizador del turno

        // Control de acciones / ataques obligatorios / turnos ---
        this.playerHasActed = false; // Flag para controlar si ya realizó su 1 acción
        this.opponentHasActed = false;
        this.playerPerformedAttackThisTurn = false; // Si el jugador atacó en el turno
        this.opponentPerformedAttackThisTurn = false;
        this.playerTurnsSinceLastAttack = 0; // Cuántos turnos propios pasaron desde su último ataque
        this.opponentTurnsSinceLastAttack = 0;
        this.playerMustAttackThisTurn = false;
        this.opponentMustAttackThisTurn = false;

        // Conteo de turns para restricciones por carta (para cada jugador)
        this.playerTurnNumber = 0;
        this.opponentTurnNumber = 0;

        // Contadores de inactividad
        this.playerInactiveTurns = 0; // Contador de turnos inactivos del jugador
        this.opponentInactiveTurns = 0; // Contador de turnos inactivos del oponente
    }

    /**
     * El método init se ejecuta antes que create y es ideal para recibir datos.
     * @param {object} data - Datos pasados desde la escena anterior.
     */
    init(data) {
        // data puede contener: playerData, socket, isLAN, roomCode, vsBot
        this.playerData = data.playerData || data;
        this.socket = data.socket || null;
        this.isLAN = !!data.isLAN;
        this.roomCode = data.roomCode || null;
        this.vsBot = !!data.vsBot;
        console.log('GameScene iniciada con los datos del jugador:', this.playerData);
    }

    preload() {
        // Fondo general
        this.load.image('board-bg', '/assets/images/campo juego/campo.png');

        // Slots
        this.load.image('slot', '/assets/images/cartas/Espacio vacio.png');

        // Cartas nivel 1
        this.load.image('card-fuego-1', '/assets/images/cartas/carta-fuego-1.png');
        this.load.image('card-agua-1', '/assets/images/cartas/carta-agua-1.png');
        this.load.image('card-planta-1', '/assets/images/cartas/carta-planta-1.png');
        this.load.image('card-luz-1', '/assets/images/cartas/carta-luz-1.png');
        this.load.image('card-sombra-1', '/assets/images/cartas/carta-sombra-1.png');
        this.load.image('card-espiritu-1', '/assets/images/cartas/carta-espiritu-1.png');

        //cartas nivel 2
        this.load.image('card-fuego-2', '/assets/images/cartas/carta-fuego-2.png');
        this.load.image('card-agua-2', '/assets/images/cartas/carta-agua-2.png');
        this.load.image('card-planta-2', '/assets/images/cartas/carta-planta-2.png');
        this.load.image('card-luz-2', '/assets/images/cartas/carta-luz-2.png');
        this.load.image('card-sombra-2', '/assets/images/cartas/carta-sombra-2.png');
        this.load.image('card-espiritu-2', '/assets/images/cartas/carta-espiritu-2.png');
        
        //cartas nivel 3
        this.load.image('card-fuego-3', '/assets/images/cartas/carta-fuego-3.png');
        this.load.image('card-agua-3', '/assets/images/cartas/carta-agua-3.png');
        this.load.image('card-planta-3', '/assets/images/cartas/carta-planta-3.png');
        this.load.image('card-luz-3', '/assets/images/cartas/carta-luz-3.png');
        this.load.image('card-sombra-3', '/assets/images/cartas/carta-sombra-3.png');
        this.load.image('card-espiritu-3', '/assets/images/cartas/carta-espiritu-3.png');
        
        //mazo reverso
        this.load.image('card-back-opponent', '/assets/images/cartas/baraja-oponente.png');
        this.load.image('card-back-player', '/assets/images/cartas/baraja-jugador.png');
    }

    create() {
        // Limpieza de objetos visuales de partidas previas (si la escena se reutiliza)
        try {
            // Tomamos una copia porque destroy modifica children.list
            const childrenCopy = this.children ? this.children.list.slice() : [];
            childrenCopy.forEach(child => {
                if (!child) return;
                // Detectar objetos tipo 'Card' por su metadata 'cardData'
                let hasCardData = false;
                try { hasCardData = !!(child.getData && child.getData('cardData')); } catch(e) { hasCardData = false; }

                // Detectar slots por nombre (creados con setName(`${name}-${i}`))
                const name = child.name || '';
                const isSlot = typeof name === 'string' && (
                    name.startsWith('player-slots') || name.startsWith('opponent-slots') ||
                    name.startsWith('player_battle_slots') || name.startsWith('opponent_battle_slots')
                );

                // Detectar elementos de UI/mazo/tablero por textura keys conocidas
                let isBoardOrDeck = false;
                try {
                    const tex = child.texture && child.texture.key;
                    if (tex === 'board-bg' || tex === 'slot' || tex === 'card-back-player' || tex === 'card-back-opponent') isBoardOrDeck = true;
                } catch(e) { isBoardOrDeck = false; }

                if (hasCardData || isSlot || isBoardOrDeck) {
                    try { if (child.destroy) child.destroy(); } catch (e) { /* ignore */ }
                }
            });
        } catch (e) {
            console.warn('[GameScene] Error durante limpieza inicial:', e);
        }

        // Reset / inicialización por si la escena se reutiliza entre partidas
        this.gameState = 'pre-start';
        this.playerHasActed = false;
        this.opponentHasActed = false;
        this.playerPerformedAttackThisTurn = false;
        this.opponentPerformedAttackThisTurn = false;
        this.playerTurnsSinceLastAttack = 0;
        this.opponentTurnsSinceLastAttack = 0;
        this.playerMustAttackThisTurn = false;
        this.opponentMustAttackThisTurn = false;
        this.playerTurnNumber = 0;
        this.opponentTurnNumber = 0;
        this.playerInactiveTurns = 0;
        this.opponentInactiveTurns = 0;

        // Mostramos un mensaje de bienvenida con el nombre del usuario temporal.
        console.log(`¡Bienvenido a GameScene, ${this.playerData?.username || 'Jugador'}!`);
        // Si estamos en modo LAN y tenemos socket, conectar manejadores de red
        if (this.isLAN && this.socket) {
            this.socket.on('game_event', (payload) => {
                try {
                    this.handleRemoteGameEvent(payload);
                } catch (e) {
                    console.error('Error manejando evento remoto:', e);
                }
            });
        }
        const { width, height } = this.scale;
        const battleRowYOffset = 70; // Distancia de las filas de batalla al centro
        // Lanza la escena de UI en paralelo para que se muestre por encima.
        // Si ya existe una instancia previa, detenerla primero para evitar duplicados.
        if (this.scene.isActive('UIScene') || this.scene.isSleeping('UIScene')) {
            this.scene.stop('UIScene');
        }
        this.scene.launch('UIScene', { playerData: this.playerData });

        // ---------- LÓGICA DE JUGADORES ----------
        // Creamos las instancias de los jugadores. La clase Player se encargará de su propio mazo y mano.
        this.player = new Player('player', this);
        this.opponent = new Player('opponent', this);

        this.player.essences = new Set();
        this.opponent.essences = new Set();

        // Añadimos la función 'fillEssence' a las instancias de Player, ya que no está en la clase base.
        const addFillEssence = (playerInstance) => {
            playerInstance.fillEssence = function(essenceType) {
                // Si la esencia no ha sido llenada previamente...
                if (!this.essences.has(essenceType)) {
                    this.essences.add(essenceType); // La añadimos al Set.
                    console.log(`%c[Player ${this.id}] Esencia ${essenceType} llenada. Total: ${this.essences.size}`, 'color: #00ffaa');
                    // Emitimos un evento para que la UIScene actualice los orbes.
                    this.scene.events.emit('essence-activated', this.id, essenceType);
                } else {
                    console.log(`%c[Player ${this.id}] Ya tiene la esencia ${essenceType}.`, 'color: #aaaaaa');
                }
            };
        };

        addFillEssence(this.player);
        addFillEssence(this.opponent);

        this.player.drawInitialHand();
        this.opponent.drawInitialHand();

        // Fondo centrado
        this.board = this.add.image(width / 2, height / 2, 'board-bg')
            .setOrigin(0.5)
            .setDisplaySize(width, height);

        // Enviamos el tablero al fondo de la lista de renderizado.
        this.board.setDepth(-1);

        // ---------- ZONA DE MANO DEL OPONENTE (4 espacios) ----------
        this.createSlotsRow(height * 0.18, 'opponent-slots');
        this.createCardsRow(height * 0.18, 'opponent-cards', this.opponent.hand);

        // ---------- CENTRO (campo de batalla con 6 espacios) ----------
        this.createSlotsRow(height * 0.45 - battleRowYOffset, 'opponent_battle_slots', 6); // Fila del oponente
        this.createSlotsRow(height * 0.55 + battleRowYOffset, 'player_battle_slots', 6);   // Fila del jugador

        // ---------- ZONA DE MANO DEL JUGADOR (4 espacios) ----------
        this.createSlotsRow(height * 0.825, 'player-slots');
        this.createCardsRow(height * 0.825, 'player-cards', this.player.hand);

        // ---------- MAZOS ----------
        this.createDecks();

        // Avisar a la UI que la escena se creó exitosamente
        this.events.emit('board-ready');

        // --- Lógica de Clic para Deseleccionar ---
        // Si hacemos clic en el tablero, deseleccionamos cualquier carta.
        this.board.setInteractive();
        this.board.on('pointerdown', () => this.deselectCard());


        // --- Lógica de Inicio de Partida ---
        // La partida no comienza hasta que la UI nos avise.
        // Evitar duplicar listeners si create() se llama varias veces.
        this.events.off('start-game');
        this.events.on('start-game', () => {
            if (this.gameState === 'pre-start') {
                console.log('%c[GameScene] ¡La partida ha comenzado!', 'color: #28a745; font-size: 16px;');
                this.startPlayerTurn();
            } else {
                console.log('%c[GameScene] start-game ignorado: estado actual = ' + this.gameState, 'color: #bbbbbb');
            }
        });

        // Cleanup al apagar la escena: evitar listeners y escenas hijas corriendo.
        this.events.off('shutdown');
        this.events.on('shutdown', () => {
            // remover listeners propios
            this.events.off('start-game');
            // detener la UIScene si está activa
            if (this.scene.isActive('UIScene')) this.scene.stop('UIScene');
            // destruir temporizador si sigue activo
            if (this.turnTimer) { this.turnTimer.destroy(); this.turnTimer = null; }
        });

        // Ya no hay botón "Terminar turno": el turno termina automáticamente
        // al ejecutar una acción o por timeout. No registramos listener 'end-player-turn'.
    }


    /**
     * Gestiona la lógica cuando un jugador intenta jugar una carta de la mano a un slot.
     * @param {Phaser.GameObjects.Image} cardObject El objeto de la carta arrastrada.
     * @param {Phaser.GameObjects.Image} dropZone El slot del campo de batalla.
     */
    handlePlayCard(cardObject, dropZone) {
        // Bloquear jugadas si no es el turno del jugador o ya actuó, o si está obligado a atacar
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('%c[GameScene] Ya realizaste tu acción este turno.', 'color:#ff4444');
            return;
        }
        if (this.playerMustAttackThisTurn) {
            console.log('%c[GameScene] Estás obligado a atacar este turno. No puedes colocar cartas.', 'color:#ff4444');
            return;
        }

        // Obtenemos los datos de la carta seleccionada y el índice del slot.
        const cardDataFromHand = this.selectedCard.cardData;
        const fieldIndex = parseInt(dropZone.name.split('-')[1]);
        const targetCardData = this.player.field[fieldIndex];

        console.log(`Intentando jugar la carta en el slot ${fieldIndex}`);

        // Escenario 1: El slot está vacío. Jugamos la carta normalmente.
        if (targetCardData === null) {
            const cardPlayed = this.player.playCardFromHand(cardDataFromHand.instanceId, fieldIndex);
            if (!cardPlayed) {
                console.log('El slot ya estaba ocupado (verificación secundaria). La carta volverá a la mano.');
                return; // No hacemos nada más, dragend la devolverá.
            }

            // Actualizamos el cardData del objeto visual con los datos del modelo (incluye instanceId)
            this.selectedCard.cardData = cardPlayed;

            // Detenemos cualquier animación activa en la carta seleccionada
            if (this.selectedCard.activeTween) {
                this.selectedCard.activeTween.stop();
            }

            // Animamos la carta para que se mueva al slot
            this.tweens.add({
                targets: this.selectedCard,
                x: dropZone.x,
                y: dropZone.y,
                duration: 150,
                ease: 'Power1',
                onComplete: () => {
                    // Toda la lógica que ocurre después de jugar la carta se mueve aquí,
                    // dentro del 'onComplete' de la animación.

                    // 1. Actualizamos las propiedades de la carta para reflejar que está en el campo.
                    // Ahora es seguro llamar a setInteractive porque la carta no ha sido destruida.
                    if (!this.selectedCard.input) {
                        this.selectedCard.setInteractive();
                    }
                    this.selectedCard.input.cursor = 'pointer';
                    this.selectedCard.setData('isCardOnField', true);
                    this.selectedCard.setData('cardData', cardPlayed);
                    this.selectedCard.setData('fieldIndex', fieldIndex);
                    this.selectedCard.setData('isRevealed', false);
                    this.selectedCard.setData('startPosition', { x: dropZone.x, y: dropZone.y });

                    // 2. La carta jugada ya no es parte de la mano visual.
                    this['player-cards'] = this['player-cards'].filter(card => card !== this.selectedCard);
                    this.deselectCard(false); // Deseleccionamos sin animar.

                    // 3. Robamos, refrescamos la mano y actualizamos contadores.
                    this.player.drawCard();
                    this.refreshPlayerHand();
                    this.updateDeckCounts();

                    // 4. Marcamos la acción y terminamos el turno.
                    this.playerHasActed = true;
                    // Emitir evento de juego a oponente si estamos en LAN
                    if (this.isLAN && this.socket) {
                        try {
                            this.socket.emit('game_event', { type: 'play_card', actor: this.player.id, card: cardPlayed, fieldIndex });
                        } catch (e) { console.warn('No se pudo emitir evento de juego:', e); }
                    }

                    this.time.delayedCall(200, () => this.endPlayerTurn());
                }
            });

        // Escenario 2: El slot está OCUPADO.
        } else {
            console.log(`Slot ${fieldIndex} ocupado. No se puede jugar la carta aquí. La carta volverá a la mano.`);
            // No hacemos nada. La bandera 'dropped' sigue en false y el evento 'dragend' la devolverá.
        }
    }

    /**
     * Intenta fusionar dos cartas en el campo de batalla.
     * @param {Phaser.GameObjects.Image} selectedCardObject La carta que el jugador seleccionó.
     * @param {Phaser.GameObjects.Image} targetCardObject La carta sobre la que se soltó la primera.
     */
    attemptToFuse(selectedCardObject, targetCardObject) {
        // Bloquear fusiones si no es turno o ya actuó
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('%c[GameScene] Ya realizaste tu acción este turno.', 'color:#ff4444');
            return;
        }
        if (this.playerMustAttackThisTurn) {
            console.log('%c[GameScene] Estás obligado a atacar este turno. No puedes fusionar.', 'color:#ff4444');
            return;
        }

        // 1. Obtenemos los datos de las cartas involucradas.
        const initiatingFusionCardData = selectedCardObject.cardData;
        const targetCardData = targetCardObject.cardData;
        const targetIndex = targetCardObject.getData('fieldIndex');
        const fusionPosition = { x: targetCardObject.x, y: targetCardObject.y };

        // 2. Validación: AMBAS cartas deben estar en el campo (solo campo⇄campo).
        if (!selectedCardObject.getData('isCardOnField') || !targetCardObject.getData('isCardOnField')) {
            console.log('%cFusión inválida: ambas cartas deben estar en el campo.', 'color: #ff4444');
            this.deselectCard(false);
            return;
        }
        
        console.log(`Intento de fusionar ${initiatingFusionCardData.id} con ${targetCardData.id}`);
        
        // --- Validaciones ---
        const areSameType = initiatingFusionCardData.type === targetCardData.type;
        const areSameLevel = initiatingFusionCardData.level === targetCardData.level;
        console.log(initiatingFusionCardData.type, targetCardData.type, initiatingFusionCardData.level, targetCardData.level);

        if (!areSameType || !areSameLevel) {
            console.log('Fallo de fusión: Las cartas no son compatibles.');
            this.deselectCard(); // Deseleccionamos la carta activa
            return;
        }

        // TODO: Validar que el jugador tiene una acción disponible para fusionar.

        console.log('%cFusión exitosa!', 'color: #00ffaa');

        // --- Ejecutar Fusión ---
        // 3. Asegurar sincronía entre la vista y el modelo antes de actualizar datos.
        const selIdx = selectedCardObject.getData('fieldIndex');
        const tgtIdx = targetIndex;

        const ensureModelAt = (idx, cardObj) => {
            if (typeof idx !== 'number') return;
            if (!this.player.field[idx]) {
                const cd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (cd) {
                    console.warn('[GameScene] Sincronizando modelo: rellenando player.field[' + idx + '] desde objeto visual', cd);
                    this.player.field[idx] = cd;
                }
            } else {
                // Si existe modelo pero difiere de la vista, informar
                const modelCd = this.player.field[idx];
                const viewCd = (cardObj.getData && cardObj.getData('cardData')) || cardObj.cardData;
                if (viewCd && modelCd.instanceId && viewCd.instanceId && modelCd.instanceId !== viewCd.instanceId) {
                    console.warn('[GameScene] Desincronización detectada en slot', idx, 'modelo.instanceId=', modelCd.instanceId, 'vista.instanceId=', viewCd.instanceId);
                }
            }
        };

        ensureModelAt(selIdx, selectedCardObject);
        ensureModelAt(tgtIdx, targetCardObject);

        // 3. Actualizar el modelo de datos.
        const fusionResult = this.player.fuseCards(selIdx, tgtIdx);
        if (!fusionResult) {
            console.error("Error en el modelo de datos al fusionar.");
            this.deselectCard();
            return;
        }

        // Para "reiniciar" el slot de destino, lo desactivamos temporalmente.
        // La nueva carta fusionada, al ser una dropzone, se encargará de capturar
        // los eventos de 'drop' en esa posición.
        const targetSlot = this['player_battle_slots'][targetIndex];
        if (targetSlot) targetSlot.disableInteractive();

        const fusedCardData = fusionResult.newCard;
        // Reactivamos el slot que el modelo nos dice que se ha vaciado.
        const originalSlot = this['player_battle_slots'][fusionResult.emptiedIndex];
        if (originalSlot) originalSlot.setInteractive({ dropZone: true });


        // 4. Destruir los objetos visuales.
        const selectedName = selectedCardObject.name;
        const targetName = targetCardObject.name;
        
        selectedCardObject.destroy();
        targetCardObject.destroy();

        console.log(`Objetos visuales destruidos:`, [selectedName, targetName]);

        // 5. Crear la nueva carta fusionada.
        // Seguimos el orden correcto: Crear, Configurar, Habilitar.
        const fusedCardObject = new Card(this, fusionPosition.x, fusionPosition.y, fusedCardData, false);
        fusedCardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        fusedCardObject.setData('isCardOnField', true);
        fusedCardObject.setData('fieldIndex', targetIndex);

        // Guardamos los datos de la carta para que la IA pueda leerlos.
        fusedCardObject.setData('cardData', fusedCardData);
    
        // Guardamos la posición y escala inicial para futuras selecciones/deselecciones.
        fusedCardObject.setData('isRevealed', true); // Las cartas fusionadas del jugador siempre están reveladas
        fusedCardObject.setData('startPosition', { x: fusionPosition.x, y: fusionPosition.y });

        // Hacemos que la nueva carta sea seleccionable para futuras acciones
        fusedCardObject.on('pointerdown', () => this.onCardClicked(fusedCardObject));
        this.deselectCard(false); // Deseleccionamos sin animación

        // Animación de aparición (fade-in). No cambiamos escala para evitar overflow.
        fusedCardObject.alpha = 0;
        this.tweens.add({
            targets: fusedCardObject,
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Power2'
        });

        // Consumir la acción y terminar el turno automáticamente.
        this.playerHasActed = true;
        this.deselectCard(false);
        this.time.delayedCall(350, () => this.endPlayerTurn());
    }

    /**
     * Intenta fusionar una carta de la mano con una carta en el campo.
     * @param {Card} handCardObject La carta seleccionada de la mano.
     * @param {Card} fieldCardObject La carta objetivo en el campo.
     */
    attemptToFuseFromHand(handCardObject, fieldCardObject) {
        // Bloquear si ya actuó o debe atacar
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('%c[GameScene] Ya realizaste tu acción este turno.', 'color:#ff4444');
            return;
        }
        if (this.playerMustAttackThisTurn) {
            console.log('%c[GameScene] Estás obligado a atacar este turno. No puedes fusionar.', 'color:#ff4444');
            return;
        }

        const handCardData = handCardObject.cardData;
        const fieldCardData = fieldCardObject.cardData;
        const targetIndex = fieldCardObject.getData('fieldIndex');

        console.log(`Intento de fusionar carta de mano ${handCardData.id} con carta en campo ${fieldCardData.id}`);

        // 1. Llamamos al modelo del jugador para que gestione la fusión.
        const fusionResult = this.player.fuseFromHand(handCardData.instanceId, targetIndex);

        // 2. Si el modelo devuelve null, la fusión no era válida (tipos/niveles no coinciden).
        if (!fusionResult) {
            console.log('Fallo de fusión desde la mano: Las cartas no son compatibles.');
            this.deselectCard(); // Deseleccionamos la carta de la mano.
            return;
        }

        console.log('%cFusión desde la mano exitosa!', 'color: #00ffaa');

        // 3. Destruimos los objetos visuales de las cartas originales.
        const fusionPosition = { x: fieldCardObject.x, y: fieldCardObject.y };
        handCardObject.destroy();
        fieldCardObject.destroy();

        // 4. Creamos el nuevo objeto visual para la carta fusionada.
        const fusedCardObject = new Card(this, fusionPosition.x, fusionPosition.y, fusionResult, false);
        // Normalizamos por tamaño real del sprite (independiente de la resolución del asset)
        // La carta resultante va al campo, por lo que debe usar el tamaño de campo.
        fusedCardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        fusedCardObject.setData('isCardOnField', true);
        fusedCardObject.setData('fieldIndex', targetIndex);
        // Guardamos los datos de la carta para que la IA pueda leerlos.
        fusedCardObject.setData('cardData', fusionResult);
        fusedCardObject.setData('isRevealed', true); // Las cartas fusionadas del jugador siempre están reveladas
        fusedCardObject.setData('startPosition', { x: fusionPosition.x, y: fusionPosition.y });
        
        // Hacemos que la nueva carta sea seleccionable.
        fusedCardObject.on('pointerdown', () => this.onCardClicked(fusedCardObject));

        // 5. Limpiamos la selección y refrescamos la mano.
        this.deselectCard(false); // Deseleccionamos sin animación.

        // Robamos una carta para reponer la que se usó desde la mano.
        this.player.drawCard();
        this.refreshPlayerHand(); // Actualizamos la mano para que se reordene.
        this.updateDeckCounts(); // Actualizamos el contador del mazo.
        // Animación de aparición para la nueva carta.
        // Aparecer con fade-in en lugar de cambiar escala.
        fusedCardObject.alpha = 0;
        this.tweens.add({
            targets: fusedCardObject,
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Power2'
        });

        // (No se admite fusiones desde la mano.)
    }

    /**
     * Inicia y ejecuta la lógica del turno del oponente.
     * Esta es un boot muy simple para fines de prueba. (En mejora continua, tendra tres niveles de dificultad.)
     */
    startOpponentTurn() {
        this.gameState = 'opponent-turn';
        let opponentHasActed = false;

        this.opponentTurnNumber++;
        this.opponentHasActed = false;
        this.opponentPerformedAttackThisTurn = false;
        this.opponentMustAttackThisTurn = (this.opponentTurnsSinceLastAttack >= 2);

        // Limpieza bloqueos vencidos y reset consecutiveAttacks si no atacó el turno anterior
        const opponentFieldCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
        opponentFieldCardObjects.forEach(cardObj => {
            if (cardObj.getData('lastAttackedTurn') !== (this.opponentTurnNumber - 1)) {
                cardObj.setData('consecutiveAttacks', 0);
            }
            const blocked = cardObj.getData('blockedTurn');
            if (typeof blocked === 'number' && blocked < this.opponentTurnNumber) {
                cardObj.setData('blockedTurn', null);
            }
        });

        console.log('%c[Opponent] Analizando acciones...', 'color: #ff8c00');

        this.time.delayedCall(800, () => {
            let acted = false;

            // 1) Intentar fusionar (campo o mano) para avanzar hacia 6 tipos / llenar esencias
            if (!acted && !this.opponentMustAttackThisTurn) {
                const fusionPlan = this.findBestFusion();
                if (fusionPlan && fusionPlan.kind === 'field') {
                    const [idxA, idxB] = fusionPlan.indices;

                    // Guardar datos originales antes de modificar el modelo
                    const origA = this.opponent.field[idxA];
                    const origB = this.opponent.field[idxB];

                    const res = this.opponent.fuseCards(idxA, idxB);
                    if (res && res.newCard) {
                        // Determinar índice donde debe quedar la carta fusionada.
                        let targetIndex = null;
                        if (typeof res.emptiedIndex === 'number') {
                            targetIndex = [idxA, idxB].find(i => i !== res.emptiedIndex);
                        } else if (typeof res.targetIndex === 'number') {
                            targetIndex = res.targetIndex;
                        } else {
                            targetIndex = idxB; // fallback
                        }

                        // Destruir de forma robusta LOS DOS objetos visuales originales
                        // (buscar por instanceId para evitar solapamientos / duplicados)
                        const idsToRemove = [
                            origA && origA.instanceId ? origA.instanceId : null,
                            origB && origB.instanceId ? origB.instanceId : null
                        ].filter(Boolean);

                        idsToRemove.forEach(id => {
                            const obj = this.children.list.find(child => {
                                const cd = child.getData('cardData') || child.cardData;
                                if (!cd || !cd.instanceId) return false;
                                return cd.instanceId === id && child.getData('isOpponentCard') && child.getData('isCardOnField');
                            });
                            if (obj) obj.destroy();
                        });

                        // Asegurar que no quede ningún objeto visual en el slot destino antes de crear la nueva carta
                        const existing = this.findCardObjectOnField(targetIndex);
                        if (existing && existing.getData('isOpponentCard')) existing.destroy();

                        // Crear UNA sola carta fusionada en el slot correcto y dejarla revelada.
                        const slotObj = this['opponent_battle_slots'][targetIndex];
                        const fusedObj = new Card(this, slotObj.x, slotObj.y, res.newCard, true);
                        // Asegurar textura frontal y luego normalizar tamaño visual/escala a dimensiones de campo
                        fusedObj.setTexture(`card-${res.newCard.type}-${res.newCard.level}`);
                        fusedObj.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height); // Tamaño unificado
                        fusedObj.setData('isOpponentCard', true);
                        fusedObj.setData('cardData', res.newCard);
                        fusedObj.setData('fieldIndex', targetIndex);
                        fusedObj.setData('isCardOnField', true);
                        fusedObj.setData('isRevealed', true);
                        fusedObj.setData('startPosition', { x: slotObj.x, y: slotObj.y });
                        fusedObj.on('pointerdown', () => this.onCardClicked(fusedObj));

                        acted = true;
                        // Fusión de campo NO cambia la mano/mazo -> no drawCard aquí.
                        this.refreshOpponentHand();
                        this.updateDeckCounts();

                        this.time.delayedCall(300, () => this.endOpponentTurn(true));
                        return;
                    }
                } else if (fusionPlan && fusionPlan.kind === 'hand') {
                    const fused = this.opponent.fuseFromHand(fusionPlan.handInstanceId, fusionPlan.targetIndex);
                    if (fused) {
                        const slotObj = this['opponent_battle_slots'][fusionPlan.targetIndex];
                        const fusedObj = new Card(this, slotObj.x, slotObj.y, fused, true);
                        fusedObj.setTexture(`card-${fused.type}-${fused.level}`);
                        fusedObj.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
                        fusedObj.setData('isOpponentCard', true);
                        fusedObj.setData('cardData', fused);
                        fusedObj.setData('fieldIndex', fusionPlan.targetIndex);
                        fusedObj.setData('isCardOnField', true);
                        fusedObj.setData('isRevealed', true);
                        fusedObj.on('pointerdown', () => this.onCardClicked(fusedObj));
                        acted = true;
                        this.opponent.drawCard();
                        this.refreshOpponentHand();
                        this.updateDeckCounts();
                        this.time.delayedCall(300, () => this.endOpponentTurn(true));
                        return;
                    }
                }
            }

            // 2) Evaluar ataques calculados
            if (!acted) {
                const bestAttack = this.findBestAttack();
                const availableAttackers = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField') && c.getData('blockedTurn') !== this.opponentTurnNumber);

                // Forzar ataques si obligado y no hay defensas => ataque directo para esencias
                const playerHasField = this.player.field.some(c => c !== null);
                if (this.opponentMustAttackThisTurn && availableAttackers.length > 0 && !playerHasField) {
                    const attacker = Phaser.Math.RND.pick(availableAttackers);
                    this.revealOpponentCard(attacker);
                    this._registerCardAttack(attacker, 'opponent');
                    this.opponent.fillEssence(attacker.getData('cardData').type);
                    acted = true;
                    this.time.delayedCall(300, () => this.endOpponentTurn(true));
                    return;
                }

                // Si está obligado y hay un bestAttack -> ejecutar
                if (this.opponentMustAttackThisTurn && bestAttack) {
                    const attackerObj = this.children.list.find(c => c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.attacker.index);
                    const defenderObj = this.children.list.find(c => !c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.defender.index);
                    if (attackerObj && defenderObj && attackerObj.getData('blockedTurn') !== this.opponentTurnNumber) {
                        this.revealOpponentCard(attackerObj);
                        const res = resolveCombat(attackerObj.getData('cardData'), defenderObj.getData('cardData'));
                        this._registerCardAttack(attackerObj, 'opponent');
                        this.tweens.add({
                            targets: attackerObj, x: defenderObj.x, y: defenderObj.y, duration: 200, yoyo: true, ease: 'Power1',
                            onComplete: () => {
                                if (res.loser === 'attacker') this.destroyCard(this.opponent, attackerObj.getData('fieldIndex'));
                                else if (res.loser === 'defender') this.destroyCard(this.player, defenderObj.getData('fieldIndex'));
                                acted = true;
                                this.opponentPerformedAttackThisTurn = true;
                                this.time.delayedCall(300, () => this.endOpponentTurn(true));
                            }
                        });
                        return;
                    }
                }

                // Si no obligado, atacar solo si score alto
                if (!this.opponentMustAttackThisTurn && bestAttack && bestAttack.score >= 5) {
                    const attackerObj = this.children.list.find(c => c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.attacker.index);
                    const defenderObj = this.children.list.find(c => !c.getData('isOpponentCard') && c.getData('fieldIndex') === bestAttack.defender.index);
                    if (attackerObj && defenderObj && attackerObj.getData('blockedTurn') !== this.opponentTurnNumber) {
                        this.revealOpponentCard(attackerObj);
                        const res = resolveCombat(attackerObj.getData('cardData'), defenderObj.getData('cardData'));
                        this._registerCardAttack(attackerObj, 'opponent');
                        this.tweens.add({
                            targets: attackerObj, x: defenderObj.x, y: defenderObj.y, duration: 200, yoyo: true, ease: 'Power1',
                            onComplete: () => {
                                if (res.loser === 'attacker') this.destroyCard(this.opponent, attackerObj.getData('fieldIndex'));
                                else if (res.loser === 'defender') this.destroyCard(this.player, defenderObj.getData('fieldIndex'));
                                acted = true;
                                this.opponentPerformedAttackThisTurn = true;
                                this.time.delayedCall(300, () => this.endOpponentTurn(true));
                            }
                        });
                        return;
                    }
                }

                // Si obligado y no hay opciones calculadas -> ataque aleatorio forzado
                if (this.opponentMustAttackThisTurn && availableAttackers.length > 0) {
                    const defenders = this.children.list.filter(c => !c.getData('isOpponentCard') && c.getData('isCardOnField'));
                    if (defenders.length === 0) {
                        // ataque directo
                        const atk = Phaser.Math.RND.pick(availableAttackers);
                        if (atk) {
                            this.revealOpponentCard(atk);
                            this._registerCardAttack(atk, 'opponent');
                            this.opponent.fillEssence(atk.getData('cardData').type);
                            acted = true;
                            this.time.delayedCall(250, () => this.endOpponentTurn(true));
                            return;
                        }
                    } else {
                        const atk = Phaser.Math.RND.pick(availableAttackers);
                        const def = Phaser.Math.RND.pick(defenders);
                        this.revealOpponentCard(atk);
                        this.revealPlayerCard(def);
                        const res = resolveCombat(atk.getData('cardData'), def.getData('cardData'));
                        this._registerCardAttack(atk, 'opponent');
                        this.tweens.add({
                            targets: atk, x: def.x, y: def.y, duration: 200, yoyo: true, ease: 'Power1',
                            onComplete: () => {
                                if (res.loser === 'attacker') this.destroyCard(this.opponent, atk.getData('fieldIndex'));
                                else if (res.loser === 'defender') this.destroyCard(this.player, def.getData('fieldIndex'));
                                acted = true;
                                this.opponentPerformedAttackThisTurn = true;
                                this.time.delayedCall(300, () => this.endOpponentTurn(true));
                            }
                        });
                        return;
                    }
                }
            }

            // 3) Intentar jugar carta que cubra tipos faltantes o simplemente ocupar
            if (!acted && !this.opponentMustAttackThisTurn) {
                const emptySlots = this.opponent.field.map((s,i) => s === null ? i : -1).filter(i => i !== -1);
                if (emptySlots.length > 0 && this.opponent.hand.length > 0) {
                    const missingTypes = (() => {
                        const types = new Set(this.opponent.field.filter(c => c).map(c => c.type));
                        return Object.values(CardDefinitions).filter(d => d.level === 1).map(d => d.type).filter(t => !types.has(t));
                    })();
                    let pickIdx = null;
                    if (missingTypes.length > 0) {
                        const candidate = this.opponent.hand.find(c => missingTypes.includes(c.type));
                        if (candidate) pickIdx = this.opponent.hand.indexOf(candidate);
                    }
                    if (pickIdx === null) pickIdx = 0;
                    const cardToPlay = this.opponent.hand[pickIdx];
                    const slotIndex = Phaser.Math.RND.pick(emptySlots);
                    const played = this.opponent.playCardFromHand(cardToPlay.instanceId, slotIndex);
                    if (played) {
                        const slotObj = this['opponent_battle_slots'][slotIndex];
                        const newCardObj = new Card(this, slotObj.x, slotObj.y, played, true);
                        newCardObj.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height); // Tamaño unificado
                        newCardObj.setData('isOpponentCard', true);
                        newCardObj.setData('cardData', played);
                        newCardObj.setData('fieldIndex', slotIndex);
                        newCardObj.setData('isCardOnField', true);
                        newCardObj.setData('isRevealed', false);
                        newCardObj.on('pointerdown', () => this.onCardClicked(newCardObj));
                        this.opponent.drawCard();
                        this.refreshOpponentHand();
                        this.updateDeckCounts();
                        acted = true;
                        this.time.delayedCall(300, () => this.endOpponentTurn(true));
                        return;
                    }
                }
            }

            // 4) Si no hizo nada -> terminar turno
            this.endOpponentTurn(acted);
        });
    }

    /**
     * --- ¡NUEVA FUNCIÓN DE IA! ---
     * Analiza todos los posibles ataques y devuelve el mejor según un sistema de puntuación.
     * @returns {object|null} El mejor objeto de ataque o null si no hay ataques posibles.
     */
    findBestAttack() {
        // La IA ya no mira el modelo de datos del jugador. Ahora busca los objetos visuales en el tablero.
        const opponentCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField') && (c.getData('cooldown') || 0) === 0);
        const playerCardObjects = this.children.list.filter(c => !c.getData('isOpponentCard') && c.getData('isCardOnField'));

        if (opponentCardObjects.length === 0 || playerCardObjects.length === 0) {
            return null;
        }

        // Sólo cartas reveladas del jugador
        const revealedPlayerCards = playerCardObjects.filter(c => c.getData('isRevealed'));

        // sólo atacantes válidos (cooldown 0) ya filtrado + defenderes revelados
        const opponentCards = opponentCardObjects.map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const playerCards = revealedPlayerCards.map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));

        if (playerCards.length === 0) return null;

        let bestAttack = { score: -100 };
        for (const attacker of opponentCards) {
            for (const defender of playerCards) {
                let currentScore = 0;
                const result = resolveCombat(attacker.card, defender.card);

                if (result.winner === 'attacker') {
                    currentScore += 10 + defender.card.level * 2;
                } else {
                    currentScore -= 10;
                    if (result.loser === 'attacker') currentScore -= attacker.card.level * 3;
                }

                if (currentScore > bestAttack.score) {
                    bestAttack = { attacker, defender, score: currentScore };
                }
            }
        }

        return bestAttack.score > 0 ? bestAttack : null;
    }

    /**
     * --- NUEVA FUNCIÓN: encontrar mejor fusión para la IA del oponente ---
     * Analiza todas las posibles fusiones que puede realizar el oponente y devuelve la más beneficiosa.
     * Priorizando aquellas que liberen espacio en el campo o que mejoren el nivel de las cartas.
     * @returns {object|null} Un objeto con la información de la fusión óptima o null si no hay fusiones posibles.
     */
    findBestFusion() {
        // Prioriza fusiones en campo que liberen slots o aumenten nivel útilmente.
        const myField = this.opponent.field;
        const samePairs = [];
        for (let i = 0; i < myField.length; i++) {
            for (let j = i + 1; j < myField.length; j++) {
                const a = myField[i], b = myField[j];
                if (a && b && a.type === b.type && a.level === b.level && a.level < 3) {
                    samePairs.push({ i, j, level: a.level, type: a.type });
                }
            }
        }

        // Si faltan tipos únicos, priorizar hacer espacio (fusionar duplicados).
        const currentTypes = new Set(myField.filter(c => c).map(c => c.type));
        const needed = Object.values(CardDefinitions).filter(d => d.level === 1).map(d => d.type).filter(t => !currentTypes.has(t));

        if (samePairs.length > 0 && (needed.length > 0 || this.opponent.hand.length === 0)) {
            samePairs.sort((a,b) => a.level - b.level);
            return { kind: 'field', indices: [samePairs[0].i, samePairs[0].j] };
        }

        // Quitar fusión desde la mano: sólo permitimos fusiones entre cartas del campo (regla).
        return null;
    }

    /**
     * Revela una carta del jugador. Aunque visualmente ya lo está,
     * esta función asegura que el flag 'isRevealed' esté activo para la IA.
     * @param {Card} cardObject La carta del jugador a revelar.
     */
    revealPlayerCard(cardObject) {
        if (!cardObject || cardObject.getData('isRevealed')) {
            return;
        }
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        console.log(`%c[GameScene] Carta del jugador ${cardData.id} ha sido revelada por un ataque/fusión.`, "color: #9933ff");
        cardObject.setData('isRevealed', true);
        // Si el objeto muestra textura de back, cambiar por la frontal
        if (cardObject.setTexture && cardData) {
            const textureName = `card-${cardData.type}-${cardData.level}`;
            cardObject.setTexture(textureName);
            // Asegurar que la textura frontal pinta exactamente al tamaño del slot
            cardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
        }
    }


    /**
     * Inicia el turno del jugador, reseteando flags y activando el temporizador.
     */
    startPlayerTurn() {
        this.gameState = 'player-turn';

        // Incremento del contador de turns del jugador y reseteo de flags
        this.playerTurnNumber++;
        this.playerHasActed = false; // Permitir 1 acción en este turno
        this.playerPerformedAttackThisTurn = false;

        // Si en dos turns previos no atacó -> ahora debe atacar
        this.playerMustAttackThisTurn = (this.playerTurnsSinceLastAttack >= 2);

        console.log('%c[GameScene] Inicia el turno del jugador.', 'color: #00ccff');
        this.events.emit('update-turn-indicator', 'player');
        // Emitimos el estado del contador obligatorio para que la UI lo muestre
        this.events.emit('update-attack-counter', 'player', this.playerTurnsSinceLastAttack + 1, this.playerMustAttackThisTurn);

        // Procesar cooldowns de las cartas del jugador al inicio de su turno
        const playerFieldCardObjects = this.children.list.filter(c => c.getData('isCardOnField') && !c.getData('isOpponentCard'));
        playerFieldCardObjects.forEach(cardObj => {
            let cooldown = cardObj.getData('cooldown') || 0;
            if (cooldown > 0) {
                cooldown = Math.max(0, cooldown - 1);
                cardObj.setData('cooldown', cooldown);
            }
            // Si no atacó en turno previo, y no hay cooldown, reset de consecutiveAttacks
            if (cardObj.getData('lastAttackedTurn') !== (this.playerTurnNumber - 1)) {
                cardObj.setData('consecutiveAttacks', 0);
            }
        });

        // --- TEMPORIZADOR REDUCIDO A 12s ---
        if (this.turnTimer) this.turnTimer.destroy();
        this.turnTimer = this.time.addEvent({
            delay: 12000, // 12 segundos (regla 15)
            callback: this._playerTimedOut,
            callbackScope: this
        });

        // Si está obligado a atacar y NO tiene cartas en campo: saltar el turno y reiniciar contador.
        const playerHasFieldCards = this.player.field.some(c => c !== null);
        if (this.playerMustAttackThisTurn && !playerHasFieldCards) {
            console.log('%c[GameScene] Obligado a atacar pero no tiene cartas -> salta turno y reinicia contador.', 'color:#ff4444');
            this.playerTurnsSinceLastAttack = 0;
            this.deselectCard(false);
            this.time.delayedCall(80, () => this.endPlayerTurn());
            return;
        }
    }

    // Nuevo helper cuando se queda sin tiempo
    _playerTimedOut() {
        console.log('%c[GameScene] El jugador agotó el tiempo del turno.', 'color: #ff4444');
        // Si estaba obligado a atacar y tenía cartas, se considera que NO atacó:
        // endPlayerTurn() aumentará su contador de turnos sin atacar (no lo reiniciamos).
        this.endPlayerTurn();
    }

    /**
     * Finaliza el turno del jugador, ya sea por tiempo o por acción voluntaria (eliminado).
     */
    endPlayerTurn() {
        if (this.gameState !== 'player-turn') return;

        console.log('%c[GameScene] Turno del jugador terminado.', 'color: #ff8c00');

        if (this.turnTimer) this.turnTimer.destroy();
        // Comprobamos inactividad
        if (!this.playerHasActed) {
            this.playerInactiveTurns++;
            console.log(`%c[GameScene] El jugador ha estado inactivo. Turnos inactivos: ${this.playerInactiveTurns}`, 'color: #ff4444');
        } else {
            this.playerInactiveTurns = 0; // Reseteamos si hubo acción
        }

        // Contador de ataques: si NO atacó este turno, incrementamos.
        if (!this.playerPerformedAttackThisTurn) {
            this.playerTurnsSinceLastAttack++;
        } else {
            this.playerTurnsSinceLastAttack = 0;
        }
        this.playerMustAttackThisTurn = false; // reset obligación al finalizar turno
        // Notificamos el contador a la UI
        this.events.emit('update-attack-counter', 'player', this.playerTurnsSinceLastAttack + 1, this.playerMustAttackThisTurn);

        // Deseleccionamos cualquier carta
        this.deselectCard(false);

        // Comprobamos condiciones de victoria antes de pasar el turno
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner);
            return;
        }

        this.startOpponentTurn();
    }

    /**
     * Finaliza el turno del oponente y devuelve el control al jugador, comprobando victoria.
     * @param {boolean} opponentActed - Si el oponente realizó alguna acción.
     */
    endOpponentTurn(opponentActed = false) {
        if (this.gameState !== 'opponent-turn') return;

        // Comprobamos inactividad del oponente
        if (!opponentActed) {
            this.opponentInactiveTurns++;
            console.log(`%c[GameScene] El oponente ha estado inactivo. Turnos inactivos: ${this.opponentInactiveTurns}`, 'color: #ff4444');
        } else {
            this.opponentInactiveTurns = 0;
        }

        // Contador de ataques del oponente
        if (!this.opponentPerformedAttackThisTurn) {
            this.opponentTurnsSinceLastAttack++;
        } else {
            this.opponentTurnsSinceLastAttack = 0;
        }
        this.opponentMustAttackThisTurn = false;
        this.events.emit('update-attack-counter', 'opponent', this.opponentTurnsSinceLastAttack + 1, this.opponentMustAttackThisTurn);

        // Comprobamos condiciones de victoria
        const winner = this.checkVictoryConditions();
        if (winner) {
            this.endGame(winner);
            return;
        }

        this.startPlayerTurn();
    }

    /**
     * Se ejecuta en cada frame. Usado para actualizar el contador del temporizador.
     */
    update() {
        if (this.gameState === 'player-turn' && this.turnTimer) {
            // Usamos getProgress() para tener un valor de 0 a 1 y lo multiplicamos por el total.
            // Math.ceil asegura que el último segundo se muestre como '1' en lugar de '0'.
            const remainingTime = Math.ceil((1 - this.turnTimer.getProgress()) * 12);
            // Emitimos un evento para que la UI actualice el contador
            this.events.emit('update-timer', remainingTime);
        } else if (this.gameState !== 'game-over') {
            // Si no es el turno del jugador, nos aseguramos que el timer esté en 0
            this.events.emit('update-timer', 0);
        }
    }

    /**
     * Gestiona el intento de ataque de una carta del jugador a una del oponente.
     * @param {Phaser.GameObjects.Image} attackingCardObject El objeto de la carta que ataca.
     * @param {Phaser.GameObjects.Image} defendingCardObject El objeto de la carta que defiende.
     */
    handleAttack(attackingCardObject, defendingCardObject) {
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('%c[GameScene] Ya realizaste tu acción este turno.', 'color:#ff4444');
            return;
        }

        // Restricción por nivel: comprobar blockedTurn en lugar de solo cooldown
        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.playerTurnNumber) {
            console.log('%c[GameScene] Esta carta está descansando este turno (restricción por nivel).', 'color:#ff4444');
            return;
        }

        // Unificamos el acceso a los datos de las cartas.
        const attackerData = attackingCardObject.getData('cardData');
        const defenderData = defendingCardObject.getData('cardData');

        this.playerHasActed = true; // Consume la acción del jugador
        this.playerPerformedAttackThisTurn = true;
        this.playerTurnsSinceLastAttack = 0; // Reiniciamos contador de ataques

        console.log(`%c[GameScene] Jugador ataca con ${attackerData.type} a ${defenderData.type}`, "color: #ff69b4");

        // Revelamos ambos según regla 14
        this.revealPlayerCard(attackingCardObject);
        this.revealOpponentCard(defendingCardObject);

        // Resolvemos el combate
        const result = resolveCombat(attackerData, defenderData);
        console.log('Resultado del combate:', result);

        // Registrar cooldowns / consecutiveAttacks
        this._registerCardAttack(attackingCardObject, 'player');

        this.animateAttack(attackingCardObject, defendingCardObject, result);
    }

    /**
     * Gestiona un ataque directo al oponente cuando no tiene cartas en el campo.
     * @param {Phaser.GameObjects.Image} attackingCardObject La carta que ataca.
     */
    handleDirectAttack(attackingCardObject) {
        if (this.gameState !== 'player-turn') return;
        if (this.playerHasActed) {
            console.log('%c[GameScene] Ya realizaste tu acción este turno.', 'color:#ff4444');
            return;
        }

        const blocked = attackingCardObject.getData('blockedTurn');
        if (blocked === this.playerTurnNumber) {
            console.log('%c[GameScene] Esta carta está descansando este turno (restricción por nivel).', 'color:#ff4444');
            return;
        }

        const attackerData = attackingCardObject.cardData || attackingCardObject.getData('cardData');
        this.playerHasActed = true;
        this.playerPerformedAttackThisTurn = true;
        this.playerTurnsSinceLastAttack = 0;

        console.log(`%c[GameScene] Jugador realiza un ATAQUE DIRECTO con ${attackerData.type}`, "color: #ff69b4");

        // Llenamos la esencia del jugador
        this.player.fillEssence(attackerData.type);

        // Marcar la carta como revelada (ataca)
        this.revealPlayerCard(attackingCardObject);

        // Registrar cooldown / consecutive attacks
        this._registerCardAttack(attackingCardObject, 'player');

        // Animamos el ataque (hacia el centro)
        const targetPos = { x: this.scale.width / 2, y: this['opponent_battle_slots'][0].y };
        this.animateAttack(attackingCardObject, targetPos, { winner: 'attacker', loser: 'none' });
    }

    animateAttack(attackingCardObject, target, result) {
        this.tweens.add({
            targets: attackingCardObject,
            x: target.x, // Corregido: usar 'target.x'
            y: target.y, // Corregido: usar 'target.y'
            duration: 200,
            yoyo: true, // La carta vuelve a su posición original
            ease: 'Power1',
            onComplete: () => {
                this.deselectCard(true); // asegurar que vuelva a startPosition tras el ataque
                // Después de una breve pausa para que se vea el resultado, aplicamos el daño.
                this.time.delayedCall(250, () => {
                    if (result.loser === 'attacker') {
                        this.destroyCard(this.player, attackingCardObject.getData('fieldIndex'));
                    } else if (result.loser === 'defender' && target && typeof target.getData === 'function') {
                        this.destroyCard(this.opponent, target.getData('fieldIndex'));
                    }

                    // Tras el ataque, el turno del jugador termina automáticamente
                    this.endPlayerTurn();
                });
            }
        });
    }

    /**
     * Comprueba todas las condiciones de victoria al final de un turno.
     * @returns {string|null} 'player', 'opponent' o null.
     */
    checkVictoryConditions() {
        // Condición 1: Derrota por inactividad
        if (this.playerInactiveTurns >= 3) {
            console.log('%c[GameScene] VICTORIA para el OPONENTE por inactividad del jugador.', 'color: #ff0000');
            return 'opponent';
        }
        if (this.opponentInactiveTurns >= 3) {
            console.log('%c[GameScene] VICTORIA para el JUGADOR por inactividad del oponente.', 'color: #00ff00');
            return 'player';
        }

        // Condición 2: Victoria por control de campo (6 tipos únicos)
        const playerFieldTypes = new Set(this.player.field.filter(c => c).map(c => c.type));
        if (playerFieldTypes.size === 6) {
            console.log('%c[GameScene] VICTORIA para el JUGADOR por control de campo (6 tipos).', 'color: #00ff00');
            return 'player';
        }
        const opponentFieldTypes = new Set(this.opponent.field.filter(c => c).map(c => c.type));
        if (opponentFieldTypes.size === 6) {
            console.log('%c[GameScene] VICTORIA para el OPONENTE por control de campo (6 tipos).', 'color: #ff0000');
            return 'opponent';
        }

        // Condición 3: Victoria por llenar las 6 esencias
        if (this.player.essences.size === 6) {
            console.log('%c[GameScene] VICTORIA para el JUGADOR por llenar las 6 esencias.', 'color: #00ff00');
            return 'player';
        }
        if (this.opponent.essences.size === 6) {
            console.log('%c[GameScene] VICTORIA para el OPONENTE por llenar las 6 esencias.', 'color: #ff0000');
            return 'opponent';
        }

        return null; // No hay ganador todavía
    }

    /**
     * Finaliza la partida y muestra un mensaje de victoria/derrota.
     * @param {string} winner El ganador de la partida ('player' u 'opponent').
     */
    endGame(winner) {
        this.gameState = 'game-over';
        if (this.turnTimer) this.turnTimer.destroy();
        this.events.emit('update-timer', 0); // Limpia el contador en la UI
        // No hay botón de terminar turno ahora.

        console.log(`%c[GameScene] Fin de la partida. Ganador: ${winner}`, 'color: yellow; font-size: 18px;');

        // Desactivamos toda la interactividad para que no se pueda seguir jugando.
        this.input.enabled = false;

        // Emitimos un evento para que la UIScene muestre la pantalla de fin de juego.
        this.events.emit('game-over', winner);
    }

    /**
     * Destruye una carta del campo de forma robusta.
     * Acepta instanceId opcional para desambiguar si el modelo y la vista se desincronizan.
     */
    destroyCard(owner, fieldIndex, instanceId = null) {
        // Intentar obtener cardData desde el modelo
        let cardData = (typeof fieldIndex === 'number' && owner.field[fieldIndex]) ? owner.field[fieldIndex] : null;

        // si hay instanceId y el modelo no coincide, buscar en el modelo por instanceId
        if ((!cardData || (instanceId && cardData.instanceId !== instanceId)) && instanceId) {
            const foundIdx = owner.field.findIndex(slot => slot && slot.instanceId === instanceId);
            if (foundIdx !== -1) {
                fieldIndex = foundIdx;
                cardData = owner.field[fieldIndex];
            }
        }

        // Si aún no encontramos, intentar localizar objeto visual por instanceId
        let cardObject = null;
        if (instanceId) {
            cardObject = this.children.list.find(child => {
                const cd = (child.getData && child.getData('cardData')) || child.cardData;
                if (!cd || !cd.instanceId) return false;
                const ownerMatch = (owner.id === 'player') ? child.getData('isCardOnField') && !child.getData('isOpponentCard') : child.getData('isOpponentCard') && child.getData('isCardOnField');
                return ownerMatch && cd.instanceId === instanceId;
            });
        }

        // Si no encontramos por instanceId, buscar por índice/propiedad owner
        if (!cardObject && typeof fieldIndex === 'number') {
            cardObject = this.children.list.find(child =>
                child.getData('fieldIndex') === fieldIndex &&
                ((owner.id === 'player' && child.getData('isCardOnField')) || (owner.id === 'opponent' && child.getData('isOpponentCard')))
            );
        }

        // Si no hay modelo ni objeto visual, registrar y salir
        if (!cardData && !cardObject) {
            console.warn(`[GameScene] destroyCard fallo: no existe modelo ni visual para owner=${owner.id} slot=${fieldIndex} id=${instanceId}`);
            // intentar buscar visual por índice
            const fallback = this.children.list.find(child => {
                try { return child.getData && child.getData('fieldIndex') === fieldIndex; } catch (e) { return false; }
            });
            if (fallback && fallback.destroy) {
                console.log('[GameScene] destroyCard: eliminando visual fallback en índice', fieldIndex);
                fallback.destroy();
            }
            // limpiar modelo si había mismatch
            if (typeof fieldIndex === 'number' && owner.field[fieldIndex]) {
                console.log('[GameScene] destroyCard: limpiando modelo en slot', fieldIndex);
                owner.field[fieldIndex] = null;
            }
            return;
        }

        // Si tenemos modelo pero no objeto visual, intentar borrar solo modelo
        if (cardData && !cardObject) {
            console.warn('[GameScene] destroyCard: objeto visual no encontrado. Actualizando solamente el modelo.', { owner: owner.id, fieldIndex, cardData });
            // llevar carta(s) al cementerio según nivel
            if (cardData.level === 2) {
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1` });
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-b` });
            } else if (cardData.level === 3) {
                for (let i = 0; i < 4; i++) owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-${i}` });
            } else owner.addCardDataToGraveyard(cardData);

            if (typeof fieldIndex === 'number') owner.field[fieldIndex] = null;
            if (owner.id === 'player') this.refreshPlayerHand();
            this.updateDeckCounts();
            return;
        }

        // Destrucción visual con animación si existe
        if (cardObject) {
            console.log('[GameScene] destroyCard: animando destrucción visual', { owner: owner.id, fieldIndex, instanceId: instanceId || (cardObject.getData && cardObject.getData('cardData') && cardObject.getData('cardData').instanceId) });
            this.tweens.add({
                targets: cardObject,
                alpha: 0,
                scale: (cardObject.scale || 1) * 0.8,
                duration: 250,
                onComplete: () => {
                    console.log('[GameScene] destroyCard: destroy() llamado sobre objeto visual', { name: cardObject.name, fieldIndex });
                    if (cardObject && cardObject.destroy) cardObject.destroy();
                }
            });
        }

        // Si tenemos modelo, mover a cementerio con la misma lógica previa
        if (cardData) {
            if (cardData.level === 2) {
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1` });
                owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-b` });
            } else if (cardData.level === 3) {
                for (let i = 0; i < 4; i++) owner.addCardDataToGraveyard({ ...cardData, level: 1, id: `${cardData.type}-l1-${i}` });
            } else owner.addCardDataToGraveyard(cardData);
            if (typeof fieldIndex === 'number') {
                console.log('[GameScene] destroyCard: limpiando modelo (owner.field) en slot', fieldIndex, 'valor previo:', owner.field[fieldIndex]);
                owner.field[fieldIndex] = null;
            }
        }

        // Restaurar interactividad del slot si era del jugador
        if (owner.id === 'player' && typeof fieldIndex === 'number') {
            const slot = this['player_battle_slots'][fieldIndex];
            if (slot) slot.setInteractive();
            this.refreshPlayerHand();
        }

        this.updateDeckCounts();
    }

    // Crear fila de slots
    createSlotsRow(y, name, numSlots = 4) { // Por defecto crea 4 slots
        const slots = [];
        const slotWidth = 110; // Ancho reducido para 1280px
        const slotSpacing = 35; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numSlots,
            itemWidth: slotWidth,
            itemSpacing: slotSpacing,
            containerWidth: this.scale.width
        });

        for (let i = 0; i < numSlots; i++) {
            let slot = this.add.image(positionsX[i], y, 'slot')
                .setScale(0.25) // Escala reducida
                .setAlpha(0.6)
                .setName(`${name}-${i}`); // Asignamos un nombre único para identificarlo

            // Si es un slot del campo de batalla del jugador, lo hacemos una zona de drop
            if (name === 'player_battle_slots') {
                slot.setInteractive({ dropZone: true }); // CORRECCIÓN: Aseguramos que sea dropzone
                // Le añadimos un listener para cuando se haga clic en él
                slot.on('pointerdown', () => {
                    this.onSlotClicked(slot);
                });
            } else if (name === 'opponent_battle_slots') {
                // Hacemos que los slots del oponente sean interactivos para poder hacerles clic.
                slot.setInteractive().on('pointerdown', () => {
                    this.onOpponentSlotClicked(slot);
                });
            }

            slots.push(slot);
        }

        this[name] = slots;
    }

    // Crear fila de cartas
    createCardsRow(y, name, hand) {
        const cards = [];
        const numCards = hand.length;
        const cardWidth = 110; // Ancho reducido
        const cardSpacing = 35; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numCards,
            itemWidth: cardWidth,
            itemSpacing: cardSpacing, 
            containerWidth: this.scale.width
        });

        for (let i = 0; i < numCards; i++) {
            const cardData = hand[i];

            let card;
            if (name === 'player-cards') {
                card = this.createPlayerCard(positionsX[i], y, cardData);
            } else {
                card = this.createOpponentCard(positionsX[i], y, cardData);
            }

            cards.push(card);
        }

        this[name] = cards;
    }

    // Crear carta del jugador
    createPlayerCard(x, y, cardData) {
        const card = new Card(this, x, y, cardData, false); // Crear la carta en su posición final
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('startPosition', { x, y });
        card.setData('isRevealed', false);
        card.setData('isCardOnField', false);
        card.on('pointerdown', () => this.onCardClicked(card));

        return card;
    }

    /**
     * Gestiona toda la lógica cuando se hace clic en una carta.
     * @param {Card} clickedCard El objeto de la carta que ha sido clicada.
     */
    onCardClicked(clickedCard) {
        // Evitar seleccionar cartas del oponente directamente.
        const clickedIsOpponent = !!clickedCard.getData('isOpponentCard');

        // Si se clicó una carta del oponente:
        if (clickedIsOpponent) {
            // Permitir solo que sea objetivo de un ataque si ya hay una carta propia
            // seleccionada en el campo.
            if (this.selectedCard && this.selectedCard.getData('isCardOnField') && !this.selectedCard.getData('isOpponentCard') && clickedCard.getData('isCardOnField')) {
                this.handleAttack(this.selectedCard, clickedCard);
            } else {
                // Ignorar clicks que intenten seleccionar una carta enemiga.
                return;
            }
            return;
        }

        // A partir de aquí, la carta clicada no es del oponente.
        // Si no hay ninguna carta seleccionada...
        if (!this.selectedCard) {
            this.selectCard(clickedCard);
            return;
        }

        // Si hacemos clic en la carta que ya estaba seleccionada...
        if (this.selectedCard === clickedCard) {
            this.deselectCard();
            return;
        }

        // FUSIÓN: ambas en campo y propias -> válido
        if (this.selectedCard.getData('isCardOnField') && clickedCard.getData('isCardOnField') && !clickedCard.getData('isOpponentCard')) {
            this.attemptToFuse(this.selectedCard, clickedCard);
            return;
        }

        // Si la carta seleccionada está en la mano y el usuario clicó una carta en el campo:
        // NO permitir fusión desde la mano --> cambiamos selección: seleccionamos la carta del campo.
        if (!this.selectedCard.getData('isCardOnField') && clickedCard.getData('isCardOnField')) {
            this.deselectCard(true);
            this.selectCard(clickedCard);
            return;
        }

        // Si no es acción válida, solo cambiamos la selección
        this.deselectCard(true);
        this.selectCard(clickedCard);
    }

    /**
     * Gestiona el clic en un slot del campo de batalla.
     * @param {Phaser.GameObjects.Image} clickedSlot El slot que ha sido clicado.
     */
    onSlotClicked(clickedSlot) {
        // Solo hacemos algo si hay una carta seleccionada y no es una carta del campo
        if (this.selectedCard && !this.selectedCard.getData('isCardOnField')) {
            this.handlePlayCard(this.selectedCard, clickedSlot);
        } // Si no hay carta seleccionada, o la carta ya está en el campo, el clic en el tablero se encargará de deseleccionar.
        // Si hay una carta seleccionada y el oponente no tiene cartas, es un ataque directo.
        else if (this.selectedCard && this.selectedCard.getData('isCardOnField')) {
            const opponentFieldCards = this.opponent.field.filter(card => card !== null);
            if (opponentFieldCards.length === 0) {
                this.handleDirectAttack(this.selectedCard);
            }
        }
    }

    /**
     * Gestiona el clic en un slot del campo de batalla del oponente.
     * @param {Phaser.GameObjects.Image} clickedSlot El slot que ha sido clicado.
     */
    onOpponentSlotClicked(clickedSlot) {
        // Si tenemos una carta de nuestro campo seleccionada...
        if (this.selectedCard && this.selectedCard.getData('isCardOnField')) {
            // Y el oponente no tiene cartas en el campo...
            const opponentHasCards = this.opponent.field.some(card => card !== null);
            if (!opponentHasCards) {
                this.handleDirectAttack(this.selectedCard);
            }
        }
    }

    /**
     * Marca una carta como seleccionada y ejecuta una animación.
     * @param {Card} cardObject La carta a seleccionar.
     */
    selectCard(cardObject) {
        this.selectedCard = cardObject;
        console.log('Carta seleccionada:', cardObject.cardData);

        // La animación de "levantar" la carta ahora solo la mueve verticalmente.
        // No cambiaremos su tamaño para mantener la consistencia.
        const isOnField = !!cardObject.getData('isCardOnField');
        const yShift = isOnField ? -25 : -50; // Se levanta más si está en la mano
        this.tweens.add({
            targets: cardObject,
            y: cardObject.getData('startPosition').y + yShift,
            duration: 150,
            ease: 'Power1'
        });
    }

    /**
     * Deselecciona la carta activa y la devuelve a su posición original.
     * @param {boolean} [animate=true] - Si la animación de retorno debe ejecutarse.
     */
    deselectCard(animate = true) {
        if (!this.selectedCard) return;

        const cardToDeselect = this.selectedCard; // Guardamos la referencia
        this.selectedCard = null;
        console.log('Carta deseleccionada.');
        
        // Si se debe animar, la carta (esté en la mano o en el campo) vuelve
        // a su posición original guardada en 'startPosition'.
        if (animate) {
            this.tweens.add({
                targets: cardToDeselect,
                x: cardToDeselect.getData('startPosition').x,
                y: cardToDeselect.getData('startPosition').y,
                duration: 200,
                ease: 'Power1'
            });
        }
    }



    /**
     * Destruye las cartas actuales de la mano del jugador y las vuelve a crear.
     * Es útil para cuando la mano cambia (robar, descartar, etc.).
     */
    refreshPlayerHand() {
        // 1. Destruimos los objetos visuales de las cartas que quedaban en la mano
        if (this['player-cards']) {
            this['player-cards'].forEach(card => card.destroy());
        }

        // 2. Volvemos a crear la fila de cartas con los datos actualizados del modelo this.player.hand
        this.createCardsRow(this.scale.height * 0.83, 'player-cards', this.player.hand);
        console.log('Mano del jugador refrescada.');
    }

    /**
     * Destruye y vuelve a crear las cartas en la mano del oponente.
     * Útil para mantener la consistencia visual cuando roba una carta.
     */
    refreshOpponentHand() {
        // 1. Destruimos los objetos visuales existentes
        if (this['opponent-cards']) {
            this['opponent-cards'].forEach(card => card.destroy());
        }

        // 2. Volvemos a crear la fila con los datos actualizados
        this.createCardsRow(this.scale.height * 0.18, 'opponent-cards', this.opponent.hand);
    }

    // Crear carta del oponente
    createOpponentCard(x, y, cardData) {
        const card = new Card(this, x, y, cardData, true);
        // Normalizamos el tamaño visual del reverso a tamaño de mano (evita que backs nativos grandes se vean enormes)
        card.setDisplaySize(this.cardHandSize.width, this.cardHandSize.height); // Tamaño unificado
        card.setData('isOpponentCard', true);
        card.setData('isRevealed', false); // siempre boca abajo al colocarse en campo
        return card;
    }

    /**
     * Maneja eventos remotos que provienen del otro jugador via socket.
     * Actualmente soporta: play_card
     */
    handleRemoteGameEvent(payload) {
        if (!payload || !payload.type) return;
        switch (payload.type) {
            case 'play_card': {
                const actor = payload.actor; // 'player' o 'opponent' desde el emisor
                const card = payload.card;
                const fieldIndex = payload.fieldIndex;

                // En el cliente receptor, si el actor era 'player' del emisor,
                // ese actor corresponde al 'opponent' local.
                const isActorPlayerOnEmitter = actor === 'player';
                const targetModel = isActorPlayerOnEmitter ? this.opponent : this.player;
                const targetSlotsName = isActorPlayerOnEmitter ? 'opponent_battle_slots' : 'player_battle_slots';

                // Actualizar modelo
                try {
                    targetModel.field[fieldIndex] = card;
                } catch (e) {
                    console.warn('No se pudo actualizar el modelo remoto:', e);
                }

                // Crear visual en el slot correspondiente
                const slot = this[targetSlotsName] && this[targetSlotsName][fieldIndex];
                if (slot) {
                    const spawnX = slot.x;
                    const spawnY = slot.y;
                    const oppCard = this.createOpponentCard(spawnX, spawnY, card);
                    oppCard.setData('isCardOnField', true);
                    oppCard.setData('fieldIndex', fieldIndex);
                    oppCard.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);
                }

                break;
            }
            default:
                console.log('Evento remoto no manejado:', payload.type);
        }
    }

    /**
     * Revela una carta del oponente, cambiando su textura y aplicando una animación.
     * @param {Phaser.GameObjects.Image} cardObject La carta del oponente a revelar.
     */
    revealOpponentCard(cardObject) {
        // Si la carta no existe o ya fue revelada, no hacemos nada.
        if (!cardObject || cardObject.getData('isRevealed')) {
            return;
        }

        const cardData = cardObject.getData('cardData');
        const textureName = `card-${cardData.type}-${cardData.level}`;

        console.log(`%c[GameScene] Revelando carta del oponente: ${cardData.id}`, "color: #9933ff");

        // Marcamos la carta como revelada para no volver a hacerlo.
        cardObject.setData('isRevealed', true);

        // Animación de revelación: un rápido encogimiento y expansión para simular un "giro".
        this.tweens.add({
            targets: cardObject,
            scaleX: 0, // Encogemos en el eje X hasta 0
            scaleY: cardObject.scaleY * 1.1, // La hacemos un poco más alta para el efecto
            duration: 100,
            ease: 'Power1',
            onComplete: () => {
                cardObject.setTexture(textureName); // Cambiamos la textura justo a la mitad de la animación

                // --- ¡CORRECCIÓN CLAVE! ---
                // Primero, forzamos el tamaño visual correcto con la nueva textura.
                // Esto recalcula internamente las escalas necesarias.
                cardObject.setDisplaySize(this.cardFieldSize.width, this.cardFieldSize.height);

                // Luego, animamos la expansión de vuelta a su escala correcta (la que calculó setDisplaySize).
                // En lugar de animar a '1', animamos al valor de escala que ya tiene el objeto.
                this.tweens.add({
                    targets: cardObject,
                    scaleX: cardObject.scaleX, // Restauramos la escala X correcta
                    scaleY: cardObject.scaleY, // Restauramos la escala Y correcta
                    duration: 100, ease: 'Power1' });
            }
        });
    }

    /**
     * Encuentra el objeto visual de una carta en el campo a partir de su índice.
     * @param {number} fieldIndex El índice de la carta en el array `player.field`.
     * @param {Phaser.GameObjects.Sprite} [excludeObject=null] Un objeto a excluir de la búsqueda.
     * @returns {Phaser.GameObjects.Image|null}
     */
    findCardObjectOnField(fieldIndex, excludeObject = null) {
        // Simplificamos la búsqueda para que sea más directa y fiable.
        return this.children.list.find(child =>
            child.getData('isCardOnField') && 

            child.getData('fieldIndex') === fieldIndex
        );
    }

    // Crear mazo y cementerio
    createDecks() {
        const { width, height } = this.scale;

        // Definimos un estilo y un padding para los contadores.
        const textStyle = { 
            fontSize: '24px', 
            color: '#fff', 
            fontStyle: 'bold',
            stroke: '#000000', // Contorno negro
            strokeThickness: 5 // Grosor del contorno
        };
        const padding = 5; // Pequeño espacio desde el borde.

        // Mazo del jugador

        const playerDeckImage = this.add.image(width - 120, height - 290, 'card-back-player').setScale(0.185);
        const playerDeckBounds = playerDeckImage.getBounds();
        this.playerDeckText = this.add.text(playerDeckBounds.left + padding, playerDeckBounds.bottom - padding, this.player.deck.getCardsCount(), textStyle)
            .setOrigin(0, 1); // Anclaje en la esquina inferior izquierda.

        // Mazo del oponente
        // Corregido y asegurado: Se crea como una imagen simple, sin interactividad.
        // Se elimina cualquier posibilidad de que se le asigne un listener de clic por error.
        const opponentDeckImage = this.add.image(120, 290, 'card-back-opponent').setScale(0.185);
        const opponentDeckBounds = opponentDeckImage.getBounds();
        this.opponentDeckText = this.add.text(opponentDeckBounds.left + padding, opponentDeckBounds.bottom - padding, this.opponent.deck.getCardsCount(), textStyle)
            .setOrigin(0, 1); // Anclaje en la esquina inferior izquierda.
    }

    // Actualizar contadores de mazos
    updateDeckCounts() {
        this.playerDeckText.setText(this.player.deck.getCardsCount());
        this.opponentDeckText.setText(this.opponent.deck.getCardsCount());
        console.log('Contadores de mazo actualizados.');
    }

    // Nuevo helper para aplicar cooldowns y contabilizar ataques por nivel
    _registerCardAttack(cardObject, ownerType) {
        const cardData = cardObject.getData('cardData') || cardObject.cardData;
        const level = cardData.level || 1;
        const nowTurn = ownerType === 'player' ? this.playerTurnNumber : this.opponentTurnNumber;

        const last = cardObject.getData('lastAttackedTurn') || null;
        const consecutive = cardObject.getData('consecutiveAttacks') || 0;
        let newConsecutive = (last === (nowTurn - 1)) ? (consecutive + 1) : 1;
        cardObject.setData('lastAttackedTurn', nowTurn);
        cardObject.setData('consecutiveAttacks', newConsecutive);

        if (level === 1) {
            // sin bloqueo
            cardObject.setData('blockedTurn', null);
        } else if (level === 2) {
            // puede atacar 2 turnos seguidos, luego descansar 1 turno propio
            if (newConsecutive >= 2) {
                // bloquea exactamente el siguiente turno propio
                cardObject.setData('blockedTurn', nowTurn + 1);
                cardObject.setData('consecutiveAttacks', 0);
                console.log(`[GameScene] Carta ${cardData.id} bloqueada para el turno ${nowTurn + 1} (nivel 2).`);
            } else {
                cardObject.setData('blockedTurn', null);
            }
        } else if (level === 3) {
            // ataca 1 turno -> descansa 1 turno propio
            cardObject.setData('blockedTurn', nowTurn + 1);
            cardObject.setData('consecutiveAttacks', 0);
            console.log(`[GameScene] Carta ${cardData.id} bloqueada para el turno ${nowTurn + 1} (nivel 3).`);
        }
    }
}