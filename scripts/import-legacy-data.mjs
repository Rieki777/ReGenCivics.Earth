import fs from 'fs';
import path from 'path';

// Parse CSV with semicolon delimiter and quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

// Map CSV path type to database enum
function mapPathType(csvPath) {
  if (!csvPath) return null;
  
  const pathLower = csvPath.toLowerCase();
  if (pathLower.includes('live') || pathLower.includes('co-create with one/some of the regen land')) {
    return 'live';
  } else if (pathLower.includes('create with regens') || pathLower.includes('co-create with one/some of the alliance')) {
    return 'create_with_regens';
  } else if (pathLower.includes('offer alliance') || pathLower.includes('organization and i want to explore joining')) {
    return 'alliance';
  } else if (pathLower.includes('offer land')) {
    return 'land_partner';
  } else if (pathLower.includes('finance') || pathLower.includes('invest')) {
    return 'finance';
  } else if (pathLower.includes('role')) {
    return 'role';
  } else if (pathLower.includes('event') || pathLower.includes('participate')) {
    return 'something_else';
  } else if (pathLower.includes('something else')) {
    return 'something_else';
  } else if (pathLower.includes('interested in visiting')) {
    return 'live';
  }
  return 'something_else';
}

// Find email anywhere in row values
function findEmailInRow(row) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === 'string') {
      const match = value.match(emailRegex);
      if (match) {
        return match[0];
      }
    }
  }
  return null;
}

