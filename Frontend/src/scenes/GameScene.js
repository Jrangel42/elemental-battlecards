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

        // Otros iconos del tablero
        this.load.image('orb-fire', '/assets/icons/fuego.png');
        this.load.image('orb-water', '/assets/icons/agua.png');
        this.load.image('orb-plant', '/assets/icons/planta.png');
        this.load.image('orb-light', '/assets/icons/luz.png');
        this.load.image('orb-spirit', '/assets/icons/espiritu.png');
        this.load.image('orb-shadow', '/assets/icons/sombra.png');
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

        // ---------- ZONA DE MANO DEL OPONENTE (4 espacios) ----------
        this.createSlotsRow(height * 0.2, 'opponent-slots');
        this.createCardsRow(height * 0.2, 'opponent-cards', this.opponent.hand);

        // ---------- CENTRO (campo de batalla con 6 espacios) ----------
        this.createSlotsRow(height / 2 - battleRowYOffset, 'opponent_battle_slots', 6); // Fila del oponente
        this.createSlotsRow(height / 2 + battleRowYOffset, 'player_battle_slots', 6);   // Fila del jugador

        // ---------- ZONA DE MANO DEL JUGADOR (4 espacios) ----------
        this.createSlotsRow(height * 0.8, 'player-slots');
        this.createCardsRow(height * 0.8, 'player-cards', this.player.hand);

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
    }

    // Crear fila de slots
    createSlotsRow(y, name, numSlots = 4) { // Por defecto crea 4 slots
        const slots = [];
        const slotWidth = 110; // Ancho reducido para 1280px
        const slotSpacing = 10; // Espacio reducido
        const positionsX = calculateRowPositions({
            numItems: numSlots,
            itemWidth: slotWidth,
            itemSpacing: slotSpacing,
            containerWidth: this.scale.width
        });

        for (let i = 0; i < numSlots; i++) {
            let slot = this.add.image(positionsX[i], y, 'slot')
                .setScale(0.1) // Escala reducida
                .setAlpha(0.55);

            slots.push(slot);
        }

        this[name] = slots;
    }

    // Crear fila de cartas
    createCardsRow(y, name, hand) {
        const cards = [];
        const numCards = hand.length;
        const cardWidth = 110; // Ancho reducido
        const cardSpacing = 10; // Espacio reducido
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
            .setScale(0.8) // Escala reducida
            .setInteractive({ cursor: 'pointer' });
        card.setData('cardData', cardData); // Guardamos los datos de la carta
        return card;
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
        this.add.image(width - 270, height - 140, 'card-back-player').setScale(0.14);
        this.playerDeckText = this.add.text(width - 270, height - 140, this.player.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Mazo del oponente
        this.add.image(270, 140, 'card-back-opponent').setScale(0.14);
        this.opponentDeckText = this.add.text(270, 140, this.opponent.deck.getCardsCount(), { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    }
}
