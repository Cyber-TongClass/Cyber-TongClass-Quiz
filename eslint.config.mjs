import nextConfig from "eslint-config-next";

// npm run lint is intentionally kept unchanged per AGENTS.md. The script still
// passes -c .eslintrc.json, so .eslintrc.json is a symlink to this flat config.
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "convex/_generated/**",
      "tmp/**",
      ".eslint-*.config.mjs",
    ],
  },
  ...nextConfig,
  {
    // eslint-plugin-react-hooks v7 includes React Compiler rules in its
    // recommended config. This React 18 codebase keeps the classic hooks checks
    // active while avoiding a repository-wide compiler-rule migration.
    rules: {
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/immutability": "off",
      "react-hooks/globals": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/unsupported-syntax": "off",
      "react-hooks/config": "off",
      "react-hooks/gating": "off",
    },
  },
];

export default config;
