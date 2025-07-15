const Tasks = {
    init() {
        this.addTaskForm = document.getElementById('add-task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskList = document.getElementById('task-list');
        this.calendarEl = document.getElementById('calendar');
        this.calendar = null;
        this.tasks = [];

        if (!this.addTaskForm) return; 
        this.addEventListeners();
        this.loadInitialTasks();
        this.initCalendar();
    },

    addEventListeners() {
        this.addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskText = this.taskInput.value.trim();
            if (taskText && window.electronAPI) {
                const newTask = { id: Date.now(), title: taskText, completed: false, start: new Date().toISOString().split('T')[0] };
                const addedTask = await window.electronAPI.addTask(newTask);
                this.tasks.push(addedTask);
                this.render();
                this.taskInput.value = '';
            }
        });

        this.taskList.addEventListener('click', (e) => {
            const target = e.target;
            const taskItem = target.closest('.task-item');
            if (!taskItem || !window.electronAPI) return;
            
            const taskId = Number(taskItem.dataset.id);

            if (target.type === 'checkbox') {
                const isCompleted = target.checked;
                // Actualizamos el estado en nuestro array local primero
                this.tasks = this.tasks.map(t => {
                    if (t.id === taskId) {
                        return { ...t, completed: isCompleted };
                    }
                    return t;
                });
                
                // Enviamos la tarea completa y actualizada al backend
                const updatedTask = this.tasks.find(t => t.id === taskId);
                window.electronAPI.updateTask(updatedTask);
                
                // Si la tarea se completó, avisamos al asistente
                if (isCompleted) {
                    document.dispatchEvent(new CustomEvent('taskCompleted'));
                }
            }
            if (target.classList.contains('delete-btn')) {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                window.electronAPI.deleteTask(taskId);
            }
            this.render();
        });
    },

    render() {
        this.renderTaskList();
        this.renderCalendarEvents();
    },

    renderTaskList() {
        this.taskList.innerHTML = '';
        if (this.tasks.length === 0) {
            this.taskList.innerHTML = '<li class="empty-tasks">¡No tienes tareas pendientes!</li>';
            return;
        }
        this.tasks.sort((a, b) => a.completed - b.completed).forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.classList.add('task-item');
            taskItem.dataset.id = task.id;
            if (task.completed) { taskItem.classList.add('completed'); }
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            const taskText = document.createElement('span');
            taskText.classList.add('task-text');
            taskText.textContent = task.title;
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.textContent = '×';
            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskText);
            taskItem.appendChild(deleteBtn);
            this.taskList.appendChild(taskItem);
        });
    },
    
    initCalendar() {
        if (!this.calendarEl || typeof FullCalendar === 'undefined') return;
        this.calendar = new FullCalendar.Calendar(this.calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            events: [],
            eventClick: (info) => {
                alert('Tarea: ' + info.event.title);
            }
        });
        this.calendar.render();
    },

    renderCalendarEvents() {
        if (!this.calendar) return;
        this.calendar.getEvents().forEach(event => event.remove());
        this.tasks.forEach(task => {
            if (!task.completed) {
                 this.calendar.addEvent({
                    id: String(task.id),
                    title: task.title,
                    start: task.start,
                    allDay: true,
                    backgroundColor: 'var(--primary-action)',
                    borderColor: 'var(--primary-action)'
                });
            }
        });
    },

    async loadInitialTasks() {
        if(window.electronAPI) {
            this.tasks = await window.electronAPI.getTasks();
            this.render();
        }
    }
};