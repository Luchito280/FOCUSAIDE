const Assistant = {
    toastEl: document.getElementById('assistant-toast'),
    mascotEl: document.getElementById('assistant-mascot'),
    toastTimeout: null,

    init() {
        if (window.electronAPI) {
            window.electronAPI.onStateUpdate(this.handleStateUpdate.bind(this));
        }
        this.mascotEl?.addEventListener('click', () => {
            this.showToast("¡Hola! Estoy aquí para ayudarte a mantener el enfoque.");
        });
    },

    showToast(message) {
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastEl.textContent = message;
        this.toastEl.classList.add('visible');
        this.toastTimeout = setTimeout(() => {
            this.toastEl.classList.remove('visible');
        }, 4000);
    },

    handleStateUpdate(state) {
        const mascotStates = {
            work: 'focused',
            rest: 'resting',
            longRest: 'celebrating',
        }

        if (state.distraction) {
            this.setMascotState(state.distraction.level > 1 ? 'alert' : 'soft-alert');
        } else if (state.timer) {
            if (!state.timer.isRunning) {
                this.setMascotState('sleeping');
            } else {
                this.setMascotState(mascotStates[state.timer.currentPhase] || 'focused');
            }
        }
    },

    setMascotState(state) {
        // Lógica para cambiar la animación de la spritesheet
        // Ejemplo: this.mascotEl.className = `mascot-state-${state}`;
        console.log(`Mascota cambiando a estado: ${state}`);
    }
};

// Módulo de Configuración
const Settings = {
    methodSelect: document.getElementById("method-select"),
    customTimeInputs: document.getElementById("custom-time-inputs"),
    workTimeInput: document.getElementById("work-time-input"),
    restTimeInput: document.getElementById("rest-time-input"),
    blocklistTextarea: document.getElementById('blocklist-textarea'),
    saveBlocklistBtn: document.getElementById('save-blocklist-btn'),

    init() {
        if (!this.methodSelect) return;
        this.addEventListeners();
        this.loadInitialBlocklist();
    },

    addEventListeners() {
        this.methodSelect.addEventListener('change', () => {
            const selectedMethod = this.methodSelect.value;
            this.customTimeInputs.classList.toggle('hidden', selectedMethod !== 'custom');
            if (selectedMethod !== 'custom') {
                window.electronAPI.setMethod(selectedMethod);
            } else {
                this.workTimeInput.focus();
            }
        });
        const applyCustomTime = () => {
            const work = parseInt(this.workTimeInput.value, 10);
            const rest = parseInt(this.restTimeInput.value, 10);
            if (!isNaN(work) && !isNaN(rest) && work > 0 && rest > 0) {
                window.electronAPI.setMethod('custom', { work, rest });
            }
        };
        this.workTimeInput.addEventListener('change', applyCustomTime);
        this.restTimeInput.addEventListener('change', applyCustomTime);
        this.saveBlocklistBtn.addEventListener('click', () => {
            const sites = this.blocklistTextarea.value.split('\n').map(s => s.trim()).filter(Boolean);
            window.electronAPI.saveBlocklist(sites);
            Assistant.showToast("✅ Lista de bloqueo guardada.");
        });
    },

    async loadInitialBlocklist() {
        if(window.electronAPI) {
            const sites = await window.electronAPI.getBlocklist();
            this.blocklistTextarea.value = sites.join('\n');
        }
    },
};