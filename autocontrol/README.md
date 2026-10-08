# AutoControl — versione aggiornata

Apri l’app pubblicata su HTTPS. Puoi usare `index.html` per consultare la versione locale, ma fotocamera e account richiedono un contesto sicuro e una connessione. Per avviare l’OCR il browser deve poter caricare i componenti OCR/PDF e le lingue italiano e inglese da CDN; serve una connessione Internet. La scansione e l’estrazione vengono elaborate nel browser. Senza accesso, file e testo OCR sono conservati nell’IndexedDB locale e i dati strutturati nel localStorage: cancellando i dati del sito si perdono. Con account e backend attivato, dati e documenti vengono sincronizzati nell’archivio personale. Il pannello mostra la conferma del salvataggio e le modifiche ancora da inviare. Vedi ATTIVAZIONE-ARCHIVIO.md.

## Aggiornamento 9 ottobre 2026
- Selettori separati per giorno, mese e anno, anche per prima immatricolazione e campi OCR. Calendario nativo mantenuto; controllo anni bisestili e date impossibili.
- Accesso/registrazione con email e password, recupero password e archivio personale Supabase. Attivazione SQL e configurazione email richieste prima dell’uso pubblico.
- Trasferimento esplicito dei dati già presenti nel browser: l’archivio precedente resta conservato. L’account deve appartenere al proprietario dei dati trasferiti.
- Allegati privati per account, salvataggio delle versioni precedenti sul server e controllo delle modifiche simultanee. I conflitti sulla stessa registrazione bloccano la sovrascrittura e chiedono una copia di sicurezza.
- Scarica copia completa / Importa copia: archivio ZIP con dati e originali dei documenti. I vecchi documenti con solo metadati richiedono «Ricollega file originale» prima di creare una copia completa.
- Controlli su importi negativi, decorrenza/scadenza polizze, collegamento dei ricambi alla corretta vettura, unità di consumo e scadenze duplicate. Un veicolo con storico collegato non viene eliminato.
- OCR con motore 6.0.1 e core 6.1.2 compatibili con i modelli best; prova sintetica superata con confidenza 92%, da verificare su documenti reali.

## Funzioni
- Fotocamera diretta con anteprima video e comando Scatta e leggi; permesso fotocamera richiesto dal browser, arresto della fotocamera alla chiusura. Le foto scelte dalla galleria e i PDF hanno anteprima o nome file, rimozione e lettura automatica; le immagini possono essere ruotate.
- Lettura diretta del testo dei PDF digitali, OCR ad alta risoluzione con modelli best italiano/inglese per foto e PDF scansionati, seconda lettura in caso di bassa confidenza. Il riconoscimento sui documenti reali dell’utente resta da verificare con un esempio; non è garantita la precisione di ogni campo.
- Aggiornamenti compatibili con l’archivio esistente: stessa chiave dati e stesso database allegati, nuove sezioni aggiunte solo se mancanti. Un archivio non valido blocca l’apertura senza essere sostituito con uno vuoto.
- Copia locale dei dati strutturati precedenti a questa versione nel database IndexedDB `autocontrol-safety`, se lo spazio del browser lo permette. Gli allegati originali restano nel database documenti esistente. Questa copia non è un backup esterno e non protegge dalla cancellazione dei dati del browser.
- Scanner direttamente nei moduli veicolo/libretto, manutenzioni, ricambi, assicurazioni, bollo, revisioni, carrozzeria, accessori e rifornimenti: fotocamera, galleria, PDF e più foto fronte/retro.
- Revisione dei valori OCR prima di riportarli nel modulo; i campi già compilati richiedono selezione esplicita. Testo OCR modificabile, compilazione manuale e allegati salvabili anche senza riconoscimento riuscito.
- Una fattura con più ricambi va verificata e suddivisa manualmente in più voci; il totale fattura non viene usato automaticamente come prezzo unitario o manodopera.
- Contatti Luca Sartori con sole icone telefono e WhatsApp, disponibili anche da mobile.
- Rubrica Officine e carrozzerie: aggiunta, modifica, rimozione, contatti e conteggio interventi. I nomi salvati sono suggeriti in manutenzione e carrozzeria.
- Accesso diretto a Officine e allo storico Carrozzeria dalla panoramica.
- Schede veicolo modificabili, suggerimenti per marca/modello/allestimento e data acquisto da calendario. Acquisto nuovo/usato, chilometri iniziali, prezzo e venditore.
- Scansione di immagini e PDF multipagina (fino a 15 pagine per file), con campi suggeriti modificabili e conferma prima dell’archiviazione.
- Archiviazione OCR collegata a veicolo, ricambi, rifornimenti, accessori, manutenzioni, assicurazioni, bollo, revisioni o carrozzeria.
- Indicazione di officina, concessionario, casa madre o privato; file originali e testo OCR consultabili e scaricabili.
- Gestione di scadenze, ricambi e optional, riepilogo costi stampabile.

I valori OCR sono suggerimenti, non certificazioni: confrontali sempre con il documento originale. Il bollo resta da verificare e confermare manualmente; le tariffe regionali automatiche non sono ancora configurate.

## Funzioni ancora da completare
Attivazione e verifica del backend reale e della consegna email agli utenti esterni; prezzi carburante automatici giornalieri, tariffe regionali bollo, notifiche, report distinti in PDF e contatore amministratore degli utenti effettivi.
