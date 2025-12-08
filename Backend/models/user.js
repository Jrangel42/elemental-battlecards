module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: { 
      type: DataTypes.STRING, 
      allowNull: false,
      unique: true // Asegúrate de que el username sea único
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: false,
      unique: true // Si quieres, puedes quitar este campo si solo usas username para login
    },
    password: { 
      type: DataTypes.STRING, 
      allowNull: false 
    }
  }, {
    tableName: 'users', // Nombre de la tabla en la base de datos
    timestamps: true // Si usas createdAt y updatedAt
  });

  return User;
};
