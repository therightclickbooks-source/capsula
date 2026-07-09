# Zenith · Capsula di Recupero Biomuscolare — Fit&Go Pompei

Strumenti digitali per la capsula di recupero biomuscolare del centro **Zenith Fitness Lab / Fit&Go Pompei**.

## Contenuto

| Percorso | Cosa contiene |
|---|---|
| `app/index.html` | **Zenith Copilot** — app per tablet: anagrafica clienti con scheda anamnestica digitale, check-in seduta, micro-questionario, motore dei protocolli (codici Z), setup guidato con schermate annotate, storico sedute e badge fedeltà (Member → Silver → Gold → Platinum → Diamond). |
| `docs/guida-zenith.html` | **Guida operativa per lo staff** — programmi P01–P24, categorie clienti C1–C8, protocolli combinati Z1–Z9, scheda anamnestica stampabile, sicurezza e manutenzione. |

Entrambi i file sono **autonomi** (un solo file HTML, immagini incluse): si aprono in qualsiasi browser, anche senza internet.

## Uso su tablet

1. Copiare `app/index.html` sul tablet (o pubblicarlo su un hosting).
2. Aprirlo con Chrome/Safari e aggiungerlo alla schermata Home per l'uso a tutto schermo.
3. PIN iniziale: `1234` (da cambiare subito nelle Impostazioni).
4. I dati restano **solo sul dispositivo** (localStorage): esportare regolarmente il backup JSON dalle Impostazioni.

## Note

- Ogni seduta assegna 10 punti, che non si azzerano mai. Soglie badge: Silver 130 · Gold 260 · Platinum 390 · Diamond 520 (una seduta a settimana per un anno).
- La capsula è uno strumento di benessere: l'app blocca i clienti non idonei (sezione A dell'anamnesi) e richiede il certificato medico per la sezione B.
