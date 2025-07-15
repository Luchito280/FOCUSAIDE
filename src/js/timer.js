const Timer = {
    init() {
        this.cacheDOM();
        this.addEventListeners();
        if (window.electronAPI) {
            window.electronAPI.onStateUpdate(this.handleStateUpdate.bind(this));
            window.electronAPI.sendTimerCommand('request-update');
        }
    },

    cacheDOM() {
        this.timerDisplay = document.getElementById("timer-display");
        this.startStopBtn = document.getElementById("start-stop-btn");
        this.resetBtn = document.getElementById("reset-btn");
        this.statusTitle = document.getElementById("status-title");
        this.progressRing = document.querySelector('.progress-ring-circle');
        this.radius = this.progressRing.r.baseVal.value;
        this.circumference = 2 * Math.PI * this.radius;
        this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
    },

    addEventListeners() {
        this.startStopBtn.addEventListener("click", () => {
            const isCurrentlyRunning = this.startStopBtn.textContent === "Pausar";
            window.electronAPI.sendTimerCommand(isCurrentlyRunning ? 'stop' : 'start');
        });
        this.resetBtn.addEventListener("click", () => {
            window.electronAPI.sendTimerCommand('reset');
        });
    },

    handleStateUpdate({ timer }) {
        if (!timer || !this.timerDisplay) return;
        
        const { timeLeft, totalTimeInPhase, isRunning, currentPhase, pomodoroCount } = timer;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        this.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.startStopBtn.textContent = isRunning ? "Pausar" : "Iniciar";
        
        const progress = totalTimeInPhase > 0 ? timeLeft / totalTimeInPhase : 0;
        const offset = this.circumference - progress * this.circumference;
        this.progressRing.style.strokeDashoffset = offset;

        if (currentPhase === 'work') {
            this.statusTitle.textContent = `Enfoque #${pomodoroCount + 1}`;
            this.progressRing.classList.remove('rest-mode');
        } else {
            this.statusTitle.textContent = currentPhase === 'longRest' ? 'Descanso Largo' : 'Descanso';
            this.progressRing.classList.add('rest-mode');
        }
    }
};