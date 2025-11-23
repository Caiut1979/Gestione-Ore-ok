import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarRange, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Palmtree,
  Building2
} from 'lucide-react';
import { CompanyInfo, Employee, TimeEntry, ViewState, LeaveRequest } from './types';
import { CompanySettings } from './components/CompanySettings';
import { EmployeesView } from './components/EmployeesView';
import { TimesheetView } from './components/TimesheetView';
import { ReportsView } from './components/ReportsView';
import { LeaveRequestsView } from './components/LeaveRequestsView';

const App: React.FC = () => {
  // State Management
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => {
    const saved = localStorage.getItem('companyInfo');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      name: '', 
      address: '', 
      vat: '', 
      email: '', 
      accountantEmail: '',
      workingDays: [1, 2, 3, 4, 5], // Default Mon-Fri
      ...parsed
    };
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('employees');
    return saved ? JSON.parse(saved) : [];
  });

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem('timeEntries');
    return saved ? JSON.parse(saved) : [];
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('leaveRequests');
    return saved ? JSON.parse(saved) : [];
  });

  // Persistence
  useEffect(() => { localStorage.setItem('companyInfo', JSON.stringify(companyInfo)); }, [companyInfo]);
  useEffect(() => { localStorage.setItem('employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('timeEntries', JSON.stringify(timeEntries)); }, [timeEntries]);
  useEffect(() => { localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests)); }, [leaveRequests]);

  // Navigation Items
  const navItems = [
    { id: ViewState.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewState.SETTINGS, label: 'Impostazioni Azienda', icon: Settings },
    { id: ViewState.LEAVE, label: 'Ferie & Permessi', icon: Palmtree },
    { id: ViewState.TIMESHEET, label: 'Inserisci Ore', icon: CalendarRange },
    { id: ViewState.REPORTS, label: 'Report', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (view) {
      case ViewState.SETTINGS:
        return (
          <div className="p-6 max-w-6xl mx-auto space-y-8">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-blue-600" />
              Impostazioni Azienda
            </h2>
            
            <section>
               <CompanySettings info={companyInfo} setInfo={setCompanyInfo} />
            </section>

            <hr className="border-slate-200" />

            <section>
               <EmployeesView 
                 employees={employees} 
                 setEmployees={setEmployees} 
                 companyWorkingDays={companyInfo.workingDays || [1, 2, 3, 4, 5]} 
               />
            </section>
          </div>
        );
      case ViewState.EMPLOYEES:
        // Fallback handled via Settings now
        return <div className="p-6">
          <EmployeesView 
            employees={employees} 
            setEmployees={setEmployees} 
            companyWorkingDays={companyInfo.workingDays || [1, 2, 3, 4, 5]}
          />
        </div>;
      case ViewState.TIMESHEET:
        return <TimesheetView 
          employees={employees} 
          entries={timeEntries} 
          setEntries={setTimeEntries} 
          leaveRequests={leaveRequests} 
          setLeaveRequests={setLeaveRequests}
        />;
      case ViewState.LEAVE:
        return <LeaveRequestsView employees={employees} requests={leaveRequests} setRequests={setLeaveRequests} />;
      case ViewState.REPORTS:
        return <ReportsView employees={employees} entries={timeEntries} company={companyInfo} leaveRequests={leaveRequests} />;
      case ViewState.DASHBOARD:
      default:
        return (
          <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Benvenuto, {companyInfo.name || 'Amministratore'}</h1>
            <p className="text-slate-500 mb-8">Pannello di controllo gestione ore dipendenti.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button onClick={() => setView(ViewState.TIMESHEET)} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left group">
                <CalendarRange className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg">Inserisci Ore</h3>
                <p className="text-blue-100 text-sm">Compila i fogli presenza mensili.</p>
              </button>
              
              <button onClick={() => setView(ViewState.LEAVE)} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group">
                <Palmtree className="w-8 h-8 mb-4 text-green-600 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-slate-800">Ferie e Permessi</h3>
                <p className="text-slate-500 text-sm">Gestisci le assenze.</p>
              </button>

              <button onClick={() => setView(ViewState.REPORTS)} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all text-left group">
                <BarChart3 className="w-8 h-8 mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg text-slate-800">Visualizza Report</h3>
                <p className="text-slate-500 text-sm">Calcola straordinari, PDF ed email.</p>
              </button>
            </div>

            <div className="mt-12 bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
              <h4 className="font-semibold text-indigo-900 mb-2">Stato Attuale</h4>
              <ul className="space-y-2 text-sm text-indigo-800">
                <li>• {employees.length} dipendenti registrati</li>
                <li>• {leaveRequests.filter(r => r.status === 'In Attesa').length} richieste ferie in attesa</li>
                <li>• {companyInfo.accountantEmail ? 'Email commercialista configurata' : 'Email commercialista mancante'}</li>
              </ul>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Gestione Ore
            </h1>
            <p className="text-xs text-slate-400 mt-1">v1.2.0</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl transition-colors text-left ${
                  view === item.id 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className={`w-5 h-5 min-w-[1.25rem] ${view === item.id ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="leading-tight text-left">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
             <div className="flex items-center gap-3 px-4 py-3">
               <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                 {companyInfo.name ? companyInfo.name.substring(0,2).toUpperCase() : 'AZ'}
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-medium text-slate-700 truncate">{companyInfo.name || 'La Tua Azienda'}</p>
                 <p className="text-xs text-slate-400 truncate">Amministratore</p>
               </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar (Mobile) */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <span className="font-bold text-slate-800">Gestione Ore</span>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;