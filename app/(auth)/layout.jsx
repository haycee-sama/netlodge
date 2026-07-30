// app/(auth)/layout.jsx
// No Navbar/Footer — auth pages use their own AuthLayout component
// for branding. This group layout exists mainly for folder organization
// and to give the auth flow a single <main> landmark.

export default function AuthGroupLayout({ children }) {
  return <main>{children}</main>
}
