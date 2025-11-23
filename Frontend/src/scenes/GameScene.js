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


        // --- Lógica de Turnos (Ejemplo) ---
        // Escuchamos el evento 'end-turn' que será emitido desde la UIScene.
        this.events.on('end-turn', () => {
            console.log('El turno ha terminado en GameScene. Ahora sería el turno del oponente.');
            // Aquí iría la lógica para que juegue el oponente.
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
            this.selectedCard.setData('fieldIndex', fieldIndex); // Guardamos su índice
            
            // --- ¡CORRECCIÓN CLAVE! ---
            // Actualizamos la posición "original" de la carta para que sea la del slot en el campo.
            this.selectedCard.setData('startPosition', { x: dropZone.x, y: dropZone.y });

            // La carta jugada ya no es parte de la mano visual
            this['player-cards'] = this['player-cards'].filter(card => card !== this.selectedCard);
            this.deselectCard(false); // Deseleccionamos sin animar el retorno

            this.player.drawCard();
            this.refreshPlayerHand();
            this.updateDeckCounts();

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
        // --- ¡CORRECCIÓN! ---
        // Guardamos la posición y escala inicial para futuras selecciones/deselecciones.
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
        fusedCardObject.setData('startPosition', { x: fusionPosition.x, y: fusionPosition.y });
        // --- ¡CORRECCIÓN! ---
        // Guardamos también la escala inicial, que es necesaria para la animación de selección.
        fusedCardObject.setData('startScale', fusedCardObject.scale);

        // Hacemos que la nueva carta sea seleccionable.
        fusedCardObject.on('pointerdown', () => this.onCardClicked(fusedCardObject));

        // 5. Limpiamos la selección y refrescamos la mano.
        this.deselectCard(false); // Deseleccionamos sin animación.

        // --- ¡NUEVA LÓGICA! ---
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
    }

    /**
     * Gestiona el intento de ataque de una carta del jugador a una del oponente.
     * @param {Phaser.GameObjects.Image} attackingCardObject El objeto de la carta que ataca.
     * @param {Phaser.GameObjects.Image} defendingCardObject El objeto de la carta que defiende.
     */
    handleAttack(attackingCardObject, defendingCardObject) {
        const attackerData = attackingCardObject.cardData;
        const defenderData = defendingCardObject.cardData;

        console.log(`%c[GameScene] Jugador ataca con ${attackerData.type} a ${defenderData.type}`, "color: #ff69b4");

        // TODO: Validar que el jugador tiene una acción disponible para atacar.

        // Resolvemos el combate
        const result = resolveCombat(attackerData, defenderData);
        console.log('Resultado del combate:', result);

        // Animación de ataque
        this.tweens.add({
            targets: attackingCardObject,
            x: defendingCardObject.x,
            y: defendingCardObject.y,
            duration: 200,
            yoyo: true, // La carta vuelve a su posición original
            ease: 'Power1',
            onComplete: () => {
                this.deselectCard(false); // Deseleccionamos la carta atacante sin animación de retorno
                // Aquí se aplicaría el resultado (destruir cartas, etc.)
                // Por ahora, solo lo mostramos en consola.
            }
        });

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
                slot.setInteractive();
                // Le añadimos un listener para cuando se haga clic en él
                slot.on('pointerdown', () => {
                    this.onSlotClicked(slot);
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
        const texture = `card-${cardData.type}-1`; // Anverso
        let card = this.add.image(x, y, texture)
<<<<<<< HEAD
            .setScale(0.82) // Escala reducida
=======
            .setScale(0.95) // Escala reducida
>>>>>>> 20061079201f7946cfd55ed4e4f9326869f67a49
            .setInteractive({ cursor: 'pointer', draggable: true }); // Hacemos la carta arrastrable
        card.setData('cardData', cardData); // Guardamos los datos de la carta

        // Habilitamos el drag en el input manager de Phaser
        this.input.setDraggable(card);


        // --- LÓGICA DE ACTIVAR ESENCIAS (ELIMINADA DE AQUÍ) ---
        // Se ha quitado el listener 'pointerdown' que activaba las esencias incorrectamente.
        // La nueva lógica se gestiona al soltar la carta en el campo y al atacar.

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
        if (this.selectedCard.getData('isCardOnField') && clickedCard.getData('isCardOnField')) {
            this.attemptToFuse(this.selectedCard, clickedCard);
        }
        // Lógica de ATAQUE: carta seleccionada en campo -> carta del oponente
        else if (this.selectedCard.getData('isCardOnField') && clickedCard.getData('isOpponentCard')) {
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
          // No necesitamos un 'else' aquí, ya que el 'pointerdown' del tablero ya llama a deselectCard().
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

    // Crear carta del oponente
    createOpponentCard(x, y, cardData) {
        const texture = 'card-back-opponent'; // Reverso
        let card = this.add.image(x, y, texture)
            .setScale(0.14); // Escala reducida
        
        card.setInteractive(); // La hacemos interactiva para poder hacer clic en ella
        card.setData('cardData', cardData); // Guardamos los datos de la carta
        card.setData('isOpponentCard', true); // Marcador para identificarlas
        card.on('pointerdown', () => this.onCardClicked(card)); // Le añadimos el listener de clic
        return card;
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
<<<<<<< HEAD
        this.add.image(width - 120, height - 290, 'card-back-player').setScale(0.185);
        this.playerDeckText = this.add.text(width - 120, height - 290, this.player.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Mazo del oponente
        this.add.image(120, 290, 'card-back-opponent').setScale(0.185);
        this.opponentDeckText = this.add.text(120, 290, this.opponent.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
=======
        this.add.image(width - 300, height - 250, 'card-back-player').setScale(0.25);
        this.playerDeckText = this.add.text(width - 270, height - 140, this.player.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Mazo del oponente
        this.add.image(300, 240, 'card-back-opponent').setScale(0.25);
        this.opponentDeckText = this.add.text(270, 140, this.opponent.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
>>>>>>> 20061079201f7946cfd55ed4e4f9326869f67a49
    }

    // Actualizar contadores de mazos
    updateDeckCounts() {
        this.playerDeckText.setText(this.player.deck.getCardsCount());
        this.opponentDeckText.setText(this.opponent.deck.getCardsCount());
        console.log('Contadores de mazo actualizados.');
    }
}
