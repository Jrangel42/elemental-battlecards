// En una aplicación real, esto usaría un ORM como Mongoose (MongoDB) o Sequelize (SQL)

// --- Base de Datos (Simulada) ---
const users = [];
let currentId = 1;

class User {
    // Busca un usuario por su email
    static async findByEmail(email) {
        return users.find(user => user.email === email);
    }

    // Crea un nuevo usuario
    static async create(userData) {
        const newUser = {
            id: currentId++,
            ...userData
        };
        users.push(newUser);
        return newUser;
    }

    // Busca un usuario por su ID
    static async findById(id) {
        return users.find(user => user.id === id);
    }
}

module.exports = User;

