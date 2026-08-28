const fs = require('fs');
const { execSync } = require('child_process');
const handlebars = require('handlebars');

const templatePath = 'views/profile.handlebars';

try {
  // 1. Read the profile.handlebars file
  const source = fs.readFileSync(templatePath, 'utf8');

  // 2. Confirm the source contains both data-avatar-customize and data-avatar-customizer plus showModal
  const hasCustomize = source.includes('data-avatar-customize');
  const hasCustomizer = source.includes('data-avatar-customizer');
  const hasShowModal = source.includes('showModal');

  console.log('--- CONTENT CHECKS ---');
  console.log('Contains data-avatar-customize:', hasCustomize);
  console.log('Contains data-avatar-customizer:', hasCustomizer);
  console.log('Contains showModal:', hasShowModal);

  if (!hasCustomize || !hasCustomizer || !hasShowModal) {
    throw new Error('Content checks failed! Missing required substring(s).');
  }

  // 3. Extract the script from views/profile.handlebars
  const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) {
    throw new Error('No <script> tag found in profile.handlebars!');
  }
  let scriptContent = scriptMatch[1];

  // 4. Replace {{student.avatar_skin}} with a quoted mock value
  // We handle any potential spacing around student.avatar_skin inside mustache braces
  const replacedScript = scriptContent.replace(/\{\{\s*student\.avatar_skin\s*\}\}/g, "'mock_skin_value'");

  // 5. Write to temporary file
  const tempFile = 'temp_script.js';
  fs.writeFileSync(tempFile, replacedScript, 'utf8');
  console.log('Temporary file written to:', tempFile);

  // 6. Run node --check
  console.log('Running node --check on temporary script...');
  execSync(`node --check "${tempFile}"`, { stdio: 'inherit' });
  console.log('Syntax check passed successfully.');

  // 7. Remove the temporary file
  fs.unlinkSync(tempFile);
  console.log('Temporary file removed:', tempFile);

  // 8. Compile the Handlebars template
  console.log('Compiling Handlebars template...');
  const compiled = handlebars.compile(source);
  console.log('Handlebars template compiled successfully without issues.');

  console.log('Validation complete. All checks passed perfectly!');

} catch (err) {
  console.error('Validation failed with error:', err);
  process.exit(1);
}
