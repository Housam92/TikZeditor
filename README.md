# TikZ Editor

Ein moderner, Electron-basierter Editor für TikZ-Diagramme mit Live-Preview und bidirektionaler Interaktion zwischen Code und visuellen Elementen.


## ✨ Features

- **Live Preview**: Echtzeit-Rendering von TikZ-Code mit TikZJax
- **Bidirektionales Mapping**: Klick auf SVG-Elemente navigiert zur Codezeile und umgekehrt
- **Syntax-Highlighting**: Custom TikZ-Sprachunterstützung im Monaco Editor
- **Theme-Support**: Dunkel- und Hellmodus mit konsistentem Design
- **Export-Funktionen**: SVG und PDF Export der erstellten Diagramme
- **Datei-Operationen**: Import/Export von LaTeX-Dateien (.tex)
- **Code-Snippets**: Vordefinierte TikZ-Befehle für schnelles Arbeiten
- **Responsive Design**: Anpassbare Editor-Preview Aufteilung

## 🚀 Installation

### Systemvoraussetzungen
- Node.js (LTS Version empfohlen, >= 16.x)
- npm (wird mit Node.js mitgeliefert)

### Installationsschritte

1. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

2. **Anwendung starten**
   ```bash
   npm start
   ```

Die Installation umfasst:
- **Electron** (v37.0.0) - Desktop-App Framework
- **Monaco Editor** (v0.52.2) - Code-Editor Komponente
- **TikZJax** - Client-seitiges TikZ-Rendering
- **jsPDF** - PDF-Generierung

## 📖 Verwendung

### Editor-Funktionen
1. **Code schreiben**: TikZ-Code im linken Editor-Fenster eingeben
2. **Live Preview**: Das Diagramm wird automatisch im rechten Fenster gerendert
3. **Interaktion**: Klick auf SVG-Elemente springt zur entsprechenden Codezeile
4. **Snippets**: Verwenden der Dropdown-Liste für vordefinierte TikZ-Befehle

### Datei-Operationen
- **LaTeX laden**: `Cmd/Ctrl + O` zum Importieren von .tex Dateien
- **LaTeX speichern**: `Cmd/Ctrl + Shift + S` zum Exportieren als .tex Datei
- **SVG exportieren**: Speichern des aktuellen Diagramms als SVG
- **PDF exportieren**: Generieren einer PDF-Datei des Diagramms

### Theme-Steuerung
- **Theme wechseln**: Über den "Toggle Theme" Button
- **Automatische Erkennung**: Unterstützung für System-Dark-Mode

## 🏗️ Projektstruktur

```
TikZEdit/
├── main.js                 # Electron Main Process
├── preload.js              # IPC Bridge zwischen Main und Renderer
├── index.html              # Haupt-HTML-Struktur der Anwendung
├── package.json            # Abhängigkeiten und Skripte
├── README.md               # Projektdokumentation
├── src/
│   ├── editor.js           # Monaco Editor Setup und Konfiguration
│   ├── renderer.js         # Haupt-App-Logik und Event-Handling
│   ├── preview.js          # Preview Rendering mit TikZJax
│   ├── export.js           # SVG und PDF Export-Funktionen
│   ├── theme-toggle.js     # Theme-Switching Logik
│   ├── tikzSvgMapper.js    # Bidirektionales Line-Mapping
│   └── services/           # Service-basierte Architektur
│       ├── editorConfigService.js       # Editor-Konfiguration
│       ├── svgMonacoInteractionService.js # SVG-Editor Interaktion
│       └── tikzProcessingService.js     # TikZ-Code Verarbeitung
└── styles/
    └── main.css            # Styling und Theme-Definitionen
```

## 🔧 Technische Architektur

### Service-basierter Aufbau
Das Projekt verwendet eine modulare Service-Architektur:

1. **EditorConfigService**: Handelt Editor-Konfiguration, Themes und Sprachdefinitionen
2. **TikzProcessingService**: Verantwortlich für Code-Preprocessing, Validierung und Formatierung
3. **SvgMonacoInteractionService**: Verwaltet die bidirektionale Interaktion zwischen SVG und Editor

### Bidirektionales Mapping
Die Kernfunktionalität ermöglicht:
- **TikZ → SVG**: Spezielle Kommentare (`\special{dvisvgm:raw}`) fügen Line-IDs in SVG ein
- **SVG → TikZ**: Klick auf SVG-Elemente navigiert zur entsprechenden Codezeile
- **Visuelles Feedback**: Hover-Effekte und Highlighting für bessere UX

### IPC-Kommunikation
- **Main Process**: Fensterverwaltung und Dateisystem-Operationen
- **Renderer Process**: UI-Rendering und Benutzerinteraktion
- **Preload Script**: Sichere IPC-Bridge zwischen den Prozessen

## 🛠️ Entwicklung

### Skripte
```bash
npm start      # Startet die Entwicklungsumgebung
npm run dist   # Erstellt eine distributable Version
```

### Beitragen
1. Repository forken
2. Feature-Branch erstellen (`git checkout -b feature/AmazingFeature`)
3. Änderungen committen (`git commit -m 'Add AmazingFeature'`)
4. Branch pushen (`git push origin feature/AmazingFeature`)
5. Pull Request erstellen

## 📝 Bekannte Issues & Lösungen

### Rendering-Probleme
- **Symptom**: Diagramme werden nicht korrekt gerendert
- **Lösung**: TikZ-Code auf Syntaxfehler überprüfen, komplexe Diagramme vereinfachen

### Performance bei großen Diagrammen
- **Symptom**: Langsames Rendering bei komplexen TikZ-Diagrammen
- **Lösung**: Diagramm in kleinere Teile aufteilen oder Optimierungen vornehmen

### Mapping-Unsicherheiten
- **Symptom**: Nicht alle SVG-Elemente sind korrekt mappbar
- **Lösung**: `strictMapping` Konfiguration im Preview-Service anpassen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.

## 👥 Mitwirkende

- **Praktikum25** - Initialarbeit
- Universität Marburg - Computer Science Student Project 2025

## 🙏 Danksagung

- **TikZJax** Team für das client-seitige TikZ-Rendering
- **Monaco Editor** Team für den exzellenten Code-Editor
- **Electron** Team für das Desktop-App Framework

---

**Hinweis**: Dies ist ein Studentenprojekt der Universität Marburg aus dem Jahr 2025. Für Produktionseinsatz werden zusätzliche Testing- und Error-Handling Mechanismen empfohlen.
