

## Ristrutturazione Pagina Profilo: Condivisione App + Cambio Password + Tour

### Cosa cambia

1. **Rimuovere "Installa app"** dalla lista profilo (righe 632-649 di ProfiloPage.tsx)

2. **Aggiungere sezione "Condividi Cibarius"** — una card con CTA accattivante che:
   - Mostra il link della PWA (`https://simple-blue-frame.lovable.app`) con anteprima/miniatura del logo Cibarius
   - Pulsante "Copia link"
   - Pulsanti di condivisione diretta: **WhatsApp**, **Telegram**, **Twitter/X**, **Email** e **Web Share API** (nativa su mobile)
   - Usa `navigator.share()` come prima opzione su mobile, con fallback ai singoli link
   - Il messaggio di condivisione sarà tipo: "Prova Cibarius! Gestisci dispensa, pasti e ricette in modo intelligente 🍽️"
   - Design: card con gradiente brand, logo Cibarius, testo invitante

3. **Aggiungere "Modifica password"** — nuovo item nel menu che apre un Dialog con:
   - Campo "Nuova password"
   - Campo "Conferma nuova password" (doppio controllo come registrazione)
   - Validazione inline: minimo 6 caratteri, le due password devono coincidere
   - Usa `supabase.auth.updateUser({ password })` per il cambio
   - Toast di conferma/errore

4. **Il "Rivedi il tour"** resta dove è (righe 689-700), nessuna modifica necessaria

### File modificati

| File | Modifica |
|------|----------|
| `src/pages/ProfiloPage.tsx` | Rimuovere sezione "Installa app", aggiungere sezione condivisione con sharing buttons e card, aggiungere dialog cambio password con doppio controllo |

### Dettagli sharing

```text
Web Share API (mobile nativo)
  ↓ fallback
WhatsApp: https://wa.me/?text=...
Telegram: https://t.me/share/url?url=...&text=...
Twitter: https://twitter.com/intent/tweet?url=...&text=...
Email: mailto:?subject=...&body=...
Copy link: navigator.clipboard.writeText(url)
```

Il link condiviso sarà l'URL pubblicato della PWA. L'OG metadata (miniatura) dipende dal `index.html` che ha già il manifest — gli utenti vedranno il titolo e l'icona di Cibarius quando condividono.

