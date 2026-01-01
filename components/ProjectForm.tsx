
import React, { useState } from 'react';
import { Project } from '../types';

interface SubProductEntry {
  name: string;
  duration: number;
}

interface ProjectFormProps {
  onAdd: (p: Project) => void;
  availableColors: string[];
  variant?: 'primary' | 'minimal' | 'outlined';
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onAdd, availableColors, variant = 'primary' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [demand, setDemand] = useState(5);
  const [deadline, setDeadline] = useState(10);
  const [subProducts, setSubProducts] = useState<SubProductEntry[]>([
    { name: 'A', duration: 1 },
    { name: 'B', duration: 1 }
  ]);

  const addSubProduct = () => {
    const usedNames = subProducts.map(s => s.name.toUpperCase());
    let nextChar = 65; // 'A'
    while (usedNames.includes(String.fromCharCode(nextChar))) {
      nextChar++;
    }
    const newName = String.fromCharCode(nextChar);
    setSubProducts([...subProducts, { name: newName, duration: 1 }]);
  };

  const removeSubProduct = (index: number) => {
    if (subProducts.length <= 1) return;
    setSubProducts(subProducts.filter((_, i) => i !== index));
  };

  const updateSubProduct = (index: number, field: keyof SubProductEntry, value: string | number) => {
    const newSubs = [...subProducts];
    if (field === 'name') {
      newSubs[index].name = (value as string).toUpperCase();
    } else {
      newSubs[index].duration = value as number;
    }
    setSubProducts(newSubs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || subProducts.length === 0) return;

    const subTimes: { [k: string]: number } = {};
    subProducts.forEach(sub => {
      if (sub.name && sub.duration > 0) {
        subTimes[sub.name] = sub.duration;
      }
    });

    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      totalDemand: demand,
      deadline,
      subTimes,
      color: availableColors[Math.floor(Math.random() * availableColors.length)],
    };

    onAdd(newProject);
    setName('');
    setSubProducts([{ name: 'A', duration: 1 }, { name: 'B', duration: 1 }]);
    setIsOpen(false);
  };

  const renderTrigger = () => {
    switch (variant) {
      case 'minimal':
        return (
          <button 
            onClick={() => setIsOpen(true)}
            className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-lg shadow-lg active:scale-95 transition-all"
          >
            <i className="fas fa-plus text-xs"></i>
          </button>
        );
      case 'outlined':
        return (
          <button 
            onClick={() => setIsOpen(true)}
            className="px-6 py-4 border-2 border-slate-100 text-slate-900 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all flex items-center gap-3 active:scale-95"
          >
            <i className="fas fa-plus"></i> New Project
          </button>
        );
      default:
        return (
          <button 
            onClick={() => setIsOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-md active:scale-95"
          >
            <i className="fas fa-plus"></i>
            New Project
          </button>
        );
    }
  };

  return (
    <>
      {renderTrigger()}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 sm:px-8 sm:py-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-white flex items-center justify-center shadow-lg">
                  <i className="fas fa-folder-plus text-sm sm:text-base"></i>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Configure Project</h3>
                  <p className="hidden sm:block text-xs text-slate-500 font-medium">Define production parameters and steps</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 hover:text-red-500 transition-colors p-2"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Name</label>
                  <input 
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border-2 border-slate-100 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                    placeholder="e.g. Batch #402"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Demand (Units)</label>
                  <div className="relative">
                    <i className="fas fa-cubes absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="number"
                      value={demand}
                      onChange={e => setDemand(parseInt(e.target.value) || 0)}
                      className="w-full border-2 border-slate-100 pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Day</label>
                  <div className="relative">
                    <i className="fas fa-calendar-check absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="number"
                      value={deadline}
                      onChange={e => setDeadline(parseInt(e.target.value) || 0)}
                      className="w-full border-2 border-slate-100 pl-12 pr-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                  <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Production Steps</label>
                  <button 
                    type="button" 
                    onClick={addSubProduct}
                    className="text-blue-600 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition flex items-center gap-2"
                  >
                    <i className="fas fa-plus"></i> Add
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subProducts.map((sub, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-slate-50 p-4 rounded-xl sm:rounded-2xl border border-slate-200 group hover:border-blue-200 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 font-black uppercase mb-1">ID</span>
                        <input 
                          type="text" 
                          value={sub.name}
                          onChange={e => updateSubProduct(idx, 'name', e.target.value)}
                          className="w-12 border-2 border-slate-200 rounded-lg py-1 px-1 text-center text-xs font-black uppercase focus:border-blue-500 outline-none"
                          maxLength={3}
                          required
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-[8px] text-slate-400 font-black uppercase mb-1">Duration</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={sub.duration}
                            onChange={e => updateSubProduct(idx, 'duration', parseInt(e.target.value) || 0)}
                            className="flex-1 border-2 border-slate-200 rounded-lg py-1 px-3 text-xs font-bold focus:border-blue-500 outline-none"
                            min="1"
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => removeSubProduct(idx)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                            disabled={subProducts.length <= 1}
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="px-5 py-5 sm:px-8 sm:py-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="order-2 sm:order-1 flex-1 py-3 px-6 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="order-1 sm:order-2 flex-[2] bg-slate-900 text-white py-4 px-6 rounded-xl sm:rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition shadow-xl flex items-center justify-center gap-3"
              >
                <i className="fas fa-rocket text-blue-400"></i>
                Build Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectForm;
