document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const assistantMascot = document.getElementById('assistant-mascot');
    const viewBtns = document.querySelectorAll('.view-btn');
    const views = document.querySelectorAll('.view-content');
    const calendarEl = document.getElementById('calendar');
    let calendar;

    // --- MAPEO DE ESTADOS Y SONIDOS (RUTAS CORREGIDAS) ---
    const emotionalStates = {
        default: 'assets/images/mascota.png',
        alert: 'assets/images/alerta_maxima.png',
        warning: 'assets/images/alerta_suave.png',
        relieved: 'assets/images/aliviado.png',
        celebrating: 'assets/images/celebrando.png',
        resting: 'assets/images/descansando.png',
        sleeping: 'assets/images/durmiendo.png',
        ready: 'assets/images/listo.png',
        thinking: 'assets/images/pensando.png',
        greeting: 'assets/images/saludando.png'
    };

    function playSound(soundName) {
        window.electronAPI.playSound(soundName);
    }

    function setMascotState(state, temporary = false, duration = 3000) {
        if (emotionalStates[state]) {
            assistantMascot.src = emotionalStates[state];
            assistantMascot.className = state === 'celebrating' ? 'mascot-celebrating' : '';
            if (temporary) {
                setTimeout(() => setMascotState('default'), duration);
            }
        }
    }

    // --- NAVEGACIÓN ---
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.add('hidden'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.view).classList.remove('hidden');
        });
    });

    // --- LÓGICA DE TAREAS Y CALENDARIO ---
    function initializeCalendar() {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            events: []
        });
        calendar.render();
    }

    async function loadTasksAndCalendar() {
        const tasks = await window.electronAPI.getTasks();
        const tasksList = document.getElementById('tasks-list');
        tasksList.innerHTML = '';

        const events = tasks.map(task => ({
            id: task.id,
            title: task.text,
            start: task.createdAt,
            allDay: true,
            classNames: task.completed ? ['event-completed'] : []
        }));
        
        if(calendar) {
            calendar.getEventSources().forEach(source => source.remove());
            calendar.addEventSource(events);
        }

        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskItem.dataset.id = task.id;
            taskItem.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-task">🗑️</button>
            `;
            tasksList.appendChild(taskItem);
        });
    }
    
    // --- MANEJADORES DE EVENTOS ---

    // Añadir Tarea
    document.getElementById('submit-task').addEventListener('click', async () => {
        const taskInput = document.getElementById('task-input');
        const taskText = taskInput.value.trim();
        if (!taskText) return;

        await window.electronAPI.addTask({
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString().split('T')[0]
        });
        taskInput.value = '';
        await loadTasksAndCalendar();
    });

    // Actualizar/Eliminar Tarea
    document.getElementById('tasks-list').addEventListener('click', async (e) => {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        const taskId = parseInt(taskItem.dataset.id);

        if (e.target.matches('.delete-task')) {
            await window.electronAPI.deleteTask(taskId);
            await loadTasksAndCalendar();
        } else if (e.target.matches('input[type="checkbox"]')) {
            const tasks = await window.electronAPI.getTasks();
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.completed = e.target.checked;
                await window.electronAPI.updateTask(task);
                if (task.completed) playSound('taskComplete');
                await loadTasksAndCalendar();
            }
        }
    });

    // Guardar Sitios Bloqueados
    document.getElementById('save-sites').addEventListener('click', async () => {
        const sites = document.getElementById('blocked-sites').value.split('\n').map(s => s.trim()).filter(Boolean);
        await window.electronAPI.saveBlocklist(sites);
        setMascotState('relieved', true);
    });

    // --- CONEXIÓN CON LA CÁMARA ---
    window.electronAPI.onPythonMessage((message) => {
        try {
            const data = JSON.parse(message);
            const statusLed = document.getElementById('status-led');
            const statusText = document.getElementById('connection-status');

            switch(data.status) {
                case 'connected':
                    statusLed.className = 'led-green';
                    statusText.textContent = 'Cámara activa';
                    setMascotState('greeting', true);
                    break;
                case 'distracted':
                    statusLed.className = 'led-red';
                    statusText.textContent = '¡Vuelve al trabajo!';
                    setMascotState('alert');
                    playSound('distraction');
                    break;
                case 'error':
                    statusLed.className = 'led-red';
                    statusText.textContent = 'Error en cámara';
                    setMascotState('warning');
                    break;
                case 'focused':
                    statusLed.className = 'led-green';
                    statusText.textContent = 'Cámara activa';
                    // Solo cambia a 'pensando' si no estaba ya en un estado temporal
                    if (!assistantMascot.className.includes('celebrating')) {
                         setMascotState('thinking');
                    }
                    break;
            }
        } catch (e) { /* Ignorar mensajes no-JSON */ }
    });

    // --- INICIALIZACIÓN DE LA APP ---
    async function init() {
        try {
            initializeCalendar();
            await loadTasksAndCalendar();
            const blocklist = await window.electronAPI.getBlocklist();
            document.getElementById('blocked-sites').value = blocklist.join('\n');
            
            // Iniciar el proceso de Python para la cámara
            window.electronAPI.startPythonProcess();
            
            setMascotState('default');
        } catch (error) {
            console.error('Error durante la inicialización:', error);
        }
    }

    init();
});
