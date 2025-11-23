import React, { useState, useEffect } from 'react';
import { Building2, CalendarDays, CheckSquare } from 'lucide-react';
import { CompanyInfo } from '../types';

interface CompanySettingsProps {
  info: CompanyInfo;
  setInfo: (info: CompanyInfo) => void;
}

export const CompanySettings: React.FC<CompanySettingsProps> = ({ info, setInfo }) => {
  const currentWorkingDays = info.workingDays || [1, 2, 3, 4, 5];
  
  // Helper to identify presets
  const isMonFri = JSON.stringify(currentWorkingDays.slice().sort()) === JSON.stringify([1, 2, 3, 4, 5]);
  const isTueSat = JSON.stringify(currentWorkingDays.slice().sort()) === JSON.stringify([2, 3, 4, 5, 6]);

  // State to control visibility of the custom checkboxes
  // If it's not one of the standard presets, start in custom mode
  const [isCustomMode, setIsCustomMode] = useState(!isMonFri && !isTueSat);

  // Sync state if data changes externally (optional, but good for initial load)
  useEffect(() => {
    if (!isMonFri && !isTueSat) {
      setIsCustomMode(true);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInfo({ ...info, [e.target.name]: e.target.value });
  };

  const applyPreset = (days: number[]) => {
    setInfo({ ...info, workingDays: days });
    setIsCustomMode(false);
  };

  const enableCustomMode = () => {
    setIsCustomMode(true);
  };

  const toggleWorkingDay = (dayIndex: number) => {
    const currentDays = info.workingDays || [];
    let newDays;
    if (currentDays.includes(dayIndex)) {
      newDays = currentDays.filter(d => d !== dayIndex);
    } else {
      newDays = [...currentDays, dayIndex].sort();
    }
    setInfo({ ...info, workingDays: newDays });
  };

  const daysMap = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

  return (
    <div className="w-full space-y-8">
      {/* Dati Aziendali */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-500" />
          Dati Aziendali
        </h3>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ragione Sociale</label>
            <input
              type="text"
              name="name"
              value={info.name}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Nome Azienda S.r.l."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Indirizzo Sede</label>
            <input
              type="text"
              name="address"
              value={info.address}
              onChange={handleChange}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Via Roma 1, Milano"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Partita IVA / C.F.</label>
              <input
                type="text"
                name="vat"
                value={info.vat}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="IT00000000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Aziendale</label>
              <input
                type="email"
                name="email"
                value={info.email}
                onChange={handleChange}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="info@azienda.it"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Configurazione Invio Email Report</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Commercialista</label>
                <p className="text-xs text-slate-500 mb-2">Per l'invio automatico dei report mensili.</p>
                <input
                  type="email"
                  name="accountantEmail"
                  value={info.accountantEmail}
                  onChange={handleChange}
                  className="w-full border border-blue-200 bg-blue-50 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="commercialista@studio.it"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Oggetto Email Personalizzato (Opzionale)</label>
                <input
                  type="text"
                  name="emailSubject"
                  value={info.emailSubject || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Es. Report Ore - [Mese] [Anno] - [Azienda]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Testo Email Personalizzato (Opzionale)</label>
                <textarea
                  name="emailTitle"
                  value={info.emailTitle || ''}
                  onChange={handleChange}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
                  placeholder="Es. Gentile Commercialista, in allegato il report..."
                />
                <p className="text-xs text-slate-400 mt-1">Lascia vuoto per usare il testo predefinito.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Giorni Lavorativi Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-slate-500" />
          Giorni Lavorativi (Turni Standard)
        </h3>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-4">
            Seleziona i giorni in cui l'azienda è operativa. Questa impostazione verrà usata come riferimento per i turni dei nuovi dipendenti.
          </p>

          <div className="flex flex-wrap gap-3 mb-6">
            <button 
              onClick={() => applyPreset([1, 2, 3, 4, 5])}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                !isCustomMode && isMonFri
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Da Lunedì al Venerdì
            </button>
            <button 
              onClick={() => applyPreset([2, 3, 4, 5, 6])}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                !isCustomMode && isTueSat
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Da Martedì al Sabato
            </button>
            <button 
              onClick={enableCustomMode}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                isCustomMode
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Personalizzato
            </button>
          </div>

          {/* Checkboxes for all days - Only visible in Custom Mode */}
          {isCustomMode && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-2">
              {daysMap.map((dayName, idx) => (
                <label key={idx} className="flex items-center space-x-2 cursor-pointer select-none">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                    currentWorkingDays.includes(idx) 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-white border-slate-300'
                  }`}>
                    {currentWorkingDays.includes(idx) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={currentWorkingDays.includes(idx)}
                      onChange={() => toggleWorkingDay(idx)}
                    />
                  </div>
                  <span className={`text-sm ${currentWorkingDays.includes(idx) ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                    {dayName}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};