export default function ContactPage() {
  const contactMethods = [
    {
      name: 'WhatsApp',
      value: '+91 790 405 0237',
      link: 'https://wa.me/917904050237',
      icon: '💬',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      desc: 'Primary mode for queries & orders'
    },
    {
      name: 'Instagram',
      value: '@rosary_plant_house',
      link: 'https://instagram.com/rosary_plant_house?igshid=ksp4zz9pj5lu',
      icon: '📸',
      color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
      desc: 'Updates and customer reviews'
    },
    {
      name: 'Facebook',
      value: 'Rosary Plant House',
      link: 'https://facebook.com/rosaryplanthouse',
      icon: '👥',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      desc: 'Reviews and community'
    },
    {
      name: 'YouTube',
      value: 'Channel',
      link: 'https://youtube.com/channel/UCUYHYgkyhoVXy5_h8a5ly6w',
      icon: '▶️',
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      desc: 'Videos and shorts'
    }
  ];

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-8 pb-20">
      <div className="text-center">
        <span className="text-4xl">📬</span>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-3">Contact Us</h1>
        <p className="text-[var(--text-secondary)] mt-1">We'd love to hear from you!</p>
      </div>

      {/* Primary Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contactMethods.map((method) => (
          <a
            key={method.name}
            href={method.link}
            target="_blank"
            rel="noopener noreferrer"
            className="card p-4 flex items-center gap-4 hover:scale-[1.02] transition-transform"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${method.color}`}>
              {method.icon}
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-primary)]">{method.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-1">{method.desc}</p>
              <p className="text-sm font-medium text-[var(--color-forest)] dark:text-[var(--text-primary)]">{method.value}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Location */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <span className="text-xl">📍</span> Our Location
        </h2>
        <div className="space-y-2 text-[var(--text-secondary)] text-sm leading-relaxed">
          <p>
            We're located at the queen of hills <strong>Nilgiris, Coonoor</strong>. 
            Very near the famous tourist spot Simspark. Just 5 minutes drive from there.
          </p>
          <p>
            We're exactly located at brooklands at a pleasant on the way from simspark to Lambsrock.
          </p>
          <div className="mt-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
            <h3 className="font-semibold text-[var(--text-primary)] mb-2">Address</h3>
            <p>Rosary Plant House</p>
            <p>Samayapuram Alwarpet Coonoor</p>
            <p>The Nilgiris</p>
          </div>
        </div>
      </div>

       {/* Business Hours & Email */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">🕒 Business Hours</h3>
          <p className="text-[var(--text-secondary)]">Mon - Fri, 10:00 - 5:00</p>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-[var(--text-primary)] mb-2">📧 Email</h3>
          <a href="mailto:rosaryplanthouse@gmail.com" className="text-[var(--color-forest)] hover:underline block">rosaryplanthouse@gmail.com</a>
          <a href="mailto:sshibinthomass@gmail.com" className="text-[var(--color-forest)] hover:underline block">sshibinthomass@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
