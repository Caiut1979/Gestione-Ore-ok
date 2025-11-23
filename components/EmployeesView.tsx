import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Save, User, Clock, ChevronUp, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Employee, WeeklySchedule } from '../types';
import { generateId, formatHoursDisplay, parseHoursInput } from '../utils';

interface EmployeesViewProps {
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  companyWorkingDays?: number[];
}

const createDefaultSchedule = (workingDays: number[] = [1, 2, 3, 4, 5]): WeeklySchedule => {
  const schedule: WeeklySchedule = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  workingDays.forEach(day => {
    schedule[day] = 8; // Default 8 hours for working days
  });
  return schedule;
};

export const EmployeesView: React.FC<EmployeesViewProps> = ({ employees, setEmployees, companyWorkingDays }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('');
  const [newContractHours, setNewContractHours] = useState('40');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState<WeeklySchedule>(createDefaultSchedule());

  const handleAddEmployee = () => {
    if (!newEmployeeName.trim()) return;
    
    const newEmployee: Employee = {
      id: generateId(),
      name: newEmployeeName,
      role: newEmployeeRole,
      contractHoursWeekly: parseHoursInput(newContractHours),
      defaultSchedule: createDefaultSchedule(companyWorkingDays)
    };

    setEmployees([...employees, newEmployee]);
    setNewEmployeeName('');
    setNewEmployeeRole('');
    setNewContractHours('40');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Sei sicuro di voler rimuovere questo dipendente?')) {
      setEmployees(employees.filter(e => e.id !== id));
    }
  };

  const startEditing = (emp: Employee) => {
    setEditingId(emp.id);
    setEditSchedule({ ...emp.defaultSchedule });
  };

  const saveSchedule = (id: string) => {
    setEmployees(employees.map(e => {
      if (e.id === id) {
        return { 
          ...e, 
          defaultSchedule: editSchedule,
          // Removed automatic update of contractHoursWeekly as per request
        };
      }
      return e;
    }));
    setEditingId(null);
  };

  const handleScheduleChange = (day: number, value: string) => {
    const hours = parseHoursInput(value);
    setEditSchedule(prev => ({ ...prev, [day]: hours }));
  };

  const handleScheduleIncrement = (day: number, delta: number) => {
    const currentVal = editSchedule[day] || 0;
    const newVal = Math.max(0, currentVal + delta);
    setEditSchedule(prev => ({ ...prev, [day]: newVal }));
  };

  // Calculate validation details
  const getValidationDetails = (schedule: WeeklySchedule, contractHours: number) => {
    const scheduledTotal = (Object.values(schedule) as number[]).reduce((sum, h) => sum + h, 0);
    const diff = scheduledTotal - contractHours;
    return { scheduledTotal, diff };
  };

  const daysMap = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <User className="w-5 h-5 text-slate-500" />
          Gestione Dipendenti
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nuovo Dipendente
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-4">Dati Nuovo Dipendente</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Nome Completo</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Ruolo/Mansione</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newEmployeeRole}
                onChange={(e) => setNewEmployeeRole(e.target.value)}
                placeholder="Operaio"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Ore Contrattuali (Settimanali)</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newContractHours}
                onChange={(e) => setNewContractHours(e.target.value)}
                placeholder="es. 40 o 38,30"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button 
              onClick={handleAddEmployee}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Salva Dipendente
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {employees.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">Nessun dipendente inserito.</p>
          </div>
        ) : (
          employees.map(emp => {
            const isEditing = editingId === emp.id;
            const { scheduledTotal, diff } = getValidationDetails(
              isEditing ? editSchedule : emp.defaultSchedule, 
              emp.contractHoursWeekly
            );
            const isExact = Math.abs(diff) < 0.01;

            return (
              <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{emp.name}</h3>
                    <p className="text-sm text-slate-500">{emp.role} • {formatHoursDisplay(emp.contractHoursWeekly)}h / settimana da contratto</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <button 
                        onClick={() => saveSchedule(emp.id)}
                        className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
                      >
                        <Save className="w-4 h-4" /> Salva Turni
                      </button>
                    ) : (
                      <button 
                        onClick={() => startEditing(emp)}
                        className="flex items-center gap-1 text-sm border border-slate-300 bg-white text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50 transition-colors"
                      >
                        <Clock className="w-4 h-4" /> Modifica Turno Standard
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(emp.id)}
                      className="text-red-500 p-2 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Schedule Grid */}
                <div className="p-4">
                  <div className="flex justify-between items-end mb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Turno Settimanale Standard
                    </p>
                    {isEditing && (
                       <div className="flex items-center gap-2 text-sm bg-slate-100 px-3 py-1 rounded border border-slate-200">
                          <span className="text-slate-600">Totale Turno: <strong>{formatHoursDisplay(scheduledTotal)}h</strong></span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-600">Contratto: <strong>{formatHoursDisplay(emp.contractHoursWeekly)}h</strong></span>
                          <span className="text-slate-400">|</span>
                          {isExact ? (
                            <span className="flex items-center gap-1 text-green-600 font-bold">
                              OK <CheckCircle2 className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600 font-bold">
                              {diff > 0 ? '+' : ''}{formatHoursDisplay(diff)}h <AlertCircle className="w-4 h-4" />
                            </span>
                          )}
                       </div>
                    )}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
                      <div key={dayIdx} className={`flex flex-col items-center p-2 rounded-lg ${dayIdx === 0 ? 'bg-red-50 border border-red-100' : 'bg-slate-50 border border-slate-100'}`}>
                        <span className={`text-xs font-medium mb-1 ${dayIdx === 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {daysMap[dayIdx]}
                        </span>
                        {isEditing ? (
                          <div className="relative flex items-center w-16">
                            <input
                              type="text"
                              value={formatHoursDisplay(editSchedule[dayIdx])}
                              onChange={(e) => handleScheduleChange(dayIdx, e.target.value)}
                              className="w-full text-center border border-slate-300 rounded-l text-sm py-1 pl-1 pr-4 focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="0"
                            />
                            <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-slate-300 bg-slate-50 rounded-r">
                              <button 
                                onClick={() => handleScheduleIncrement(dayIdx, 0.5)}
                                className="flex-1 px-0.5 hover:bg-slate-200 text-slate-500"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleScheduleIncrement(dayIdx, -0.5)}
                                className="flex-1 px-0.5 hover:bg-slate-200 text-slate-500"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800">{formatHoursDisplay(emp.defaultSchedule[dayIdx])}h</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};