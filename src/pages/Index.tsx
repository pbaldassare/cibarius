import MobileHeader from "@/components/MobileHeader";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";

const recentProducts = [
  { name: "Nutella", brand: "Ferrero", score: 18, emoji: "🍫" },
  { name: "Pasta Barilla", brand: "Barilla", score: 72, emoji: "🍝" },
  { name: "Yogurt Greco", brand: "Fage", score: 85, emoji: "🥛" },
  { name: "Patatine Classiche", brand: "San Carlo", score: 32, emoji: "🥔" },
  { name: "Succo d'arancia", brand: "Santal", score: 45, emoji: "🍊" },
];

const Index = () => {
  return (
    <div>
      <MobileHeader title="Home" />
      <main className="space-y-6 px-4 py-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ciao! 👋</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Scansiona un prodotto o cerca tra i tuoi preferiti
          </p>
        </div>

        <SearchBar />

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Prodotti recenti
          </h3>
          <div className="space-y-3">
            {recentProducts.map((p) => (
              <ProductCard key={p.name} {...p} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
