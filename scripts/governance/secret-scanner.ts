import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface SecretFinding {
  file: string;
  line: number;
  patternName: string;
  snippet: string;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'Private Key Header', regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'OpenAI API Secret Key', regex: /sk-[a-zA-Z0-9_-]{20,}/ },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/ },
  { name: 'AWS Access Key ID', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: 'GitHub Personal Access Token', regex: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}/ },
  { name: 'Slack Bot / Webhook Token', regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/ }
];

export function scanContentForSecrets(content: string, filePath: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore markdown examples or comments containing dummy placeholder tokens
    if (line.includes('sk-... ') || line.includes('EXAMPLE') || line.includes('dummy') || line.includes('test_token')) {
      continue;
    }

    for (const pat of SECRET_PATTERNS) {
      if (pat.regex.test(line)) {
        findings.push({
          file: filePath,
          line: i + 1,
          patternName: pat.name,
          snippet: line.trim().slice(0, 40) + '...'
        });
      }
    }
  }

  return findings;
}

export function scanGitDiffForSecrets(baseRef = 'origin/main'): SecretFinding[] {
  let diff = '';
  try {
    diff = execSync(`git diff -U0 ${baseRef}...HEAD`, { encoding: 'utf-8' });
  } catch {
    try {
      diff = execSync('git diff -U0 HEAD~1...HEAD', { encoding: 'utf-8' });
    } catch {
      diff = execSync('git diff -U0 --staged', { encoding: 'utf-8' });
    }
  }

  const findings: SecretFinding[] = [];
  let currentFile = '';

  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.substring(6);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      const addedContent = line.substring(1);
      const lineFindings = scanContentForSecrets(addedContent, currentFile);
      findings.push(...lineFindings);
    }
  }

  return findings;
}

if (process.argv[1] && process.argv[1].endsWith('secret-scanner.ts')) {
  console.log('🔍 [Stage B: DevSecOps] Scanning code diff for unredacted credentials and cryptographic secrets...');
  const baseRef = process.argv[2] || 'origin/main';
  const findings = scanGitDiffForSecrets(baseRef);

  if (findings.length > 0) {
    console.error('\n❌ CRITICAL SECURITY VIOLATION: Potential credentials detected in commit diff:');
    for (const f of findings) {
      console.error(`  - [${f.patternName}] in ${f.file}:${f.line} -> "${f.snippet}"`);
    }
    console.error('\nPush blocked per NAVAL-USV Source Code & Data Handling Policy.\n');
    process.exit(1);
  }

  console.log('✅ [Stage B: DevSecOps] Zero exposed credentials or secrets detected.\n');
}
