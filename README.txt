HOTZONE – Netlify Multiplayer
================================
Enthalten:
- index.html: Browser-Spiel mit Erstellen/Beitreten
- netlify/functions/hotzone.mjs: Netlify Function für Räume
- netlify.toml: Netlify-Konfiguration
- package.json: Netlify Blobs-Abhängigkeit

WICHTIG:
1. Das ist ein Netlify-Projektpaket, nicht bloß eine einzelne HTML-Datei.
2. Lade den ENTpackten Ordner über eine Netlify-Methode hoch, die Functions und Dependencies bereitstellt (z. B. Netlify CLI oder Git-Repository-Deploy). Ein normaler Drag-and-drop-Upload einzelner HTML-Dateien veröffentlicht keine Functions.
3. Beim ersten Deploy muss Netlify Blobs für das Site-Projekt verfügbar sein. Prüfe anschließend, ob /.netlify/functions/hotzone antwortet.
4. Namen werden nicht abgefragt oder in der Datenbank gespeichert. Es werden zufällige Spieler-IDs gespeichert. Raumdaten laufen nach 3 Stunden Inaktivität logisch ab; bei einer späteren Anfrage wird ein abgelaufener Raum verworfen.
5. Dies ist ein Start-Prototyp, kein sicherheitsgeprüftes kommerzielles Spiel. Für öffentliche Nutzung wären zusätzliche Limits, bessere Lösch-/Ablaufbereinigung und Schutz gegen Missbrauch nötig.
