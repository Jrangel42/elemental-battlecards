import Phaser from 'phaser';

// URL del backend real
const scriptURL = "https://elemental-battlecards.onrender.com/api/auth/login";

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super('LoginScene');
    }

    preload() {
        this.load.video('inicio-video', '/assets/images/inicio/inicio.mp4', { muted: true });
        this.load.image('logo', '/assets/images/logotipo.png');

        this.load.on('loaderror', (file) => console.error('Error al cargar:', file.key, file.url));
        this.load.on('complete', () => console.log('Archivos de LoginScene cargados'));
    }

    create() {
        const { width, height } = this.scale;
        // BACKGROUND VIDEO
        this.bg = this.add.video(width / 2, height / 2, 'inicio-video').setOrigin(0.5);
        this.bg.setDepth(-1); // Poner el video al fondo

        // Esperar a que el video esté listo para escalar correctamente
        this.bg.on('play', () => {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        });
        this.bg.play(true); // Reproducir en bucle

        const formHTML = `
            <style>
                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.55);
                    backdrop-filter: blur(3px);
                    z-index: 9;
                }

                .form-card {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 400px;
                    padding: 30px 40px;
                    background: rgba(15, 14, 14, 0.37);
                    border-radius: 15px;
                    backdrop-filter: blur(6px);
                    text-align: center;
                    z-index: 10;
                }

                .logo {
                    width: 200px;
                    margin-bottom: 15px;
                }

                .form-card h2 {
                    color: white;
                    font-size: 22px;
                    margin-bottom: 4px;
                }

                .subtitle {
                    color: #d5d5d5;
                    font-size: 14px;
                    margin-bottom: 20px;
                }

                .form-card label {
                    display: block;
                    text-align: left;
                    color: white;
                    margin: 6px 0 4px;
                }

                .form-card input {
                    width: 100%;
                    padding: 12px;
                    margin-bottom: 10px;
                    border-radius: 8px;
                    background: #b3abaa;
                    border: none;
                    font-size: 14px;
                    outline: none;
                    box-sizing: border-box;
                }

                .btn-primary {
                    width: 100%;
                    padding: 12px;
                    margin-top: 10px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(90deg, #7a00ff, #5a37f8ff);
                    color: white;
                    font-size: 15px;
                    cursor: pointer;
                }

                .btn-primary:hover {
                    opacity: .9;
                }

                .login-text {
                    color: white;
                    margin-top: 15px;
                    font-size: 14px;
                }

                .login-text a {
                    color: #303df1ff;
                    text-decoration: none;
                }

                .login-text a:hover {
                    text-decoration: underline;
                }
            </style>
            <div class="overlay"></div>
            <form class="form-card">
                <img src="/assets/images/logotipo.png" alt="Elemental Battlecards" class="logo" />
                <h2>Iniciar Sesión</h2>
                <p class="subtitle">¡Qué bueno verte de nuevo!</p>
                <label>Nombre de usuario</label>
                <input type="text" name="username" placeholder="Username" required>
                <label>Contraseña</label>
                <input type="password" name="password" placeholder="********" required>
                <button type="button" class="btn-primary">Entrar</button>
                <p class="login-text">
                    ¿No tienes una cuenta?
                    <a href="#" id="register-link">Regístrate</a>
                </p>
            </form>
        `;

        this.formElement = this.add.dom(width / 2, height / 2).createFromHTML(formHTML);

        const loginButton = this.formElement.node.querySelector('.btn-primary');
        loginButton.addEventListener('click', async () => {
            const username = this.formElement.getChildByName('username').value.trim();
            const password = this.formElement.getChildByName('password').value;

            if (!username || !password) {
                alert('Por favor, introduce usuario y contraseña.');
                return;
            }

            loginButton.disabled = true;
            loginButton.style.opacity = '0.7';
            loginButton.textContent = 'Entrando...';

            try {
                const res = await fetch(scriptURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const json = await res.json();

                if (res.ok && json.token) {
                    console.log('Login exitoso:', json);
                    localStorage.setItem('token', json.token); // guardar token
                    this.scene.start('HomeScenes');
                    return;
                }

                alert('Error al iniciar sesión: ' + (json.message || 'Credenciales incorrectas'));
            } catch (error) {
                console.error('Error de conexión/login', error);
                alert('Error de conexión. Revisa la consola.');
            } finally {
                loginButton.disabled = false;
                loginButton.style.opacity = '';
                loginButton.textContent = 'Entrar';
            }
        });

        const registerLink = this.formElement.node.querySelector('#register-link');
        registerLink.addEventListener('click', (event) => {
            event.preventDefault();
            this.scene.start('RegisterScene');
        });
    }

    resize(gameSize) {
        const { width, height } = gameSize;
        if (this.bg && this.bg.width > 0) {
            const scaleX = width / this.bg.width;
            const scaleY = height / this.bg.height;
            const scale = Math.max(scaleX, scaleY);
            this.bg.setScale(scale);
        }
        if (this.formElement) this.formElement.setPosition(width / 2, height / 2);
    }
}
