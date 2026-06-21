export default function TabSwitcher({ tabs, active, onChange }) {
  return (
    <div className="flex p-1 mx-3 my-2 rounded-xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
          style={active === tab.id
            ? { background: 'linear-gradient(135deg, #FF6B9D, #FF8E53)', color: '#fff' }
            : { color: '#8B8B9E' }
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
