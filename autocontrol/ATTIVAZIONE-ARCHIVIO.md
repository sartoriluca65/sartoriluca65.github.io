# Attivare l’archivio personale AutoControl

## Stato attuale
Il codice dell’app include account, sincronizzazione e copie complete. Le prove di sincronizzazione usano un server simulato. Il progetto Supabase reale non ha ancora restituito la tabella `ac_archives` durante il controllo del 9 ottobre 2026: occorre eseguire lo script e verificare l’accesso. Non cancellare i dati del sito prima del trasferimento confermato o di una copia completa scaricata.

## Operazioni dell’amministratore
1. Apri [SQL Editor del progetto](https://supabase.com/dashboard/project/uphtmvqzlfoftcibbacr/sql/new).
2. Copia tutto il file aggiornato `../AutoControl-admin/archivio-online.sql` ed esegui Run. Deve comparire «Archivio AutoControl pronto». Lo script aggiunge nuove tabelle e uno spazio privato per allegati; non modifica le tabelle dei contatori e non elimina i dati esistenti.
3. In Authentication → URL Configuration, aggiungi `https://sartoriluca65.github.io/autocontrol/` agli indirizzi di reindirizzamento autorizzati, mantenendo anche l’indirizzo del pannello admin.
4. Per gli utenti esterni configura SMTP in Authentication → Email. Il servizio email predefinito di Supabase è limitato agli indirizzi del team: registrazione, conferma e recupero password richiedono un servizio di invio configurato per gli altri utenti. [Documentazione ufficiale SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
5. Mantieni attivi provider Email, registrazioni e conferma email; configura il servizio di invio prima di invitare altri utenti. I contatori amministrativi restano separati dai dati privati degli utenti.

## Trasferire i tuoi dati esistenti
1. Apri AutoControl nello stesso browser dove hai già inserito auto e interventi.
2. Premi «Scarica copia completa» e conserva lo ZIP fuori dal browser. Se manca un originale precedente, usa «Ricollega file originale» nella sezione Documenti e ripeti.
3. Premi «Accedi / registrati». Usa l’account personale creato nel progetto, oppure crea un account e conferma l’email. La password dell’app è quella dell’utente Authentication, distinta dalla password di GitHub e del database.
4. Dopo l’accesso premi «Trasferisci i dati di questo browser» e verifica che l’email indicata sia la tua.
5. Attendi «Tutto salvato online». Messaggi di errore o documenti mancanti richiedono intervento: non indicano un salvataggio completo.
6. Apri l’app in un secondo browser e accedi con lo stesso account. Controlla veicoli, interventi e scarica un allegato prima di cancellare i dati del primo browser.

## Uso da altri browser
Accedi con lo stesso account e premi «Sincronizza» per ricevere gli ultimi aggiornamenti. Ogni salvataggio viene inviato al server; in assenza di rete resta una bozza nello stesso browser e il pannello lo segnala. Chiudere o cancellare i dati del sito prima della conferma può perdere le modifiche non inviate. Due modifiche simultanee alla stessa registrazione richiedono una scelta manuale; registrazioni distinte vengono unite.

La copia ZIP completa permette il ripristino anche senza servizio cloud. Proteggi il file, perché contiene dati e documenti personali. Le versioni precedenti dell’archivio restano nella tabella privata `ac_archive_versions`; il ripristino delle versioni da pannello non è ancora disponibile. Il servizio gratuito Supabase resta soggetto a limiti e disponibilità del progetto: conserva anche copie esterne.
