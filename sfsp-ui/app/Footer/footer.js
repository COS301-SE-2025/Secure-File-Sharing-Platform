const footerLinks = [
  {
    title: "Secure Share",
    links: [
      { name: "Website", href: "#" },
    ],
  },
  // {
  //   title: "Features",
  //   links: [
  //     { name: "Send files", href: "#" },
  //     { name: "Send videos", href: "#" },
  //     { name: "Cloud storage", href: "#" },
  //     { name: "Secure file transfer", href: "#" },
  //   ],
  // },
  {
    title: "Support",
    links: [
      { name: "Help center", href: "/Support/helpCenter" },
      { name: "Contact us", href: "/Support/contactPage" },
      { name: "FAQ", href: "/Support/FAQs" },
      { name: "Security", href: "/Support/Security" },
    ],
  },
  
  {
    title: "Company",
    links: [{ name: "About us", href: "/Company" }],
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
                <li key={link.name}>
                    {/* {link} */}
                  <a href={link.href} className="hover:underline">
                    {link.name}
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
