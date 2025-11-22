import Deck from './deck.js';
import Card, { CardTypes } from './card.js';
import EssenceManager from './essences.js';

/**
 * Gestiona el estado completo de un jugador, incluyendo su mazo, mano, campo,
 * cementerio y esencias.
 */
export default class Player {
    /**
     * @param {string} id El identificador del jugador ('player1' o 'player2').
     * @param {Phaser.Scene} scene La escena principal del juego.
     */
    constructor(id, scene) {
        this.id = id;
        this.scene = scene;

        this.deck = new Deck(id);
        this.essences = new EssenceManager();

        /** @type {Card[]} */
        this.hand = [];

        /** @type {(Card|null)[]} */
        this.field = new Array(6).fill(null); // 6 espacios en el campo

        /** @type {object[]} */
        this.graveyard = []; // Guardaremos los datos de las cartas, no los sprites

        this.turnsWithoutAttacking = 0;
    }

    /**
     * Roba la mano inicial de 4 cartas.
     */
    drawInitialHand() {
        for (let i = 0; i < 4; i++) {
            this.drawCard();
        }
    }

    /**
     * Roba una carta del mazo y la añade a la mano.
     * @returns {object|null} Los datos de la carta robada o null.
     */
    drawCard() {
        if (this.deck.getCardsCount() === 0) {
            if (this.graveyard.length === 0) {
                console.log(`${this.id} no tiene cartas en el mazo ni en el cementerio.`);
                return null; // No hay más cartas en el juego
            }
            this.refillDeckFromGraveyard();
        }

        const cardData = this.deck.draw();
        if (cardData) {
            // En lugar de crear el sprite aquí, lo añadimos a la mano como datos.
            // La escena se encargará de crear el sprite cuando sea necesario mostrarlo.
            this.hand.push(cardData);
        }
        return cardData;
    }

    /**
     * Mueve las cartas del cementerio de vuelta al mazo y lo baraja.
     */
    refillDeckFromGraveyard() {
        console.log(`${this.id} está barajando su cementerio en el mazo.`);
        this.deck.cards.push(...this.graveyard);
        this.graveyard = [];
        this.deck.shuffle();
    }

    /**
     * Mueve una carta de la mano a un slot específico del campo de batalla.
     * @param {string} cardId El ID de la carta a jugar.
     * @param {number} fieldIndex El índice del slot en el campo (0-5).
     * @returns {Card|null} La carta jugada o null si no se pudo.
     */
    playCardFromHand(cardId, fieldIndex) {
        const cardIndex = this.hand.findIndex(card => card.id === cardId);
        if (cardIndex > -1 && this.field[fieldIndex] === null) {
            const cardToPlay = this.hand.splice(cardIndex, 1)[0]; // Saca la carta de la mano
            this.field[fieldIndex] = cardToPlay; // Coloca la carta en el campo
            console.log(`[Player] Carta ${cardId} movida al slot ${fieldIndex} del campo.`);
            return cardToPlay;
        }
        console.warn(`[Player] No se pudo jugar la carta ${cardId} en el slot ${fieldIndex}.`);
        return null;
    }

    /**
     * Añade los datos de una carta al cementerio.
     * Si la carta es de nivel 2 o 3, la descompone en cartas de nivel 1.
     * @param {Card} card El objeto Card que ha sido derrotado.
     */
    addCardToGraveyard(card) {
        const baseCardsCount = Math.pow(2, card.level - 1);
        console.log(`Añadiendo ${baseCardsCount} carta(s) base de tipo ${card.type} al cementerio.`);

        for (let i = 0; i < baseCardsCount; i++) {
            this.graveyard.push({ type: card.type, owner: this.id });
        }

        // Destruimos el sprite de la carta del juego para liberar memoria
        card.destroy();
    }
}