// Process all CSV files
async function processCSVFiles() {
  const csvFiles = [
    '/home/ubuntu/upload/tripetto-export-zLuA2gMYffzEDRKh5gvW-1e0dd275904d91a5e5d19bbc4e138154005a989a011298da26043b5211fcd656.csv',
    '/home/ubuntu/upload/tripetto-export-zLuA2gMYffzEDRKh5gvW-355b292da43a8c7a6dbe2bdab4da43333996b9cb2b853a074719e412fa5f0e46.csv',
    '/home/ubuntu/upload/tripetto-export-zLuA2gMYffzEDRKh5gvW-529c6ba651d1d644bd53e630f0c69862c0f2faf0fdbee26e51217f4f5be54aec(1).csv'
  ];
  
  const allInquiries = [];
  
  for (const filePath of csvFiles) {
    console.log(`\nProcessing: ${path.basename(filePath)}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleanContent = content.replace(/^\uFEFF/, '');
    const { headers, rows } = parseCSV(cleanContent);
    
    console.log(`  Headers count: ${headers.length}`);
    console.log(`  Rows count: ${rows.length}`);
    
    // Find the path type column
    const pathColumn = headers.find(h => 
      h.includes('which most apply') || h.includes('Hi Friend')
    );
    
    for (const row of rows) {
      const dateSubmitted = row['Date submitted'];
      const identification = row['Identification'];
      const pathValue = pathColumn ? row[pathColumn] : '';
      const pathType = mapPathType(pathValue);
      
      if (!pathType) {
        console.log(`  Skipping row - no valid path: "${pathValue?.substring(0, 50)}..."`);
        continue;
      }
      
      // Find email anywhere in the row
      const email = findEmailInRow(row);
      
      if (!email) {
        console.log(`  Skipping row - no email found for: ${identification}`);
        continue;
      }
      
      console.log(`  Found: ${pathType} - ${email}`);
      
      // Extract land projects
      const landProjects = [];
      const landProjectNames = [
        'Finca Sagrada - Ecuador', 'Heartland Collective - California', 
        'Lala Gardens - Colorado', 'La Tierra - Costa Rica', 'Liminal Village - Italy',
        'Salt Cross - United Kingdom', 'StarSeed Village - Guatemala', 
        'Tabi Regenerativo - Mexico', 'The Nyx - Bali', 'Traditional Dream Factory - Portugal',
        'Tioga Community - N.E. USA', 'Ubuntu - Nicaragua', 'Valhalla Farms Coop - Canada',
        'ReGen Synergy Village & Incubator - North Carolina', 'Our NeighbourGood - New Zealand',
        'All of the above - Earth'
      ];
      for (const proj of landProjectNames) {
        if (row[proj] === 'Selected') {
          landProjects.push(proj);
        }
      }
      
      // Extract alliance organizations
      const allianceOrgs = [];
      const allianceOrgNames = [
        'SEEDS Economy - joinseeds.earth', 'Local Scale - Localscale.org',
        'Open Impact - Openfuturecoalition.org', 'Hypha - hypha.earth',
        'United Planet - UP.Game', 'Regen Garden - regengarden.io',
        'Permatours - permatours.org', 'Desa - desa.earth',
        'Universe Land Trust - theuniverse.org', 'Nestr - Nestr.io',
        'Maptio - Maptio.com', 'Closer - closer.earth', 'Cohere - Cohere.network',
        'Regen Living - regenliving.eco', 'ALL - Send my details to all Alliance Organizations!'
      ];
      for (const org of allianceOrgNames) {
        if (row[org] === 'Selected') {
          allianceOrgs.push(org);
        }
      }
      
      // Extract role archetypes
      const roleArchetypes = [];
      for (const [key, value] of Object.entries(row)) {
        if (value === 'Selected') {
          if (key.includes('Building and Developing')) roleArchetypes.push('Building and Developing');
          if (key.includes('Researching and Architecting')) roleArchetypes.push('Researching and Architecting');
          if (key.includes('Facilitating and Space Holding')) roleArchetypes.push('Facilitating and Space Holding');
          if (key.includes('Catalysing and Connecting')) roleArchetypes.push('Catalysing and Connecting');
          if (key.includes('Storytelling and Communicating')) roleArchetypes.push('Storytelling and Communicating');
        }
      }
      
      // Extract capitals
      const capitals = [];
      for (const [key, value] of Object.entries(row)) {
        if (value === 'Selected') {
          if (key.includes('Intellectual')) capitals.push('Intellectual');
          if (key.includes('Social')) capitals.push('Social');
          if (key.includes('Natural')) capitals.push('Natural');
          if (key.includes('Spiritual')) capitals.push('Spiritual');
          if (key.includes('Financial')) capitals.push('Financial');
          if (key.includes('Experiential')) capitals.push('Experiential');
          if (key.includes('Cultural')) capitals.push('Cultural');
          if (key.includes('Vital')) capitals.push('Vital');
          if (key.includes('Material')) capitals.push('Material');
        }
      }
      
      // Find URL fields
      const orgUrl = row['Best link to explore your organization?'] || row['Best link to explore your project?'] || null;
      const description = row['Tell us more about how our partnership will help create a diversity of Regenerative Cultures!'] || null;
      const uniqueContrib = row['Tell us more! What unique way would you like to contribute?'] || row['What else do you want us to know?'] || null;
      
      // Build inquiry object
      const inquiry = {
        pathType,
        email,
        status: 'new',
        createdAt: dateSubmitted,
        organizationUrl: orgUrl,
        partnershipDescription: description,
        landProjects: landProjects.length > 0 ? JSON.stringify(landProjects) : null,
        allianceOrganizations: allianceOrgs.length > 0 ? JSON.stringify(allianceOrgs) : null,
        roleArchetypes: [...new Set(roleArchetypes)].length > 0 ? JSON.stringify([...new Set(roleArchetypes)]) : null,
        uniqueContribution: uniqueContrib,
        additionalNotes: [...new Set(capitals)].length > 0 ? `Capitals: ${[...new Set(capitals)].join(', ')}` : null,
        _originalId: identification,
        _originalPath: pathValue
      };
      
      allInquiries.push(inquiry);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Total inquiries parsed: ${allInquiries.length}`);
  
  // Group by path type
  const byPath = {};
  for (const inq of allInquiries) {
    byPath[inq.pathType] = (byPath[inq.pathType] || 0) + 1;
  }
  console.log('\nBy path type:');
  for (const [pathType, count] of Object.entries(byPath)) {
    console.log(`  ${pathType}: ${count}`);
  }
  
  // Generate SQL
  const sqlStatements = [];
  for (const inq of allInquiries) {
    let createdAt;
    try {
      const parsed = new Date(inq.createdAt);
      createdAt = !isNaN(parsed.getTime()) 
        ? parsed.toISOString().slice(0, 19).replace('T', ' ')
        : new Date().toISOString().slice(0, 19).replace('T', ' ');
    } catch {
      createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    
    const escapeSql = (val) => {
      if (val === null || val === undefined || val === '') return 'NULL';
      return `'${String(val).replace(/'/g, "''")}'`;
    };
    
    sqlStatements.push(`INSERT INTO general_inquiries (pathType, email, status, organizationUrl, partnershipDescription, landProjects, allianceOrganizations, roleArchetypes, uniqueContribution, additionalNotes, createdAt) VALUES (${escapeSql(inq.pathType)}, ${escapeSql(inq.email)}, 'new', ${escapeSql(inq.organizationUrl)}, ${escapeSql(inq.partnershipDescription)}, ${escapeSql(inq.landProjects)}, ${escapeSql(inq.allianceOrganizations)}, ${escapeSql(inq.roleArchetypes)}, ${escapeSql(inq.uniqueContribution)}, ${escapeSql(inq.additionalNotes)}, '${createdAt}');`);
  }
  
  // Write SQL to file
  fs.writeFileSync('/tmp/import-inquiries.sql', sqlStatements.join('\n'));
  console.log(`\nSQL file written to /tmp/import-inquiries.sql`);
  console.log(`Total SQL statements: ${sqlStatements.length}`);
  
  // Also output JSON for verification
  fs.writeFileSync('/tmp/import-inquiries.json', JSON.stringify(allInquiries, null, 2));
  console.log(`JSON file written to /tmp/import-inquiries.json`);
  
  return allInquiries;
}

processCSVFiles().catch(console.error);
