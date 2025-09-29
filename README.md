# FocusAide 🧠✨

Tu asistente de concentración personal. FocusAide es una herramienta de escritorio diseñada específicamente para ayudar a personas con **TDAH** y a cualquiera que busque potenciar su enfoque, combinando técnicas de productividad probadas con un sistema inteligente de monitoreo para crear un entorno de estudio libre de distracciones.

---

## ✨ Características Principales

FocusAide no es solo un temporizador, es un ecosistema completo para mantenerte en la zona de máxima concentración.

* **Temporizador de Enfoque Avanzado:** Utiliza métodos de estudio probados como **Pomodoro (25/5)**, la **Regla 52/17** o sesiones de trabajo profundo **(90/30)**. ¡O personaliza los tiempos para que se adapten perfectamente a tu ritmo!

* **Bloqueador de Sitios a Nivel de Sistema:** Una de las funciones más críticas. Elimina la tentación bloqueando una lista personalizable de sitios web (redes sociales, noticias, etc.) directamente en el archivo `hosts` de tu sistema. El bloqueo se activa y desactiva automáticamente al iniciar y detener una sesión.

* **Sistema Inteligente de Detección de Distracción:** El corazón de FocusAide. Usando tu cámara, la aplicación detecta si tu atención se desvía de la pantalla y te ayuda a volver a la tarea con alertas sutiles. Incluye una calibración simple de un punto para adaptarse a tu posición de trabajo.

* **Alertas Visuales y Auditivas:** Cuando se detecta una distracción durante una sesión de trabajo, la aplicación activa simultáneamente una animación visual en la interfaz y una señal de audio sutil y no intrusiva para reorientar tu atención sin interrumpir tu flujo.

* **Gestor de Tareas con Calendario:** Mantén tus objetivos claros. La aplicación incluye una sección de tareas donde puedes añadir, completar y eliminar pendientes. Estas tareas se integran en un calendario interactivo para que puedas visualizar tu progreso y planificar tus sesiones.

* **Soporte por Chat en Vivo:** ¿Necesitas ayuda? Hay una pestaña de "Soporte" dedicada en la barra lateral que integra un servicio de chat en vivo (como Tawk.to) para que puedas obtener asistencia al instante.

---

## 🛠️ Arquitectura y Tecnologías Utilizadas

FocusAide está construido sobre una arquitectura de dos componentes que se comunican en tiempo real: una aplicación de escritorio moderna y un potente motor de visión por computadora.

### Aplicación Principal (Electron / Frontend)
* **[Electron.js](https://www.electronjs.org/):** El framework principal para construir la aplicación de escritorio multiplataforma con tecnologías web.
* **[ws](https://www.npmjs.com/package/ws):** Cliente WebSocket que permite a la interfaz de JavaScript recibir en tiempo real los datos del motor de Python.
* **[sudo-prompt](https://www.npmjs.com/package/sudo-prompt):** Librería para solicitar de forma segura los permisos de administrador necesarios para modificar el archivo `hosts` y activar el bloqueador de sitios.
* **[concurrently](https://www.npmjs.com/package/concurrently):** Herramienta de desarrollo para ejecutar simultáneamente el proceso de Electron y el script de Python con un solo comando.

### Motor de Visión por Computadora (Python / Backend)
* **[OpenCV](https://opencv.org/):** Utilizado para acceder a la cámara web y manejar todo el procesamiento de video en tiempo real.
* **[Dlib](http://dlib.net/):** Librería de machine learning que proporciona los modelos de alta precisión para detectar rostros humanos y sus puntos de referencia faciales (ojos, boca, nariz).
* **[NumPy](https://numpy.org/):** Fundamental para realizar los cálculos numéricos de alto rendimiento necesarios para procesar las coordenadas de la mirada.
* **[Websockets](https://pypi.org/project/websockets/):** La librería que crea el servidor WebSocket, encargado de transmitir los datos de la detección de distracción a la aplicación de Electron.

---

## 📥 Instalación (Para Usuarios)

Puedes descargar la última versión de FocusAide desde la sección de **[Releases](https://github.com/TuUsuario/FocusAide/releases)** de este repositorio.

1.  Descarga el archivo `FocusAide-Setup-X.X.X.exe`.
2.  Ejecuta el instalador. **Importante:** Windows podría mostrar una advertencia de seguridad (SmartScreen). Haz clic en `Más información` y luego en `Ejecutar de todas formas`.
3.  ¡Listo! Busca FocusAide en tu menú de inicio.

---

<details>
<summary>💻 Instrucciones para Desarrolladores</summary>

1.  **Clona el repositorio:** `git clone https://github.com/TuUsuario/FocusAide.git`
2.  **Instala dependencias de Node.js:** `npm install`
3.  **Configura el entorno de Python:** `pip install opencv-python dlib numpy websockets`
4.  **Ejecuta la aplicación:** `npm start`
</details>