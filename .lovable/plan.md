

## Fix: Redirect automatico dopo la registrazione

### Problema
Dopo la registrazione, il toast "Registrazione completata!" appare ma l'utente resta sulla pagina di signup. Manca una chiamata `navigate()` dopo il signup riuscito.

### Soluzione
In `src/pages/auth/SignupPage.tsx`, dopo il toast di successo (riga 163), aggiungere una navigazione verso la home page appropriata per il ruolo dell'utente. Dato che il signup crea una sessione immediatamente, il `ProtectedRoute` e `Index.tsx` gestiranno il redirect in base al ruolo.

| File | Modifica |
|------|----------|
| `src/pages/auth/SignupPage.tsx` | Dopo il toast di successo, aggiungere `navigate("/", { replace: true })` per portare l'utente in app. Importare `useNavigate` se non già presente. |

La pagina Index si occupa già di redirigere verso la dashboard corretta in base al ruolo (admin → /admin, restaurant_owner → /restaurant, ecc.).

