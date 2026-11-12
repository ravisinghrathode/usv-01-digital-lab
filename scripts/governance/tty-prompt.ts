/**
 * Interactive terminal prompts for human-attributable governance actions.
 *
 * Secrets entered here are NEVER accepted from argv, environment variables,
 * piped stdin, or files. A real interactive terminal (TTY) is mandatory so that
 * an automated agent or CI job cannot silently substitute stored credentials
 * for an explicit human action.
 */
import readline from 'readline';

export function assertInteractiveTerminal(action: string): void {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `${action} requires an interactive terminal (TTY). Non-interactive, piped, CI, or ` +
      `environment-supplied credentials are prohibited for human authority actions.`
    );
  }
}

export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    out._writeToOutput = (s: string) => {
      if (!muted) out.output.write(s);
    };
    rl.question(question, answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
    rl.on('SIGINT', () => {
      rl.close();
      reject(new Error('Aborted by operator.'));
    });
  });
}

export function promptVisible(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Reject any attempt to pass secrets on the command line (visible in process lists / shell history). */
export function rejectSecretArguments(argv: string[]): void {
  const forbidden = argv.find(a => /pass(word|phrase)?|secret|key=/i.test(a));
  if (forbidden) {
    throw new Error(`Secrets must not be supplied as command-line arguments (rejected argument: '${forbidden.split('=')[0]}').`);
  }
}
