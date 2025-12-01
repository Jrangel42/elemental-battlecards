import Phaser from 'phaser';
import { calculateRowPositions } from '../helpers/zone';
import Player from '../game_objects/player.js';

/**
 * La escena principal donde se desarrolla el juego de cartas.
 * Se encarga del tablero, las manos de los jugadores y la lógica del juego.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.playerData = null; // Propiedad para guardar los datos del jugador
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

        // Cartas
        this.load.image('card-fuego-1', '/assets/images/cartas/carta fuego.png');
        this.load.image('card-agua-1', '/assets/images/cartas/carta agua.png');
        this.load.image('card-planta-1', '/assets/images/cartas/carta planta.png');
        this.load.image('card-luz-1', '/assets/images/cartas/carta luz.png');
        this.load.image('card-sombra-1', '/assets/images/cartas/carta sombra.png');
        this.load.image('card-espiritu-1', '/assets/images/cartas/carta espiritu.png');
        
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

        // --- Lógica de Turnos (Ejemplo) ---
        // Escuchamos el evento 'end-turn' que será emitido desde la UIScene.
        this.events.on('end-turn', () => {
            console.log('El turno ha terminado en GameScene. Ahora sería el turno del oponente.');
            // Aquí iría la lógica para que juegue el oponente.
        });

        // --- Lógica de Arrastrar y Soltar (Drag and Drop) ---
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            gameObject.x = dragX;
            gameObject.y = dragY;
        });

        this.input.on('dragstart', (pointer, gameObject) => {
            this.children.bringToTop(gameObject); // Traer la carta al frente
            // Guardamos la posición original de la carta
            gameObject.setData('startPosition', { x: gameObject.x, y: gameObject.y });
            gameObject.setData('dropped', false); // Bandera para saber si se soltó en una zona válida
        });

        this.input.on('drop', (pointer, gameObject, dropZone) => {
            const cardData = gameObject.getData('cardData');
            console.log(`Carta ${cardData.id} soltada en zona: ${dropZone.name}`);

            // Obtenemos el índice del slot del campo de batalla (ej: de 'player_battle_slots-2' extraemos 2)
            const fieldIndex = parseInt(dropZone.name.split('-')[1]);

            // --- LÓGICA DE REPONER CARTA ---
            // 1. Actualizar el modelo de datos del jugador PRIMERO
            // Usamos el método para mover la carta de la mano al campo
            const cardPlayed = this.player.playCardFromHand(cardData.id, fieldIndex);

            // 2. Si la carta se pudo jugar (el slot estaba libre)...
            if (cardPlayed) {
                gameObject.setData('dropped', true); // Marcamos que el drop fue exitoso

                // Movemos el objeto visualmente al slot
                gameObject.x = dropZone.x;
                gameObject.y = dropZone.y;
                // ¡AQUÍ ESTÁ LA CORRECCIÓN! Ajustamos la escala de la carta para que encaje en el campo.
                gameObject.setScale(0.82);

                // La carta en el campo ahora es clickeable para atacar
                gameObject.setInteractive({ cursor: 'crosshair' });

                // Añadimos el listener para el ataque.
                gameObject.on('pointerdown', () => this.handleAttack(gameObject));

                // Quitamos la carta jugada del array de la mano ANTES de refrescar.
                this['player-cards'] = this['player-cards'].filter(card => card !== gameObject);

                // 3. Robamos una nueva carta y actualizamos la vista
                this.player.drawCard();
                this.refreshPlayerHand();
                this.updateDeckCounts();
            } else {
                // Si no se pudo jugar (ej: slot ocupado), no hacemos nada aquí.
                // El evento 'dragend' se encargará de devolver la carta a la mano.
                console.log('El slot ya estaba ocupado. La carta volverá a la mano.');
            }
        });

        this.input.on('dragend', (pointer, gameObject) => {
            // Si la carta no se soltó en una zona válida (o el slot estaba ocupado), la devolvemos a su lugar
            if (!gameObject.getData('dropped')) {
                const startPosition = gameObject.getData('startPosition');
                // Usamos un tween para una animación suave de retorno
                this.tweens.add({
                    targets: gameObject,
                    x: startPosition.x,
                    y: startPosition.y,
                    duration: 200, // Duración de la animación en ms
                    ease: 'Power1'
                });
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
                slot.setInteractive({ dropZone: true });
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
            .setScale(0.82) // Escala reducida
            .setScale(0.95) // Escala reducida
            .setInteractive({ cursor: 'pointer', draggable: true }); // Hacemos la carta arrastrable
        card.setData('cardData', cardData); // Guardamos los datos de la carta

        // Habilitamos el drag en el input manager de Phaser
        this.input.setDraggable(card);
        
        return card;
    }

    /**
     * Gestiona el intento de ataque de una carta del jugador.
     * Aquí se aplica la nueva lógica de activación de esencias.
     * @param {Phaser.GameObjects.Image} attackingCardObject El objeto de la carta que ataca.
     */
    handleAttack(attackingCardObject) {
        const cardData = attackingCardObject.getData('cardData');
        console.log(`%c[GameScene] Jugador ataca con ${cardData.type} (ID: ${cardData.id})`, "color: #ff69b4");

        // Condición 1: Comprobar si el campo del oponente está vacío.
        const opponentFieldIsEmpty = this.opponent.field.every(slot => slot === null);

        // Condición 2: El jugador realiza un ataque (este método es la prueba de ello).
        if (opponentFieldIsEmpty) {
            console.log('%cEl campo del oponente está vacío. ¡Ataque directo!', 'color: #ff69b4');
            
            // Si la esencia de ese tipo NO está llena, la llenamos.
            if (!this.player.essences.has(cardData.type)) {
                this.player.essences.activate(cardData.type);
                this.game.events.emit('essence-activated', this.player.id, cardData.type);
            } else {
                console.log(`La esencia de ${cardData.type} ya estaba llena. No pasa nada.`);
            }
        } else {
            console.log('El oponente tiene cartas. El combate debería resolverse aquí.');
            // Aquí iría la lógica futura para seleccionar una carta defensora y llamar a resolveCombat().
        }
    }

    /**
     * Destruye las cartas actuales de la mano del jugador y las vuelve a crear.
     * Es útil para cuando la mano cambia (robar, descartar, etc.).
     */
    refreshPlayerHand() {
        // Destruimos los objetos de juego de las cartas anteriores
        if (this['player-cards']) {
            this['player-cards'].forEach(card => card.destroy());
        }

        // Volvemos a crear las cartas con la mano actualizada
        this.createCardsRow(this.scale.height * 0.82, 'player-cards', this.player.hand);
        console.log('Mano del jugador refrescada.');
    }

    // Crear carta del oponente
    createOpponentCard(x, y, cardData) {
        const texture = 'card-back-opponent'; // Reverso
        let card = this.add.image(x, y, texture)
            .setScale(0.14) // Escala reducida
            .setInteractive({ cursor: 'pointer' });
        card.setData('cardData', cardData); // Guardamos los datos de la carta
        return card;
    }

    // Crear mazo y cementerio
    createDecks() {
        const { width, height } = this.scale;

        // Mazo del jugador

        this.add.image(width - 120, height - 290, 'card-back-player').setScale(0.185);
        this.playerDeckText = this.add.text(width - 120, height - 290, this.player.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Mazo del oponente
        this.add.image(120, 290, 'card-back-opponent').setScale(0.185);
        this.opponentDeckText = this.add.text(120, 290, this.opponent.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    }

    // Actualizar contadores de mazos
    updateDeckCounts() {
        this.playerDeckText.setText(this.player.deck.getCardsCount());
        this.opponentDeckText.setText(this.opponent.deck.getCardsCount());
        console.log('Contadores de mazo actualizados.');
    }
}
