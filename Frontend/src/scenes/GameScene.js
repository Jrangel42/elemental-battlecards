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
        this.selectedCard = null; // Propiedad para la carta seleccionada

        this.gameState = 'pre-start'; // 'pre-start', 'player-turn', 'opponent-turn', 'game-over'
        this.turnTimer = null; // Referencia al temporizador del turno
        this.playerHasActed = false; // Flag para controlar la inactividad del jugador
        this.playerInactiveTurns = 0; // Contador de turnos inactivos del jugador
        this.opponentInactiveTurns = 0; // Contador de turnos inactivos del oponente
    }

    /**
     * El método init se ejecuta antes que create y es ideal para recibir datos.
     * @param {object} data - Datos pasados desde la escena anterior.
     */
    init(data) {
        this.playerData = data;
        console.log('GameScene iniciada con los datos del jugador:', this.playerData);
    }

    preload() {
        // Fondo general
        this.load.image('board-bg', '/assets/images/campo juego/campo.png');

        // Slots
        this.load.image('slot', '/assets/images/cartas/Espacio vacio.png');

        // Cartas nivel 1
        this.load.image('card-fuego-1', '/assets/images/cartas/carta fuego.png');
        this.load.image('card-agua-1', '/assets/images/cartas/carta agua.png');
        this.load.image('card-planta-1', '/assets/images/cartas/carta planta.png');
        this.load.image('card-luz-1', '/assets/images/cartas/carta luz.png');
        this.load.image('card-sombra-1', '/assets/images/cartas/carta sombra.png');
        this.load.image('card-espiritu-1', '/assets/images/cartas/carta espiritu.png');

        //cartas nivel 2
        this.load.image('card-fuego-2', '/assets/images/cartas/carta fuego 2.png');
        this.load.image('card-agua-2', '/assets/images/cartas/carta agua 2.png');
        this.load.image('card-planta-2', '/assets/images/cartas/carta planta 2.png');
        this.load.image('card-luz-2', '/assets/images/cartas/carta luz 2.png');
        this.load.image('card-sombra-2', '/assets/images/cartas/carta sombra 2.png');
        this.load.image('card-espiritu-2', '/assets/images/cartas/carta espiritu 2.png');
        
        //cartas nivel 3
        this.load.image('card-fuego-3', '/assets/images/cartas/carta fuego 3.png');
        this.load.image('card-agua-3', '/assets/images/cartas/carta agua 3.png');
        this.load.image('card-planta-3', '/assets/images/cartas/carta planta 3.png');
        this.load.image('card-luz-3', '/assets/images/cartas/carta luz 3.png');
        this.load.image('card-sombra-3', '/assets/images/cartas/carta sombra 3.png');
        this.load.image('card-espiritu-3', '/assets/images/cartas/carta espiritu 3.png');
        
        //mazo reverso
        this.load.image('card-back-opponent', '/assets/images/cartas/baraja oponente.png');
        this.load.image('card-back-player', '/assets/images/cartas/baraja jugador.png');
    }

    create() {
        // Mostramos un mensaje de bienvenida con el nombre del usuario temporal.
        console.log(`¡Bienvenido a GameScene, ${this.playerData.username}!`);
        const { width, height } = this.scale;
        const battleRowYOffset = 70; // Distancia de las filas de batalla al centro
        // Lanza la escena de UI en paralelo para que se muestre por encima.
        // Le pasamos los datos del jugador también a la UI.
        this.scene.launch('UIScene', { playerData: this.playerData });

        // ---------- LÓGICA DE JUGADORES ----------
        // Creamos las instancias de los jugadores. La clase Player se encargará de su propio mazo y mano.
        this.player = new Player('player', this);
        this.opponent = new Player('opponent', this);

        this.player.essences = new Set();
        this.opponent.essences = new Set();


        // --- ¡CORRECCIÓN! ---
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

        // ¡AQUÍ ESTÁ LA CORRECCIÓN! Enviamos el tablero al fondo de la lista de renderizado.
        this.board.setDepth(-1);

        // ---------- ZONA DE MANO DEL OPONENTE (4 espacios) ----------
        this.createSlotsRow(height * 0.18, 'opponent-slots');
        this.createCardsRow(height * 0.18, 'opponent-cards', this.opponent.hand);

        // ---------- CENTRO (campo de batalla con 6 espacios) ----------
        this.createSlotsRow(height * 0.45 - battleRowYOffset, 'opponent_battle_slots', 6); // Fila del oponente
        this.createSlotsRow(height * 0.55 + battleRowYOffset, 'player_battle_slots', 6);   // Fila del jugador

        // ---------- ZONA DE MANO DEL JUGADOR (4 espacios) ----------
        this.createSlotsRow(height * 0.82, 'player-slots');
        this.createCardsRow(height * 0.819, 'player-cards', this.player.hand);

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
        this.events.on('start-game', () => {
            if (this.gameState === 'pre-start') {
                console.log('%c[GameScene] ¡La partida ha comenzado!', 'color: #28a745; font-size: 16px;');
                this.startPlayerTurn();
            }
        });

        // Escuchamos el evento del botón "Terminar Turno" de la UI
        this.events.on('end-player-turn', () => {
            console.log('%c[GameScene] El jugador termina el turno manualmente.', 'color: #ff8c00');
            this.endPlayerTurn();
        });

    }


    /**
     * Gestiona la lógica cuando un jugador intenta jugar una carta de la mano a un slot.
     * @param {Phaser.GameObjects.Image} cardObject El objeto de la carta arrastrada.
     * @param {Phaser.GameObjects.Image} dropZone El slot del campo de batalla.
     */
    handlePlayCard(cardObject, dropZone) {
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
                scale: this.selectedCard.getData('startScale'), // Restauramos su escala original
                duration: 150,
                ease: 'Power1',
            });
            
            // Actualizamos las propiedades de la carta para reflejar que está en el campo
            this.selectedCard.input.cursor = 'pointer'; // Cambiamos el cursor
            this.selectedCard.setData('isCardOnField', true); // Marcador para identificarla
            // --- ¡CORRECCIÓN CLAVE! ---
            // Guardamos los datos con setData para que la IA pueda leerlos.
            this.selectedCard.setData('cardData', cardPlayed);
            this.selectedCard.setData('fieldIndex', fieldIndex); // Guardamos su índice
            this.selectedCard.setData('isRevealed', true); // Las cartas del jugador siempre están reveladas
            
            // --- ¡CORRECCIÓN CLAVE! ---
            // Actualizamos la posición "original" de la carta para que sea la del slot en el campo.
            this.selectedCard.setData('startPosition', { x: dropZone.x, y: dropZone.y });

            // La carta jugada ya no es parte de la mano visual
            this['player-cards'] = this['player-cards'].filter(card => card !== this.selectedCard);
            this.deselectCard(false); // Deseleccionamos sin animar el retorno

            this.player.drawCard();
            this.refreshPlayerHand();
            this.updateDeckCounts();

            this.playerHasActed = true; // El jugador ha realizado una acción

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
        // 1. Obtenemos los datos de las cartas involucradas.
        const initiatingFusionCardData = selectedCardObject.cardData;
        const targetCardData = targetCardObject.cardData;
        const targetIndex = targetCardObject.getData('fieldIndex');
        const fusionPosition = { x: targetCardObject.x, y: targetCardObject.y };

        // 2. Validación: La carta objetivo debe estar en el campo.
        if (!targetCardObject.getData('isCardOnField')) 
            return;
       
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
        // 3. Actualizar el modelo de datos.
        const fusionResult = this.player.fuseCards(selectedCardObject.getData('fieldIndex'), targetIndex);
        if (!fusionResult) {
            console.error("Error en el modelo de datos al fusionar.");
            this.deselectCard();
            return;
        }

         // --- ¡AQUÍ ESTÁ LA MEJORA! ---
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
        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
        // Seguimos el orden correcto: Crear, Configurar, Habilitar.
        const fusedCardObject = new Card(this, fusionPosition.x, fusionPosition.y, fusedCardData, false); // 1. Crear

        fusedCardObject.setScale(0.95); // 2. Configurar (usamos la misma escala que las cartas en mano)
        fusedCardObject.setData('isCardOnField', true);
        fusedCardObject.setData('fieldIndex', targetIndex);
        // --- ¡CORRECCIÓN CLAVE! ---
        // Guardamos los datos de la carta para que la IA pueda leerlos.
        fusedCardObject.setData('cardData', fusedCardData);
        // --- ¡CORRECCIÓN! ---
        // Guardamos la posición y escala inicial para futuras selecciones/deselecciones.
        fusedCardObject.setData('isRevealed', true); // Las cartas fusionadas del jugador siempre están reveladas
        fusedCardObject.setData('startPosition', { x: fusionPosition.x, y: fusionPosition.y });
        fusedCardObject.setData('startScale', fusedCardObject.scale);

        // Hacemos que la nueva carta sea seleccionable para futuras acciones
        fusedCardObject.on('pointerdown', () => this.onCardClicked(fusedCardObject));
        this.deselectCard(false); // Deseleccionamos sin animación

        // Animación de aparición
        this.tweens.add({
            targets: fusedCardObject,
            scale: { from: 0.5, to: 0.95 },
            duration: 300,
            ease: 'Power2'
        });

        // TODO: Consumir la acción del jugador por este turno.
        this.playerHasActed = true; // El jugador ha realizado una acción
    }

    /**
     * Intenta fusionar una carta de la mano con una carta en el campo.
     * @param {Card} handCardObject La carta seleccionada de la mano.
     * @param {Card} fieldCardObject La carta objetivo en el campo.
     */
    attemptToFuseFromHand(handCardObject, fieldCardObject) {
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
        fusedCardObject.setScale(0.95);
        fusedCardObject.setData('isCardOnField', true);
        fusedCardObject.setData('fieldIndex', targetIndex);
        // --- ¡CORRECCIÓN CLAVE! ---
        // Guardamos los datos de la carta para que la IA pueda leerlos.
        fusedCardObject.setData('cardData', fusionResult);
        fusedCardObject.setData('isRevealed', true); // Las cartas fusionadas del jugador siempre están reveladas
        fusedCardObject.setData('startPosition', { x: fusionPosition.x, y: fusionPosition.y });
        // --- ¡CORRECCIÓN! ---
        // Guardamos también la escala inicial, que es necesaria para la animación de selección.
        fusedCardObject.setData('startScale', fusedCardObject.scale);

        // Hacemos que la nueva carta sea seleccionable.
        fusedCardObject.on('pointerdown', () => this.onCardClicked(fusedCardObject));

        // 5. Limpiamos la selección y refrescamos la mano.
        this.deselectCard(false); // Deseleccionamos sin animación.

        // Robamos una carta para reponer la que se usó desde la mano.
        this.player.drawCard();
        this.refreshPlayerHand(); // Actualizamos la mano para que se reordene.
        this.updateDeckCounts(); // Actualizamos el contador del mazo.
        // Animación de aparición para la nueva carta.
        this.tweens.add({
            targets: fusedCardObject,
            scale: { from: 0.5, to: 0.95 },
            duration: 300,
            ease: 'Power2'
        });

        // TODO: Consumir la acción del jugador por este turno.
        this.playerHasActed = true; // El jugador ha realizado una acción
    }

    /**
     * Inicia y ejecuta la lógica del turno del oponente.
     * Esta es un boot muy simple para fines de prueba.
     */
    startOpponentTurn() {
        this.gameState = 'opponent-turn';
        let opponentHasActed = false; // Flag de acción para el oponente en este turno


        console.log('%c[Opponent] Analizando acciones...', 'color: #ff8c00');

        // Usamos un temporizador para simular que el oponente "piensa"
        this.time.delayedCall(1000, () => {
            let opponentHasActed = false;

            // 1. Evaluar el mejor ataque posible contra cartas REVELADAS.
            const bestAttack = this.findBestAttack();

            // 2. Obtener información sobre el campo para decisiones posteriores.
            const opponentFieldCards = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
            // --- ¡CORRECCIÓN CLAVE! ---
            const availableSlots = this.opponent.field.map((slot, index) => (slot === null ? index : -1)).filter(index => index !== -1);
            const canPlayCard = this.opponent.hand.length > 0 && availableSlots.length > 0;
    
            // Decisión 1: Si se encontró un ataque viable, ejecutarlo.
            if (bestAttack) {
                const attackerCardData = bestAttack.attacker.card;
                const defenderCardData = bestAttack.defender.card;

                // Necesitamos encontrar los objetos visuales de las cartas para animarlos.
                const attackerCardObject = this.children.list.find(child =>
                    child.getData('isOpponentCard') && child.getData('fieldIndex') === bestAttack.attacker.index
                );
                const defenderCardObject = this.children.list.find(child =>
                    child.getData('isCardOnField') && !child.getData('isOpponentCard') && child.getData('fieldIndex') === bestAttack.defender.index
                );

                // Si no encontramos los objetos por alguna razón, abortamos para evitar errores.
                if (!attackerCardObject || !defenderCardObject) {
                    console.error("No se encontraron los objetos de las cartas para el ataque del oponente.");
                    this.endOpponentTurn(); // Pasamos el turno para no bloquear el juego.
                    return;
                }

                console.log(`%c[Opponent] Decide atacar con ${attackerCardData.id} a ${defenderCardData.id}`, 'color: #ff8c00');
                
                // 1. Revelamos la carta del oponente que ataca.
                this.revealOpponentCard(attackerCardObject);

                // 2. Resolvemos el combate
                const result = resolveCombat(attackerCardData, defenderCardData);
                console.log('[Opponent] Resultado del combate:', result);

                // 3. Animación de ataque
                this.tweens.add({
                    targets: attackerCardObject,
                    x: defenderCardObject.x,
                    y: defenderCardObject.y,
                    duration: 200,
                    yoyo: true,
                    ease: 'Power1',
                    onComplete: () => {
                        if (result.loser === 'attacker') this.destroyCard(this.opponent, bestAttack.attacker.index);
                        else if (result.loser === 'defender') this.destroyCard(this.player, bestAttack.defender.index);
                        this.time.delayedCall(500, () => this.endOpponentTurn(true));
                    }
                });
                return; // Salimos para que no intente jugar otra carta.
            }

            // --- ¡NUEVA LÓGICA DE ATAQUE A CIEGAS! ---
            // Decisión 2: Si no hay un buen ataque calculado, pero hay cartas boca abajo, atacar una al azar.
            const unrevealedPlayerCards = this.children.list.filter(c => 
                !c.getData('isOpponentCard') && 
                c.getData('isCardOnField') && 
                !c.getData('isRevealed')
            );

            if (opponentFieldCards.length > 0 && unrevealedPlayerCards.length > 0) {
                console.log('%c[Opponent] No hay ataques óptimos. Realizando un ataque a ciegas.', 'color: #ff8c00');

                const randomAttackerObject = Phaser.Math.RND.pick(opponentFieldCards);
                const randomDefenderObject = Phaser.Math.RND.pick(unrevealedPlayerCards);

                // 1. Animación de ataque. La IA no sabe el resultado todavía.
                this.tweens.add({
                    targets: randomAttackerObject,
                    x: randomDefenderObject.x,
                    y: randomDefenderObject.y,
                    duration: 200,
                    yoyo: true,
                    ease: 'Power1',
                    onComplete: () => {
                        // --- ¡LÓGICA CORREGIDA! ---
                        // El resultado se determina AHORA, después de que el ataque ha ocurrido.

                        // 2. Obtenemos los datos de las cartas justo antes de resolver.
                        const attackerCardData = randomAttackerObject.getData('cardData');
                        const defenderCardData = randomDefenderObject.getData('cardData');

                        // 3. Revelamos las cartas involucradas.
                        this.revealOpponentCard(randomAttackerObject);
                        this.revealPlayerCard(randomDefenderObject);

                        // 4. Resolvemos el combate y aplicamos el resultado.
                        const result = resolveCombat(attackerCardData, defenderCardData);
                        console.log('[Opponent] Resultado del ataque a ciegas:', result);

                        if (result.loser === 'attacker') this.destroyCard(this.opponent, randomAttackerObject.getData('fieldIndex'));
                        else if (result.loser === 'defender') this.destroyCard(this.player, randomDefenderObject.getData('fieldIndex'));
                        this.time.delayedCall(500, () => this.endOpponentTurn(true));
                    }
                });
                return; // Salimos para que no intente jugar otra carta.
            }

            // Decisión 2: Si no hay un buen ataque, intentar jugar una carta.
            if (this.opponent.hand.length > 0 && availableSlots.length > 0) {
                const cardToPlay = this.opponent.hand[0]; // Juega la primera carta de la mano
                const targetSlotIndex = Phaser.Math.RND.pick(availableSlots);

                console.log(`%c[Opponent] Decide jugar la carta ${cardToPlay.id} en el slot ${targetSlotIndex}`, 'color: #ff8c00');

                // Actualizamos el modelo de datos del oponente
                const playedCard = this.opponent.playCardFromHand(cardToPlay.instanceId, targetSlotIndex);
                
                if (playedCard) {
                    // Creamos la representación visual de la carta en el campo del oponente
                    const targetSlotObject = this['opponent_battle_slots'][targetSlotIndex];
                    // --- ¡MEJORA! --- Usamos la clase Card para crear la carta boca abajo.
                    const newCardObject = new Card(this, targetSlotObject.x, targetSlotObject.y, playedCard, true); // El 'true' indica que debe estar boca abajo.
                    newCardObject.setScale(0.17); // Usamos la misma escala que las cartas del jugador en el campo.
                    newCardObject.setData('isOpponentCard', true); // Marcador para identificarla en el campo
                    // --- ¡CORRECCIÓN CLAVE! ---
                    // Guardamos los datos de la carta para que la IA pueda leerlos al atacar.
                    newCardObject.setData('cardData', playedCard);
                    newCardObject.setData('fieldIndex', targetSlotIndex);
                    newCardObject.setData('isCardOnField', true); // Marcamos que está en el campo para poder ser atacada.
                    // --- ¡CORRECCIÓN CLAVE! ---
                    newCardObject.on('pointerdown', () => this.onCardClicked(newCardObject)); // Hacemos que la carta sea clicable.
                    
                    // Reponemos la mano del oponente (lógica y visual)
                    this.opponent.drawCard();
                    this.refreshOpponentHand();
                    this.updateDeckCounts();
                    opponentHasActed = true;
                }

                this.time.delayedCall(500, () => this.endOpponentTurn(opponentHasActed));
                return;
            }

            // Decisión 3: Si no puede hacer nada, pasar el turno
            console.log('%c[Opponent] No puede realizar acciones. Pasa el turno.', 'color: #ff8c00');
            this.endOpponentTurn(true); // El oponente ha actuado (pasando el turno)
        });
    }

    /**
     * --- ¡NUEVA FUNCIÓN DE IA! ---
     * Analiza todos los posibles ataques y devuelve el mejor según un sistema de puntuación.
     * @returns {object|null} El mejor objeto de ataque o null si no hay ataques posibles.
     */
    findBestAttack() {
        // --- ¡LÓGICA CORREGIDA! ---
        // La IA ya no mira el modelo de datos del jugador. Ahora busca los objetos visuales en el tablero.
        const opponentCardObjects = this.children.list.filter(c => c.getData('isOpponentCard') && c.getData('isCardOnField'));
        const playerCardObjects = this.children.list.filter(c => !c.getData('isOpponentCard') && c.getData('isCardOnField'));

        if (opponentCardObjects.length === 0 || playerCardObjects.length === 0) {
            return null;
        }

        // Filtramos las cartas del jugador para quedarnos solo con las que están reveladas.
        const revealedPlayerCards = playerCardObjects.filter(c => c.getData('isRevealed'));

        // --- ¡CORRECCIÓN CLAVE CONTRA TRAMPAS! ---
        // La IA solo puede "ver" y mapear los datos de las cartas que están reveladas.
        // Si una carta no está revelada, no se incluye en la lista de posibles objetivos a analizar.
        const opponentCards = opponentCardObjects.map(c => ({ card: c.getData('cardData'), index: c.getData('fieldIndex') }));
        const playerCards = revealedPlayerCards.map(c => {
            return { card: c.getData('cardData'), index: c.getData('fieldIndex') };
        });

        let bestAttack = { score: -100 }; // Empezamos con una puntuación muy baja.

        // Iteramos sobre cada posible combinación de ataque.
        for (const attacker of opponentCards) {
            for (const defender of playerCards) {
                let currentScore = 0;
                const result = resolveCombat(attacker.card, defender.card);

                // Puntuación basada en el resultado del combate:
                if (result.winner === 'attacker') {
                    currentScore += 10; // ¡Muy bueno! Destruimos una carta enemiga.
                    // Bonificación si la carta destruida era de alto nivel.
                    currentScore += defender.card.level * 2; 
                } else { // Si es un empate o una derrota, se considera una mala jugada.
                    currentScore -= 10; // ¡Muy malo! Evitar este ataque.
                    if (result.loser === 'attacker') { // Penalización extra solo si nuestra carta muere
                        currentScore -= attacker.card.level * 3;
                    }
                }

                // Si esta jugada es mejor que la mejor que hemos encontrado hasta ahora...
                if (currentScore > bestAttack.score) {
                    bestAttack = { attacker, defender, score: currentScore };
                }
            }
        }

        // --- ¡CORRECCIÓN CLAVE! ---
        // Solo devolvemos un ataque si su puntuación es estrictamente positiva.
        // Un empate (score 0) ya no se considera un "buen ataque".
        return bestAttack.score > 0 ? bestAttack : null;
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
        const cardData = cardObject.getData('cardData');
        console.log(`%c[GameScene] Carta del jugador ${cardData.id} ha sido revelada por un ataque.`, "color: #9933ff");
        cardObject.setData('isRevealed', true);
    }


    /**
     * Inicia el turno del jugador, reseteando flags y activando el temporizador.
     */
    startPlayerTurn() {
        this.gameState = 'player-turn';
        this.playerHasActed = false; // Reseteamos el flag de acción para el nuevo turno

        console.log('%c[GameScene] Inicia el turno del jugador.', 'color: #00ccff');
        this.events.emit('update-turn-indicator', 'player');
        this.events.emit('show-end-turn-button'); // Mostramos el botón

        // Creamos un temporizador de 30 segundos
        if (this.turnTimer) this.turnTimer.destroy();
        this.turnTimer = this.time.addEvent({
            delay: 30000, // 30 segundos
            callback: this.endPlayerTurn,
            callbackScope: this
        });
    }

    /**
     * Finaliza el turno del jugador, ya sea por tiempo o por acción voluntaria (eliminado).
     */
    endPlayerTurn() {
        if (this.gameState !== 'player-turn') return;

        console.log('%c[GameScene] Turno del jugador terminado.', 'color: #ff8c00');

        // Detenemos el temporizador actual
        if (this.turnTimer) this.turnTimer.destroy();
        this.events.emit('hide-end-turn-button'); // Ocultamos el botón

        // Comprobamos inactividad
        if (!this.playerHasActed) {
            this.playerInactiveTurns++;
            console.log(`%c[GameScene] El jugador ha estado inactivo. Turnos inactivos: ${this.playerInactiveTurns}`, 'color: #ff4444');
        } else {
            this.playerInactiveTurns = 0; // Reseteamos si hubo acción
        }

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
            const remainingTime = Math.ceil(this.turnTimer.getRemainingSeconds());
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
        // --- ¡CORRECCIÓN CLAVE! ---
        // Unificamos el acceso a los datos de las cartas. Siempre usamos getData.
        const attackerData = attackingCardObject.getData('cardData');
        const defenderData = defendingCardObject.getData('cardData');

        this.playerHasActed = true; // El jugador ha realizado una acción

        console.log(`%c[GameScene] Jugador ataca con ${attackerData.type} a ${defenderData.type}`, "color: #ff69b4");

        // --- ¡NUEVA LÓGICA DE REVELACIÓN! ---
        // Antes de cualquier otra cosa, revelamos la carta del oponente.
        this.revealOpponentCard(defendingCardObject);

        // Resolvemos el combate
        const result = resolveCombat(attackerData, defenderData);
        console.log('Resultado del combate:', result);

        this.animateAttack(attackingCardObject, defendingCardObject, result);
    }

    /**
     * Gestiona un ataque directo al oponente cuando no tiene cartas en el campo.
     * @param {Phaser.GameObjects.Image} attackingCardObject La carta que ataca.
     */
    handleDirectAttack(attackingCardObject) {
        const attackerData = attackingCardObject.cardData;
        this.playerHasActed = true; // El jugador ha realizado una acción

        console.log(`%c[GameScene] Jugador realiza un ATAQUE DIRECTO con ${attackerData.type}`, "color: #ff69b4");

        // Llenamos la esencia del jugador
        this.player.fillEssence(attackerData.type);
        console.log(`%c[GameScene] Esencia de ${attackerData.type} llenada para el jugador.`, "color: #00ffaa");
        // TODO: Emitir evento para actualizar la UI de las esencias.
        // TODO: Validar que el jugador tiene una acción disponible para atacar.

        // Animamos el ataque hacia el centro del campo del oponente
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
                this.deselectCard(false);
                // Después de una breve pausa para que se vea el resultado, aplicamos el daño.
                this.time.delayedCall(250, () => {
                    if (result.loser === 'attacker') {
                        this.destroyCard(this.player, attackingCardObject.getData('fieldIndex'));
                    } else if (result.loser === 'defender' && target && typeof target.getData === 'function') {
                        // La carta ya fue revelada, ahora la destruimos.
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
        this.events.emit('hide-end-turn-button'); // Ocultamos el botón al final del juego

        console.log(`%c[GameScene] Fin de la partida. Ganador: ${winner}`, 'color: yellow; font-size: 18px;');

        // Desactivamos toda la interactividad para que no se pueda seguir jugando.
        this.input.enabled = false;

        // Emitimos un evento para que la UIScene muestre la pantalla de fin de juego.
        this.events.emit('game-over', winner);
    }

    /**
     * Destruye una carta del campo, actualizando el modelo y la vista.
     * @param {Player} owner El jugador propietario de la carta.
     * @param {number} fieldIndex El índice de la carta en el campo.
     */
    destroyCard(owner, fieldIndex) {
        const cardData = owner.field[fieldIndex];
        if (!cardData) return;

        console.log(`%c[GameScene] Destruyendo carta ${cardData.id} del jugador ${owner.id} en el slot ${fieldIndex}`, "color: #ff4444");

        // 1. Encontrar el objeto visual de la carta
        const cardObject = this.children.list.find(child =>
            child.getData('fieldIndex') === fieldIndex &&
            ((owner.id === 'player' && child.getData('isCardOnField')) || (owner.id === 'opponent' && child.getData('isOpponentCard')))
        );

        if (cardObject) {
            // Animación de destrucción
            this.tweens.add({
                targets: cardObject,
                alpha: 0,
                scale: cardObject.scale * 0.8,
                duration: 250,
                onComplete: () => cardObject.destroy()
            });
        }

        // 2. Añadir la carta al cementerio del propietario
        owner.addCardDataToGraveyard(cardData);

        // 3. Limpiar el slot en el modelo de datos
        owner.field[fieldIndex] = null;

        // 4. Si la carta era del jugador, reactivar el slot para que sea 'droppable'
        if (owner.id === 'player') {
            const slot = this['player_battle_slots'][fieldIndex];
            if (slot) {
                slot.setInteractive(); // Lo reactivamos
            }
        }
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
        // ¡AQUÍ ESTÁ EL CAMBIO! Usamos la clase Card.
        // 1. Creamos la instancia. El constructor de Card ya la añade a la escena y la hace interactiva.
        const card = new Card(this, x, y, cardData, false);
        
        // 2. Configuramos sus propiedades visuales y guardamos su posición/escala original.
        card.setScale(0.95);
        card.setData('startPosition', { x, y });
        card.setData('startScale', card.scale);
        card.setData('isRevealed', true); // Las cartas del jugador siempre están reveladas

        // 3. Añadimos el listener para el evento de clic.
        card.on('pointerdown', () => this.onCardClicked(card));

        return card;
    }

    /**
     * Gestiona toda la lógica cuando se hace clic en una carta.
     * @param {Card} clickedCard El objeto de la carta que ha sido clicada.
     */
    onCardClicked(clickedCard) {
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

        // Si ya hay una carta seleccionada, y hacemos clic en otra...
        // Comprobamos si es una acción válida (atacar, fusionar).

        // Lógica de FUSIÓN: carta seleccionada en campo -> otra carta propia en campo
        if (this.selectedCard.getData('isCardOnField') && 
            clickedCard.getData('isCardOnField') && 
            !clickedCard.getData('isOpponentCard')) // <-- ¡CORRECCIÓN CLAVE!
        {
            this.attemptToFuse(this.selectedCard, clickedCard);
        }
        // Lógica de ATAQUE: carta seleccionada en campo -> carta del oponente
        else if (this.selectedCard.getData('isCardOnField') && 
                 clickedCard.getData('isOpponentCard') &&
                 clickedCard.getData('isCardOnField')) // <-- ¡CORRECCIÓN CLAVE!
        {
            this.handleAttack(this.selectedCard, clickedCard);
        }
        // --- ¡NUEVA LÓGICA! ---
        // Lógica de FUSIÓN DESDE MANO: carta seleccionada en mano -> carta propia en campo
        else if (!this.selectedCard.getData('isCardOnField') && clickedCard.getData('isCardOnField')) {
            this.attemptToFuseFromHand(this.selectedCard, clickedCard);
        }
        // Si no es una acción válida (ej: carta de mano -> otra carta de mano),
        // simplemente cambiamos la selección a la nueva carta.
        else {
            this.deselectCard();
            this.selectCard(clickedCard);
        }
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

        // Animación de "levantar" la carta
        this.tweens.add({
            targets: cardObject,
            y: cardObject.getData('startPosition').y - 50, // La elevamos un poco
            scale: cardObject.getData('startScale') * 1.1, // La agrandamos
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
        
        // --- LÓGICA CORREGIDA ---
        // Si se debe animar, la carta (esté en la mano o en el campo) vuelve
        // a su posición original guardada en 'startPosition'.
        if (animate) {
            this.tweens.add({
                targets: cardToDeselect,
                x: cardToDeselect.getData('startPosition').x,
                y: cardToDeselect.getData('startPosition').y,
                scale: cardToDeselect.getData('startScale'),
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
        this.createCardsRow(this.scale.height * 0.82, 'player-cards', this.player.hand);
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
    createOpponentCard(x, y, cardData, scale = 0.2) { // Por defecto, escala pequeña para la mano
        // --- ¡REFACTORIZACIÓN! ---
        // Ahora usamos la clase Card, pasando 'true' para que se cree boca abajo.
        const card = new Card(this, x, y, cardData, true);
        card.setScale(scale); // Aplicamos la escala para la mano.
        card.setData('isOpponentCard', true); // Marcador para identificarlas
        return card;
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
            scaleX: 0,
            scaleY: cardObject.scaleY * 1.1, // La hacemos un poco más alta
            duration: 100,
            ease: 'Power1',
            onComplete: () => {
                cardObject.setTexture(textureName); // Cambiamos la textura justo a la mitad de la animación

                // --- ¡NUEVA LÓGICA DE ESCALA! ---
                // Definimos la nueva escala para la carta revelada.
                const revealedScale = 0.95; // Usamos la misma escala que las cartas del jugador.

                // Animación de vuelta
                this.tweens.add({
                    targets: cardObject,
                    scaleX: revealedScale, // Aplicamos la nueva escala más grande
                    scaleY: revealedScale,
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

        // --- ¡NUEVA LÓGICA! ---
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
}