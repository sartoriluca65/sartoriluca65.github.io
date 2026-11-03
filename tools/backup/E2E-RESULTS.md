# Aggiornamento: correzioni dei lettori nativi — 3 novembre 2026

Le tre anomalie descritte nel rapporto storico qui sotto sono state corrette SOLO nei candidati del ramo `backup-preparation-2026` (TeFinanza e portale). Le copie pubblicate non sono aggiornate. Rifornio archiviato ha soltanto una proposta locale.

Nuove prove sintetiche: quattro percorsi Chromium superati, inclusi errori di scrittura e riapertura; 14 test Node sui due repository. Rifornio locale: ulteriori 6 test dello stesso componente. Nessuna richiesta eseguita verso servizi applicativi di produzione. Dettagli, limiti e rollback: [NATIVE-RESTORE.md](NATIVE-RESTORE.md).

---

Rapporto storico precedente alle correzioni:

# Risultati di integrazione su copie — 3 novembre 2026

Dati esclusivamente sintetici, contesti Chromium nuovi e servizi esterni bloccati. Nessun archivio personale, browser esistente o database operativo utilizzato. Applicazioni originali non modificate.

I test eseguono i sorgenti applicativi del commit `4254c16473469c840f12d5e0c8590b75ae3c7ff2` (per il repository iOS soltanto verifica statica dello schema, non esecuzione).

| Copia applicativa | Nuovo toolkit: apertura e riapertura | Diagnostica dei lettori nativi |
|---|---|---|
| Portal-Rifornio | PASS | native_invalid_records_preserve_valid_archive |
| Portal-Stickers | PASS | Nessun difetto nei casi provati |
| Portal-Cassa | PASS | Nessun difetto nei casi provati |
| Portal-AutoControl | PASS | native_id_collision_rejected_or_correct_bytes |
| Portal-Clinical-Main | PASS | Nessun difetto nei casi provati |
| Portal-Clinical-Family | PASS | Nessun difetto nei casi provati |
| Portal-Credential-Demo | PASS | Nessun difetto nei casi provati |

Flusso: archivio inventato aperto nell’app; cattura in sola lettura; controllo del pacchetto; scrittura tramite adattatore SOLO di test in un secondo contesto vuoto su loopback; apertura e ricarica della copia originale dell’app; confronto di dati e allegati. Nessun importatore operativo viene aggiunto all’app.

## Esiti da non confondere

- TeFinanza: un JSON nativo con metadati del documento ma senza originalFiles viene accettato e rimuove il file originale nella destinazione di prova. Il nuovo toolkit rifiuta l’allegato mancante. Il lettore nativo resta invariato.
- Rifornio: l’importatore nativo accetta record veicolo incompleti e sostituisce l’archivio valido della prova. Il vecchio export non comprende i viaggi. Il nuovo controllo del toolkit rifiuta i veicoli privi di nome e conserva le chiavi dei viaggi.
- AutoControl: ZIP nativo valido ripristinato e riaperto in archivio vuoto. Con un file già presente con lo stesso ID ma byte diversi, il lettore nativo può riutilizzare il file errato. Il sandbox del toolkit richiede invece una destinazione nuova.
- Cartella clinica principale e familiare: provati .tlbackup, JSON completo, .tlenc con password inventata e vecchio ZIP; dati e originali recuperati. Password errata e originale mancante rifiutati. Nessun test su dati clinici reali o su file grandi.
- Registro credenziali demo: sblocco nativo, copia cifrata ripristinata e successivo sblocco con PIN sintetico; nessuna credenziale reale.

## Controlli affinati nel nuovo toolkit

Rifiuto di veicoli senza nome, regole Cochi incompatibili con il lettore, anagrafica clinica mancante e riferimenti file clinici non validi. Fixture aggiornate per rispettare gli schemi delle app. Per iOS, UUID controllati prima di produrre una copia. Non sono introdotte migrazioni o cancellazioni.

Test del toolkit: 30 test JavaScript per copia (23 core, 4 compatibilità, 3 staging). Tutti passati. SHA-256 e confronto dei byte non sostituiscono i controlli applicativi sopra distinti.

## Limiti e rollback

Nessuna garanzia su servizi remoti, account operativi, Safari, OCR, disponibilità delle email o ripristino di file oltre il limite prudenziale di 64 MiB. Le condizioni native pericolose sopra indicate sono blocchi all’uso operativo del relativo lettore: non interpretare PASS del toolkit come correzione dell’app.

Rollback: lasciare il ramo non unito. Sono cambiati soltanto strumenti/test/documentazione sotto tools/backup; nessun avvio applicativo li importa. Per tornare alla prima preparazione, selezionare il commit precedente sul ramo dopo revisione; non ripristinare database, cancellare chiavi o migrare dati. Le copie valide sono conservate e le destinazioni esistenti vengono rifiutate.

