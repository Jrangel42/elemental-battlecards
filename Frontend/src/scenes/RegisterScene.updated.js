import Phaser from 'phaser';
// Versión actualizada: envía FormData al Apps Script desde el botón
const scriptURL = "https://script.google.com/macros/s/AKfycbxYudPQa4QPGn62sIdQhQ7XlgI_WU1-zfupR1cmUn0-SoUaoJpWVV_S8mkTfHjYiln1tQ/exec";

export default class RegisterSceneUpdated extends Phaser.Scene {
    constructor() {
        super('RegisterScene');
    }

    preload() {
        this.load.image('inicio-bg', '/assets/images/inicio/inicio.png');
        this.load.image('logo', '/assets/images/logotipo.png');
    }

    create() {
        const { width, height } = this.scale;
        this.bg = this.add.image(0, 0, 'inicio-bg').setOrigin(0, 0);
        this.bg.displayWidth = width;
        this.bg.displayHeight = height;

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
                .logo { width: 200px; margin-bottom: 15px; }
                .form-card h2 { color: white; font-size: 22px; margin-bottom: 4px; }
                .subtitle { color: #d5d5d5; font-size: 14px; margin-bottom: 20px; }
                .form-card label { display: block; text-align: left; color: white; margin: 6px 0 4px; }
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
                .btn-primary:hover { opacity: .9; }
                .login-text { color: white; margin-top: 15px; font-size: 14px; }
                .login-text a { color: #303df1ff; text-decoration: none; }
                .login-text a:hover { text-decoration: underline; }
            </style>
            <div class="overlay"></div>
            <form class="form-card">
                <img src="/assets/images/logotipo.png" class="logo">
                <h2>Crea una cuenta</h2>
                <label>Nombre de usuario</label>
                <input type="text" name="username" required>
                <label>Email</label>
                <input type="email" name="email" required>
                <label>Contraseña</label>
                <input type="password" name="password" required>
                <label>Confirmar</label>
                <input type="password" name="passwordConfirm" required>
                <button type="button" class="btn-primary">Crear cuenta</button>
                <p class="login-text">¿Ya tienes cuenta? <a href="#" id="login-link">Iniciar sesión</a></p>
            </form>
        `;

        this.formElement = this.add.dom(width/2, height/2).createFromHTML(formHTML);

        const btn = this.formElement.node.querySelector('.btn-primary');
        btn.addEventListener('click', async () => {
            const username = this.formElement.getChildByName('username').value.trim();
            const email = this.formElement.getChildByName('email').value.trim();
            const password = this.formElement.getChildByName('password').value;
            const passwordConfirm = this.formElement.getChildByName('passwordConfirm').value;

            if (password !== passwordConfirm) { alert('Las contraseñas no coinciden.'); return; }
            if (!username || !email || !password) { alert('Completa todos los campos.'); return; }

            btn.disabled = true; btn.textContent = 'Creando...';
            const form = new FormData();
            form.append('username', username);
            form.append('email', email);
            form.append('password', password);

            try {
                const res = await fetch(scriptURL, { method: 'POST', body: form });
                const text = await res.text();
                let json = null;
                try { json = JSON.parse(text); } catch(e){}
                if (res.ok && ((json && json.status==='success') || /success/i.test(text))) {
                    alert('Registro exitoso');
                    this.scene.start('LoginScene');
                    return;
                }
                alert('Error al registrar: ' + (json && json.message ? json.message : text));
            } catch (err) {
                console.error(err);
                alert('Error de conexión');
            } finally {
                btn.disabled = false; btn.textContent = 'Crear cuenta';
            }
        });

        const loginLink = this.formElement.node.querySelector('#login-link');
        loginLink.addEventListener('click', (e) => { e.preventDefault(); this.scene.start('LoginScene'); });
    }

    resize(gameSize) { const { width, height } = gameSize; this.bg.displayWidth = width; this.bg.displayHeight = height; this.formElement.setPosition(width/2, height/2); }
}
