import { redirect } from 'next/navigation';

export default function HomePage() {
  // Middleware sends signed-in users to their role dashboard and
  // unauthenticated users to /login. This is the safety net.
  redirect('/login');
}