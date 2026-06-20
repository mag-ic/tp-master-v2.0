import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportToCsv(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    alert("Aucune donnée à exporter.");
    return;
  }
  
  const separator = ',';
  
  // Create a consistent set of headers from all rows
  const headerSet = new Set<string>();
  rows.forEach(row => {
    Object.keys(row).forEach(key => headerSet.add(key));
  });
  const header = Array.from(headerSet);

  const csvRows = [
    header.join(separator),
    ...rows.map(row => 
      header.map(fieldName => {
        if (!row.hasOwnProperty(fieldName)) {
          return '';
        }
        
        let cell = (row as any)[fieldName];
        
        if (cell === null || cell === undefined) {
          return '';
        }

        if (typeof cell === 'object') {
          cell = JSON.stringify(cell);
        }

        let cellString = String(cell).replace(/"/g, '""');
        if (cellString.search(/("|,|\n)/g) >= 0) {
          cellString = `"${cellString}"`;
        }
        return cellString;
      }).join(separator)
    )
  ];
  
  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
