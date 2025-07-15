document.addEventListener('DOMContentLoaded', () => {
    // Inicializa todos los módulos de la interfaz
    UI.init();
    Timer.init();
    Tasks.init();
    Assistant.init();
    Settings.init();

    console.log("FOCUSAIDE UI inicializada y lista.");
});