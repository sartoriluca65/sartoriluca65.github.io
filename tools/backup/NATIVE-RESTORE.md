# Portale: preparazione dei lettori Rifornio e AutoControl

Solo ramo backup-preparation-2026. Nessuna modifica a main, workflow, impostazioni, segreti o pubblicazioni. Nessun backup reale eseguito o dichiarato riuscito.

## Rifornio

File: `rifornio/backup-integrity.js`, `rifornio/app.js`, `rifornio/index.html`. Il JSON precedente resta accettato quando completo e valido: identificativi unici, campi veicolo, date e importi. La cronologia di veicoli rimossi è mantenuta. I valori importati sono resi come testo nelle etichette HTML.

L'importazione valida tutto prima della conferma. Conserva i due valori originali in `rifornio-before-import-v1`, quindi scrive e rilegge entrambe le chiavi. Se una scrittura fallisce tenta di ripristinare i soli valori scritti dall'operazione; il registro rimane. Un registro pending blocca i normali salvataggi. Alla riapertura mostra i valori precedenti senza modificarli. Il pulsante “Recupera archivio precedente” ripristina e verifica solo dopo conferma esplicita. Non cancellare dati sito o registro. Chiudere tutte le altre schede prima del recupero: vecchi lettori non conoscono il registro.

Il JSON nativo rimane parziale: veicoli e rifornimenti, senza viaggi/bozze/impostazioni. Per l'archivio locale completo serve il toolkit già preparato, con verifica e prova in ambiente isolato; il toolkit non è un importatore operativo. Nessuna aggiunta di dipendenze. localStorage non offre transazioni tra chiavi: il registro limita i danni, non sostituisce una copia esterna verificata.

## AutoControl

File: `autocontrol/import-integrity.js`, `autocontrol/cloud.js`, `autocontrol/index.html`. Il formato ZIP versione 1 rimane invariato. Si controllano limiti di decompressione, CRC, indice, presenza di tutti gli allegati e confronto byte per byte con gli originali che hanno lo stesso ID. Il controllo termina prima di scrivere. Gli allegati nuovi sono inseriti con `add` in un'unica transazione IndexedDB: un conflitto sopraggiunto annulla tutti gli inserimenti, senza sovrascrivere originali. I metadati sono scritti dopo gli allegati e riletti; si verifica che l'archivio non sia cambiato durante la preparazione.

Una chiusura o un errore fra inserimento file e scrittura metadati può lasciare nuovi file orfani. Non sono rimossi automaticamente, non sostituiscono originali e non costituiscono un ripristino completato. L'archivio precedente resta il riferimento. Non è stata implementata una transazione unica fra localStorage e IndexedDB. Il ZIP contiene i documenti locali disponibili; non è un backup del database cloud né dei dati remoti non scaricati. JSZip 3.10.1 resta la dipendenza già presente, senza aggiornamento del gestore CDN. Il CRC rileva corruzione accidentale, non garantisce provenienza.

## Prove e utilizzo futuro

`node --test tools/backup/native-restore.test.cjs`: 10 test superati (6 Rifornio, 4 AutoControl). Nei browser Chromium isolati: ripristino e riapertura; record incompleti rifiutati; seconda scrittura Rifornio interrotta, riapertura con copia precedente e recupero esplicito; AutoControl collisione binaria, transazione con ID duplicato, metadati non scrivibili, ultimo allegato mancante, ZIP con CRC errato e troncato. Sorgenti e originali esclusivamente sintetici; chiamate ai servizi operativi bloccate. Non provati account remoti, sincronizzazione, Safari, dispositivi o archivi grandi. Nessuna nuova dipendenza applicativa.

Prima di un futuro uso autorizzato: esportare verso un file nuovo, conservare copie valide fuori dal browser e verificare tutti gli originali. Provare l'importazione in un profilo vuoto con rete applicativa disabilitata. Chiudere le altre schede. Non confondere il backup del codice Git con i dati nel browser o cloud. Non cancellare originali, cache o archivi per risolvere errori di importazione.

## Rollback e attività manuali

Baseline codice: `3b3047cfddbdc85d5e6126261fb843862542ad18`. Lasciare il ramo non unito; una futura correzione inversa può usare questo commit senza riscrivere la storia. Nessuna migrazione o eliminazione automatica. Tornare a un vecchio lettore mentre esiste un registro Rifornio pending è rischioso: il registro deve prima essere verificato e recuperato esplicitamente. Il codice precedente AutoControl mantiene il difetto della collisione e non deve essere usato per importare ZIP sospetti.

La reversibilità del codice non ripristina dati reali. Recuperi reali, autorizzazioni database/account, accessi manuali, cache di produzione e pubblicazione richiedono attività distinte non eseguite. Il repository Rifornio archiviato rimane intatto: è disponibile solo una patch locale equivalente, da valutare prima di qualsiasi futura applicazione.
