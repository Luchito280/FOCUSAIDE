const Settings = {
    init() {
        this.methodSelect = document.getElementById("method-select");
        this.customTimeInputs = document.getElementById("custom-time-inputs");
        this.workTimeInput = document.getElementById("work-time-input");
        this.restTimeInput = document.getElementById("rest-time-input");
        this.blocklistTextarea = document.getElementById('blocklist-textarea');
        this.saveBlocklistBtn = document.getElementById('save-blocklist-btn');
        
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
    }
};