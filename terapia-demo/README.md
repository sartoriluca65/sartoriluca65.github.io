# Terapia & Cartella Clinica — Demo GitHub Pages

Demo funzionante con dati completamente fittizi, senza valore clinico. ©2026 Luca Sartori. Tutti i diritti riservati.

## Pubblicazione
1. Carica tutto il contenuto di questa cartella in un repository GitHub, senza i dati della tua app privata.
2. Settings → Pages → Deploy from a branch → main → / (root) → Save.
3. Apri il link fornito da GitHub Pages. Funziona anche in una sottocartella del sito.

Non occorrono chiavi, server o account ChatGPT. Per una prova locale usa un server HTTP, ad esempio `python3 -m http.server 8000`, poi apri http://localhost:8000. Non aprire con file://.

## Funzioni
Farmaci, orari, assunzioni, prossimo ciclo, integratori con lettura foto/PDF da verificare, visite, esami, archivio documenti con aggiunta/rinomina/eliminazione, stampe PDF a colori e backup completo ZIP con allegati e ripristino.

Dati e file sono memorizzati in IndexedDB nel singolo browser. Nessuna sincronizzazione fra dispositivi, autenticazione o archivio cloud. Cancellare i dati del browser cancella anche l'archivio locale. Il backup ZIP permette di trasferire manualmente l'archivio e contiene anche gli allegati. Non contiene una password o cifratura: conservalo con cura se inserisci dati reali.

La demo include farmaci con nomi inventati e un PDF dimostrativo. Le dosi non sono prescrizioni. La lettura automatica propone testo e campi che vanno controllati prima del salvataggio. Il limite per singolo allegato è 100 MB; lo spazio effettivo dipende dal browser. La lettura testo analizza al massimo le prime 5 pagine del PDF.

## Librerie
Il motore di stampa PDF e ZIP sono distribuiti localmente. Le librerie di lettura PDF e OCR vengono scaricate da jsDelivr in versioni fissate quando si usa la scansione; i documenti sono elaborati nel browser. nessun dato clinico viene inviato a servizi esterni.

## Contatori
Il collegamento al sistema esistente è predisposto in `analytics-link.js` ma disattivato (`COUNTERS_ENABLED = false`). L’attivazione richiede l’autorizzazione all’invio verso il backend analytics Supabase già configurato nel sito. Verranno inviati solo ID app, identificativo casuale del browser e segnali di presenza; non vengono letti farmaci, referti, allegati o contenuti clinici. L’eventuale autorizzazione lato backend per il nuovo ID `terapia-demo` resta da verificare. Le licenze sono nelle cartelle vendor e licenses. Il PDF di stampa conserva lo stile e le icone del progetto originale.

## Sorgenti
Il modulo di stampa originale è compresso nelle parti locali `assets/report-*.gzpart` e viene ricostruito nel browser solo quando si stampa. I caratteri per ricompilare il motore sono conservati in `assets/fonts-*.gzpart`: `node scripts/restore-font-source.mjs` ripristina `src/fonts.ts`. La ricostruzione del modulo conserva il codice e i caratteri originali.
