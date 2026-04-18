const fs = require('fs');
const path = require('path');

const tscOutput = fs.readFileSync('tsc_post_transform.txt', 'utf8');
const lines = tscOutput.split('\n');

const changesByFile = {};

// Regex to capture: filepath(line,col): error TS2551: Property 'bad' does not exist on type '...'. Did you mean 'good'?
const regexDidYouMean = /^(.*?)\((\d+),(\d+)\):\s*error\s*TS2551:\s*Property\s*'([^']+)'\s*does not exist on type\s*'[^']+'.*?Did you mean\s*'([^']+)'\?/;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(regexDidYouMean);
    
    if (match) {
        const file = match[1].trim();
        const lineNum = parseInt(match[2], 10);
        const colNum = parseInt(match[3], 10);
        const badProp = match[4];
        const goodProp = match[5];

        if (!changesByFile[file]) {
            changesByFile[file] = [];
        }
        
        changesByFile[file].push({
            line: lineNum,
            col: colNum,
            bad: badProp,
            good: goodProp
        });
    } else {
        // Sometimes the error is multiline. "Does not exist on type ... \n Did you mean 'good'?"
        // Let's do a loose regex matching bad to good across the whole file
    }
}

// Write the parsed changes out so we can see how many matches we found
fs.writeFileSync('tsc_parsed_changes.json', JSON.stringify(changesByFile, null, 2));
console.log(`Parsed files with suggestions: ${Object.keys(changesByFile).length}`);
