/**
 * CSV Import Dialog
 * Allows bulk import of equipment or roles from CSV files
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CSVImportDialogProps {
  type: 'equipment' | 'roles';
  onImport: (data: any[]) => void;
}

export function CSVImportDialog({ type, onImport }: CSVImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      setErrors(['CSV file must contain at least a header row and one data row']);
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const newErrors: string[] = [];
    const parsed: any[] = [];

    // Validate headers based on type
    if (type === 'equipment') {
      const requiredHeaders = ['category', 'name', 'quantity', 'description', 'estimatedvalue'];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        newErrors.push(`Missing required columns: ${missing.join(', ')}`);
      }
    } else {
      const requiredHeaders = ['title', 'category', 'description', 'hoursperweek', 'weeksneeded', 'hourlyrate'];
      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        newErrors.push(`Missing required columns: ${missing.join(', ')}`);
      }
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      if (type === 'equipment') {
        const quantity = parseInt(row.quantity);
        const estimatedValue = parseFloat(row.estimatedvalue);
        
        if (isNaN(quantity) || quantity <= 0) {
          newErrors.push(`Row ${i}: Invalid quantity`);
          continue;
        }
        if (isNaN(estimatedValue) || estimatedValue < 0) {
          newErrors.push(`Row ${i}: Invalid estimated value`);
          continue;
        }

        parsed.push({
          category: row.category,
          name: row.name,
          quantity,
          description: row.description,
          estimatedValue,
          customValue: null
        });
      } else {
        const hoursPerWeek = parseFloat(row.hoursperweek);
        const weeksNeeded = parseInt(row.weeksneeded);
        const hourlyRate = parseFloat(row.hourlyrate);
        
        if (isNaN(hoursPerWeek) || hoursPerWeek <= 0) {
          newErrors.push(`Row ${i}: Invalid hours per week`);
          continue;
        }
        if (isNaN(weeksNeeded) || weeksNeeded <= 0) {
          newErrors.push(`Row ${i}: Invalid weeks needed`);
          continue;
        }
        if (isNaN(hourlyRate) || hourlyRate <= 0) {
          newErrors.push(`Row ${i}: Invalid hourly rate`);
          continue;
        }

        parsed.push({
          title: row.title,
          category: row.category,
          description: row.description,
          hoursPerWeek,
          weeksNeeded,
          hourlyRate,
          estimatedValue: hoursPerWeek * weeksNeeded * hourlyRate,
          customValue: null
        });
      }
    }

    setErrors(newErrors);
    setCsvData(parsed);
    setPreview(parsed.slice(0, 5)); // Show first 5 rows
  };

  const handleImport = () => {
    if (csvData.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    onImport(csvData);
    toast.success(`Successfully imported ${csvData.length} ${type}`);
    setIsOpen(false);
    setCsvData([]);
    setPreview([]);
    setErrors([]);
  };

  const downloadTemplate = () => {
    let csvContent = '';
    if (type === 'equipment') {
      csvContent = 'category,name,quantity,description,estimatedValue\n';
      csvContent += 'Agriculture,Tractor,1,Farm tractor 40-60 HP,35000\n';
      csvContent += 'Construction,Excavator,1,Site preparation,85000\n';
    } else {
      csvContent = 'title,category,description,hoursPerWeek,weeksNeeded,hourlyRate\n';
      csvContent += 'Farm Manager,Operations & Management,Overall farm operations,40,52,50\n';
      csvContent += 'Permaculture Designer,Design & Planning,Site design and implementation,20,26,65\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-[#7dd87d] text-[#4a7c59] text-sm">
          <Upload className="w-4 h-4 mr-2" />
          Import from CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {type === 'equipment' ? 'Equipment' : 'Roles'} from CSV</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="bg-[#f0f7f0] p-4 rounded-lg">
            <h3 className="font-bold text-[#1a472a] mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              CSV Format Requirements
            </h3>
            <p className="text-sm text-[#1a472a]/70 mb-2">
              Your CSV file must include the following columns:
            </p>
            {type === 'equipment' ? (
              <ul className="text-sm text-[#1a472a]/70 space-y-1 list-disc list-inside">
                <li><strong>category</strong>: Equipment category (e.g., Agriculture, Construction)</li>
                <li><strong>name</strong>: Equipment name</li>
                <li><strong>quantity</strong>: Number of units needed</li>
                <li><strong>description</strong>: Brief description</li>
                <li><strong>estimatedValue</strong>: Estimated cost per unit</li>
              </ul>
            ) : (
              <ul className="text-sm text-[#1a472a]/70 space-y-1 list-disc list-inside">
                <li><strong>title</strong>: Role title</li>
                <li><strong>category</strong>: Role category (e.g., Operations & Management)</li>
                <li><strong>description</strong>: Role description</li>
                <li><strong>hoursPerWeek</strong>: Hours per week</li>
                <li><strong>weeksNeeded</strong>: Number of weeks</li>
                <li><strong>hourlyRate</strong>: Hourly rate in your currency</li>
              </ul>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={downloadTemplate}
            >
              <FileText className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a472a] mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-[#1a472a]
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-[#7dd87d] file:text-white
                hover:file:bg-[#4a7c59] cursor-pointer"
            />
          </div>

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Errors Found
              </h4>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <h4 className="font-bold text-[#1a472a] mb-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-[#7dd87d]" />
                Preview ({csvData.length} items will be imported)
              </h4>
              <div className="border border-[#7dd87d]/30 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f0f7f0]">
                      <tr>
                        {type === 'equipment' ? (
                          <>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Category</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Name</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Qty</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Value</th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Title</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Category</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Hrs/Wk</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Weeks</th>
                            <th className="px-3 py-2 text-left text-[#1a472a]">Rate</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item, index) => (
                        <tr key={index} className="border-t border-[#7dd87d]/20">
                          {type === 'equipment' ? (
                            <>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.category}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.name}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.quantity}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">${item.estimatedValue.toLocaleString()}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.title}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.category}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.hoursPerWeek}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">{item.weeksNeeded}</td>
                              <td className="px-3 py-2 text-[#1a472a]/70">${item.hourlyRate}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvData.length > 5 && (
                  <div className="px-3 py-2 bg-[#f0f7f0] text-xs text-[#1a472a]/80 text-center">
                    ... and {csvData.length - 5} more items
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={csvData.length === 0 || errors.length > 0}
              className="bg-[#7dd87d] hover:bg-[#4a7c59] text-white"
            >
              Import {csvData.length} Items
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
