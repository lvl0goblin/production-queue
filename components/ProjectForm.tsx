
import React, { useState } from 'react';
import { Project } from '../types';

interface SubProductEntry {
  name: string;
  duration: number;
}

interface ProjectFormProps {
  onAdd: (p: Project) => void;
  availableColors: string[];
}

const ProjectForm: React.FC<ProjectFormProps> = ({ onAdd, availableColors }) => {
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

  return (
    <>
      {/* Trigger Button (Remains in Sidebar) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3 rounded-lg hover:bg-slate-800 transition font-bold shadow-md"
      >
        <i className="fas fa-plus"></i>
        New Project
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-2 rounded-lg text-white">
                  <i className="fas fa-folder-plus"></i>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Configure New Project</h3>
                  <p className="text-sm text-slate-500">Define production parameters and sub-product durations</p>
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Project Name</label>
                  <input 
                    autoFocus
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border-2 border-slate-100 p-3 rounded-xl text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                    placeholder="e.g. Q3 Manufacturing Batch"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Demand (Units)</label>
                  <div className="relative">
                    <i className="fas fa-cubes absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="number"
                      value={demand}
                      onChange={e => setDemand(parseInt(e.target.value) || 0)}
                      className="w-full border-2 border-slate-100 pl-10 pr-4 py-3 rounded-xl text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Deadline (Day)</label>
                  <div className="relative">
                    <i className="fas fa-calendar-check absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                    <input 
                      type="number"
                      value={deadline}
                      onChange={e => setDeadline(parseInt(e.target.value) || 0)}
                      className="w-full border-2 border-slate-100 pl-10 pr-4 py-3 rounded-xl text-base outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50/50"
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Sub-products Section */}
              <div>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Production Steps & Durations</label>
                  <button 
                    type="button" 
                    onClick={addSubProduct}
                    className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center gap-2"
                  >
                    <i className="fas fa-plus-circle"></i> Add Component
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {subProducts.map((sub, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 group hover:border-blue-200 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">ID</span>
                        <input 
                          type="text" 
                          value={sub.name}
                          onChange={e => updateSubProduct(idx, 'name', e.target.value)}
                          className="w-14 border-2 border-slate-200 rounded-lg py-1 px-2 text-center text-sm font-bold uppercase focus:border-blue-500 outline-none"
                          maxLength={3}
                          required
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mb-1">Duration (Sessions)</span>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={sub.duration}
                            onChange={e => updateSubProduct(idx, 'duration', parseInt(e.target.value) || 0)}
                            className="flex-1 border-2 border-slate-200 rounded-lg py-1 px-3 text-sm focus:border-blue-500 outline-none"
                            min="1"
                            required
                          />
                          <button 
                            type="button" 
                            onClick={() => removeSubProduct(idx)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                            disabled={subProducts.length <= 1}
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {subProducts.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 italic">
                    No components added. Every project needs at least one production step.
                  </div>
                )}
              </div>
            </form>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex gap-4">
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="flex-[2] bg-blue-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <i className="fas fa-rocket"></i>
                Generate Production Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectForm;
