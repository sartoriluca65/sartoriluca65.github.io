# Controlli aggiornamento — 9 ottobre 2026

## Esito

20 controlli automatici superati; nessun errore JavaScript rilevato nel DOM simulato. Controllo sintassi superato per il codice principale e cloud.js.

- Prima immatricolazione: selezione anno/mese/giorno, modifica e salvataggio
- Anni bisestili e date impossibili
- Creazione manuale in 10 moduli
- Blocco polizza con scadenza antecedente alla decorrenza
- Blocco valori negativi
- Estrazione strutturata libretto/importi/km su testo di prova
- Calendario anche nei campi OCR dell’archivio documenti
- Archivio precedente conservato durante le modifiche
- Trasferimento esplicito dell’archivio locale al proprio account
- Modifica salvata e confermata dal backend simulato
- Recupero dopo cancellazione memoria locale in un secondo ambiente isolato
- Dati distinti per due account (backend simulato)
- Conflitto di versione: unione delle registrazioni distinte senza sovrascrittura
- Fotocamera assente: messaggio esplicito, nessuna apertura del selettore cartelle
- Allegato e testo OCR caricati nello spazio privato dell’account (server simulato)
- Download privato dell’allegato da un ambiente senza archivio locale
- Copia ZIP completa contiene dati e byte originali dell’allegato
- Importazione ZIP in archivio vuoto: dati e allegati ripristinati
- Ricambi: interventi selezionabili solo per la vettura scelta
- Nessun errore JavaScript nei controlli DOM

## OCR

Prova con immagine stampata sintetica: FIAT, PANDA, targa AB123CD e importo 1.234,56 riconosciuti; confidenza 92%. Il motore 7 con modelli float best falliva per un problema del core relaxed SIMD; il motore compatibile 6.0.1 supera la prova. Nessun documento reale dell’utente è stato usato.

## Limiti della verifica

I controlli di account, isolamento tra utenti, conflitti e allegati utilizzano un backend simulato. Non dimostrano che Supabase reale sia già configurato né verificano le policy sul server reale. L’avvio di Chromium nel sandbox è fallito: la resa grafica, la fotocamera fisica e il calendario nativo Safari/iPhone restano da provare nei browser reali. Le tabelle cloud richiedono l’esecuzione di archivio-online.sql e la consegna email richiede configurazione SMTP per gli utenti esterni. Prezzi carburante giornalieri e tariffe regionali bollo automatiche non sono implementati.
