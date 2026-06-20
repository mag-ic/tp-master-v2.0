import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const rootDir = process.cwd();
    const files = fs.readdirSync(rootDir);
    const backupFile = files.find(f => f.startsWith('Backup_TPMaster') && f.endsWith('.json'));
    
    if (!backupFile) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
    }
    
    const filePath = path.join(rootDir, backupFile);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Backup Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
