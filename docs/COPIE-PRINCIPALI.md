# Copie principali e pulizia dei repository

Verifica del 15 novembre 2026. Questa mappa identifica dove modificare ogni app.
La cronologia Git conserva i file rimossi; non sono stati eliminati repository,
backup personali, database, bucket, chiavi o archivi dei browser.

| App | Sorgenti da aggiornare | Altre copie e loro funzione |
| --- | --- | --- |
| TeFinanza | `sartoriluca65/tefinanza-app`, radice | `dist/index.html` conserva il vecchio collegamento; il toolbox backup ha una copia controllata del validatore per funzionare autonomamente |
| Terapia / Cartella clinica | `sartoriluca65.github.io/terapia-demo/` | Le due vecchie anteprime rimandano all'app corrente; i frammenti PDF sono quelli del manifest attuale |
| AutoControl | `sartoriluca65.github.io/autocontrol/` | Il repository archiviato `Auto-Control` è un rimando documentale |
| PienoSmart | `sartoriluca65.github.io/rifornio/` | Il repository archiviato `Rifornio` conserva il recupero dello storico; `pienosmart.html` è un rimando alla versione corrente |
| Sticker web | `sartoriluca65.github.io/stickers/` | `LukiStickers/archivio.html` serve a esportare dati del vecchio indirizzo; non è una copia eliminabile senza migrazione |
| Sticker iOS | `sartoriluca65/luki-Stickers-ios` | Progetto nativo distinto; non è un duplicato della web app |
| Ricorda | `sartoriluca65/registro-credenziali` | La cartella omonima del portale contiene solo guida, licenza e documentazione precedenti, non una seconda app |
| Cochi | `sartoriluca65.github.io/cochi/` | Il repository privato `cassa-agricola-cochi` conserva una versione precedente; non eliminare eventuali archivi iniziali |
| Diviso | `sartoriluca65/Diviso` | La versione storica alla radice del portale rimane distinta: può contenere dati locali sotto chiavi/origini precedenti |
| Dispensa | `sartoriluca65/Dispensa`, cartella `dist/` | Qui `dist/` è il sorgente statico effettivo, non un residuo da cancellare |
| AiFusion | `sartoriluca65/AiFusion` | `src/` è il Worker, `public/` l'interfaccia: sono componenti complementari |
| AutoQuota | `sartoriluca65/Valutatore-auto-` | Streamlit e adattamento Cloudflare sono due runtime dello stesso motore, non copie intercambiabili |

## Elementi mantenuti intenzionalmente

- Configurazioni e script Cloudflare, D1 e R2: necessari a pubblicare e sincronizzare.
- Pagina e file di recupero dei vecchi indirizzi: necessari a esportare i dati locali.
- Icone, font e risorse compilate del catalogo: i riferimenti sono ancora presenti.
- Regole dei diversi strumenti e licenze: non sono dati applicativi duplicati.
- Frammenti font e script di ricostruzione PDF: servono a rendere il motore ricompilabile.
- Codice e test del trasporto ripetuti in progetti autonomi: evitano dipendenze fra deploy distinti.

## Pulizia applicata

- Rimossi soltanto `terapia-demo/assets/report-00.gzpart` fino a `report-05.gzpart`,
  non richiamati dal loader o dal manifest corrente: 1.464.860 byte.
- Sostituite le due anteprime cliniche e la pagina PienoSmart superata con rimandi
  alle rispettive versioni correnti, conservando query string e frammento URL.
- La build PDF rimuove solo i propri frammenti generati superati dopo aver scritto
  il nuovo manifest e loader, così le copie obsolete non si accumulano di nuovo.
- Nel repository AiFusion viene rimossa la copia statica della pagina login,
  perché gli stessi indirizzi sono gestiti dal Worker prima degli asset.
  Il controllo TypeScript usa dipendenze bloccate e i tipi Cloudflare mancanti.

Per una rimozione successiva di copie storiche va prima verificata la possibilità
di esportare e ripristinare i relativi dati. Un indirizzo cambiato non trasferisce
automaticamente l'archivio del browser.
