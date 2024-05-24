import TopButton from '@/components/TopButton';

export default async function Footer() {
  return <footer className="fixed h-fit bottom-16">
    <div className="fixed right-16">
      <TopButton />
    </div>
  </footer>;
}
