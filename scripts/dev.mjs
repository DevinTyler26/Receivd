import { execFileSync, spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

execFileSync(npmCommand, ["run", "build"], { stdio: "inherit" });

const environment = { ...process.env, RECEIVD_DEV_WATCH: "1" };
const targets = ["build:popup", "build:content", "build:background"];
const children = targets.map((target) =>
  spawn(npmCommand, ["run", target, "--", "--watch"], {
    env: environment,
    stdio: "inherit"
  })
);

const stop = () => {
  for (const child of children) child.kill("SIGTERM");
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
