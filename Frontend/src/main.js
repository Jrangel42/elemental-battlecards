import Phaser from 'phaser';
import LoginScene from './scenes/LoginScene.js';
import RegisterScene from './scenes/RegisterScene.js';
import PreloaderScene from './scenes/Preloader.js';
import GameScene from './scenes/GameScene.js'; 
import UIScene from './scenes/uiScene.js';  
import HomeScene from './scenes/homeScenes.js';     
import CreateRoomScene from './scenes/createRoomScene.js';

const config = {
    type: Phaser.AUTO,
    dom: { createContainer: true }, // Importante para que funcionen los elementos DOM
    width: 1440,
    height: 1024,
    scale: {
        mode: Phaser.Scale.FIT, // Ajusta el juego al contenedor manteniendo la proporción
        autoCenter: Phaser.Scale.CENTER_BOTH // Centra el canvas automáticamente
    },
    parent: 'game-container',
<<<<<<< HEAD
    scene: [GameScene, HomeScene, LoginScene, PreloaderScene, RegisterScene, UIScene] // Se cargarán en este orden
=======
    scene: [CreateRoomScene, GameScene, HomeScene,   LoginScene,  PreloaderScene,   RegisterScene, UIScene] // Se cargarán en este orden
>>>>>>> 20061079201f7946cfd55ed4e4f9326869f67a49
};

const game = new Phaser.Game(config);
