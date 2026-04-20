import SearchForm from '@/components/SearchForm';
import Cart from '@/components/Cart';

export default function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SearchForm />
      </div>
      <aside className="lg:col-span-1">
        <Cart />
      </aside>
    </div>
  );
}
