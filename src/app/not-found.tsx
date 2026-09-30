import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="not-found">
      <span className="eyebrow">ATLAS / 404</span>
      <h1>A different path.</h1>
      <p>This page doesn’t exist.</p>
      <Link href="/" className="button primary">
        Back to overview
      </Link>
    </main>
  );
}
