"""
Script to import Excel data to Convex database
Run: py scripts/import_excel.py
"""

import pandas as pd
import json
from datetime import datetime
import re

# Category mapping based on keywords in KETERANGAN
CATEGORY_MAPPING = {
    # Expense categories
    'pakan': 'Pakan',
    'obat': 'Obat & Vaksin',
    'vaksin': 'Obat & Vaksin',
    'gumboro': 'Obat & Vaksin',
    'ndib': 'Obat & Vaksin',
    'kill': 'Obat & Vaksin',
    'gas': 'Gas Elpiji',
    'elpiji': 'Gas Elpiji',
    'gaji': 'Gaji Karyawan',
    'upah': 'Gaji Karyawan',
    'listrik': 'Listrik',
    'mobil': 'Transportasi',
    'angkut': 'Transportasi',
    'bongkar': 'Transportasi',
    'timbang': 'Peralatan',
    'lampu': 'Peralatan',
    'motor': 'Peralatan',
    'admin': 'Admin Bank',
    'transfer': 'Admin Bank',
    'rekening': 'Admin Bank',
    'pullet': 'Pullet/DOC',
    'doc': 'Pullet/DOC',
    'pembangunan': 'Pembangunan',
    'kandang': 'Pembangunan',
    'material': 'Pembangunan',
    'kayu': 'Pembangunan',
    'ijin': 'Pembangunan',
    'tanah': 'Pembangunan',
    # Income categories
    'investasi': 'Investasi',
    'dp': 'Investasi',
    'setoran': 'Investasi',
    'bunga': 'Bunga Bank',
}

def guess_category(description):
    """Guess category based on keywords in description"""
    desc_lower = description.lower()
    for keyword, category in CATEGORY_MAPPING.items():
        if keyword in desc_lower:
            return category
    return 'Lain-lain'

def parse_excel(file_path, kandang_name):
    """Parse Excel file and return transactions list"""
    df = pd.read_excel(file_path)
    transactions = []
    
    current_month = None
    current_year = 2025
    
    for _, row in df.iterrows():
        # Skip headers and totals
        keterangan = str(row.get('KETERANGAN', ''))
        if pd.isna(keterangan) or 'SALDO' in keterangan.upper() or keterangan.strip() == '':
            continue
        if 'LIST' in keterangan.upper() or 'TOTAL' in keterangan.upper():
            continue
            
        # Get date info
        tgl_val = row.iloc[0]
        day_val = row.iloc[1] if len(row) > 1 else None
        
        # Parse month from TGL column
        if not pd.isna(tgl_val):
            if isinstance(tgl_val, str):
                months = {'JANUARI':1,'FEBRUARI':2,'MARET':3,'APRIL':4,'MEI':5,'JUNI':6,
                         'JULI':7,'AGUSTUS':8,'SEPTEMBER':9,'OKTOBER':10,'NOVEMBER':11,'DESEMBER':12}
                for m_name, m_num in months.items():
                    if m_name in tgl_val.upper():
                        current_month = m_num
                        break
            elif isinstance(tgl_val, (int, float)) and tgl_val > 2000:
                current_year = int(tgl_val)
        
        # Get day
        day = 1
        if not pd.isna(day_val) and isinstance(day_val, (int, float)):
            day = int(day_val)
        
        # Get amount - check both MASUK and KELUAR
        masuk = row.get('MASUK', 0)
        keluar = row.get('KELUAR', 0)
        
        if pd.isna(masuk): masuk = 0
        if pd.isna(keluar): keluar = 0
        
        # Skip if no amount
        if masuk == 0 and keluar == 0:
            continue
            
        # Determine type and amount
        if masuk > 0:
            tx_type = 'income'
            amount = float(masuk)
        else:
            tx_type = 'expense'
            amount = float(keluar)
        
        # Create date timestamp
        if current_month:
            try:
                date_obj = datetime(current_year, current_month, day)
                date_ts = int(date_obj.timestamp() * 1000)
            except:
                date_ts = int(datetime(current_year, 1, 1).timestamp() * 1000)
        else:
            date_ts = int(datetime(current_year, 1, 1).timestamp() * 1000)
        
        # Guess category
        category = guess_category(keterangan)
        
        transactions.append({
            'kandang': kandang_name,
            'description': keterangan.strip(),
            'amount': amount,
            'type': tx_type,
            'category': category,
            'date': date_ts,
        })
    
    return transactions

# Process all Excel files
files = [
    ('Data Keuangan/AYAM PERTAMA - LAPKEU 2025.xlsx', 'AYAM PERTAMA'),
    ('Data Keuangan/AYAM KEDUA - LAPKEU 2025.xlsx', 'AYAM KEDUA'),
    ('Data Keuangan/Kandang KEVIN.xlsx', 'Kandang KEVIN'),
]

all_transactions = []
for file_path, kandang_name in files:
    try:
        txs = parse_excel(file_path, kandang_name)
        all_transactions.extend(txs)
        print(f"✓ {kandang_name}: {len(txs)} transactions")
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")

# Save to JSON for import
output = {
    'kandang': ['AYAM PERTAMA', 'AYAM KEDUA', 'Kandang KEVIN'],
    'transactions': all_transactions
}

with open('import_data.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\n✓ Total: {len(all_transactions)} transactions")
print(f"✓ Saved to import_data.json")
