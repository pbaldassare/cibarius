-- Rimuove i dati dimostrativi creati da demo-ristorante.sql.
-- Tocca solo righe marcate [DEMO] del ristorante indicato, piu' tutti i
-- movimenti: il registro e' append-only in produzione, ma su dati demo
-- ripartire da zero e' piu' utile che conservare storia finta.
--
-- Sostituire l'UUID con quello del proprio ristorante prima di eseguire.

begin;

delete from public.inventory_items ii
using public.products p
where p.id = ii.product_id
  and ii.restaurant_id = 'a1244511-0238-400c-b040-aabf26816851'
  and p.name like '[DEMO]%';

delete from public.preparations
where restaurant_id = 'a1244511-0238-400c-b040-aabf26816851'
  and name like '[DEMO]%';

delete from public.inventory_movements
where restaurant_id = 'a1244511-0238-400c-b040-aabf26816851';

delete from public.haccp_documents
where restaurant_id = 'a1244511-0238-400c-b040-aabf26816851'
  and supplier_name like '%[DEMO]%';

-- I prodotti restano orfani dopo la cancellazione dei lotti
delete from public.products where name like '[DEMO]%';

commit;
