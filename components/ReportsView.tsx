import React, { useState, useMemo } from 'react';
import { FileText, Mail, Download, MessageCircle, CalendarRange, PieChart, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Employee, TimeEntry, CompanyInfo, LeaveRequest, LeaveStatus, LeaveType } from '../types';
import { months, years, formatDateISO, getDaysInMonth, isHoliday, getDayName, formatHoursDisplay } from '../utils';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

interface ReportsViewProps {
  employees: Employee[];
  entries: TimeEntry[];
  company: CompanyInfo;
  leaveRequests: LeaveRequest[];
}

interface ReportRow {
  id: string;
  name: string;
  role: string;
  worked: number;
  expected: number;
  leaveHours: number;
  overtime: number;
  deficit: number;
}

type ReportTab = 'monthly' | 'annual';
type DetailType = 'overtime' | 'ferie' | 'malattia' | 'permessi' | null;

export const ReportsView: React.FC<ReportsViewProps> = ({ employees, entries, company, leaveRequests }) => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ReportTab>('monthly');

  // Monthly Report State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDetailEmp, setSelectedDetailEmp] = useState<ReportRow | null>(null); // State for the modal

  // Annual Report State
  const [annualYear, setAnnualYear] = useState(new Date().getFullYear());
  const [annualEmployeeId, setAnnualEmployeeId] = useState<string>('ALL'); // Default to ALL
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);

  // --- Helpers ---

  const getApprovedLeave = (date: Date, empId: string): LeaveRequest | undefined => {
    const dateStr = formatDateISO(date);
    return leaveRequests.find(req => {
      return req.employeeId === empId && 
             req.status === LeaveStatus.APPROVED &&
             dateStr >= req.startDate && 
             dateStr <= req.endDate;
    });
  };

  // --- Monthly Report Logic ---

  const generateReportData = (): ReportRow[] => {
    const days = getDaysInMonth(selectedMonth, selectedYear);
    
    return employees.map(emp => {
      let totalWorked = 0;
      let expected = 0;
      let leaveHours = 0;

      days.forEach(day => {
        const dateStr = formatDateISO(day);
        const dayOfWeek = day.getDay();
        const isHol = isHoliday(day);
        
        const sched = isHol ? 0 : (emp.defaultSchedule[dayOfWeek] || 0);
        expected += sched;
        
        const entry = entries.find(e => e.employeeId === emp.id && e.date === dateStr);
        const workedOnDay = entry ? entry.hours : 0;
        totalWorked += workedOnDay;
        
        const leave = getApprovedLeave(day, emp.id);
        if (leave) {
          if (leave.type === LeaveType.PERMESSO) {
            const absence = Math.max(0, sched - workedOnDay);
            leaveHours += absence;
          } else {
            leaveHours += sched;
          }
        }
      });

      const overtime = Math.max(0, totalWorked - expected);
      const deficit = Math.max(0, expected - totalWorked);

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        worked: totalWorked,
        expected: expected,
        leaveHours: leaveHours,
        overtime: overtime,
        deficit: deficit
      };
    });
  };

  const reportData = generateReportData();

  // --- Annual Report Logic ---

  // Helper function to calculate stats for a single employee
  const calculateAnnualStats = (emp: Employee, year: number) => {
    let totalExpected = 0;
    let totalWorked = 0;
    let totalOvertime = 0;
    let totalPermitHours = 0;
    let totalFerieDays = 0;
    let totalMalattiaDays = 0;

    const overtimeEvents: { date: Date; hours: number }[] = [];
    const permitEvents: { date: Date; hours: number }[] = [];
    const ferieDates: Date[] = [];
    const malattiaDates: Date[] = [];

    for (let m = 0; m < 12; m++) {
      const daysInMonth = getDaysInMonth(m, year);
      let monthExpected = 0;
      let monthWorked = 0;
      
      daysInMonth.forEach(day => {
        const dateStr = formatDateISO(day);
        const isHol = isHoliday(day);
        const sched = isHol ? 0 : (emp.defaultSchedule[day.getDay()] || 0);
        
        const entry = entries.find(e => e.employeeId === emp.id && e.date === dateStr);
        const worked = entry ? entry.hours : 0;
        const leave = getApprovedLeave(day, emp.id);

        monthExpected += sched;
        monthWorked += worked;

        if (leave) {
          if (leave.type === LeaveType.FERIE) {
             ferieDates.push(day);
             totalFerieDays++;
          } else if (leave.type === LeaveType.MALATTIA) {
             malattiaDates.push(day);
             totalMalattiaDays++;
          } else if (leave.type === LeaveType.PERMESSO) {
             const p = Math.max(0, sched - worked);
             if (p > 0) {
               permitEvents.push({ date: day, hours: p });
               totalPermitHours += p;
             }
          }
        }
      });

      const monthOvertime = Math.max(0, monthWorked - monthExpected);
      totalExpected += monthExpected;
      totalWorked += monthWorked;
      totalOvertime += monthOvertime;

      if (monthOvertime > 0) {
        overtimeEvents.push({ 
          date: new Date(year, m, 1), 
          hours: monthOvertime 
        });
      }
    }

    // Helper to merge consecutive dates into ranges
    const mergeDates = (dates: Date[]) => {
      if (dates.length === 0) return [];
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      const ranges: { start: Date; end: Date; days: number }[] = [];
      
      let currentStart = sorted[0];
      let currentEnd = sorted[0];
      let count = 1;

      for (let i = 1; i < sorted.length; i++) {
        const diffTime = Math.abs(sorted[i].getTime() - currentEnd.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (diffDays === 1) {
          currentEnd = sorted[i];
          count++;
        } else {
          ranges.push({ start: currentStart, end: currentEnd, days: count });
          currentStart = sorted[i];
          currentEnd = sorted[i];
          count = 1;
        }
      }
      ranges.push({ start: currentStart, end: currentEnd, days: count });
      return ranges;
    };

    return {
      employee: emp,
      totalExpected,
      totalWorked,
      totalOvertime,
      totalPermitHours,
      totalFerieDays,
      totalMalattiaDays,
      overtimeEvents,
      permitEvents,
      ferieRanges: mergeDates(ferieDates),
      malattiaRanges: mergeDates(malattiaDates)
    };
  };

  const annualData = useMemo(() => {
    if (annualEmployeeId === 'ALL') {
      return employees.map(e => calculateAnnualStats(e, annualYear));
    } else {
      const emp = employees.find(e => e.id === annualEmployeeId);
      if (!emp) return null;
      return calculateAnnualStats(emp, annualYear);
    }
  }, [annualYear, annualEmployeeId, employees, entries, leaveRequests]);


  // --- PDF Functions ---

  const handleExportAnnualPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.text(company.name, 14, 15);
    doc.setFontSize(10);
    doc.text(`Report Annuale ${annualYear}`, 14, 22);

    if (Array.isArray(annualData)) {
      // ALL EMPLOYEES SUMMARY TABLE
      const head = [['Dipendente', 'Previste', 'Lavorate', 'Straordinari', 'Permessi (h)', 'Ferie (gg)', 'Malattia (gg)']];
      const body = annualData.map(d => [
        d.employee.name,
        formatHoursDisplay(d.totalExpected) + 'h',
        formatHoursDisplay(d.totalWorked) + 'h',
        formatHoursDisplay(d.totalOvertime) + 'h',
        formatHoursDisplay(d.totalPermitHours) + 'h',
        d.totalFerieDays.toString(),
        d.totalMalattiaDays.toString()
      ]);

      autoTable(doc, {
        startY: 30,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
      
      doc.save(`Report_Annuale_Tutti_${annualYear}.pdf`);

    } else if (annualData) {
      // SINGLE EMPLOYEE DETAILED REPORT
      const d = annualData;
      
      doc.setFontSize(14);
      doc.text(`Dipendente: ${d.employee.name}`, 14, 30);

      // Summary Table
      autoTable(doc, {
        startY: 35,
        head: [['Previste', 'Lavorate', 'Straordinari', 'Permessi (h)', 'Ferie (gg)', 'Malattia (gg)']],
        body: [[
          formatHoursDisplay(d.totalExpected) + 'h',
          formatHoursDisplay(d.totalWorked) + 'h',
          formatHoursDisplay(d.totalOvertime) + 'h',
          formatHoursDisplay(d.totalPermitHours) + 'h',
          d.totalFerieDays.toString(),
          d.totalMalattiaDays.toString()
        ]],
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;

      // Overtime Detail
      if (d.overtimeEvents.length > 0) {
        doc.text('Dettaglio Straordinari', 14, finalY);
        autoTable(doc, {
          startY: finalY + 2,
          head: [['Mese', 'Ore']],
          body: d.overtimeEvents.map(e => [months[e.date.getMonth()], formatHoursDisplay(e.hours)]),
          theme: 'grid',
          margin: { right: 200 } // Limit width
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Leaves Detail
      if (d.ferieRanges.length > 0 || d.malattiaRanges.length > 0) {
        doc.text('Dettaglio Assenze', 14, finalY);
        const leaveBody = [
          ...d.ferieRanges.map(r => ['Ferie', `${formatDateISO(r.start)} - ${formatDateISO(r.end)}`, `${r.days} gg`]),
          ...d.malattiaRanges.map(r => ['Malattia', `${formatDateISO(r.start)} - ${formatDateISO(r.end)}`, `${r.days} gg`])
        ];
        
        autoTable(doc, {
          startY: finalY + 2,
          head: [['Tipo', 'Periodo', 'Durata']],
          body: leaveBody,
          theme: 'grid',
        });
      }

      doc.save(`Report_Annuale_${d.employee.name.replace(/\s/g, '_')}_${annualYear}.pdf`);
    }
  };

  // --- Monthly PDF (Existing) ---

  const generateGlobalPDFDoc = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const days = getDaysInMonth(selectedMonth, selectedYear);

    const headRow = ['Dipendente', ...days.map(d => d.getDate().toString()), 'Tot.Ore', 'O.Perm', 'G.Fer', 'G.Mal'];

    const bodyRows = employees.map(emp => {
      let rowTotalWorked = 0;
      let rowPermitHours = 0;
      let rowFerieDays = 0;
      let rowMalattiaDays = 0;

      const dayCells = days.map(date => {
        const dateStr = formatDateISO(date);
        const entry = entries.find(e => e.employeeId === emp.id && e.date === dateStr);
        const leave = getApprovedLeave(date, emp.id);
        const isHol = isHoliday(date);
        const scheduled = isHol ? 0 : (emp.defaultSchedule[date.getDay()] || 0);
        
        let cellText = '/'; 
        const worked = entry ? entry.hours : 0;
        
        if (leave) {
           if (leave.type === LeaveType.FERIE) {
             cellText = 'F';
             rowFerieDays++;
           } else if (leave.type === LeaveType.MALATTIA) {
             cellText = 'M';
             rowMalattiaDays++;
           } else if (leave.type === LeaveType.PERMESSO) {
             if (worked > 0) {
               cellText = formatHoursDisplay(worked);
             } else {
               cellText = 'P';
             }
             const p = Math.max(0, scheduled - worked);
             rowPermitHours += p;
           }
        } else if (worked > 0) {
           cellText = formatHoursDisplay(worked);
        } else {
           cellText = '/';
        }

        if (worked > 0) rowTotalWorked += worked;

        return cellText;
      });

      return [
        emp.name,
        ...dayCells,
        formatHoursDisplay(rowTotalWorked),
        formatHoursDisplay(rowPermitHours),
        rowFerieDays.toString(),
        rowMalattiaDays.toString()
      ];
    });

    doc.setFontSize(16);
    doc.text(`${company.name} - Report Mensile`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Periodo: ${months[selectedMonth]} ${selectedYear}`, 14, 22);
    doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 200, 22);

    autoTable(doc, {
      startY: 28,
      head: [headRow],
      body: bodyRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [41, 128, 185], 
        halign: 'center', 
        fontSize: 6,
        cellPadding: 1
      },
      bodyStyles: { 
        fontSize: 6, 
        halign: 'center',
        cellPadding: 1 
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 25, fontSize: 6, fontStyle: 'bold' }
      },
      styles: {
        overflow: 'linebreak'
      },
      margin: { left: 10, right: 10 }
    });

    return doc;
  };

  const handleExportPDFDetail = (empData: ReportRow) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const days = getDaysInMonth(selectedMonth, selectedYear);
    
    let pdfTotalWorked = 0;
    let pdfTotalPermitHours = 0;
    let pdfFerieDays = 0;
    let pdfMalattiaDays = 0;

    const tableBody = days.map(date => {
      const dateStr = formatDateISO(date);
      const entry = entries.find(e => e.employeeId === empData.id && e.date === dateStr);
      const leave = getApprovedLeave(date, empData.id);
      const isHol = isHoliday(date);
      const scheduled = isHol ? 0 : (employees.find(e => e.id === empData.id)?.defaultSchedule[date.getDay()] || 0);
      
      let status = 'Lavorativo';
      if (isHol) status = 'Festivo';
      
      let hoursDisplay = '-';
      const workedHours = entry ? entry.hours : 0;

      if (leave) {
        status = leave.type;
        if (leave.type === LeaveType.FERIE) pdfFerieDays++;
        if (leave.type === LeaveType.MALATTIA) pdfMalattiaDays++;
        if (leave.type === LeaveType.PERMESSO) {
          const permitH = Math.max(0, scheduled - workedHours);
          pdfTotalPermitHours += permitH;
        }
      }

      if (workedHours > 0) hoursDisplay = formatHoursDisplay(workedHours);
      else if (leave && leave.type !== LeaveType.PERMESSO) hoursDisplay = '-'; 
      
      pdfTotalWorked += workedHours;

      return [`${date.getDate()} ${getDayName(date)}`, status, hoursDisplay];
    });

    doc.setFontSize(18);
    doc.text(company.name, 14, 15);
    doc.setFontSize(10);
    doc.text(`P.IVA: ${company.vat} - ${company.address}`, 14, 20);
    doc.setLineWidth(0.5);
    doc.line(14, 23, 280, 23);
    
    doc.setFontSize(14);
    doc.text(`Report Mensile: ${months[selectedMonth]} ${selectedYear}`, 14, 32);
    doc.setFontSize(12);
    doc.text(`Dipendente: ${empData.name} (${empData.role})`, 14, 38);
    
    autoTable(doc, {
      startY: 45,
      head: [['Giorno', 'Stato', 'Ore Lavorate']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202], halign: 'center' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { cellWidth: 30, halign: 'center' }
      },
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const pageWidth = doc.internal.pageSize.width;
    const startX = pageWidth - 14;

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Totale Ore Lavorate: ${formatHoursDisplay(pdfTotalWorked)}`, startX, finalY, { align: 'right' });
    doc.text(`Totale Ore Permesso: ${formatHoursDisplay(pdfTotalPermitHours)}`, startX, finalY + 6, { align: 'right' });
    doc.text(`Giorni Ferie: ${pdfFerieDays}`, startX, finalY + 12, { align: 'right' });
    doc.text(`Giorni Malattia: ${pdfMalattiaDays}`, startX, finalY + 18, { align: 'right' });

    doc.save(`Report_Dettaglio_${empData.name.replace(/\s/g, '_')}_${months[selectedMonth]}.pdf`);
  };

  const handleGlobalExportPDF = () => {
    const doc = generateGlobalPDFDoc();
    doc.save(`Report_Globale_${months[selectedMonth]}_${selectedYear}.pdf`);
  };

  const handleMailTo = () => {
    const subject = company.emailSubject || `Report Ore - ${months[selectedMonth]} ${selectedYear} - ${company.name}`;
    let body = company.emailTitle || `Gentile Commercialista,\n\nEcco il report delle ore per il mese di ${months[selectedMonth]} ${selectedYear}.\n\nAzienda: ${company.name}\nP.IVA: ${company.vat}\n\n`;
    body += "DIPENDENTE | PREVISTE | LAVORATE | ASSENZE | STRAORDINARI\n";
    body += "------------------------------------------------------------------------\n";
    reportData.forEach(row => {
      body += `${row.name} | ${formatHoursDisplay(row.expected)}h | ${formatHoursDisplay(row.worked)}h | ${formatHoursDisplay(row.leaveHours)}h | ${formatHoursDisplay(row.overtime)}h\n`;
    });
    body += "\nCordiali saluti.";
    window.location.href = `mailto:${company.accountantEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleWhatsApp = async () => {
    const fileName = `Report_Globale_${months[selectedMonth]}_${selectedYear}.pdf`;
    const doc = generateGlobalPDFDoc();

    if (navigator.share) {
      try {
        const blob = doc.output('blob');
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
           await navigator.share({ files: [file], title: `Report`, text: `Ecco il report.` });
           return;
        }
      } catch (e) {}
    }
    doc.save(fileName);
    let text = `*Report Ore - ${months[selectedMonth]} ${selectedYear}*\n${company.name}\n\n`;
    text += `📎 *Nota:* Il PDF è stato scaricato. Allegalo manualmente.\n\n`;
    reportData.forEach(row => {
      text += `*${row.name}*\nPrev: ${formatHoursDisplay(row.expected)}h | Lav: ${formatHoursDisplay(row.worked)}h\nAss: ${formatHoursDisplay(row.leaveHours)}h | Str: ${formatHoursDisplay(row.overtime)}h\n\n`;
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Render Detail Modal Data Helper
  const renderModalContent = () => {
    if (!selectedDetailEmp) return null;
    const days = getDaysInMonth(selectedMonth, selectedYear);
    let modalTotalWorked = 0;
    let modalTotalPermit = 0;
    let modalFerie = 0;
    let modalMalattia = 0;

    return (
       <div className="space-y-4">
          <div className="max-h-[60vh] overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0">
                  <tr>
                     <th className="px-4 py-2">Giorno</th>
                     <th className="px-4 py-2">Stato</th>
                     <th className="px-4 py-2 text-right">Ore</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {days.map(date => {
                     const dateStr = formatDateISO(date);
                     const entry = entries.find(e => e.employeeId === selectedDetailEmp.id && e.date === dateStr);
                     const leave = getApprovedLeave(date, selectedDetailEmp.id);
                     const isHol = isHoliday(date);
                     const scheduled = isHol ? 0 : (employees.find(e => e.id === selectedDetailEmp.id)?.defaultSchedule[date.getDay()] || 0);
                     
                     let statusClass = "text-slate-600";
                     let statusText = "Lavorativo";
                     let rowBg = "";

                     if (isHol) {
                        statusText = "Festivo";
                        statusClass = "text-red-600 font-medium";
                        rowBg = "bg-red-50/30";
                     }

                     if (leave) {
                        statusText = leave.type;
                        rowBg = "bg-blue-50/30";
                        if (leave.type === LeaveType.FERIE) {
                           modalFerie++;
                           statusClass = "text-green-600 font-bold";
                           rowBg = "bg-green-50/30";
                        } else if (leave.type === LeaveType.MALATTIA) {
                           modalMalattia++;
                           statusClass = "text-red-600 font-bold";
                           rowBg = "bg-red-50/30";
                        } else if (leave.type === LeaveType.PERMESSO) {
                           statusClass = "text-orange-600 font-bold";
                           rowBg = "bg-orange-50/30";
                        }
                     }

                     const worked = entry ? entry.hours : 0;
                     modalTotalWorked += worked;

                     if (leave && leave.type === LeaveType.PERMESSO) {
                        const p = Math.max(0, scheduled - worked);
                        modalTotalPermit += p;
                     }

                     return (
                        <tr key={dateStr} className={rowBg}>
                           <td className="px-4 py-2">{date.getDate()} {getDayName(date)}</td>
                           <td className={`px-4 py-2 ${statusClass}`}>{statusText}</td>
                           <td className="px-4 py-2 text-right font-medium">
                              {worked > 0 ? formatHoursDisplay(worked) : '-'}
                           </td>
                        </tr>
                     )
                  })}
               </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
             <div>
                <p className="text-xs text-slate-500 uppercase">Ore Lavorate</p>
                <p className="text-xl font-bold text-blue-700">{formatHoursDisplay(modalTotalWorked)}h</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 uppercase">Ore Permesso</p>
                <p className="text-xl font-bold text-indigo-700">{formatHoursDisplay(modalTotalPermit)}h</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 uppercase">Giorni Ferie</p>
                <p className="text-xl font-bold text-green-700">{modalFerie}</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 uppercase">Giorni Malattia</p>
                <p className="text-xl font-bold text-red-700">{modalMalattia}</p>
             </div>
          </div>
       </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Detail Modal */}
      {selectedDetailEmp && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
               <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                  <div>
                     <h3 className="font-bold text-lg text-slate-800">Dettaglio Mensile</h3>
                     <p className="text-sm text-slate-500">{selectedDetailEmp.name} - {months[selectedMonth]} {selectedYear}</p>
                  </div>
                  <button onClick={() => setSelectedDetailEmp(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                     <X className="w-5 h-5 text-slate-500" />
                  </button>
               </div>
               
               <div className="p-6 overflow-y-auto">
                  {renderModalContent()}
               </div>

               <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                  <button 
                     onClick={() => setSelectedDetailEmp(null)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
                  >
                     Chiudi
                  </button>
                  <button 
                     onClick={() => handleExportPDFDetail(selectedDetailEmp)}
                     className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2 shadow-sm"
                  >
                     <Download className="w-4 h-4" />
                     Scarica PDF
                  </button>
               </div>
            </div>
         </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          Report & Analisi
        </h2>
        
        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1">
           <button 
             onClick={() => setActiveTab('monthly')}
             className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
               activeTab === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             Mensile
           </button>
           <button 
             onClick={() => setActiveTab('annual')}
             className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
               activeTab === 'annual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
             }`}
           >
             Annuale
           </button>
        </div>
      </div>

      {activeTab === 'monthly' ? (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
          {/* --- MONTHLY VIEW (Existing) --- */}
          <div className="flex justify-end gap-3 mb-8">
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
              <p className="text-sm text-blue-600 font-medium mb-1">Totale Ore Lavorate</p>
              <p className="text-3xl font-bold text-blue-900">
                {formatHoursDisplay(reportData.reduce((sum, r) => sum + r.worked, 0))}h
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
              <p className="text-sm text-slate-600 font-medium mb-1">Totale Previste</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatHoursDisplay(reportData.reduce((sum, r) => sum + r.expected, 0))}h
              </p>
            </div>
            <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
              <p className="text-sm text-indigo-600 font-medium mb-1">Totale Assenze</p>
              <p className="text-3xl font-bold text-indigo-900">
                {formatHoursDisplay(reportData.reduce((sum, r) => sum + r.leaveHours, 0))}h
              </p>
            </div>
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
              <p className="text-sm text-orange-600 font-medium mb-1">Totale Straordinari</p>
              <p className="text-3xl font-bold text-orange-900">
                {formatHoursDisplay(reportData.reduce((sum, r) => sum + r.overtime, 0))}h
              </p>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider">Dipendente</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Previste</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Lavorate</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Assenze</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Straordinari</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-center">Dettaglio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {row.name}
                        <div className="text-xs text-slate-400 font-normal">{row.role}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600">{formatHoursDisplay(row.expected)}h</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">{formatHoursDisplay(row.worked)}h</td>
                      <td className="px-6 py-4 text-right text-indigo-600 font-medium">{formatHoursDisplay(row.leaveHours)}h</td>
                      <td className="px-6 py-4 text-right">
                        {row.overtime > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            +{formatHoursDisplay(row.overtime)}h
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedDetailEmp(row)}
                          className="bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 mx-auto"
                        >
                          <ChevronRight className="w-4 h-4" />
                          Vedi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-4 justify-end">
            <button 
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium shadow-sm hover:shadow transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Invia su WhatsApp
            </button>
            <button 
              onClick={handleGlobalExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm hover:shadow transition-all"
            >
              <FileText className="w-4 h-4" />
              Esporta PDF Mensile
            </button>
            <button 
              onClick={handleMailTo}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm hover:shadow transition-all"
            >
              <Mail className="w-4 h-4" />
              Invia Email
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
          {/* --- ANNUAL VIEW --- */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center">
             <div className="flex gap-3 w-full md:w-auto items-end">
                <div className="w-full md:w-64">
                  <label className="block text-xs text-slate-500 mb-1 font-medium uppercase">Dipendente</label>
                  <select 
                    value={annualEmployeeId}
                    onChange={(e) => setAnnualEmployeeId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="ALL">Tutti i Dipendenti</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs text-slate-500 mb-1 font-medium uppercase">Anno</label>
                  <select 
                    value={annualYear} 
                    onChange={(e) => setAnnualYear(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
             </div>
             {annualData && (
                <button 
                  onClick={handleExportAnnualPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Esporta PDF Annuale
                </button>
             )}
          </div>

          {annualData ? (
            Array.isArray(annualData) ? (
              // ALL EMPLOYEES TABLE VIEW
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider">Dipendente</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Previste</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Lavorate</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Straordinari</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Permessi</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Ferie</th>
                        <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-right">Malattia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {annualData.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 font-medium text-slate-900">{d.employee.name}</td>
                          <td className="px-6 py-4 text-right text-slate-600">{formatHoursDisplay(d.totalExpected)}h</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800">{formatHoursDisplay(d.totalWorked)}h</td>
                          <td className="px-6 py-4 text-right text-orange-600">{formatHoursDisplay(d.totalOvertime)}h</td>
                          <td className="px-6 py-4 text-right text-indigo-600">{formatHoursDisplay(d.totalPermitHours)}h</td>
                          <td className="px-6 py-4 text-right text-green-600">{d.totalFerieDays} gg</td>
                          <td className="px-6 py-4 text-right text-red-600">{d.totalMalattiaDays} gg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // SINGLE EMPLOYEE DASHBOARD VIEW
              <div className="space-y-8">
                 {/* Stat Cards - Clickable */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Previste</p>
                        <p className="text-2xl font-bold text-slate-700">{formatHoursDisplay(annualData.totalExpected)}h</p>
                      </div>
                      <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 w-full"></div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Lavorate</p>
                         <p className="text-2xl font-bold text-blue-700">{formatHoursDisplay(annualData.totalWorked)}h</p>
                      </div>
                      <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (annualData.totalWorked / (annualData.totalExpected || 1)) * 100)}%` }}></div>
                      </div>
                    </div>

                    {/* Interactive Cards */}
                    <button 
                      onClick={() => setActiveDetail(activeDetail === 'overtime' ? null : 'overtime')}
                      className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between text-left transition-all ${
                        activeDetail === 'overtime' ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200' : 'bg-white border-slate-200 hover:border-orange-200 hover:shadow-md'
                      }`}
                    >
                      <div>
                         <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeDetail === 'overtime' ? 'text-orange-700' : 'text-orange-600'}`}>Straordinari</p>
                         <p className="text-2xl font-bold text-orange-900">{formatHoursDisplay(annualData.totalOvertime)}h</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                         <span className="text-xs text-slate-400">Clicca per dettaglio</span>
                         {activeDetail === 'overtime' ? <ChevronDown className="w-4 h-4 text-orange-500" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveDetail(activeDetail === 'permessi' ? null : 'permessi')}
                      className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between text-left transition-all ${
                        activeDetail === 'permessi' ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'
                      }`}
                    >
                      <div>
                         <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeDetail === 'permessi' ? 'text-indigo-700' : 'text-indigo-600'}`}>Permessi</p>
                         <p className="text-2xl font-bold text-indigo-900">{formatHoursDisplay(annualData.totalPermitHours)}h</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                         <span className="text-xs text-slate-400">Clicca per dettaglio</span>
                         {activeDetail === 'permessi' ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </div>
                    </button>

                    <button 
                      onClick={() => setActiveDetail(activeDetail === 'ferie' ? null : 'ferie')}
                      className={`rounded-xl p-5 border shadow-sm flex flex-col justify-between text-left transition-all ${
                        activeDetail === 'ferie' ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'bg-white border-slate-200 hover:border-green-200 hover:shadow-md'
                      }`}
                    >
                       <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${activeDetail === 'ferie' ? 'text-green-700' : 'text-green-600'}`}>Ferie & Malattia</p>
                            <div className="space-y-1">
                              <p className="text-lg font-bold text-green-900">{annualData.totalFerieDays} <span className="text-xs font-normal text-green-700">gg Ferie</span></p>
                              <p className="text-lg font-bold text-red-900">{annualData.totalMalattiaDays} <span className="text-xs font-normal text-red-700">gg Malattia</span></p>
                            </div>
                          </div>
                       </div>
                       <div className="flex justify-between items-end mt-2">
                         <span className="text-xs text-slate-400">Clicca per dettaglio</span>
                         {activeDetail === 'ferie' ? <ChevronDown className="w-4 h-4 text-green-500" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </div>
                    </button>
                 </div>

                 {/* Detailed List Section */}
                 {activeDetail && (
                   <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                         <h3 className="font-bold text-slate-700 capitalize flex items-center gap-2">
                           <CalendarRange className="w-5 h-5 text-slate-500" />
                           Dettaglio {activeDetail === 'ferie' ? 'Ferie e Malattia' : activeDetail}
                         </h3>
                         <button onClick={() => setActiveDetail(null)} className="text-xs text-slate-500 hover:text-slate-800 underline">Chiudi</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto p-0">
                         {activeDetail === 'overtime' && (
                           <table className="w-full text-sm text-left">
                             <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0">
                               <tr><th className="px-6 py-3">Mese</th><th className="px-6 py-3 text-right">Ore Straordinario</th></tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {annualData.overtimeEvents.length === 0 ? (
                                 <tr><td colSpan={2} className="px-6 py-4 text-center text-slate-400">Nessuno straordinario registrato.</td></tr>
                               ) : (
                                 annualData.overtimeEvents.map((ev, i) => (
                                   <tr key={i}>
                                     <td className="px-6 py-3 font-medium text-slate-700 capitalize">{months[ev.date.getMonth()]}</td>
                                     <td className="px-6 py-3 text-right font-bold text-orange-600">+{formatHoursDisplay(ev.hours)}h</td>
                                   </tr>
                                 ))
                               )}
                             </tbody>
                           </table>
                         )}

                         {activeDetail === 'permessi' && (
                           <table className="w-full text-sm text-left">
                             <thead className="text-xs text-slate-500 bg-slate-50 sticky top-0">
                               <tr><th className="px-6 py-3">Data</th><th className="px-6 py-3 text-right">Ore Permesso</th></tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {annualData.permitEvents.length === 0 ? (
                                 <tr><td colSpan={2} className="px-6 py-4 text-center text-slate-400">Nessun permesso registrato.</td></tr>
                               ) : (
                                 annualData.permitEvents.map((ev, i) => (
                                   <tr key={i}>
                                     <td className="px-6 py-3 font-medium text-slate-700">{ev.date.getDate()} {months[ev.date.getMonth()]}</td>
                                     <td className="px-6 py-3 text-right font-bold text-indigo-600">{formatHoursDisplay(ev.hours)}h</td>
                                   </tr>
                                 ))
                               )}
                             </tbody>
                           </table>
                         )}

                         {(activeDetail === 'ferie' || activeDetail === 'malattia') && (
                           <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h4 className="text-xs font-bold text-green-700 uppercase mb-3 border-b border-green-100 pb-2">Ferie Godute</h4>
                                {annualData.ferieRanges.length === 0 ? (
                                  <p className="text-sm text-slate-400 italic">Nessun giorno di ferie.</p>
                                ) : (
                                  <ul className="space-y-2">
                                    {annualData.ferieRanges.map((range, i) => (
                                      <li key={i} className="flex justify-between items-center text-sm bg-green-50 p-2 rounded border border-green-100">
                                        <span className="text-slate-700">
                                          {range.start.getDate()} {months[range.start.getMonth()].substring(0,3)} 
                                          {range.days > 1 && ` - ${range.end.getDate()} ${months[range.end.getMonth()].substring(0,3)}`}
                                        </span>
                                        <span className="font-bold text-green-700">{range.days} gg</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                             </div>
                             <div>
                                <h4 className="text-xs font-bold text-red-700 uppercase mb-3 border-b border-red-100 pb-2">Malattia</h4>
                                {annualData.malattiaRanges.length === 0 ? (
                                  <p className="text-sm text-slate-400 italic">Nessun giorno di malattia.</p>
                                ) : (
                                  <ul className="space-y-2">
                                    {annualData.malattiaRanges.map((range, i) => (
                                      <li key={i} className="flex justify-between items-center text-sm bg-red-50 p-2 rounded border border-red-100">
                                        <span className="text-slate-700">
                                          {range.start.getDate()} {months[range.start.getMonth()].substring(0,3)} 
                                          {range.days > 1 && ` - ${range.end.getDate()} ${months[range.end.getMonth()].substring(0,3)}`}
                                        </span>
                                        <span className="font-bold text-red-700">{range.days} gg</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                             </div>
                           </div>
                         )}
                      </div>
                   </div>
                 )}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
               Seleziona un dipendente per visualizzare il report annuale.
            </div>
          )}
        </div>
      )}
    </div>
  );
};