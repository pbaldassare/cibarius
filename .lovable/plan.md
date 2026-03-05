

# Fix bottone Profilo ristorante + aggiunta Logout

## Problemi identificati

1. **Profilo non funziona**: Il bottone "Profilo" nella dashboard ristorante naviga a `/profile`, che e' dentro le route `UserLayout` (protette per ruolo `user`). Un `restaurant_owner` non puo' accedervi.
2. **Manca il logout**: Nell'app ristorante non c'e' nessun modo per uscire dall'account.

## Soluzione

### 1. Aggiungere route profilo per ristoratore

Aggiungere una route `/restaurant/profile` dentro il blocco `RestaurantLayout` che renderizza `ProfiloPage` (lo stesso componente, che gia' gestisce ruoli diversi).

**File**: `src/App.tsx` — aggiungere `<Route path="/restaurant/profile" element={<ProfiloPage />} />` dentro il blocco RestaurantLayout (riga 147-154).

### 2. Correggere navigazione bottone Profilo

**File**: `src/pages/restaurant/RestaurantPage.tsx` — cambiare `navigate("/profile")` in `navigate("/restaurant/profile")` (riga 158).

### 3. Aggiungere bottone Logout nella dashboard ristorante

**File**: `src/pages/restaurant/RestaurantPage.tsx` — aggiungere un bottone "Esci" nella barra in alto (accanto a Profilo e Gestione), oppure nella pagina profilo del ristoratore. Approccio: aggiungere nella ProfiloPage il bottone logout (gia' presente per gli utenti), verificando che funzioni anche per `restaurant_owner`.

Verifico se ProfiloPage ha gia' il logout per tutti i ruoli — si', ha il bottone "Esci" (riga 8: `LogOut` importato). Quindi basta che la route funzioni.

## File coinvolti

| File | Modifica |
|------|----------|
| `src/App.tsx` | Aggiungere route `/restaurant/profile` |
| `src/pages/restaurant/RestaurantPage.tsx` | Fix path navigazione profilo |

