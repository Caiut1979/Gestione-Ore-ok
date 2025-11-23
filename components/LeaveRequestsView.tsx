import React, { useState } from 'react';
import { Palmtree, CheckCircle2, XCircle, Save, Plus, CalendarDays } from 'lucide-react';
import { Employee, LeaveRequest, LeaveType, LeaveStatus } from '../types';
import { generateId, formatDateISO } from '../utils';

interface LeaveRequestsViewProps {
  employees: Employee[];
  requests: LeaveRequest[];
  setRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
}

export const LeaveRequestsView: React.FC<LeaveRequestsViewProps> = ({ employees, requests, setRequests }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [startDate, setStartDate] = useState(formatDateISO(new Date()));
  const [endDate, setEndDate] = useState(formatDateISO(new Date()));
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.FERIE);
  const [note, setNote] = useState('');

  const handleAddRequest = () => {
    if (!selectedEmployeeId || !startDate || !endDate) return;
    
    // Auto-approved since it's inserted by the owner
    const newRequest: LeaveRequest = {
      id: generateId(),
      employeeId: selectedEmployeeId,
      startDate,
      endDate,
      type: leaveType,
      status: LeaveStatus.APPROVED,
      note
    };

    setRequests([newRequest, ...requests]);
    setIsAdding(false);
    setNote('');
  };

  const updateStatus = (id: string, status: LeaveStatus) => {
    setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Vuoi cancellare questa assenza?')) {
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.name || 'Sconosciuto';

  const getStatusColor = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED: return 'text-green-600 bg-green-50 border-green-200';
      case LeaveStatus.REJECTED: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Palmtree className="w-6 h-6 text-blue-600" />
          Gestione Ferie e Permessi
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Aggiungi Assenza
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-4">Nuova Assenza (Inserimento diretto)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Dipendente</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={LeaveType.FERIE}>Ferie</option>
                <option value={LeaveType.PERMESSO}>Permesso</option>
                <option value={LeaveType.MALATTIA}>Malattia</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Dal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Al</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
             <label className="block text-sm font-medium text-slate-600 mb-1">Note opzionali</label>
             <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Motivazione..."
              />
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Annulla
            </button>
            <button 
              onClick={handleAddRequest}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salva
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
           <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-500">Nessuna assenza registrata.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${req.type === LeaveType.MALATTIA ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                   <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{getEmployeeName(req.employeeId)}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-medium">{req.type}</span> dal {new Date(req.startDate).toLocaleDateString('it-IT')} al {new Date(req.endDate).toLocaleDateString('it-IT')}
                  </p>
                  {req.note && <p className="text-xs text-slate-400 italic mt-1">"{req.note}"</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                  {/* Show Pending actions only if somehow a pending request exists (legacy) */}
                  {req.status === LeaveStatus.PENDING && (
                    <>
                      <button 
                        onClick={() => updateStatus(req.id, LeaveStatus.APPROVED)}
                        className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approva
                      </button>
                      <button 
                        onClick={() => updateStatus(req.id, LeaveStatus.REJECTED)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Rifiuta
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => handleDelete(req.id)}
                    className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                    title="Elimina"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};