import { CARD_TYPES, GAME_CONFIG } from "../helpers/constants";

/**
 * Baraja un array de cartas usando el algoritmo Fisher-Yates.
 * @param {Array<object>} deck - El mazo de cartas a barajar.
 * @returns {Array<object>} El mazo barajado.
 */
export function shuffleDeck(deck) {
    // Recorremos el array desde el último elemento hasta el segundo (índice 1).
    for (let currentIndex = deck.length - 1; currentIndex > 0; currentIndex--) {
        // Generamos un índice aleatorio entre 0 y el índice actual.
        const randomIndexToSwap = Math.floor(Math.random() * (currentIndex + 1));

        // Intercambiamos la carta en la posición actual con la carta en la posición aleatoria.
        [deck[currentIndex], deck[randomIndexToSwap]] = [deck[randomIndexToSwap], deck[currentIndex]];
    }
    return deck;
}

/**
 * Crea un mazo inicial según la Regla #7.
 * (8 copias de cada uno de los 6 tipos elementales).
 * @returns {Array<object>} Un nuevo mazo de 48 cartas, barajado.
 */
export function createInitialDeck() {
    const deck = [];
    const types = Object.values(CARD_TYPES); // ['fuego', 'agua', ...]
    const copiesPerType = GAME_CONFIG.INITIAL_DECK_SIZE / types.length; // 48 / 6 = 8

    for (const type of types) {
        // Para cada tipo, creamos el número de copias definido (8).
        for (let copyIndex = 0; copyIndex < copiesPerType; copyIndex++) {
            // Aquí definimos la estructura de una carta.
            // Usamos un ID único para poder rastrearla.
            deck.push({
                id: `${type}-${copyIndex}`,
                type: type,
                level: 1,
                state: 'in_deck' // Estado inicial
            });
        }
    }

    return shuffleDeck(deck);
}