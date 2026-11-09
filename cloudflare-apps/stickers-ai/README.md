# Generazione sticker con Cloudflare

Il servizio privato `luki-stickers-cloudflare-ai` usa FLUX.2 Klein 4B tramite binding AI. Riceve foto e prompt soltanto dal proxy autenticato di Stickers e restituisce `{image,mimeType}`. Nessuna chiave Google viene richiesta o copiata; il servizio Gemini precedente resta invariato.

Le foto vengono elaborate da Cloudflare per generare lo sticker. Il modello è dichiarato Cloudflare-hosted, con zero data retention nella relativa scheda; non si registrano foto, prompt o IP nel codice applicativo. Il risultato può differire da Gemini e va controllato prima del salvataggio.

Quota generale Workers AI: 10.000 neurons/giorno condivisi con gli altri modelli. Non è un servizio illimitato. Tariffe e disponibilità: https://developers.cloudflare.com/workers-ai/platform/pricing/ . Non viene attivato alcun piano a pagamento da questo codice. Modello: https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/ . Termini del modello: https://bfl.ai/legal/terms-of-service .

Test: `node --test cloudflare-apps/stickers-ai/worker.test.mjs`. La suite usa un binding simulato, non consuma inferenze. Verificata separatamente una vera trasformazione di una faccina sintetica blu in sticker 512×512; verificato che un riferimento non decodificabile sia rifiutato dal modello, non ignorato. Il MIME in uscita viene riconosciuto dai byte Base64 (JPEG, PNG o WebP).

Il deploy ripetibile di Stickers pubblica prima questo servizio e poi il frontend. Non si modifica il database, il bucket, l’archivio locale o la chiave di sincronizzazione. Per tornare a Gemini occorre ripristinare il binding `AI_SERVICE` e i testi del pacchetto Cloudflare; il Worker Gemini e il suo secret non vengono modificati.
