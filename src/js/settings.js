export const Settings = {
    init() {
        this.blocklistTextarea = document.getElementById('blocklist-textarea');
        this.saveBlocklistBtn = document.getElementById('save-blocklist-btn');
        this.calibrateBtn = document.getElementById('calibrate-btn');
        if (!this.saveBlocklistBtn) return;
        this.addEventListeners();
        this.loadInitialBlocklist();
    },
    addEventListeners() {
        this.saveBlocklistBtn.addEventListener('click', () => {
            const sites = this.blocklistTextarea.value.split('\n').map(s => s.trim()).filter(Boolean);
            window.electronAPI.saveBlocklist(sites);
        });
        this.calibrateBtn.addEventListener('click', () => {
            window.electronAPI.calibrateCenter();
        });
    },
    async loadInitialBlocklist() {
        const sites = await window.electronAPI.getBlocklist();
        this.blocklistTextarea.value = sites.join('\n');
    }
};