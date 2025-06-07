const footerLinks = [
  {
    title: "Secure Share",
    links: [
      "Website",
      "Features"
    ],
  },
  {
    title: "Features",
    links: [
      "Send files",
      "Send videos",
      "Cloud storage",
      "Secure file transfer"
    ],
  },
  {
    title: "Support",
    links: [
      "Help center",
      "Contact us"
    ],
  },
  
  {
    title: "Company",
    links: ["About us"],
  },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-white dark:bg-gray-800 dark:text-gray-400">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 text-sm">
        {footerLinks.map((group) => (
          <div key={group.title}>
            <h3 className="font-semibold mb-3">{group.title}</h3>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link}>
                  <a href="#" className="hover:underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="p-6 text-center text-xs border-t border-gray-700">
        &copy; 2025 SecureShare — Built with privacy in mind.
      </div>
    </footer>
  );
}
