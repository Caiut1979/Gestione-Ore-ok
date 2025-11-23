
import React, { useState, useMemo } from 'react';
import { Calendar, Wand2, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { Employee, TimeEntry, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { getDaysInMonth, months, years, isHoliday, formatDateISO, getDayName, generateId, formatHoursDisplay, parseHoursInput } from '../utils';

interface TimesheetViewProps {
  employees: Employee[];
  entries: TimeEntry[];
  setEntries: React.Dispatch<React.SetStateAction<TimeEntry[]>>;
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({ 
  employees, 
  entries, 
  setEntries, 
  leaveRequests,
  setLeaveRequests
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');

  const days = useMemo(() => getDaysInMonth(selectedMonth, selectedYear), [selectedMonth, selectedYear]);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  
  // Helper to find entry
  const getEntryHours = (date: Date, empId: string) => {
    const dateStr = formatDateISO(date);
    const entry = entries.find(e => e.employeeId === empId && e.date === dateStr);
    return entry ? entry.hours : 0;
  };

  const getApprovedLeave = (date: Date, empId: string): LeaveRequest | undefined => {
    const dateStr = formatDateISO(date);
    return leaveRequests.find(req => {
      return req.employeeId === empId && 
             req.status === LeaveStatus.APPROVED &&
             dateStr >= req.startDate && 
             dateStr <= req.endDate;
    });
  };

  const handleHourChange = (date: Date, empId: string, val: string) => {
    const dateStr = formatDateISO(date);
    const numVal = parseHoursInput(val);
    
    setEntries(prev => {
      const existingIndex = prev.findIndex(e => e.employeeId === empId && e.date === dateStr);
      if (existingIndex >= 0) {
        const newEntries = [...prev];
        newEntries[existingIndex] = { ...newEntries[existingIndex], hours: numVal };
        return newEntries;
      } else {
        return [...prev, { id: Math.random().toString(36), employeeId: empId, date: dateStr, hours: numVal }];
      }
    });
  };

  const handleQuickLeave = (date: Date, type: LeaveType) => {
    const dateStr = formatDateISO(date);
    const existing = getApprovedLeave(date, selectedEmployeeId);

    // If clicking the same type on a day with leave, remove it (toggle off)
    if (existing && existing.type === type) {
      setLeaveRequests(prev => prev.filter(r => r.id !== existing.id));
      return;
    }

    // If clicking a different type or new day
    const newRequest: LeaveRequest = {
      id: generateId(),
      employeeId: selectedEmployeeId,
      startDate: dateStr,
      endDate: dateStr,
      type: type,
      status: LeaveStatus.APPROVED,
      note: 'Inserito da Foglio Ore'
    };

    setLeaveRequests(prev => {
      const others = prev.filter(r => r.id !== existing?.id);
      return [...others, newRequest];
    });

    // If it's NOT Permesso, clear hours (Full Absence). 
    // For Permesso, we don't clear, but the UI will now interpret input as PERMIT hours.
    if (type !== LeaveType.PERMESSO) {
      handleHourChange(date, selectedEmployeeId, "");
    }
  };

  const applyPresets = () => {
    if (!selectedEmployee) return;

    const newEntries: TimeEntry[] = [];
    
    days.forEach(day => {
      const dayOfWeek = day.getDay();
      const isHol = isHoliday(day);
      const leave = getApprovedLeave(day, selectedEmployee.id);
      
      // Apply preset if:
      // 1. Not a holiday
      // 2. No leave OR Leave is Permesso
      if (!isHol && (!leave || leave.type === LeaveType.PERMESSO)) {
          const standardHours = selectedEmployee.defaultSchedule[dayOfWeek] || 0;
          if (standardHours > 0) {
             newEntries.push({
               id: Math.random().toString(36),
               employeeId: selectedEmployee.id,
               date: formatDateISO(day),
               hours: standardHours
             });
          }
      }
    });

    setEntries(prev => {
      // Use fixed formatDateISO to reliably filter current month entries
      const startStr = formatDateISO(days[0]);
      const endStr = formatDateISO(days[days.length - 1]);
      
      // Filter out existing entries for this employee in this month range
      const filtered = prev.filter(e => {
        if (e.employeeId === selectedEmployeeId && e.date >= startStr && e.date <= endStr) {
          return false;
        }
        return true;
      });
      return [...filtered, ...newEntries];
    });
  };

  // Totals Calculation
  const totals = useMemo(() => {
     let worked = 0;
     let ferieDays = 0;
     let ferieHours = 0;
     let malattiaDays = 0;
     let malattiaHours = 0;
     let permessoHours = 0;

     if (selectedEmployee) {
       days.forEach(day => {
         const isHol = isHoliday(day);
         const hours = getEntryHours(day, selectedEmployeeId);
         worked += hours;
         
         const leave = getApprovedLeave(day, selectedEmployeeId);
         // For totals calculation, if it's a holiday, we consider scheduled as 0 to avoid inflating permit/sick counts incorrectly on non-working days
         const scheduled = isHol ? 0 : (selectedEmployee.defaultSchedule[day.getDay()] || 0);

         if (leave) {
           if (leave.type === LeaveType.FERIE) {
             ferieDays++;
             ferieHours += scheduled;
           } else if (leave.type === LeaveType.MALATTIA) {
             malattiaDays++;
             malattiaHours += scheduled;
           } else if (leave.type === LeaveType.PERMESSO) {
             // For permesso, it's the difference between schedule and worked
             const diff = Math.max(0, scheduled - hours);
             permessoHours += diff;
           }
         }
       });
     }

     return { worked, ferieDays, ferieHours, malattiaDays, malattiaHours, permessoHours };
  }, [days, entries, leaveRequests, selectedEmployeeId, selectedEmployee]);


  if (employees.length === 0) {
    return <div className="p-8 text-center text-slate-500">Inserisci prima dei dipendenti per gestire le ore.</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Inserimento Ore
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar list of employees */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-fit">
          <h3 className="font-semibold text-slate-700 mb-3">Seleziona Dipendente</h3>
          <div className="space-y-2">
            {employees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedEmployeeId(emp.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex justify-between items-center ${
                  selectedEmployeeId === emp.id 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <span className="font-medium">{emp.name}</span>
                {selectedEmployeeId === emp.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap justify-between items-center gap-3">
             <div className="font-medium text-slate-700">
               Foglio Presenze: <span className="font-bold text-blue-700">{selectedEmployee?.name}</span>
             </div>
             <div className="flex gap-2">
               <button 
                 onClick={applyPresets}
                 className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
               >
                 <Wand2 className="w-4 h-4" />
                 Inserisci ore preimpostate
               </button>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Data</th>
                  <th className="px-6 py-3">Giorno</th>
                  <th className="px-6 py-3 text-center">
                    {/* Column header adapts based on context if needed, but kept general for now */}
                    Ore {leaveRequests.some(r => r.employeeId === selectedEmployeeId && r.status === LeaveStatus.APPROVED && r.type === LeaveType.PERMESSO) ? 'Lavorate / Permesso' : 'Lavorate'}
                  </th>
                  <th className="px-6 py-3 text-center">Azioni Rapide</th>
                  <th className="px-6 py-3">Stato</th>
                </tr>
              </thead>
              <tbody>
                {days.map((date) => {
                  const isHol = isHoliday(date);
                  const dateStr = formatDateISO(date);
                  const leave = getApprovedLeave(date, selectedEmployeeId);
                  
                  const isPermesso = leave?.type === LeaveType.PERMESSO;
                  const scheduled = isHol ? 0 : (selectedEmployee?.defaultSchedule[date.getDay()] || 0);
                  
                  // Hours logic
                  const currentWorked = getEntryHours(date, selectedEmployeeId);
                  
                  // Determine what to display in the input box
                  let displayValue = "";
                  if (isPermesso) {
                    // If Permesso, user wants to see/edit PERMIT hours.
                    // Permit = Schedule - Worked
                    const permitHours = Math.max(0, scheduled - currentWorked);
                    displayValue = formatHoursDisplay(permitHours);
                  } else {
                    // Otherwise, user sees/edits WORKED hours
                    displayValue = formatHoursDisplay(currentWorked);
                  }

                  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    if (isPermesso) {
                       // User enters PERMIT hours
                       const permitInput = parseHoursInput(val);
                       // We calculate WORKED hours to save
                       const newWorked = Math.max(0, scheduled - permitInput);
                       handleHourChange(date, selectedEmployeeId, formatHoursDisplay(newWorked));
                    } else {
                       // User enters WORKED hours
                       handleHourChange(date, selectedEmployeeId, val);
                    }
                  };

                  const handleInputIncrement = (delta: number) => {
                    if (isPermesso) {
                      const currentPermit = parseHoursInput(displayValue);
                      const newPermit = Math.max(0, currentPermit + delta);
                      const newWorked = Math.max(0, scheduled - newPermit);
                      handleHourChange(date, selectedEmployeeId, formatHoursDisplay(newWorked));
                    } else {
                      const currentWork = parseHoursInput(displayValue);
                      const newWork = Math.max(0, currentWork + delta);
                      handleHourChange(date, selectedEmployeeId, formatHoursDisplay(newWork));
                    }
                  };

                  const showInput = !leave || isPermesso;

                  return (
                    <tr 
                      key={dateStr} 
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${isHol ? 'bg-red-50/50' : ''} ${leave && !isPermesso ? 'bg-blue-50/50' : ''} ${isPermesso ? 'bg-orange-50/50' : ''}`}
                    >
                      <td className={`px-6 py-3 font-medium ${isHol ? 'text-red-600' : 'text-slate-900'}`}>
                        {date.getDate()} {months[date.getMonth()]}
                      </td>
                      <td className={`px-6 py-3 ${isHol ? 'text-red-600' : 'text-slate-500'}`}>
                        {getDayName(date)}
                      </td>
                      
                      {/* Input Hours */}
                      <td className="px-6 py-2 text-center">
                        {showInput ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                value={displayValue}
                                onChange={handleInputChange}
                                className={`w-24 pl-2 pr-6 py-1 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                                  isHol && currentWorked > 0 
                                    ? 'border-red-300 bg-red-50 text-red-700 font-bold' 
                                    : isPermesso 
                                      ? 'border-orange-300 bg-orange-50 text-orange-800 font-medium'
                                      : 'border-slate-300'
                                }`}
                                placeholder={isPermesso ? "Ore P." : ""}
                              />
                              <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-300/50">
                                <button 
                                  onClick={() => handleInputIncrement(0.5)}
                                  className="flex-1 px-1 hover:bg-slate-200/50 text-slate-500 rounded-tr"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleInputIncrement(-0.5)}
                                  className="flex-1 px-1 hover:bg-slate-200/50 text-slate-500 rounded-br"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {isPermesso && (
                              <span className="text-[10px] text-orange-600 font-medium">
                                Inserisci ore permesso
                              </span>
                            )}
                          </div>
                        ) : (
                           <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Quick Leave Buttons */}
                      <td className="px-6 py-2">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleQuickLeave(date, LeaveType.FERIE)}
                            className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-all transform hover:scale-110 ${
                              leave?.type === LeaveType.FERIE 
                              ? 'bg-green-700 text-white ring-2 ring-green-300 shadow-md' 
                              : 'bg-green-600 text-white hover:bg-green-700 opacity-80 hover:opacity-100'
                            }`}
                            title="Ferie"
                          >
                            F
                          </button>
                          <button 
                            onClick={() => handleQuickLeave(date, LeaveType.PERMESSO)}
                            className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-all transform hover:scale-110 ${
                              leave?.type === LeaveType.PERMESSO
                              ? 'bg-orange-500 text-slate-900 ring-2 ring-orange-300 shadow-md'
                              : 'bg-orange-400 text-slate-900 hover:bg-orange-500 opacity-80 hover:opacity-100'
                            }`}
                            title="Permesso"
                          >
                            P
                          </button>
                          <button 
                            onClick={() => handleQuickLeave(date, LeaveType.MALATTIA)}
                            className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm transition-all transform hover:scale-110 ${
                              leave?.type === LeaveType.MALATTIA
                              ? 'bg-red-700 text-white ring-2 ring-red-300 shadow-md'
                              : 'bg-red-600 text-white hover:bg-red-700 opacity-80 hover:opacity-100'
                            }`}
                            title="Malattia"
                          >
                            M
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-3 text-xs">
                         {isPermesso ? (
                           <div className="flex flex-col items-start">
                             <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-800 font-bold uppercase tracking-wider w-fit">
                               Permesso
                             </span>
                             <span className="text-slate-500 mt-1 text-[10px]">
                               (Lavorate: {formatHoursDisplay(currentWorked)}h)
                             </span>
                           </div>
                         ) : leave ? (
                           <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold uppercase tracking-wider">
                             {leave.type}
                           </span>
                         ) : isHol ? (
                           <span className="text-red-500 font-medium">Festivo</span>
                         ) : (
                           <span className="text-slate-400">Lavorativo</span>
                         )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              
              {/* Footer Summary */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold text-slate-800">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-right">TOTALI MENSILI:</td>
                  <td className="px-6 py-4 text-center text-blue-700 text-base">
                    {formatHoursDisplay(totals.worked)} ore lavorate
                  </td>
                  <td className="px-6 py-4" colSpan={2}>
                     <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-green-100 text-green-800 p-1.5 rounded text-center">
                          Ferie: {totals.ferieDays}gg ({formatHoursDisplay(totals.ferieHours)}h)
                        </div>
                        <div className="bg-orange-100 text-orange-800 p-1.5 rounded text-center">
                          Permessi: {formatHoursDisplay(totals.permessoHours)}h
                        </div>
                        <div className="bg-red-100 text-red-800 p-1.5 rounded text-center">
                          Malattia: {totals.malattiaDays}gg ({formatHoursDisplay(totals.malattiaHours)}h)
                        </div>
                     </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
