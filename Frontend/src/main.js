import Phaser from 'phaser';
import LoginScene from './scenes/LoginScene.js';
import RegisterScene from './scenes/RegisterScene.js';
import PreloaderScene from './scenes/Preloader.js';
import GameScene from './scenes/GameScene.js'; 
import UIScene from './scenes/uiScene.js';  
import HomeScenes from './scenes/homeScenes.js';
import CreateRoomScene from './scenes/createRoomScene.js';

const config = {
    type: Phaser.AUTO,
    dom: { createContainer: true },
    width: 1440,
    height: 1024,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    parent: 'game-container',
    scene: [HomeScenes, GameScene,  CreateRoomScene, LoginScene, PreloaderScene, RegisterScene, UIScene] // Se cargarán en este orden
};

const game = new Phaser.Game(config);
