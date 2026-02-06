// import-resources.js
// Script to import resources from Excel to Supabase

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Category mapping from your spreadsheet to new taxonomy
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

// Function to determine content type from link
function guessContentType(link, name) {
  const url = link.toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Video';
  if (url.includes('github.com')) return 'Tool';
  if (url.includes('docs.') || url.includes('documentation')) return 'Documentation';
  if (name && name.toLowerCase().includes('tutorial')) return 'Tutorial';
  if (name && name.toLowerCase().includes('course')) return 'Course';
  return 'Article';
}

// Function to clean and map data
function cleanData(row) {
  // Try multiple possible column names
  const name = row['Name'] || row['name'] || row['Title'] || row['title'] || '';
  const link = row['Link'] || row['link'] || row['URL'] || row['url'] || '';
  const category = row['Category'] || row['category'] || 'AI Fundamentals';
  const stage = row['Course creation - Stage'] || row['Stage'] || row['stage'] || 'Start';
  const nicoRating = row['Nico Rating (1–5)'] || row['Nico Rating'] || row['Rating'];
  const camiRating = row['Cami Rating (1–5)'] || row['Cami Rating'];
  const description = row['Small description'] || row['Description'] || row['description'] || '';
  
  // Skip if no name or link
  if (!name || !link || link === '') return null;
  
  // Allow items without ratings - they'll get default values
  // Only skip completely empty ratings if you want to review them later
  
  // Parse rating - if no rating, default to 3
  let rating = 3; // Default rating for unrated items
  if (nicoRating && nicoRating !== 'Verlo' && nicoRating !== 'N/A' && nicoRating !== 'TBR' && nicoRating !== 'no se' && !isNaN(parseFloat(nicoRating))) {
    rating = Math.round(parseFloat(nicoRating));
  }
  
  // Map category
  const primaryTopic = categoryMap[category] || 'AI Fundamentals';
  
  // Map stage to week
  const weekSuggested = stageToWeek[stage] || 'Week 1';
  
  // Determine skill level based on stage
  let skillLevel = 'Beginner';
  if (stage.includes('Medium') || stage.includes('Middle') || stage.includes('Mid')) {
    skillLevel = 'Intermediate';
  } else if (stage.includes('Advance') || stage.includes('Advanced')) {
    skillLevel = 'Advanced';
  }
  
  // Guess content type
  const contentType = guessContentType(link, name);
  
  return {
    title: name.trim(),
    link: link.trim(),
    content_type: contentType,
    primary_topic: primaryTopic,
    skill_level: skillLevel,
    tools_covered: determineTools(name, link),
    learning_modality: contentType === 'Video' ? 'Read/Watch' : 
                       contentType === 'Tutorial' ? 'Hands-On' : 'Read/Watch',
    time_investment: estimateTime(contentType),
    quality_rating: rating,
    relevance_score: rating, // Use same as quality for now
    status_priority: rating && rating >= 4 ? 'Core' : 
                     rating && rating >= 3 ? 'Supplemental' : 'To Review',
    use_case_tags: generateUseCaseTags(primaryTopic),
    your_notes: description,
    week_suggested: weekSuggested
  };
}

// Helper: Determine tools from content
function determineTools(name, link) {
  const text = (name + ' ' + link).toLowerCase();
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

// Helper: Estimate time based on content type
function estimateTime(contentType) {
  switch(contentType) {
    case 'Video': return '30-45min';
    case 'Tutorial': return '1-2hrs';
    case 'Documentation': return '20-30min';
    case 'Course': return '2-4hrs';
    default: return '15-20min';
  }
}

// Helper: Generate use case tags
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

// Main import function
async function importResources(filePath) {
  try {
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Try to find where the actual data starts
    console.log('🔍 Checking all sheet tabs...');
    console.log('Available sheets:', workbook.SheetNames);
    
    // Read with range to skip potential header rows
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      range: 1, // Skip first row
      defval: '' // Default value for empty cells
    });
    
    console.log(`📊 Found ${data.length} rows in spreadsheet`);
    
    // Debug: Show first row
    if (data.length > 0) {
      console.log('\n🔍 Column names detected:');
      console.log(Object.keys(data[0]));
      console.log('\n📋 First row sample:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    // Clean and map data
    const cleanedData = data
      .map(cleanData)
      .filter(item => item !== null);
    
    console.log(`✅ Processed ${cleanedData.length} valid resources`);
    
    if (cleanedData.length === 0) {
      console.log('❌ No valid resources to import');
      return;
    }
    
    // Show preview
    console.log('\n📋 Preview of first resource:');
    console.log(JSON.stringify(cleanedData[0], null, 2));
    
    // Ask for confirmation
    console.log(`\n⚠️  Ready to import ${cleanedData.length} resources to Supabase`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Import to Supabase in batches
    console.log('\n🚀 Starting import...');
    const batchSize = 10;
    
    for (let i = 0; i < cleanedData.length; i += batchSize) {
      const batch = cleanedData.slice(i, i + batchSize);
      
      const { data: insertedData, error } = await supabase
        .from('resources')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Error importing batch ${i / batchSize + 1}:`, error);
        continue;
      }
      
      console.log(`✅ Imported batch ${i / batchSize + 1} (${batch.length} resources)`);
    }
    
    console.log('\n🎉 Import complete!');
    console.log(`✅ Successfully imported ${cleanedData.length} resources`);
    console.log('\n📊 Check your app at: https://your-app.vercel.app');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the import
const filePath = process.argv[2] || './AI Courses Table.xlsx';

console.log('🚀 AI Training Library - Resource Importer');
console.log('==========================================\n');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

importResources(filePath);