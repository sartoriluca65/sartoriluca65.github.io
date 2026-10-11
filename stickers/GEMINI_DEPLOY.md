# Attivazione Gemini LucaStickers Web

Il sito GitHub Pages è statico: la chiave GEMINI_API_KEY va impostata come **secret nel Worker** che serve `/api/ai/sticker`, mai in GitHub Pages, HTML o JavaScript.

## Configurazione necessaria (operatore)

1. Distribuire il Worker del file `stickers/worker/index.js` sull'host backend effettivo. Il Worker richiede il binding di asset `__SITE_ASSETS__` già previsto dal progetto: verificare il processo di build/deploy esistente.
2. Impostare nel Worker il secret `GEMINI_API_KEY` con la chiave già creata.
3. Creare un binding Cloudflare **Rate Limiting** chiamato `AI_RATE_LIMITER` e scegliere una soglia prudente. Il Worker blocca le generazioni se il binding non esiste o non funziona.
4. Controllare che l'endpoint usato dal sito GitHub Pages sia quello del Worker distribuito e che gli origin consentiti corrispondano ai domini reali.
5. Provare una generazione su ambiente di test, verificando quota, costi, errori 429 e 503. Monitorare l'uso prima di aprire al pubblico.
6. Dopo il test, approvare e pubblicare le modifiche del ramo `feature/stickers-gemini-server-key`.

**Importante:** CORS e limite per IP non costituiscono autenticazione: l'endpoint resta potenzialmente invocabile da terzi. Per un servizio pubblico a pagamento aggiungere autenticazione, controllo budget e quote per account, o un meccanismo di accesso equivalente, prima del lancio. Non incollare la chiave nei ticket o nel repository.

**Stato:** codice predisposto, non distribuito né testato contro Gemini live.
