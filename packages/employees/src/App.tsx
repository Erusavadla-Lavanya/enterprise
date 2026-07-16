import './styles.css';

const staff = ['Aarav Sharma', 'Priya Patel', 'Sanjay Kumar'];
export default function App() { return <div><p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-600">Employees remote</p><h2 className="text-3xl font-bold">Employee directory</h2><div className="mt-5 divide-y rounded-lg border">{staff.map((name, index) => <div className="flex items-center justify-between p-4" key={name}><span className="font-medium">{name}</span><span className="text-sm text-slate-500">EMP-00{index + 1}</span></div>)}</div></div>; }
