# netlodge

A modern web application built with **Next.js** and **React**, deployed on Vercel for seamless hosting and scalability.

**Live Demo:** [https://netlodge.vercel.app](https://netlodge.vercel.app)

---

## 📋 Overview

**netlodge** is a Next.js-based web application that leverages modern web development technologies to deliver a fast, responsive, and user-friendly experience. The project uses Tailwind CSS for styling, Lucide React for icons, and Next.js 16.2.1 for server-side rendering and static generation.

---

## ✨ Key Features

- ⚡ **Next.js 16.2.1** - Latest version of the React framework with built-in optimization
- 🎨 **Tailwind CSS 3.4.1** - Utility-first CSS framework for rapid UI development
- 🔤 **Lucide React 1.7.0** - Beautiful, consistent icon library
- 📱 **Fully Responsive** - Mobile-first design approach
- 🚀 **Vercel Deployment** - Optimized for performance and scalability
- ✅ **ESLint** - Code quality and consistency checks
- 📦 **PostCSS** - CSS processing and optimization

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 16.2.1 | React framework for production |
| **React** | 18.x | UI library |
| **React DOM** | 18.x | React rendering engine |
| **Tailwind CSS** | 3.4.1 | Styling framework |
| **Lucide React** | 1.7.0 | Icon components |
| **PostCSS** | 8.x | CSS processing |
| **ESLint** | 10.1.0 | Code linting |

---

## 📁 Project Structure

```
netlodge/
├── app/                      # Next.js App Router directory
├── public/                   # Static assets
├── middleware.js             # Next.js middleware configuration
├── package.json              # Project dependencies
├── package-lock.json         # Locked dependency versions
├── jsconfig.json             # JavaScript configuration with path aliases
├── tailwind.config.js        # Tailwind CSS configuration
├── next.config.mjs           # Next.js configuration
├── postcss.config.mjs        # PostCSS configuration
├── .eslintrc.json            # ESLint configuration
├── .gitignore                # Git ignore rules
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm, yarn, pnpm, or bun

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/haycee-sama/netlodge.git
   cd netlodge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   # or
   bun install
   ```

### Development

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to see the application.

The page auto-updates as you edit files in the `app/` directory.

### Production Build

5. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (hot reload enabled) |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint for code quality checks |

---

## ⚙️ Configuration Files

### `jsconfig.json`
Configures JavaScript path aliases for cleaner imports:
- `@/*` - Maps to root directory for convenient imports

### `tailwind.config.js`
Tailwind CSS configuration with support for:
- Page and component files (`.js`, `.ts`, `.jsx`, `.tsx`, `.mdx`)
- Custom gradient utilities

### `middleware.js`
Next.js middleware that:
- Passes the current pathname as a header (`x-pathname`)
- Enables dynamic navbar and footer visibility based on current route

### `next.config.mjs`
Next.js configuration for optimal performance and features.

### `postcss.config.mjs`
PostCSS pipeline including Tailwind CSS processing.

---

## 🎨 Styling

- **Framework:** Tailwind CSS 3.4.1
- **Approach:** Utility-first CSS for rapid development
- **Customization:** See `tailwind.config.js` for theme extensions
- **Features:** Responsive design, custom gradients, and more

---

## 🚢 Deployment

### Vercel (Recommended)

The easiest way to deploy netlodge is using the **Vercel Platform**:

1. Push your code to GitHub
2. Visit [https://vercel.com/new](https://vercel.com/new)
3. Import the netlodge repository
4. Vercel auto-detects Next.js and applies optimal settings
5. Deploy with a single click

Learn more: [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)

---

## 📚 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs) - Official Next.js features and API
- [Next.js Tutorial](https://nextjs.org/learn) - Interactive learning guide
- [Next.js GitHub Repository](https://github.com/vercel/next.js/) - Source code and community
- [Tailwind CSS Docs](https://tailwindcss.com/docs) - Styling framework reference
- [React Documentation](https://react.dev) - React fundamentals and best practices

---

## 📄 License

This project is provided as-is for personal and commercial use.

---

## 👤 Author

**haycee-sama**
- GitHub: [@haycee-sama](https://github.com/haycee-sama)

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs and issues
- Suggest new features
- Submit pull requests
- Improve documentation

---

## 📞 Support

For questions or issues, please open a GitHub issue or check the official [Next.js documentation](https://nextjs.org/docs).

---

**Last Updated:** June 2026
