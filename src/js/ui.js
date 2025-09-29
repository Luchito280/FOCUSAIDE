const UI = {
    dockBtns: document.querySelectorAll('.dock-btn'),
    views: document.querySelectorAll('.view'),
    commandPaletteOverlay: document.getElementById('command-palette-overlay'),
    commandInput: document.getElementById('command-input'),
    commandResults: document.getElementById('command-results'),
    
    commands: [
        { name: 'Iniciar/Pausar Temporizador', action: () => document.getElementById('start-stop-btn').click(), view: 'timer-view' },
        { name: 'Resetear Temporizador', action: () => document.getElementById('reset-btn').click(), view: 'timer-view' },
        { name: 'Ir a Tareas', action: () => UI.switchView('tasks-view') },
        { name: 'Ir a Configuración', action: () => UI.switchView('settings-view') },
        { name: 'Ir a Temporizador', action: () => UI.switchView('timer-view') },
        { name: 'Añadir Nueva Tarea', action: () => { UI.switchView('tasks-view'); document.getElementById('task-input').focus(); } }
    ],

    init() {
        this.dockBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.showCommandPalette();
            }
            if (e.key === 'Escape' && this.commandPaletteOverlay.classList.contains('visible')) {
                this.hideCommandPalette();
            }
        });

        this.commandInput.addEventListener('input', () => {
            this.renderCommandResults(this.commandInput.value);
        });
        
        this.commandPaletteOverlay.addEventListener('click', (e) => {
            if (e.target === this.commandPaletteOverlay) {
                this.hideCommandPalette();
            }
        });

        this.switchView('timer-view'); // Vista inicial
    },

    switchView(viewId) {
        this.views.forEach(view => view.classList.remove('active'));
        this.dockBtns.forEach(btn => btn.classList.remove('active'));
        
        const targetView = document.getElementById(viewId);
        const targetBtn = document.querySelector(`.dock-btn[data-view="${viewId}"]`);

        if (targetView) targetView.classList.add('active');
        if (targetBtn) targetBtn.classList.add('active');
    },

    showCommandPalette() {
        this.commandPaletteOverlay.classList.remove('hidden');
        this.commandPaletteOverlay.classList.add('visible');
        this.commandInput.focus();
        this.renderCommandResults('');
    },

    hideCommandPalette() {
        this.commandPaletteOverlay.classList.remove('visible');
        this.commandInput.value = '';
    },

    renderCommandResults(filter) {
        this.commandResults.innerHTML = '';
        const filteredCommands = this.commands.filter(cmd => cmd.name.toLowerCase().includes(filter.toLowerCase()));
        filteredCommands.forEach(cmd => {
            const li = document.createElement('li');
            li.textContent = cmd.name;
            li.onclick = () => {
                cmd.action();
                this.hideCommandPalette();
            };
            this.commandResults.appendChild(li);
        });
    }
};