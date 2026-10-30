# Lukiapp — applicazioni pubbliche

Questo repository contiene la versione pubblicata da GitHub Pages. Gli archivi personali dei browser non devono essere aggiunti al sorgente.

| Percorso | Applicazione |
| --- | --- |
| `/` e `/diviso.html` | Diviso |
| `/luca-apps/` | Catalogo delle app |
| `/autocontrol/` | AutoControl |
| `/cochi/` | Cassa Agricola Cochi |
| `/registro-credenziali/` | Ricorda, demo locale |
| `/rifornio/` | PienoSmart / Rifornio |
| `/stickers/` | Luki Stickers web |
| `/terapia-demo/` | Terapia e cartella clinica |
| `/admin/` | Interfaccia statistiche |

## Sorgenti e versioni precedenti

Le versioni attive delle app elencate sono nelle cartelle di questo repository. I repository Rifornio e LukiStickers conservano le vecchie versioni e reindirizzano qui; non rimuovere le pagine archivio, necessarie per esportare i dati del vecchio indirizzo. Auto-Control è un repository di rimando, non una seconda copia dell’app.

`autoquota/` contiene soltanto un’icona condivisa: non è una seconda applicazione. AutoQuota / Valutatore auto richiede Streamlit e un hosting Python separato.

Il catalogo `luca-apps/` è un’esportazione statica con risorse compilate. Il repository non contiene il progetto sorgente originale né uno script per ricompilarlo: conservare le risorse distribuite finché non si recupera quel progetto.

TeFinanza pubblica è nel repository separato `tefinanza-app`: la radice contiene l’unica copia pubblicata; `dist/` conserva soltanto un rimando per i vecchi indirizzi. La versione privata `tefinanza` ha una configurazione di hosting distinta.

Il catalogo `/luca-apps/` apre direttamente le otto app pubbliche disponibili. AutoValuta resta su richiesta, perché non è stato verificato un indirizzo di esecuzione Streamlit. Il codice iOS di Luki Stickers è un progetto nativo distinto dalla versione web.

## Verifica

Node.js 22 o successivo:

- `node scripts/check-structure.mjs`
- `node terapia-demo/scripts/check-workflows.mjs`
- `node terapia-demo/scripts/check-chart.mjs`

Il workflow esegue questi controlli a ogni aggiornamento. Verificano sintassi, risorse locali e regressioni su dati sintetici; non verificano consegna email, credenziali o stato dei servizi esterni.

GitHub conserva il codice, non sincronizza automaticamente dati e allegati tra dispositivi. Usare le funzioni di backup e ripristino delle singole app. Non pubblicare password, documenti o dati personali nel repository.
