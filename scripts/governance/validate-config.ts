import fs from 'fs';
import path from 'path';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateRepositoryConfiguration(rootDir = process.cwd()): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. package.json validation
  const pkgPath = path.join(rootDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    errors.push('Missing package.json');
  } else {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (!pkg.scripts || !pkg.scripts.test || !pkg.scripts.build || !pkg.scripts.lint) {
        errors.push("package.json missing mandatory verification scripts ('test', 'build', 'lint')");
      }
    } catch (e: any) {
      errors.push(`Invalid package.json JSON syntax: ${e.message}`);
    }
  }

  // 2. tsconfig.json validation
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    errors.push('Missing tsconfig.json');
  } else {
    try {
      JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    } catch (e: any) {
      errors.push(`Invalid tsconfig.json syntax: ${e.message}`);
    }
  }

  // 3. CODEOWNERS validation
  const codeownersPath = path.join(rootDir, '.github', 'CODEOWNERS');
  if (!fs.existsSync(codeownersPath)) {
    errors.push('Missing .github/CODEOWNERS required for server-side branch protection');
  } else {
    const content = fs.readFileSync(codeownersPath, 'utf8');
    if (!content.includes('@ravisinghrathode')) {
      errors.push('.github/CODEOWNERS must designate Engineering Director @ravisinghrathode');
    }
  }

  // 4. USV01_PROJECT_CONTEXT.md validation
  const contextPath = path.join(rootDir, 'USV01_PROJECT_CONTEXT.md');
  if (!fs.existsSync(contextPath)) {
    errors.push('Missing foundational USV01_PROJECT_CONTEXT.md');
  } else {
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    if (!contextContent.includes('TBD')) {
      warnings.push('USV01_PROJECT_CONTEXT.md does not contain explicit TBD markers for open vessel parameters');
    }
  }

  // 5. GitHub Actions workflow validation
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'safety-governance-gate.yml');
  if (!fs.existsSync(workflowPath)) {
    errors.push('Missing server-side CI workflow: .github/workflows/safety-governance-gate.yml');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

if (process.argv[1] && process.argv[1].endsWith('validate-config.ts')) {
  console.log('⚙️  [Stage B: DevSecOps] Validating repository governance configuration...');
  const res = validateRepositoryConfiguration();

  if (res.warnings.length > 0) {
    for (const w of res.warnings) console.warn(`  ⚠️  Warning: ${w}`);
  }

  if (!res.valid) {
    console.error('\n❌ Repository configuration validation failed:');
    for (const e of res.errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('✅ [Stage B: DevSecOps] Repository configuration verified successfully.\n');
}
