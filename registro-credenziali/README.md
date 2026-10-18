# Registro Credenziali — Demo

Creato da Luca Sartori.

Apri `index.html` oppure la pagina pubblicata su GitHub Pages. La cartella contiene esclusivamente codice e sei record di fantasia, senza dati o collegamenti al registro privato.

## Uso
- Aggiungi, modifica o elimina una voce di prova; attendi la conferma del salvataggio automatico.
- Usa **Elenco completo** per la tabella unica senza paginazione; la ricerca filtra anche questa vista.
- Le password sono nascoste; puoi mostrarle esplicitamente.
- **Stampa** e **Salva PDF** consentono di scegliere registro intero o risultati della ricerca. Per il PDF premi Crea PDF e poi Scarica PDF: il file viene generato direttamente nel browser. Per la stampa usa la pagina dedicata oppure apri il PDF nel visualizzatore.
- **Guida all’uso** apre le istruzioni; `GUIDA_USO.html` è consultabile e scaricabile dalla demo.
- **Esporta copia** scarica un JSON con le password in chiaro.
- **Ripristina esempi** cancella le prove e ripristina i sei account inventati.

## Salvataggio demo
Le prove vengono salvate solo nel localStorage del browser. Non c’è sincronizzazione tra dispositivi. La cancellazione dei dati del browser elimina le prove. Non inserire credenziali reali in questa dimostrazione.

## Proprietà
©2026 Luca Sartori. Tutti i diritti riservati. Vietate copia, riproduzione, modifica e distribuzione senza autorizzazione scritta. Consultare LICENSE.txt. La pubblicazione del codice non concede una licenza libera e non impedisce tecnicamente di copiarlo.


## PIN e parola segreta
Al primo accesso scegli PIN (6 cifre) e parola/frase segreta (12-128 caratteri). PIN dimenticato consente di reimpostare il PIN con la parola segreta senza cancellare le voci. La frase ignora maiuscole/minuscole e normalizza gli spazi ripetuti. Entrambi si possono modificare dall’app. Non servono email o servizi esterni.

La demo cifra i dati nel localStorage con una chiave casuale AES-GCM, protetta separatamente dal PIN e dalla parola segreta mediante PBKDF2. Le prove precedenti vengono migrate quando completi la configurazione, senza essere inviate a server. Non è un servizio di account online: niente sincronizzazione e solo dati inventati. Un PIN corto e un blocco tentativi locale non equivalgono a un’autenticazione server. Cancella i dati del browser solo se accetti di perdere la demo locale; dimenticare entrambi i segreti impedisce il recupero automatico dei dati cifrati.
