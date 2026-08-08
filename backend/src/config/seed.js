import bcrypt from 'bcryptjs';
import db, { run } from './database.js';

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Drop tables if they exist to start fresh
    await run(`DROP TABLE IF EXISTS users`);
    await run(`DROP TABLE IF EXISTS welfare_schemes`);
    await run(`DROP TABLE IF EXISTS grievances`);

    // Create users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create welfare_schemes table
    await run(`
      CREATE TABLE IF NOT EXISTS welfare_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        department TEXT NOT NULL,
        benefits TEXT NOT NULL,
        application_steps TEXT NOT NULL,
        required_documents TEXT NOT NULL,
        rules TEXT NOT NULL,
        external_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create grievances table
    await run(`
      CREATE TABLE IF NOT EXISTS grievances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        attachment_path TEXT,
        status TEXT DEFAULT 'Submitted',
        escalation_level INTEGER DEFAULT 0,
        sla_deadline DATETIME,
        resolution_notes TEXT,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tables created successfully. Seeding users...');

    // Seed Users (hashed passwords)
    const adminPasswordHash = bcrypt.hashSync('adminpassword', 10);
    const officerPasswordHash = bcrypt.hashSync('officerpassword', 10);

    await run(
      `INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)`,
      ['admin', adminPasswordHash, 'admin', 'All']
    );

    await run(
      `INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)`,
      ['sanitation_officer', officerPasswordHash, 'officer', 'Sanitation']
    );

    await run(
      `INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)`,
      ['water_officer', officerPasswordHash, 'officer', 'Water Supply']
    );

    await run(
      `INSERT INTO users (username, password_hash, role, department) VALUES (?, ?, ?, ?)`,
      ['welfare_officer', officerPasswordHash, 'officer', 'Social Welfare']
    );

    console.log('Users seeded. Seeding welfare schemes...');

    // Seed Welfare Schemes
    const schemes = [
      {
        title: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
        description: 'Income support of ₹6,000 per year in three equal installments to all landholding farmer families across the country to help meet agriculture and domestic needs.',
        department: 'Agriculture & Farmers Welfare',
        benefits: 'Direct cash transfer of ₹6,000 per annum directly to bank accounts.',
        application_steps: JSON.stringify([
          'Visit the PM-Kisan portal or open our chatbot.',
          'Complete the PM-Kisan self-registration form.',
          'Enter Aadhaar number and captcha code.',
          'Fill in details of landholdings and upload the land records.',
          'Submit the application and verify OTP.'
        ]),
        required_documents: JSON.stringify([
          'Aadhaar Card',
          'Land Ownership Documents (Khatauni/Patta)',
          'Bank Account Passbook',
          'Mobile Number (linked with Aadhaar)'
        ]),
        rules: JSON.stringify({
          occupation: 'farmer',
          max_income: 300000,
          min_age: 18,
          gender: 'any'
        }),
        external_link: 'https://pmkisan.gov.in/'
      },
      {
        title: 'Ladli Behna Yojana',
        description: 'Financial assistance program by the state government to improve the health, nutrition, and financial independence of women in the state.',
        department: 'Women & Child Development',
        benefits: 'Monthly financial assistance of ₹1,250 directly transferred to the beneficiary woman\'s bank account.',
        application_steps: JSON.stringify([
          'Visit the nearest Anganwadi center or local ward office.',
          'Fill the physical application form or complete it on our portal.',
          'Provide Samagra ID and Aadhaar link details.',
          'Get biometric verification done if required.',
          'Receive application acknowledgment number.'
        ]),
        required_documents: JSON.stringify([
          'Aadhaar Card',
          'Samagra Family ID / Member ID',
          'Active Mobile Number',
          'Bank account linked with Aadhaar and enabled for DBT (Direct Benefit Transfer)'
        ]),
        rules: JSON.stringify({
          gender: 'female',
          min_age: 21,
          max_age: 60,
          max_income: 250000,
          occupation: 'any'
        }),
        external_link: 'https://cmladlibahna.mp.gov.in/'
      },
      {
        title: 'Ayushman Bharat PM-JAY',
        description: 'The largest health assurance scheme in the world which aims to provide a health cover of ₹5 Lakhs per family per year for secondary and tertiary care hospitalization to over 12 crore poor and vulnerable families.',
        department: 'Health & Family Welfare',
        benefits: 'Cashless and paperless access to healthcare services up to ₹5,00,000 per family per year at empaneled hospitals.',
        application_steps: JSON.stringify([
          'Check eligibility on PM-JAY portal or via our chatbot.',
          'Visit an empaneled hospital or Ayushman Mitra kiosk.',
          'Present Aadhaar card, Ration card, or PM letter.',
          'Get verified through e-KYC.',
          'Receive Ayushman Golden Card for medical access.'
        ]),
        required_documents: JSON.stringify([
          'Aadhaar Card or Voter ID Card',
          'Ration Card (showing family details)',
          'Income Certificate or BPL Card'
        ]),
        rules: JSON.stringify({
          max_income: 120000,
          occupation: 'informal',
          min_age: 0,
          gender: 'any'
        }),
        external_link: 'https://pmjay.gov.in/'
      },
      {
        title: 'Pradhan Mantri Awas Yojana (PMAY-G)',
        description: 'Social welfare program under which the government provides financial assistance to rural poor to construct concrete homes with modern amenities.',
        department: 'Rural Development',
        benefits: 'Financial assistance of up to ₹1,20,000 in plains and ₹1,30,000 in hilly/difficult areas for house construction.',
        application_steps: JSON.stringify([
          'Gram Sabha selects beneficiaries based on Socio-Economic Caste Census (SECC) data.',
          'Eligible citizens can apply through Gram Panchayat or Online.',
          'Submit housing details, land ownership, and bank account information.',
          'Verification by local housing inspector.',
          'Sanction letter is issued and funds are disbursed in installments based on construction progress.'
        ]),
        required_documents: JSON.stringify([
          'Aadhaar Card',
          'Bank Account details',
          'Swachh Bharat Mission (SBM) registration number',
          'MGNREGA job card number',
          'Land certificate / Patta copy'
        ]),
        rules: JSON.stringify({
          max_income: 180000,
          occupation: 'any',
          min_age: 18,
          gender: 'any',
          homeless_or_poor_housing: true
        }),
        external_link: 'https://pmayg.nic.in/'
      },
      {
        title: 'Pradhan Mantri Matru Vandana Yojana (PMMVY)',
        description: 'Maternity benefit program running in all districts of the country in accordance with the National Food Security Act, 2013.',
        department: 'Women & Child Development',
        benefits: 'Direct cash incentive of ₹5,000 in three installments to pregnant women and lactating mothers for the first living child.',
        application_steps: JSON.stringify([
          'Register at the nearest Anganwadi Center (AWC) or health facility within 150 days of Last Menstrual Period (LMP).',
          'Submit Form 1-A along with documents.',
          'Submit Form 1-B for the second installment after at least one antenatal checkup (after 6 months).',
          'Submit Form 1-C for the third installment after child birth registration and initial vaccination cycle.'
        ]),
        required_documents: JSON.stringify([
          'Aadhaar Card of mother and husband',
          'MCP Card (Mother and Child Protection Card)',
          'Child Birth Registration Certificate',
          'Bank Passbook'
        ]),
        rules: JSON.stringify({
          gender: 'female',
          min_age: 19,
          pregnant_or_lactating: true,
          occupation: 'any',
          max_income: 300000
        }),
        external_link: 'https://pmmvy.wcd.gov.in/'
      }
    ];

    for (const scheme of schemes) {
      await run(
        `INSERT INTO welfare_schemes (title, description, department, benefits, application_steps, required_documents, rules, external_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scheme.title,
          scheme.description,
          scheme.department,
          scheme.benefits,
          scheme.application_steps,
          scheme.required_documents,
          scheme.rules,
          scheme.external_link
        ]
      );
    }

    console.log('Welfare schemes seeded. Seeding sample grievances...');

    // Seed mock grievances for stats/maps
    const sampleGrievances = [
      {
        tracking_id: 'HAK-2026-X11',
        title: 'Broken water pipeline leaking for 3 days',
        description: 'The primary supply pipe near Sector 4 community hall has ruptured. Drinking water is being wasted and flooding the road.',
        category: 'Water Supply',
        latitude: 22.5735,
        longitude: 88.4330,
        attachment_path: null,
        status: 'Submitted',
        escalation_level: 0,
        sla_deadline: new Date(Date.now() + 2 * 60000).toISOString(), // 2 mins from now
        resolution_notes: null
      },
      {
        tracking_id: 'HAK-2026-Y22',
        title: 'Garbage dump pile causing disease risk',
        description: 'Large municipal bin at Ward 12 is overflowing and hasn\'t been cleared for a week. Heavy stench and flies.',
        category: 'Sanitation',
        latitude: 22.5698,
        longitude: 88.4312,
        attachment_path: null,
        status: 'Under Review',
        escalation_level: 0,
        sla_deadline: new Date(Date.now() + 10 * 60000).toISOString(), // 10 mins from now
        resolution_notes: null
      },
      {
        tracking_id: 'HAK-2026-Z33',
        title: 'Streetlights not working on Bypass road',
        description: 'Entire stretch of Bypass road near Metro Station has non-functioning streetlights, posing a threat to safety of women walking home at night.',
        category: 'Road Safety',
        latitude: 22.5801,
        longitude: 88.4395,
        attachment_path: null,
        status: 'Escalated_Level_1',
        escalation_level: 1,
        sla_deadline: new Date(Date.now() - 5 * 60000).toISOString(), // Overdue
        resolution_notes: null
      },
      {
        tracking_id: 'HAK-2026-W44',
        title: 'Open manhole near primary school',
        description: 'An open sewer manhole has been left open for over two weeks. This is extremely dangerous for the children at the adjacent municipal school.',
        category: 'Sanitation',
        latitude: 22.5712,
        longitude: 88.4280,
        attachment_path: null,
        status: 'Resolved',
        escalation_level: 0,
        sla_deadline: new Date(Date.now() - 100 * 60000).toISOString(),
        resolution_notes: 'The manhole cover has been replaced and sealed properly by the sanitation crew.',
        resolved_at: new Date(Date.now() - 20 * 60000).toISOString()
      }
    ];

    for (const g of sampleGrievances) {
      await run(
        `INSERT INTO grievances (tracking_id, title, description, category, latitude, longitude, attachment_path, status, escalation_level, sla_deadline, resolution_notes, resolved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          g.tracking_id,
          g.title,
          g.description,
          g.category,
          g.latitude,
          g.longitude,
          g.attachment_path,
          g.status,
          g.escalation_level,
          g.sla_deadline,
          g.resolution_notes,
          g.resolved_at
        ]
      );
    }

    console.log('Database seeded successfully!');
    db.close();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
