// app/(student)/layout.jsx
import Navbar from '../components/Navbar'
import { auth } from '../../lib/auth'
import { getNotificationsByUser, getUnreadNotificationCount } from '../../lib/db/queries'

export default async function StudentLayout({ children }) {
  const session = await auth()
  const isLoggedIn = !!session?.user?.id

  const [notifications, unreadCount] = isLoggedIn
    ? await Promise.all([
        getNotificationsByUser(session.user.id),
        getUnreadNotificationCount(session.user.id),
      ])
    : [[], 0]

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} initialNotifications={notifications} initialUnreadCount={unreadCount} />
      <main>{children}</main>
    </>
  )
}