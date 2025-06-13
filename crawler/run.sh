#!/bin/bash

# Installiere Abhängigkeiten
npm install

# Erstelle data-Verzeichnis falls nicht vorhanden
mkdir -p data

# Führe Crawler aus
node crawler.js 