import Image from "next/image";
import HomeRotator from "./home_features";
import Footer from "./Footer/footer";

export default function Home() {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen font-sans text-gray-800  dark:text-white dark:bg-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-4 flex justify-between items-center bg-neutral-200/95 shadow-md dark:bg-gray-800/95">
        <div className="flex items-center gap-3">

          {/* Light mode logo */}
          <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={28} height={28} className="block dark:hidden"
          />

          {/* Dark mode logo */}
          <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={28} height={28} className="hidden dark:block"
          />
          <a href="/">
              <span className="text-xl font-bold tracking-tight">SecureShare</span>
          </a>
        </div>
        <ul className="flex gap-6 text-sm sm:text-base">
          <li><a href="#main" className="hover:underline">Home</a></li>
          <li><a href="#features" className="hover:underline">Features</a></li>
          {/* <li><a href="#" className="hover:underline">Contact</a></li> */}
        </ul>

        {/* Log In*/}
        <a
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          Log In
        </a>
      </nav>

      {/* Main Content */}
      {/* <main className="px-8 py-12 sm:px-20 flex flex-col sm:flex-row items-center justify-between gap-12 text-left"> */}
      <section id="main" className="min-h-[calc(100vh-64px)] pt-24 px-8 py-12 sm:px-20 flex flex-col sm:flex-row items-center justify-between gap-12 text-left">
        {/* Left */}
        <div className="flex-1 max-w-xl space-y-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Secure File Sharing with <span className="text-blue-600 dark:text-blue-400">End-to-End Encryption</span>
          </h1>
          <p className="text-lg">
            A privacy-first cloud platform to share files securely—ensuring only you and your receiver can decrypt the content. No third-party access. Ever.
          </p>
          <div className="flex gap-4">
            <a
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium"
            >
              Log In
            </a>
          </div>
        </div>

        {/* Right */}
        <div className="flex-1 flex justify-center">
          <Image
            src="/img/cloud-computing-security-abstract-concept-illustration.png"
            alt="Secure File Sharing Illustration"
            width={700}
            height={500}
            className="max-w-full h-auto"
          />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="grid grid-rows-[auto_1fr_auto]  font-sans text-gray-800 bg-gray-300 dark:text-white dark:bg-gray-300">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center pt-8 text-gray-800">
          SecureShare supports you and your care to privacy
        </h2>
        <HomeRotator />
      </section>

      {/* Get Sharing */}
      <div className="text-center py-10 bg-gray-50 dark:bg-gray-900">
        <h3 className="text-2xl font-semibold mb-4">Get Sharing</h3>
        <a
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
        >
          Log in
        </a>
      </div>

      {/* Footer */}
      {/* <footer className="p-6 text-center text-sm bg-neutral-700 text-white dark:bg-gray-800 dark:text-gray-400">
        &copy; 2025 SecureShare — Built with privacy in mind.
      </footer> */}

      <Footer />
    </div>
  );
}