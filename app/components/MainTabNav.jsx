export default function MainTabNav({ tabItems, activeTab, setActiveTab }) {
  return (
    <nav className="sticky top-0 z-40 -mx-4 border-b bg-zinc-100/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto">
        {tabItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              activeTab === tab.id
                ? "bg-zinc-900 text-white"
                : "border bg-white text-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
