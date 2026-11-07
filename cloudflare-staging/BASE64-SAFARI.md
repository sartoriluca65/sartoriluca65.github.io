# Correzione Base64 / Safari — 7 novembre 2026

Solo Cartella Clinica staging; produzione, sorgenti terapia-demo, D1 e R2 non modificati.

## Causa verificata
Il decoder precedente controllava l'alfabeto Base64URL ma non lunghezza e padding prima di atob(). Una stringa con lunghezza congruente a 1 modulo 4 (esempio sintetico AAAAA) riproduce esattamente in WebKit InvalidCharacterError: “The string contains invalid characters.” Una chiave valida di 43 caratteri funziona anche nel WebKit precedente alla patch: non è corretto attribuire ogni caso alla sola assenza di padding. Non avendo acquisito la chiave privata dell'utente, non possiamo stabilire quale fosse la stringa effettivamente incollata.

## Correzione
crypto.mjs valida lunghezza e padding, converte Base64URL/Base64 in una rappresentazione esplicitamente padded prima di atob(), controlla i 32 byte richiesti da AES-GCM. Accetta la formattazione ASCII del copia/incolla. btoa continua a ricevere solo byte, verificati tutti i 256 valori.
controller.js usa lo stesso parser per importazione e fingerprint, disabilita correzione automatica del campo e conserva la chiave temporanea salvata se non leggibile o non corrispondente. Nessuna rigenerazione automatica. AES-GCM, AAD, formato v1 e fingerprint dei byte invariati.

## Verifica
9 casi crypto e 13 backend superati. Test sintetici in Chromium, Firefox 153 e WebKit 26.5: prima chiave, sblocco equivalente Base64URL/Base64 con padding, rifiuto input malformati, blocco creazione prima chiave con cloud esistente, decifratura snapshot del vecchio codice, ripristino in generazione separata, successiva sincronizzazione e conservazione cache malformata. Compatibilità con vecchi blob fino a 1 MiB, chiave errata, AAD errato e manomissione verificati.
WebKit è il motore di test Linux di Playwright, non Safari reale su macOS. La verifica finale sul Safari del Mac dell'utente resta necessaria.
Il server browser locale usa solo identità sintetiche e archivi in memoria; nessun dato reale importato.

## Uso
Aprire https://luki-cartella-clinica-staging.sartori-luca65.workers.dev e ricaricare una volta per acquisire il codice aggiornato. Usare la chiave ESISTENTE di Cartella Clinica. Non creare una chiave nuova per un archivio già cifrato.
