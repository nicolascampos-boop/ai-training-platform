// import-by-position.js
// Import script that reads by column position instead of headers

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Column positions (0-indexed)
const COLUMNS = {
  ORIGIN: 0,           // Column A: Origin Content
  DATE: 1,             // Column B: Date
  NAME: 2,             // Column C: Name
  LINK: 3,             // Column D: Link
  DESCRIPTION: 4,      // Column E: Small description
  ONE_LINER: 5,        // Column F: One-liner
  CAMI_RATING: 6,      // Column G: Cami Rating
  NICO_RATING: 7,      // Column H: Nico Rating
  CATEGORY: 8,         // Column I: Category
  STAGE: 9             // Column J: Course creation - Stage
};

// Category mapping
const categoryMap = {
  'Foundations & Mental Models': 'AI Fundamentals',
  'Developer Tooling': 'AI-Assisted Coding',
  'Systems & Architecture': 'Platform Deep-Dives',
  'Product / Process Thinking': 'Implementation Strategy',
  'AI Agents & Automation': 'Agent Development',
  'Prompting & Context Engineering': 'Prompt Engineering',
  'Ecosystem & Industry Signals': 'Implementation Strategy',
  'Community & Practitioner Insight': 'Applied Use Cases',
  'Productivity & Knowledge Work': 'Implementation Strategy'
};

// Stage to Week mapping
const stageToWeek = {
  'Start': 'Week 1',
  'Start-Medium': 'Week 2',
  'Start-Mid': 'Week 2',
  'Medium': 'Week 3',
  'Middle': 'Week 3',
  'Mid': 'Week 3',
  'Start Tech pro - Normal Middle optional': 'Week 2',
  'Start - Medium': 'Week 2',
  'Start Normal / Tech non essential extra': 'Week 1',
  'Start Normal / tech non essential Extra': 'Week 1',
  'Start Tech / Start Middle Normal': 'Week 2',
  'Start-medium - Tech / Advance nomal': 'Week 3',
  'Star-Mid': 'Week 2',
  'Extra Tips': 'Optional',
  'Extra - Good Practice': 'Optional',
  'Extra not Essential': 'Optional',
  'Nice extra tool': 'Optional',
  '-': 'Week 1'
};

function guessContentType(link, name) {
  const url = (link || '').toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Video';
  if (url.includes('github.com')) return 'Tool';
  if (url.includes('docs.') || url.includes('documentation')) return 'Documentation';
  if (name && name.toLowerCase().includes('tutorial')) return 'Tutorial';
  if (name && name.toLowerCase().includes('course')) return 'Course';
  return 'Article';
}

function determineTools(name, link) {
  const text = ((name || '') + ' ' + (link || '')).toLowerCase();
  const tools = [];
  
  if (text.includes('claude')) tools.push('Claude');
  if (text.includes('cursor')) tools.push('Cursor');
  if (text.includes('make.com') || text.includes('make')) tools.push('Make');
  if (text.includes('zapier')) tools.push('Zapier');
  if (text.includes('n8n')) tools.push('n8n');
  if (text.includes('figma')) tools.push('Figma');
  if (text.includes('notion')) tools.push('Notion');
  
  return tools.length > 0 ? tools.join(', ') : 'General';
}

function estimateTime(contentType) {
  switch(contentType) {
    case 'Video': return '30-45min';
    case 'Tutorial': return '1-2hrs';
    case 'Documentation': return '20-30min';
    case 'Course': return '2-4hrs';
    default: return '15-20min';
  }
}

function generateUseCaseTags(topic) {
  const tagMap = {
    'AI Fundamentals': 'Learning, Understanding',
    'Prompt Engineering': 'Prompting, Optimization',
    'Workflow Automation': 'Automation, Integration',
    'Agent Development': 'Agent Building, Automation',
    'AI-Assisted Coding': 'Coding, Development',
    'Implementation Strategy': 'Strategy, Planning',
    'Platform Deep-Dives': 'Tools, Platforms',
    'Applied Use Cases': 'Examples, Case Studies'
  };
  
  return tagMap[topic] || 'General';
}

