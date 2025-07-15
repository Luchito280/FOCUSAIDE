const UI = {
    init() {
        this.dockBtns = document.querySelectorAll('.dock-btn');
        this.contentArea = document.getElementById('content-area');
        this.commandPaletteOverlay = document.getElementById('command-palette-overlay');
        this.commandInput = document.getElementById('command-input');
        this.commandResults = document.getElementById('command-results');
        
        this.commands = [
            { name: 'Iniciar/Pausar Temporizador', action: () => Timer.startStopBtn?.click() },
            { name: 'Resetear Temporizador', action: () => Timer.resetBtn?.click() },
            { name: 'Ir a Tareas', action: () => UI.switchView('tasks') },
            { name: 'Ir a Configuración', action: () => UI.switchView('settings') },
            { name: 'Ir a Temporizador', action: () => UI.switchView('timer') },
            { name: 'Añadir Nueva Tarea', action: () => { UI.switchView('tasks'); Tasks.taskInput?.focus(); } }
        ];

        this.addEventListeners();
        this.switchView('timer'); // Carga la vista inicial
    },

    addEventListeners() {
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

        this.commandInput.addEventListener('input', () => this.renderCommandResults(this.commandInput.value));
        this.commandPaletteOverlay.addEventListener('click', (e) => {
            if (e.target === this.commandPaletteOverlay) {
                this.hideCommandPalette();
            }
        });
    },

    async switchView(viewName) {
        try {
            const response = await fetch(`views/${viewName}.html`);
            if (!response.ok) throw new Error(`No se pudo cargar la vista: ${viewName}`);
            this.contentArea.innerHTML = await response.text();
            
            this.dockBtns.forEach(btn => btn.classList.remove('active'));
            document.querySelector(`.dock-btn[data-view="${viewName}"]`)?.classList.add('active');
            
            if (viewName === 'timer') Timer.init();
            else if (viewName === 'tasks') Tasks.init();
            else if (viewName === 'settings') Settings.init();

        } catch (error) {
            console.error("Error al cargar la vista:", error);
            this.contentArea.innerHTML = `<p style="color:red; text-align:center;">Error al cargar la sección.</p>`;
        }
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
        filteredCommands.forEach((cmd, index) => {
            const li = document.createElement('li');
            li.textContent = cmd.name;
            if (index === 0) {
                li.classList.add('selected');
            }
            li.onclick = () => {
                cmd.action();
                this.hideCommandPalette();
            };
            this.commandResults.appendChild(li);
        });
    }
};