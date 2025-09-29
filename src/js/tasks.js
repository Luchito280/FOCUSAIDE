export const Tasks = {
    tasks: [],
    init() {
        this.addTaskForm = document.getElementById('add-task-form');
        this.taskInput = document.getElementById('task-input');
        this.taskList = document.getElementById('task-list');
        if (!this.addTaskForm) return; 
        this.addEventListeners();
        this.loadInitialTasks();
    },
    addEventListeners() {
        this.addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const taskText = this.taskInput.value.trim();
            if (taskText) {
                const newTask = await window.electronAPI.addTask({ text: taskText, completed: false });
                this.addTaskToList(newTask, true);
                this.taskInput.value = '';
            }
        });

        this.taskList.addEventListener('click', async (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            const taskId = Number(taskItem.dataset.id);
            const task = this.tasks.find(t => t.id === taskId);

            if (e.target.type === 'checkbox') {
                task.completed = e.target.checked;
                await window.electronAPI.updateTask(task);
                taskItem.classList.toggle('completed', task.completed);
            }
            if (e.target.classList.contains('delete-btn')) {
                taskItem.classList.add('exiting');
                taskItem.addEventListener('animationend', async () => {
                    await window.electronAPI.deleteTask(taskId);
                    this.loadInitialTasks();
                }, { once: true });
            }
        });
    },
    render() {
        this.taskList.innerHTML = '';
        if (this.tasks.length === 0) {
            this.taskList.innerHTML = '<li class="empty-tasks">¡No tienes tareas pendientes!</li>';
            return;
        }
        this.tasks.sort((a, b) => a.completed - b.completed || b.id - a.id).forEach(task => {
            this.addTaskToList(task, false);
        });
    },
    addTaskToList(task, isNew) {
        const taskItem = document.createElement('li');
        taskItem.className = 'task-item' + (task.completed ? ' completed' : '');
        if (isNew) {
            taskItem.classList.add('entering');
            setTimeout(() => taskItem.classList.remove('entering'), 500);
        }
        taskItem.dataset.id = task.id;
        taskItem.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${task.text}</span>
            <button class="delete-btn">×</button>
        `;
        this.taskList.prepend(taskItem);
    },
    async loadInitialTasks() {
        this.tasks = await window.electronAPI.getTasks();
        this.render();
    }
};