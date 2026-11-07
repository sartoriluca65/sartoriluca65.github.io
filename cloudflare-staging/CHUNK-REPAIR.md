# Frammenti locali: causa, correzione e recupero

## Causa riprodotta

Il percorso `localBlob()` viene chiamato in parallelo da `encode()` per oggetti e array. Due Blob con gli stessi byte possono leggere entrambi una cache ancora vuota e cifrare gli stessi byte con nonce casuali diversi. L'indice della cache è basato sul plaintext hash: l'ultima scrittura sostituisce il record precedente. Lo snapshot può però riferire entrambi gli hash dei ciphertext. Uno non è più presente nel database locale né sul server e l'upload si ferma con `Frammento locale non disponibile: copia precedente conservata`.

Due Blob sintetici identici riproducono il messaggio esatto sul codice precedente. Il caso personale mostra lo stesso errore, ma non sono stati letti i database o gli allegati personali.

## Correzione

Ogni ciphertext viene conservato sotto il proprio hash prima di pubblicarne il riferimento nello snapshot. L'indice basato sul plaintext può ancora essere aggiornato per il riuso, ma non è più l'unica copia del frammento. Lo stesso criterio vale per i frammenti scaricati. AES-GCM, nonce casuali, AAD, chiavi e namespace non cambiano.

## Invii già bloccati

Quando manca un frammento compare `Ricostruisci invio dagli originali`. L'azione richiede conferma e:

1. acquisisce il blocco di sincronizzazione;
2. decifra e verifica l'invio precedente con la chiave già sbloccata;
3. ricattura lo stato locale corrente e controlla la presenza di tutti i plaintext hash degli allegati dell'invio precedente;
4. verifica che lo stato non sia cambiato durante la preparazione;
5. in una sola transazione IndexedDB archivia l'invio precedente e registra il nuovo invio, mantenendo la revisione base originale;
6. riprende il normale caricamento con controllo dei conflitti.

Se manca un originale, la chiave non verifica l'invio o i dati cambiano, l'invio corrente non viene sostituito. La conferma annullata non modifica nulla. La copia archiviata rimane nel database di trasporto, senza rimozione automatica. Il nuovo invio può avere nuovi nonce e ciphertext, ma quelli precedenti rimangono conservati. Nessuna cancellazione di dati locali, revisioni cloud o backup. Non c'è generazione di nuove chiavi.

## Validazione

- Messaggio esatto riprodotto sul codice precedente con Blob sintetici duplicati.
- 10 scenari browser Chromium desktop/mobile passati: duplicati, recupero e riapertura dei due allegati in un secondo contesto indipendente, originale mancante, annullamento e chiave errata.
- 9 test crypto e 14 test backend preesistenti passati.
- Prova sintetica isolata `/frammenti` preparata sul Worker diagnostico: client corretto reale, backend simulato solo in memoria nel browser, nessun collegamento agli archivi personali.
- Safari reale Mac/iPhone resta da verificare; Chromium mobile non ne costituisce una verifica.

Questa proposta riguarda solo il trasporto clinico. Nessun cambio a TeFinanza o Registro Credenziali. Lo spazio clinico appena autorizzato resta `fresh-20261107-dd02131d`.
