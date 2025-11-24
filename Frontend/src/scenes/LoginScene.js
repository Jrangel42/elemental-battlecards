import Phaser from 'phaser';

// URL del Apps Script (usa la misma que en RegisterScene)
const scriptURL = "https://script.google.com/macros/s/AKfycbxYudPQa4QPGn62sIdQhQ7XlgI_WU1-zfupR1cmUn0-SoUaoJpWVV_S8mkTfHjYiln1tQ/exec";

export default class LoginScene extends Phaser.Scene {
    constructor() {
        super('LoginScene');
    }

    preload() {
        // Cargamos la imagen de fondo para la pantalla de inicio
        // La ruta es relativa a la carpeta 'public', que se sirve en la raíz del servidor.
        // Por lo tanto, el navegador buscará el archivo en '/assets/images/inicio/inicio.webp'.
        this.load.image('inicio-bg', '/assets/images/inicio/inicio.png');
        this.load.image('logo', '/assets/images/logotipo.png');

        // --- INICIO DE CÓDIGO DE DEPURACIÓN ---
        // Escuchamos si hay un error al cargar un archivo específico.
        this.load.on('loaderror', (file) => {
            console.error('Error al cargar el archivo:', file.key, file.url);
        });

        // Escuchamos cuando la carga de todos los archivos se ha completado.
        this.load.on('complete', () => {
            console.log('¡Archivos de preload de LoginScene cargados!');
        });
        // --- FIN DE CÓDIGO DE DEPURACIÓN ---
    }

    create() {
        const { width, height } = this.scale;

        // Añadimos la imagen de fondo y la ajustamos al tamaño de la pantalla
        this.bg = this.add.image(0, 0, 'inicio-bg').setOrigin(0, 0);
        this.bg.displayWidth = width;
        this.bg.displayHeight = height;

        // Creamos el formulario y sus estilos como un elemento DOM de Phaser
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

        // Escuchamos el evento 'resize' del gestor de escalado para hacer la escena responsive
        this.scale.on('resize', this.resize, this);

        // Añadimos un listener al botón para enviar credenciales al Apps Script
        const loginButton = this.formElement.node.querySelector('.btn-primary');
        loginButton.addEventListener('click', async () => {
            const usernameEl = this.formElement.getChildByName('username');
            const passwordEl = this.formElement.getChildByName('password');

            const username = usernameEl ? usernameEl.value.trim() : '';
            const password = passwordEl ? passwordEl.value : '';

            if (!username || !password) {
                alert('Por favor, introduce usuario y contraseña.');
                return;
            }

            // Deshabilitar mientras se procesa
            loginButton.disabled = true;
            loginButton.style.opacity = '0.7';
            loginButton.textContent = 'Entrando...';

            const form = new FormData();
            form.append('action', 'login');
            form.append('username', username);
            form.append('password', password);

            try {
                const res = await fetch(scriptURL, { method: 'POST', body: form });
                const text = await res.text();
                let json = null;
                try { json = JSON.parse(text); } catch (e) { /* not JSON */ }

                if (res.ok && json && json.status === 'success') {
                    // Login correcto
                    console.log('Login successful:', json);
                    alert('Inicio de sesión correcto. Bienvenido ' + (json.username || username));
                    // Aquí puedes guardar info en localStorage/session si quieres

                    // Una vez que el login es exitoso, llevamos al usuario al menú principal.
                    // La PreloaderScene ya debería haberse ejecutado al inicio.
                    this.scene.start('HomeScenes');

                    return;
                }

                // Si no ok, mostrar error
                const message = (json && json.message) ? json.message : text || 'Credenciales incorrectas';
                alert('Error al iniciar sesión: ' + message);
                console.warn('Login response:', text);

            } catch (error) {
                console.error('Network/login error', error);
                alert('Error de conexión. Revisa la consola.');
            } finally {
                loginButton.disabled = false;
                loginButton.style.opacity = '';
                loginButton.textContent = 'Entrar';
            }
        });

        // Navegación a la escena de Registro
        const registerLink = this.formElement.node.querySelector('#register-link');
        registerLink.addEventListener('click', (event) => {
            event.preventDefault();
            this.scene.start('RegisterScene');
        });
    }

    /**
     * Esta función se llama cada vez que la ventana del juego cambia de tamaño.
     * @param {Phaser.Structs.Size} gameSize - El nuevo tamaño del juego.
     */
    resize(gameSize) {
        const { width, height } = gameSize;

        // Reajustamos el tamaño del fondo
        this.bg.displayWidth = width;
        this.bg.displayHeight = height;

        // Reposicionamos el formulario en el nuevo centro
        this.formElement.setPosition(width / 2, height / 2);
    }
}