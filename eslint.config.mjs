// eslint-config-next 16 ships flat config, so it is spread directly rather than
// run through the eslintrc compat layer (which throws on this plugin graph).
import next from "eslint-config-next";
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "public/**", "scripts/**"] },
  ...next,
  ...coreWebVitals,
  ...typescript,
];

export default config;
