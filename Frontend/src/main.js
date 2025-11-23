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
    scene: [ CreateRoomScene, HomeScene, GameScene, LoginScene, PreloaderScene, RegisterScene, UIScene] // Se cargarán en este orden
};

const game = new Phaser.Game(config);