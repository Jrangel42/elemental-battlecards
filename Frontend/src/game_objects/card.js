/**
 * Define los tipos de cartas para evitar errores de tipeo y facilitar el mantenimiento.
 */
export const CardTypes = {
    FUEGO: 'fuego',
    AGUA: 'agua',
    PLANTA: 'planta',
    LUZ: 'luz',
    SOMBRA: 'sombra',
    ESPIRITU: 'espiritu'
};

/**
 * Representa una carta en el juego. Extiende de Phaser.GameObjects.Sprite para tener
 * una representación visual y manejar la interacción.
 */
export default class Card extends Phaser.GameObjects.Sprite {

    /**
     * @param {Phaser.Scene} scene La escena a la que pertenece la carta.
     * @param {number} x La posición x inicial.
     * @param {number} y La posición y inicial.
     * @param {string} owner El jugador propietario de la carta ('player1' o 'player2').
     * @param {string} type El tipo de la carta (usando CardTypes).
     * @param {number} [level=1] El nivel de la carta.
     * @param {boolean} [isFaceDown=true] Si la carta está boca abajo.
     */
    constructor(scene, x, y, owner, type, level = 1, isFaceDown = true) {
        // La textura inicial será el reverso de la carta. Asumimos que se carga con la key 'card_back'.
        super(scene, x, y, 'card_back');

        this.scene = scene;
        this.owner = owner;
        this.type = type;
        this.level = level;
        this.isFaceDown = isFaceDown;

        // Propiedades para las reglas de ataque
        this.canAttack = true;
        this.attackCooldown = 0; // Turnos que debe esperar para atacar
        this.consecutiveAttacks = 0; // Para la regla del nivel 2

        // Hacemos la carta interactiva para poder hacer clic en ella
        this.setInteractive();

        // Añadimos la carta a la escena
        scene.add.existing(this);

        // Si la carta no está boca abajo desde el principio (ej. por fusión), la revelamos
        if (!this.isFaceDown) {
            this.reveal();
        }
    }

    /**
     * Revela la carta, cambiando su textura a la del tipo y nivel correspondiente.
     * Una vez revelada, no puede volver a ocultarse.
     */
    reveal() {
        if (this.isFaceDown) {
            this.isFaceDown = false;
            // Asumimos que las texturas de las cartas se llaman, por ejemplo, 'fuego_1', 'agua_2', etc.
            const textureName = `${this.type}_${this.level}`;
            this.setTexture(textureName);
        }
    }

    /**
     * Sube el nivel de la carta. Se usa durante la fusión.
     */
    levelUp() {
        if (this.level < 3) {
            this.level++;
            // Actualiza la textura si la carta ya está revelada
            if (!this.isFaceDown) {
                const textureName = `${this.type}_${this.level}`;
                this.setTexture(textureName);
            }
        }
    }

    /**
     * Se llama al final del turno del propietario para actualizar los contadores de ataque.
     */
    updateAttackState() {
        // Regla Nivel 3: Ataca 1 turno, descansa 1.
        if (this.level === 3) {
            if (this.attackCooldown > 0) {
                this.attackCooldown--;
            }
            this.canAttack = (this.attackCooldown === 0);
        }

        // Regla Nivel 2: Ataca 2 turnos seguidos, descansa 1.
        if (this.level === 2) {
            if (this.attackCooldown > 0) {
                this.attackCooldown--;
            } else if (this.consecutiveAttacks >= 2) {
                this.attackCooldown = 1; // Inicia el descanso
                this.consecutiveAttacks = 0;
            }
            this.canAttack = (this.attackCooldown === 0);
        }
        // Las cartas de Nivel 1 siempre pueden atacar (this.canAttack es true por defecto).
    }

    /**
     * Registra que la carta ha realizado un ataque y actualiza su estado.
     */
    registerAttack() {
        if (this.level === 2) {
            this.consecutiveAttacks++;
        }
        if (this.level === 3) {
            this.attackCooldown = 1; // Debe descansar el próximo turno
        }
        this.updateAttackState();
    }
}