import MobileHeader from "@/components/MobileHeader";
import SearchBar from "@/components/SearchBar";
import ProductCard from "@/components/ProductCard";

const products = [
  { name: "Muesli Bio", brand: "Jordans", score: 88, emoji: "🥣" },
  { name: "Biscotti Digestive", brand: "McVitie's", score: 42, emoji: "🍪" },
  { name: "Riso Basmati", brand: "Scotti", score: 91, emoji: "🍚" },
  { name: "Olio Extra Vergine", brand: "De Cecco", score: 95, emoji: "🫒" },
  { name: "Coca-Cola", brand: "Coca-Cola", score: 12, emoji: "🥤" },
  { name: "Pane Integrale", brand: "Mulino Bianco", score: 78, emoji: "🍞" },
];

const ProdottiPage = () => {
  return (
    <div>
      <MobileHeader title="Prodotti" />
      <main className="space-y-4 px-4 py-5">
        <SearchBar placeholder="Cerca nei tuoi prodotti..." />
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard key={p.name} {...p} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProdottiPage;