function cleanData(row) {
  const name = row[COLUMNS.NAME];
  const link = row[COLUMNS.LINK];
  const category = row[COLUMNS.CATEGORY];
  const stage = row[COLUMNS.STAGE] || 'Start';
  const nicoRating = row[COLUMNS.NICO_RATING];
  const description = row[COLUMNS.DESCRIPTION] || '';
  
  // Skip if no name or link
  if (!name || !link || link === '') return null;
  
  // Skip obvious header rows
  if (name === 'Name' || link === 'Link') return null;
  
  // Parse rating
  let rating = 3; // Default
  if (nicoRating && !isNaN(parseFloat(nicoRating))) {
    rating = Math.round(parseFloat(nicoRating));
  }
  
  // Map category
  const primaryTopic = categoryMap[category] || 'AI Fundamentals';
  
  // Map stage to week
  const weekSuggested = stageToWeek[stage] || 'Week 1';
  
  // Determine skill level
  let skillLevel = 'Beginner';
  if (stage && (stage.includes('Medium') || stage.includes('Middle') || stage.includes('Mid'))) {
    skillLevel = 'Intermediate';
  } else if (stage && (stage.includes('Advance') || stage.includes('Advanced'))) {
    skillLevel = 'Advanced';
  }
  
  const contentType = guessContentType(link, name);
  
  return {
    title: String(name).trim(),
    link: String(link).trim(),
    content_type: contentType,
    primary_topic: primaryTopic,
    skill_level: skillLevel,
    tools_covered: determineTools(name, link),
    learning_modality: contentType === 'Video' ? 'Read/Watch' : 
                       contentType === 'Tutorial' ? 'Hands-On' : 'Read/Watch',
    time_investment: estimateTime(contentType),
    quality_rating: rating,
    relevance_score: rating,
    status_priority: rating >= 4 ? 'Core' : rating >= 3 ? 'Supplemental' : 'To Review',
    use_case_tags: generateUseCaseTags(primaryTopic),
    your_notes: String(description || '').trim(),
    week_suggested: weekSuggested
  };
}

async function importResources(filePath) {
  try {
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Read as array of arrays (not objects)
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`📊 Found ${data.length} rows in spreadsheet`);
    
    // Show first few rows for debugging
    console.log('\n🔍 First 3 rows:');
    data.slice(0, 3).forEach((row, i) => {
      console.log(`Row ${i}:`, row.slice(0, 5)); // Show first 5 columns
    });
    
    // Clean and map data
    const cleanedData = data
      .map(cleanData)
      .filter(item => item !== null);
    
    console.log(`\n✅ Processed ${cleanedData.length} valid resources`);
    
    if (cleanedData.length === 0) {
      console.log('❌ No valid resources to import');
      return;
    }
    
    // Show preview
    console.log('\n📋 Preview of first resource:');
    console.log(JSON.stringify(cleanedData[0], null, 2));
    
    console.log(`\n⚠️  Ready to import ${cleanedData.length} resources to Supabase`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Import to Supabase in batches
    console.log('\n🚀 Starting import...');
    const batchSize = 10;
    let successCount = 0;
    
    for (let i = 0; i < cleanedData.length; i += batchSize) {
      const batch = cleanedData.slice(i, i + batchSize);
      
      const { data: insertedData, error } = await supabase
        .from('resources')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error.message);
        continue;
      }
      
      successCount += batch.length;
      console.log(`✅ Imported batch ${i / batchSize + 1} (${batch.length} resources)`);
    }
    
    console.log('\n🎉 Import complete!');
    console.log(`✅ Successfully imported ${successCount} resources`);
    console.log('\n📊 Check your app at your Vercel URL');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const filePath = process.argv[2] || './AI Courses Table.xlsx';

console.log('🚀 AI Training Library - Resource Importer (By Position)');
console.log('========================================================\n');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

importResources(filePath);