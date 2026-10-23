# Terapia e Cartella Clinica · Lukiapp

Versione pubblica: https://sartoriluca65.github.io/terapia-demo/

Alla prima apertura la cartella è vuota. Ogni persona inserisce e conserva i propri dati nel proprio browser; non viene usato l’archivio privato ChatGPT dell’autore.

- **Archivio .tlbackup**: copia completa dei dati e degli allegati, scritta e verificata a blocchi. Formato consigliato per la minore dimensione.
- **JSON completo .json**: dati clinici leggibili e allegati incorporati in blocchi Base64 con controlli di integrità. È autonomo e ripristinabile, ma più grande dell’archivio.
- **Ripristina**: accetta i due formati completi, i precedenti ZIP e i vecchi JSON. I vecchi JSON contengono soltanto riferimenti agli allegati già presenti e non diventano retroattivamente copie complete.

L’esportazione JSON seleziona i dati clinici ed esclude campi di autenticazione, credenziali e segreti. I test di esportazione/ripristino usano esclusivamente record e allegati sintetici, senza scritture sui dati reali.

Creata da Lukiapp · Contatto: lukiapp.info@gmail.com

© 2026 Luca Sartori. Tutti i diritti riservati. Riproduzione non autorizzata vietata. Il marchio © indica la titolarità e non è una protezione tecnica contro la copia.
