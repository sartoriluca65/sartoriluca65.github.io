# Luki STICKERS

Versione pubblica di Luki STICKERS per GitHub Pages: https://sartoriluca65.github.io/stickers/

Include l'applicazione web, le risorse statiche, la conversione HEIC e il codice Worker usato per la generazione immagini. Su GitHub Pages vengono eseguite le funzioni statiche e locali. La generazione Gemini inoltra le richieste al Worker del sito principale.

I pacchetti, gli sticker e le preferenze restano salvati nel browser dell'utente. Le immagini personali non vengono caricate in questo repository. Il tracker invia solo un identificativo casuale del browser e il segnale di presenza al sistema contatori esistente.

La connessione diretta agli abbonamenti consumer di ChatGPT, Copilot o Gemini non è implementata: questi abbonamenti non autorizzano automaticamente un'app esterna a usare i rispettivi modelli. Il flusso AI disponibile richiede una credenziale API Gemini. L'app può comunque usare gli effetti locali senza collegare un servizio AI.

## Convertitore foto iPhone

La libreria HEIC completa e la sua licenza sono in `vendor/heic2any/`. Sia GitHub Pages sia il generatore Worker usano `/vendor/heic2any/heic2any.min.js`. Non sostituire la libreria con estratti troncati. Il controllo di struttura ne verifica la sintassi.
