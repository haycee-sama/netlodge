// app/(admin)/layout.jsx
// Group layout only — mirrors (auth)/layout.jsx's role: gives the admin
// route group a single <main> landmark. The actual sidebar chrome lives in
// AdminLayout, used per-page like LandlordLayout is.

export default function AdminGroupLayout({ children }) {
  return <main>{children}</main>
}