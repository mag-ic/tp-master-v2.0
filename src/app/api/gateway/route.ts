import { NextResponse } from 'next/server';
import pg from 'pg';

export const dynamic = 'force-dynamic';

// Automatically parse NUMERIC (OID 1700) to float
pg.types.setTypeParser(1700, function(val) {
  return val === null ? null : parseFloat(val);
});

// Automatically parse INT8 (OID 20) to int
pg.types.setTypeParser(20, function(val) {
  return val === null ? null : parseInt(val, 10);
});

const connectionString = 'postgresql://postgres.ygkvvgvixjcjlzzciluf:FFMm&Njuz_Jv5Z$@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const tableColumns: Record<string, string[]> = {
  products: ['id', 'name', 'sku', 'category', 'price', 'stock', 'minStock', 'declassedStock'],
  contacts: ['id', 'name', 'type', 'email', 'phone', 'address', 'city', 'ice', 'ifId'],
  payments: ['id', 'invoiceNumber', 'customerName', 'amount', 'paidAmount', 'date', 'dueDate', 'status', 'method', 'isReceived'],
  charges: ['id', 'reference', 'supplierName', 'description', 'category', 'amount', 'paidAmount', 'status', 'date', 'method', 'responsible'],
  deliveries: ['id', 'deliveryNumber', 'totalHT', 'totalTTC', 'date', 'paymentMethod', 'clientId', 'clientName', 'items'],
  stockentries: ['id', 'entryNumber', 'totalTTC', 'date', 'supplierId', 'supplierName', 'attachmentUrl', 'items'],
  savtickets: ['id', 'ticketNumber', 'clientName', 'productName', 'description', 'status', 'createdAt'],
  cheques: ['id', 'number', 'bank', 'amount', 'dueDate', 'status', 'type'],
  apports: ['id', 'reference', 'amount', 'date', 'method', 'description'],
  spareparts: ['id', 'name', 'sku', 'productId', 'productName', 'stock', 'price', 'category'],
  supplieradvances: ['id', 'date', 'supplierId', 'supplierName', 'amount', 'method', 'description', 'status', 'linkedEntryNumber']
};

function dbToCamel(table: string, row: any) {
  if (!row) return row;
  const keys = tableColumns[table.toLowerCase()];
  if (!keys) return row;
  const newRow: any = {};
  for (const k of keys) {
    const lowerK = k.toLowerCase();
    if (row[lowerK] !== undefined) {
      let val = row[lowerK];
      // Parse JSONB columns
      if (k === 'items' && typeof val === 'string') {
        try {
          val = JSON.parse(val);
        } catch (e) {}
      }
      newRow[k] = val;
    }
  }
  return newRow;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');
  const id = searchParams.get('id');

  if (!table) {
    return NextResponse.json({ error: 'Missing table parameter' }, { status: 400 });
  }

  const normalizedTable = table.toLowerCase();
  if (!tableColumns[normalizedTable]) {
    return NextResponse.json({ error: `Unsupported table: ${table}` }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    if (id) {
      const res = await client.query(`SELECT * FROM "${normalizedTable}" WHERE id = $1 LIMIT 1`, [id]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      return NextResponse.json(dbToCamel(normalizedTable, res.rows[0]));
    } else {
      const res = await client.query(`SELECT * FROM "${normalizedTable}"`);
      const mapped = res.rows.map(row => dbToCamel(normalizedTable, row));
      return NextResponse.json(mapped);
    }
  } catch (error: any) {
    console.error(`Database GET error on ${table}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table, id, data } = body;

    if (!action || !table) {
      return NextResponse.json({ error: 'Missing action or table' }, { status: 400 });
    }

    const normalizedTable = table.toLowerCase();
    if (!tableColumns[normalizedTable]) {
      return NextResponse.json({ error: `Unsupported table: ${table}` }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      if (action === 'set') {
        const allowedKeys = tableColumns[normalizedTable];
        const keys = Object.keys(data).filter(k => allowedKeys.includes(k));
        if (!keys.includes('id') && id) {
          keys.unshift('id');
          data.id = id;
        }

        const columns = keys.map(k => `"${k.toLowerCase()}"`);
        const values = keys.map(k => {
          const val = data[k];
          if (k === 'items' && typeof val !== 'string') {
            return JSON.stringify(val);
          }
          return val;
        });

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        let queryText = '';
        if (columns.length > 1) {
          const updateSet = keys
            .filter(k => k.toLowerCase() !== 'id')
            .map(k => `"${k.toLowerCase()}" = EXCLUDED."${k.toLowerCase()}"`)
            .join(', ');
          queryText = `
            INSERT INTO "${normalizedTable}" (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (id) DO UPDATE SET ${updateSet}
          `;
        } else {
          queryText = `
            INSERT INTO "${normalizedTable}" (${columns.join(', ')})
            VALUES (${placeholders})
            ON CONFLICT (id) DO NOTHING
          `;
        }

        await client.query(queryText, values);
        return NextResponse.json({ success: true });

      } else if (action === 'update') {
        const allowedKeys = tableColumns[normalizedTable];
        const keys = Object.keys(data).filter(k => allowedKeys.includes(k) && k.toLowerCase() !== 'id');
        
        if (keys.length === 0) {
          return NextResponse.json({ success: true, message: 'No fields to update' });
        }

        const columns = keys.map(k => `"${k.toLowerCase()}"`);
        const values = keys.map(k => {
          const val = data[k];
          if (k === 'items' && typeof val !== 'string') {
            return JSON.stringify(val);
          }
          return val;
        });
        
        const targetId = id || data.id;
        if (!targetId) {
          return NextResponse.json({ error: 'Missing ID for update' }, { status: 400 });
        }

        values.push(targetId);
        const updateSet = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
        const queryText = `UPDATE "${normalizedTable}" SET ${updateSet} WHERE id = $${values.length}`;

        await client.query(queryText, values);
        return NextResponse.json({ success: true });

      } else if (action === 'delete') {
        const targetId = id;
        if (!targetId) {
          return NextResponse.json({ error: 'Missing ID for delete' }, { status: 400 });
        }

        await client.query(`DELETE FROM "${normalizedTable}" WHERE id = $1`, [targetId]);
        return NextResponse.json({ success: true });

      } else {
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Database POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
