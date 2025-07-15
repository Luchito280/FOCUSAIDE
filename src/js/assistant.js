const Assistant = {
    init() {
        this.mascotEl = document.getElementById('assistant-mascot');
        this.toastEl = document.getElementById('assistant-toast');
        this.toastTimeout = null;
        this.currentState = 'sleeping';
        this.audioCache = {}; // Caché para los sonidos

        this.stateImages = {
            sleeping: 'assets/images/durmiendo.png',
            neutral: 'assets/images/neutral.png',
            thinking: 'assets/images/pensando.png',
            soft_alert: 'assets/images/alerta_suave.png',
            strong_alert: 'assets/images/alerta_maxima.png',
            relieved: 'assets/images/aliviado.png',
            resting: 'assets/images/descansando.png',
            ready: 'assets/images/listo.png',
            celebrating: 'assets/images/celebrando.png',
            waving: 'assets/images/saludando.png'
        };

        this.addEventListeners();
        if (window.electronAPI) {
            window.electronAPI.onStateUpdate(this.handleStateUpdate.bind(this));
            // Escuchar la orden para reproducir un sonido desde main.js
            window.electronAPI.onPlaySound(this.playSound.bind(this));
        }
    },

    addEventListeners() {
        this.mascotEl?.addEventListener('mouseenter', () => {
            this.setMascotState('waving');
        });
        this.mascotEl?.addEventListener('mouseleave', () => {
            this.setMascotState(this.previousState || 'sleeping');
        });
        
        document.addEventListener('taskCompleted', () => {
            this.setMascotState('celebrating');
            this.showToast("¡Felicidades! ¡Una tarea menos!");
            setTimeout(() => this.setMascotState('neutral'), 4000);
        });
    },

    playSound(soundName) {
        if (!this.audioCache[soundName]) {
            this.audioCache[soundName] = new Audio(`../assets/sounds/${soundName}.mp3`);
        }
        this.audioCache[soundName].currentTime = 0;
        this.audioCache[soundName].play().catch(error => console.error(`Error al reproducir ${soundName}:`, error));
    },

    setMascotState(newState) {
        if (!this.mascotEl || this.currentState === newState) return;

        this.previousState = this.currentState;
        this.currentState = newState;
        
        this.mascotEl.classList.add('fading');
        setTimeout(() => {
            this.mascotEl.src = this.stateImages[newState] || this.stateImages.neutral;
            this.mascotEl.classList.remove('fading');
        }, 200);
    },

    handleStateUpdate({ timer, distraction }) {
        if (distraction) {
            this.setMascotState(distraction.level > 1 ? 'strong_alert' : 'soft_alert');
            return;
        }

        if (this.previousState === 'strong_alert' || this.previousState === 'soft_alert') {
            this.setMascotState('relieved');
            setTimeout(() => this.setMascotState('neutral'), 2000);
            return;
        }

        if (timer) {
            if (!timer.isRunning) {
                this.setMascotState('sleeping');
            } else {
                const stateMap = { work: 'neutral', rest: 'resting', longRest: 'celebrating' };
                this.setMascotState(stateMap[timer.currentPhase] || 'neutral');
            }
        }
    },

    showToast(message) {
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastEl.textContent = message;
        this.toastEl.classList.add('visible');
        this.toastTimeout = setTimeout(() => {
            this.toastEl.classList.remove('visible');
        }, 4000);
    }
};