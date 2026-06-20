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

export function parseCsv(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentVal = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' || char === ';') { // support comma and semicolon separators
      if (inQuotes) {
        currentVal += char;
      } else {
        row.push(currentVal.trim());
        currentVal = '';
      }
    } else if (char === '\r' || char === '\n') {
      if (inQuotes) {
        currentVal += char;
      } else {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip LF
        }
        row.push(currentVal.trim());
        if (row.length > 0 && row.some(cell => cell !== '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      }
    } else {
      currentVal += char;
    }
  }
  if (currentVal !== '' || row.length > 0) {
    row.push(currentVal.trim());
    if (row.some(cell => cell !== '')) {
      lines.push(row);
    }
  }

  if (lines.length < 2) return [];

  const headers = lines[0].map(h => h.toLowerCase().trim().replace(/['"“”]/g, ''));
  const results: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const line = lines[r];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      if (line[c] !== undefined) {
        obj[headers[c]] = line[c];
      } else {
        obj[headers[c]] = '';
      }
    }
    results.push(obj);
  }

  return results;
}

const NUMERIC_FIELDS = new Set([
  'price', 'stock', 'minstock', 'declassedstock', 'amount', 
  'paidamount', 'totalht', 'totalttc'
]);

const BOOLEAN_FIELDS = new Set([
  'isreceived'
]);

const JSON_FIELDS = new Set([
  'items'
]);

export function mapCsvRowsToSchema(csvRows: Record<string, string>[], schemaKeys: string[], defaultValues: Record<string, any> = {}): any[] {
  return csvRows.map(row => {
    const obj: any = { ...defaultValues };
    
    for (const key of schemaKeys) {
      const lowerKey = key.toLowerCase();
      let csvValue: string | undefined = undefined;
      
      for (const csvKey of Object.keys(row)) {
        if (csvKey.toLowerCase().replace(/[\s_-]/g, '') === lowerKey.replace(/[\s_-]/g, '')) {
          csvValue = row[csvKey];
          break;
        }
      }
      
      if (csvValue !== undefined && csvValue !== null) {
        if (NUMERIC_FIELDS.has(lowerKey)) {
          const cleanVal = csvValue.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
          obj[key] = parseFloat(cleanVal) || 0;
        } else if (BOOLEAN_FIELDS.has(lowerKey)) {
          const valLower = csvValue.toLowerCase().trim();
          obj[key] = valLower === 'true' || valLower === 'vrai' || valLower === '1' || valLower === 'yes' || valLower === 'oui';
        } else if (JSON_FIELDS.has(lowerKey)) {
          try {
            obj[key] = JSON.parse(csvValue);
          } catch (e) {
            obj[key] = [];
          }
        } else {
          obj[key] = csvValue;
        }
      } else {
        if (obj[key] === undefined) {
          if (NUMERIC_FIELDS.has(lowerKey)) {
            obj[key] = 0;
          } else if (BOOLEAN_FIELDS.has(lowerKey)) {
            obj[key] = false;
          } else if (JSON_FIELDS.has(lowerKey)) {
            obj[key] = [];
          } else {
            obj[key] = '';
          }
        }
      }
    }
    
    return obj;
  });
}
