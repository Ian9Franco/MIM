const { spawn } = require("child_process");

function runSingleGate(repoRoot, gate) {
  const env = gate.env ? { ...process.env, ...gate.env } : process.env;
  return new Promise((resolve) => {
    const start = Date.now();
    let capturedOutput = "";
    const proc = spawn(gate.cmd, gate.args, {
      cwd: repoRoot,
      shell: true,
      env: { ...env, NODE_OPTIONS: "--max-old-space-size=4096" },
    });

    if (proc.stdout) {
      proc.stdout.on("data", (chunk) => {
        process.stdout.write(chunk);
        capturedOutput += chunk.toString();
      });
    }
    if (proc.stderr) {
      proc.stderr.on("data", (chunk) => {
        process.stderr.write(chunk);
        capturedOutput += chunk.toString();
      });
    }
    proc.on("close", (code) => {
      resolve({
        ok: code === 0,
        elapsed: ((Date.now() - start) / 1000).toFixed(1),
        code,
        output: capturedOutput,
      });
    });
    proc.on("error", (err) => {
      resolve({ ok: false, elapsed: 0, code: 1, output: err.message });
    });
  });
}

module.exports = { runSingleGate };
