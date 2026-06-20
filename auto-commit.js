const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const WATCH_DIR = path.join(__dirname, 'src');
const DEBOUNCE_MS = 5000; // Wait 5 seconds of inactivity before committing/pushing
let timeoutId = null;

console.log(`Starting Git Auto-Commit Watcher on: ${WATCH_DIR}`);
console.log('Press Ctrl+C to stop.\n');

function runGitCommands() {
  console.log('Change detected. Preparing to commit and push...');
  exec('git add .', (err, stdout, stderr) => {
    if (err) {
      console.error('git add failed:', err);
      return;
    }
    
    // Check if there are changes to commit
    exec('git status --porcelain', (err, statusOut) => {
      if (err) {
        console.error('git status failed:', err);
        return;
      }
      if (!statusOut.trim()) {
        console.log('No changes to commit.');
        return;
      }
      
      const commitMessage = `Auto-commit: modified files at ${new Date().toLocaleTimeString()}`;
      exec(`git commit -m "${commitMessage}"`, (err, stdout, stderr) => {
        if (err) {
          console.error('git commit failed:', err);
          return;
        }
        console.log(stdout.trim());
        
        // Push changes
        exec('git rev-parse --abbrev-ref HEAD', (err, branchOut) => {
          let branch = 'main';
          if (!err && branchOut.trim() && branchOut.trim() !== 'HEAD') {
            branch = branchOut.trim();
          }
          console.log(`Pushing to origin ${branch}...`);
          exec(`git push origin ${branch}`, (err, stdout, stderr) => {
            if (err) {
              console.error('git push failed:', err);
              console.error(stderr);
              return;
            }
            console.log('Successfully pushed changes to GitHub!\n');
          });
        });
      });
    });
  });
}

// Watch recursively (supported natively on Windows)
try {
  fs.watch(WATCH_DIR, { recursive: true }, (eventType, filename) => {
    if (filename) {
      // Filter out cache or temporary files
      if (filename.includes('.next') || filename.includes('node_modules') || filename.includes('.git') || filename.endsWith('~')) {
        return;
      }
      console.log(`[Changed] ${filename}`);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(runGitCommands, DEBOUNCE_MS);
    }
  });
} catch (error) {
  console.error("Failed to start file watcher:", error);
}
