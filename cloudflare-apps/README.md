# Cinque applicazioni personali su Cloudflare

Versione 9 novembre 2026. Cochi, AutoControl, PienoSmart e Luki Stickers usano i sorgenti principali del portale; Diviso usa il repository autonomo. I sorgenti nativi e i siti precedenti restano conservati. Le trasformazioni sono applicate soltanto agli asset preparati per Cloudflare.

## Accesso e sincronizzazione

Le cinque configurazioni in `configs/` indicano URL, Worker, D1 e R2 dedicati. L'accesso Cloudflare Access è riservato al proprietario, con provider passkey e codice email. La registrazione biometrica richiede il dispositivo personale. Il Worker verifica nuovamente firma, issuer, audience e scadenza del JWT. Ogni utente ha uno spazio locale e remoto distinto. R2 non ha un indirizzo pubblico abilitato.

La barra superiore contiene sblocco/blocco, sincronizzazione, copie e ripristino, **Backup JSON** e **Aggiornamenti**. Ogni app ha una chiave casuale distinta: crearla soltanto sul primo dispositivo, conservarla in un gestore password e usare la stessa sugli altri. Email, PIN e passkey non ricostruiscono una chiave persa. La chiave non è inviata al server, ed è conservata temporaneamente nella scheda per un massimo di 15 minuti; poi occorre sbloccare di nuovo. Nel dialogo è possibile mostrarla mentre è ancora disponibile. Nessuna rigenerazione automatica.

Il confronto con un vecchio abbinamento locale avviene dopo la verifica crittografica della copia cloud. Se questa si apre correttamente con la chiave fornita, il riabbinamento richiede conferma e conserva la generazione locale precedente. Un errore di rete non deve essere presentato come chiave errata. Il ritorno da una pagina ripristinata nella cache iOS ricarica il trasporto anziché lasciarlo fermo.

La sincronizzazione controlla ogni 10 secondi, al ritorno online e quando la pagina torna visibile. Funziona a pagina aperta e con chiave sbloccata. Senza rete conserva le modifiche nel browser; non cancellare i dati del sito prima di un backup. Un accesso iniziale offline non è garantito. Revisioni D1 e snapshot/allegati R2 sono cifrati AES-GCM, immutabili e separati per account. I conflitti conservano entrambe le copie e richiedono confronto; nessuna fusione automatica di modifiche sullo stesso dato.

## Trasferire i dati esistenti

L'assistente non importa dati reali. Eseguire il trasferimento su un solo dispositivo, controllare l'anteprima e attendere “Sincronizzato” prima di collegare gli altri.

- **Cochi:** usare il backup JSON nativo, libero oppure protetto da password, quindi il ripristino nativo nella nuova app. La password di un vecchio archivio cifrato rimane necessaria ed è distinta dalla nuova chiave di sincronizzazione.
- **AutoControl:** esportare la copia ZIP completa dal vecchio sistema, inclusi i documenti; importarla mediante “Importa copia”. Le funzioni ZIP originali restano disponibili. Nella nuova versione il vecchio login Supabase è disattivato per evitare due motori di sincronizzazione; il vecchio servizio e i suoi dati non vengono toccati. File prima solo remoti vanno inclusi nel vecchio ZIP.
- **PienoSmart:** usare Esporta dati / Importa archivio dell'app originale e controllare veicoli e registrazioni prima della conferma.
- **Sticker e Diviso:** nel browser che contiene i dati GitHub aprire la pagina `cloudflare-apps/migrate-local.html` dello stesso sito, selezionare l'app, controllare ed esportare. La pagina legge soltanto le chiavi locali dell'app e, per Sticker, il database immagini; non invia dati in rete e non cancella l'originale. Il file di trasferimento non è cifrato: conservarlo protetto, mai caricarlo su GitHub o in chat. Nella nuova app aprire Backup JSON e selezionare il file dopo lo sblocco; controllare l'anteprima. Se i dati erano su un altro dominio, la pagina deve essere ospitata su quel dominio: i browser non consentono letture tra origini diverse.

Il nuovo backup JSON cifrato include dati e allegati, richiede la stessa app, lo stesso account e la chiave al ripristino. Anteprima e verifica degli hash/decifratura precedono il cambio della generazione locale. La copia corrente resta conservata. Dopo il ripristino da file la pubblicazione online richiede una scelta esplicita in Copie e ripristino. I backup nativi originali rimangono disponibili. Limite del file JSON completo: 64 MB; metadati snapshot: 8 MB. I testi grandi e le immagini vengono spezzati in frammenti cifrati R2. Per archivi maggiori occorre valutare un formato in streaming prima del trasferimento.

## Servizi AI e prezzi

Sticker e PienoSmart chiamano rotte autenticate della stessa origine. I service binding inoltrano solo il corpo richiesto ai Worker già esistenti, senza cookie o token Access. Le chiavi API rimangono nei segreti dei servizi originali e non vengono duplicate. Il proxy accetta solo servizi e metodi predefiniti, controlla origine/tipo/dimensione e non è un proxy arbitrario.

MIMIT è una fonte quotidiana, non prezzi in tempo reale. Itinerari e consigli dipendono da disponibilità, quota e modelli dei provider esistenti. Le prove automatiche simulano le risposte e non effettuano generazioni a pagamento. Un'eventuale indisponibilità del provider non deve impedire l'apertura dell'archivio personale. Fotocamera e geolocalizzazione restano consentite sulla stessa origine, con permesso del browser.

## Codice, aggiornamenti e verifiche

`shared/verify.mjs` esegue build, 19 test backend/import/proxy e prepara gli asset nativi. `shared/integration.py` verifica per ciascuna app creazione della chiave, riabbinamento verificato, sincronizzazione automatica, backup cifrato, rifiuto dei file alterati, ripristino e separazione utenti, con record, immagini e PDF sintetici. `shared/transfer-browser.py` verifica il trasferimento di Sticker e Diviso. Prove passate in Chromium e WebKit con profili persistenti; trasferimento passato anche in Firefox. WebKit Linux non equivale a Safari reale su iPhone/Mac: completare l'apertura e l'abbinamento sui dispositivi personali prima di trasferimenti estesi.

Cloudflare Builds può distribuire dal repository dopo i controlli, usando il collegamento e il build token già presenti nell'account: nessuna credenziale viene salvata nel codice o in GitHub. Il deploy pubblica codice e asset e conserva database, bucket, identità e chiavi. Non esegue migrazioni dei dati su ogni aggiornamento. Le modifiche al codice devono passare per una pull request e i test. Un cambiamento incompatibile della struttura nativa blocca la preparazione invece di modificare automaticamente l'app.

Per rollback ridistribuire il codice precedente conservando invariati risorse, identità Access e chiavi. Non cancellare D1, R2, browser o copie storiche. Le vecchie versioni pubblicate restano disponibili durante il trasferimento.
