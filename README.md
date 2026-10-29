# Sito di Luca Sartori (GitHub Pages)

Repository del sito https://sartoriluca65.github.io/, che raccoglie le app web di Luca.

## App pubblicate

| App | Percorso | URL |
|---|---|---|
| Diviso (dividi il conto) | `/index.html`, `diviso.html` | https://sartoriluca65.github.io/ |
| Sito app di Luki (portale) | `luca-apps/` | https://sartoriluca65.github.io/luca-apps/ |
| AutoControl | `autocontrol/` | https://sartoriluca65.github.io/autocontrol/ |
| Rifornio | `rifornio/` | https://sartoriluca65.github.io/rifornio/ |
| Luki Stickers | `stickers/` | https://sartoriluca65.github.io/stickers/ |
| Cassa Agricola Cochi | `cochi/` | https://sartoriluca65.github.io/cochi/ |
| Terapia demo | `terapia-demo/` | https://sartoriluca65.github.io/terapia-demo/ |
| Registro credenziali | `registro-credenziali/` | https://sartoriluca65.github.io/registro-credenziali/ |

`cochi-restauro/` è solo un rimando automatico a `cochi/` per i vecchi segnalibri.

## Servizi e supporto

- `admin/`, `analytics/`: statistiche di utilizzo delle app.
- `gemini-worker/` e `wrangler.toml`: Worker Cloudflare per Gemini (non pubblicato da GitHub Pages).
- `stickers/worker/`: Worker dell'app Stickers.
- `autoquota/`: contiene solo l'icona dell'app.

## Altri repository pubblici dell'account

`Auto-Control`, `Rifornio`, `LukiStickers`, `tefinanza-app`. Alcune app hanno una copia anche in questo repository: prima di cambiare una copia verifica quale è quella attiva.

## Regole di lavoro

- Mai modificare `main` direttamente: usare rami `feat/`, `fix/` o `chore/` e aprire una pull request.
- Le regole complete per gli strumenti di sviluppo sono in `.cursor/rules/lavoro-italiano.mdc`.
- Nessun merge o pubblicazione senza conferma di Luca.
