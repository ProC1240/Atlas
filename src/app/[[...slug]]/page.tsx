import { notFound } from 'next/navigation';
import { AppShell, type Section } from '@/components/app-shell';
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const section = slug?.[0] ?? 'overview';
  if (
    (slug?.length ?? 0) > 1 ||
    !['overview', 'anatomy', 'progress', 'avatar', 'me', 'bond'].includes(section)
  )
    notFound();
  return <AppShell section={section as Section} />;
}
