import { Timer } from './js/timer.js';
import { Tasks } from './js/tasks.js';
import { Settings } from './js/settings.js';

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const dockBtns = document.querySelectorAll('.view-btn');
    const statusLed = document.getElementById('status-led');
    const connectionStatus = document.getElementById('connection-status');
    const alertSound = document.getElementById('alert-sound');

    async function loadView(viewName) {
        try {
            const response = await fetch(`./views/${viewName}.html`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            mainContent.innerHTML = html;

            if (viewName === 'timer') Timer.init();
            if (viewName === 'tasks') Tasks.init();
            if (viewName === 'settings') Settings.init();
        } catch (error) {
            console.error('Failed to load view:', viewName, error);
            mainContent.innerHTML = `<h1>Error al cargar la vista.</h1>`;
        }
    }

    function switchView(viewName) {
        dockBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });
        loadView(viewName);
    }

    dockBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    if (window.electronAPI) {
        window.electronAPI.onEngineStatus(({ connected }) => {
            if (statusLed) statusLed.className = connected ? 'led-green' : 'led-red';
            if (connectionStatus) connectionStatus.textContent = connected ? 'Motor Conectado' : 'Motor Desconectado';
        });

        window.electronAPI.onDistractionUpdate(({ distracted }) => {
            document.body.classList.toggle('distracted-alert', distracted);
            if (distracted && alertSound) {
                alertSound.loop = true;
                alertSound.play();
            } else if (alertSound) {
                alertSound.loop = false;
                alertSound.pause();
                alertSound.currentTime = 0;
            }
        });
    }
    
    switchView('timer');
});