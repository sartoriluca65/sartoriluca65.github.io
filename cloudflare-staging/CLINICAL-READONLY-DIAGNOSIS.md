# Diagnosi clinica di sola lettura

Il proprietario vede la revisione 2 sincronizzata su iPhone ma un profilo vuoto. Riprodotto su dati sintetici un caso distinto: dati aggiornati nel fallback localStorage sul mittente, database IndexedDB vuoto/stale incluso nello stesso snapshot e ricevente che legge IndexedDB. Il trasferimento ordinario IndexedDB verso IndexedDB invece passa. Questo non dimostra ancora la causa personale.

Il pulsante Controlla copia clinica confronta solo conteggi, validità strutturale, tipo di memoria e profilo principale/secondario. Legge l'interfaccia, il cacheGet locale, l'ultima copia cifrata e, se successiva alla 2, anche la revisione 2. Non scarica gli allegati e non espone nomi, documenti, ID dei record, contenuti, chiavi o impronte. Non usa readDatabase/capture, non genera ciphertext, non scrive dati, non attiva la sincronizzazione.

Con chiave già sbloccata la riusa solo per la lettura. Se bloccata, chiede la chiave in un campo locale temporaneo: la importa, svuota il campo e verifica senza salvarla o attivare tick. La copia cifrata è decifrata sul dispositivo. Durante il controllo il flag transportBusy impedisce il polling concorrente. La lettura remota accetta una chiave candidata locale alla chiamata; il comportamento ordinario resta identico col parametro predefinito.

Test sui sorgenti clinici nativi con dati sintetici: due percorsi IndexedDB e fallback, ricevente mobile, confronto dei conteggi, assenza di valori sensibili nel riepilogo, nessuna richiesta di scrittura cloud, controllo locale invariato e diagnosi da sessione bloccata che resta bloccata senza chiave in sessionStorage. Anche 9 test crypto e 14 backend passati. Nessuna conversione del formato di memorizzazione implementata.

Pubblicazione sull'app attiva rifiutata dal controllo automatico in attesa di approvazione esplicita del proprietario. Il Worker operativo non è stato modificato da questa proposta.
