import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('rto_session_token')?.value;

  if (token) {
    if (token.includes('ADMIN')) {
      redirect('/admin/dashboard');
    } else {
      redirect('/van/dashboard');
    }
  }

  redirect('/login');
}
