export const Timer = {
    init() {
        this.cacheDOMElements();
        if (!this.progressRing) return;
        this.radius = this.progressRing.r.baseVal.value;
        this.circumference = 2 * Math.PI * this.radius;
        this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        this.addEventListeners();
        window.electronAPI.onStateUpdate(({ timer }) => this.handleStateUpdate(timer));
    },
    cacheDOMElements() {
        this.timerDisplay = document.getElementById("timer-display");
        this.startStopBtn = document.getElementById("start-stop-btn");
        this.resetBtn = document.getElementById("reset-btn");
        this.statusTitle = document.getElementById("status-title");
        this.methodSelect = document.getElementById("method-select");
        this.customTimeInputs = document.getElementById("custom-time-inputs");
        this.workTimeInput = document.getElementById("work-time-input");
        this.restTimeInput = document.getElementById("rest-time-input");
        this.progressRing = document.querySelector('.progress-ring-circle');
        this.timerWrapper = document.querySelector('.timer-wrapper');
    },
    addEventListeners() {
        this.methodSelect.addEventListener('change', () => {
            const selectedMethod = this.methodSelect.value;
            this.customTimeInputs.classList.toggle('hidden', selectedMethod !== 'custom');
            if (selectedMethod !== 'custom') window.electronAPI.setMethod(selectedMethod);
            else this.workTimeInput.focus();
        });
        const applyCustomTime = () => {
            const work = parseInt(this.workTimeInput.value, 10);
            const rest = parseInt(this.restTimeInput.value, 10);
            if (!isNaN(work) && !isNaN(rest) && work > 0 && rest > 0) window.electronAPI.setMethod('custom', { work, rest });
        };
        this.workTimeInput.addEventListener('change', applyCustomTime);
        this.restTimeInput.addEventListener('change', applyCustomTime);
        this.startStopBtn.addEventListener("click", () => {
            const isRunning = this.startStopBtn.textContent === "Pausar";
            window.electronAPI.sendTimerCommand(isRunning ? 'stop' : 'start');
            if (!isRunning) {
                this.timerWrapper.classList.add('pulsing');
                this.timerWrapper.addEventListener('animationend', () => {
                    this.timerWrapper.classList.remove('pulsing');
                }, { once: true });
            }
        });
        this.resetBtn.addEventListener("click", () => {
            window.electronAPI.sendTimerCommand('reset');
        });
    },
    handleStateUpdate(timerState) {
        if (!timerState || !this.timerDisplay) return;
        const { timeLeft, totalTimeInPhase, isRunning, currentPhase, pomodoroCount } = timerState;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        this.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        this.startStopBtn.textContent = isRunning ? "Pausar" : "Iniciar";
        const progress = totalTimeInPhase > 0 ? (totalTimeInPhase - timeLeft) / totalTimeInPhase : 0;
        const offset = this.circumference - progress * this.circumference;
        this.progressRing.style.strokeDashoffset = offset;
        if (currentPhase === 'work') {
            this.statusTitle.textContent = `Estudio #${pomodoroCount + 1}`;
            this.progressRing.classList.remove('rest-mode');
        } else {
            this.statusTitle.textContent = currentPhase === 'longRest' ? 'Descanso Largo' : 'Descanso';
            this.progressRing.classList.add('rest-mode');
        }
    }
};