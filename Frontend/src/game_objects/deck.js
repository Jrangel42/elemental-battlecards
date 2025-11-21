import { CARD_TYPES, GAME_CONFIG } from '../helpers/constants';

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
        const types = Object.values(CARD_TYPES); // ['fuego', 'agua', ...]
        const copiesPerType = GAME_CONFIG.INITIAL_DECK_SIZE / types.length; // 48 / 6 = 8

        for (const type of types) {
            for (let copyIndex = 0; copyIndex < copiesPerType; copyIndex++) {
                deck.push({
                    id: `${type}-${copyIndex}`,
                    type: type,
                    level: 1,
                    state: 'in_deck',
                    owner: this.ownerId
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