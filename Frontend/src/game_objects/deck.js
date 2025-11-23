import { CARD_TYPES, GAME_CONFIG } from '../helpers/constants.js';
import { CardDefinitions } from './card-definitions.js';

/**
 * Gestiona un conjunto de cartas, como el mazo o el cementerio.
 */
export default class Deck {
    constructor(ownerId) {
        this.ownerId = ownerId;
        this.cards = this.createInitialDeck();
    }

    /**
     * Crea un mazo inicial según la Regla #7 (8 copias de cada tipo elemental).
     * @returns {Array<object>} Un nuevo mazo de 48 cartas, barajado.
     */
    createInitialDeck() {
        const deck = [];
        const types = Object.values(CARD_TYPES); // ['fuego', 'agua', ...] -> Obtenemos los tipos de carta de las constantes
        const copiesPerType = GAME_CONFIG.INITIAL_DECK_SIZE / types.length; // 48 / 6 = 8

        for (const type of types) {
            // Buscamos la definición de la carta de nivel 1 para este tipo
            const cardDefinition = CardDefinitions[`${type}-1`];
            if (!cardDefinition) continue; // Si no se encuentra, saltamos a la siguiente

            for (let copyIndex = 0; copyIndex < copiesPerType; copyIndex++) {
                deck.push({
                    ...cardDefinition, // Copiamos todas las propiedades base de la definición
                    owner: this.ownerId // Y añadimos el propietario
                });
            }
        }
        return this.shuffle(deck);
    }

    /**
     * Baraja el mazo actual usando el algoritmo Fisher-Yates.
     */
    shuffle(deck = this.cards) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    /**
     * Roba la carta superior del mazo.
     * @returns {object|undefined} La carta robada o undefined si el mazo está vacío.
     */
    draw() {
        return this.cards.pop();
    }

    /**
     * Devuelve el número de cartas que quedan en el mazo.
     * @returns {number}
     */
    getCardsCount() {
        return this.cards.length;
    }
}